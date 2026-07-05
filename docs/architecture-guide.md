# Architecture Guide — Routes → Controllers → Services → Repositories → Models

A comprehensive walkthrough of every layer in the skeleton backend, how they connect, and how to add a new feature end-to-end.

---

## [MAP] Directory Layout

```
src/
├── app.ts                          Express assembly (middleware pipeline)
├── server.ts                       Startup orchestration (DB → listen)
├── composition-root.ts             Dependency wiring hub
│
├── config/
│   └── index.ts                    Environment configuration
│
├── routes/
│   ├── index.ts                    Main router — mounts all sub-routers
│   └── auth.routes.ts              Auth-specific routes
│
├── controllers/
│   ├── base.controller.ts          Response helpers + validation
│   ├── interface.controller.ts     Role interfaces (Indexable, Storable, …)
│   ├── auth.controller.ts          Auth endpoints
│   └── examples/
│       ├── health.controller.ts    Health-check
│       └── user.controller.ts      Full CRUD example
│
├── services/
│   ├── auth.service.ts             Auth business logic
│   └── user.service.ts             User business logic
│
├── repositories/
│   ├── index.ts                    Barrel exports
│   ├── interfaces/
│   │   ├── IBaseRepository.ts      Generic CRUD interface
│   │   └── IUserRepository.ts      User-specific queries
│   └── mongo/
│       ├── BaseRepository.ts       Generic Mongoose implementation
│       └── UserRepository.ts       User Mongoose implementation
│
├── models/
│   └── user.model.ts               Mongoose schema + document interface
│
├── middleware/
│   ├── auth.ts                     JWT verification + role authorization
│   ├── errorHandler.ts             Global error handler + 404
│   ├── rateLimiter.ts              Rate-limit instances
│   ├── rateLimitStore.ts           Upstash Redis store
│   ├── requestId.ts                X-Request-Id generation
│   └── validators/
│       ├── user.validator.ts       Validation chains
│       └── validate.ts             Standalone validation runner
│
├── types/
│   ├── index.ts                    IApiResponse, IPaginationOptions, ControllerMethod
│   ├── user.types.ts               IUser, ICreateUserDTO, IUpdateUserDTO
│   └── express.d.ts                AuthenticatedRequest extension
│
└── utils/
    ├── appError.ts                 Custom error class with statusCode
    └── logger.ts                   Winston logger instance
```

---

## [FLOW] How a Request Travels Through the Layers

```
HTTP Request
     │
     ▼
┌────────────┐      Middleware pipeline (app.ts)
│  app.ts    │      requestId → helmet → cors → body parser → mongoSanitize → hpp → rate limiter
└─────┬──────┘
      │
      ▼
┌────────────┐      Route matching (routes/index.ts)
│  routes/   │      GET /api/v1/users → userController.index
└─────┬──────┘
      │
      ▼
┌────────────┐      Controller — parse request, call service, send response
│controller  │      userController.index(req, res)
│  .ts       │        → validates input
│            │        → calls userService.getAllUsers({ page, limit })
│            │        → sends res via this.sendSuccess()
└─────┬──────┘
      │
      ▼
┌────────────┐      Service — business logic, no Express knowledge
│ service    │      userService.getAllUsers(options)
│  .ts       │        → calls this.userRepo.findAll(options)
│            │        → applies business rules (if any)
│            │        → returns domain result
└─────┬──────┘
      │
      ▼
┌────────────┐      Repository — data access, abstracted behind interface
│repository  │      userRepo.findAll(options)
│  .ts       │        → this.model.find()...model.countDocuments()
│            │        → returns { items, total }
└─────┬──────┘
      │
      ▼
┌────────────┐      Model — Mongoose schema + document
│ model.ts   │      User model (schema, hooks, instance methods)
│            │      The repository calls model methods, never the controller
└────────────┘

Response ← ─ ─ ─ Return path (reverse order, same layers)
```

---

## [LAYER 1] Routes — `src/routes/`

### Structure

`routes/index.ts` is the main router. It mounts sub-routers and directly attaches controller methods.

```ts
const router = Router();

router.use("/auth", authRoutes);          // delegates to sub-router
router.get("/health", healthController.check);  // direct controller method

// Full CRUD — one method per HTTP verb + route
router.get("/users",       userController.index);
router.post("/users",      userController.store);
router.get("/users/:id",   userController.show);
router.get("/users/:id/edit", userController.edit);
router.put("/users/:id",   userController.update);
router.delete("/users/:id", userController.destroy);
```

### Route Naming Convention

| Pattern | Verb | Controller Method | Purpose |
|---|---|---|---|
| `/resource` | GET | `index` | List all, with pagination |
| `/resource` | POST | `store` | Create new |
| `/resource/:id` | GET | `show` | Read one (client view) |
| `/resource/:id/edit` | GET | `edit` | Read one (form population) |
| `/resource/:id` | PUT/PATCH | `update` | Persist changes |
| `/resource/:id` | DELETE | `destroy` | Remove |

### Sub-routers

Keep related routes in their own file (e.g. `auth.routes.ts`) and mount them:

```ts
// auth.routes.ts
router.post("/register", authLimiter, authController.register);
router.post("/login",    authLimiter, authController.login);
router.get("/me",        authenticate, authController.me);

// mounted at /auth in index.ts:
router.use("/auth", authRoutes);
```

### Middleware per Route

Pass middleware before the controller method:

```ts
router.post("/register", authLimiter, authController.register);
router.get("/me",        authenticate, authController.me);
router.put("/users/:id", authenticate, authorize("admin"), userController.update);
```

Available middleware: `authenticate` (JWT), `authorize("role")`, `authLimiter`, `generalLimiter`.

---

## [LAYER 2] Controllers — `src/controllers/`

### Role Interfaces (Interface Segregation)

Instead of one monolithic controller interface, the app defines **6 atomic role interfaces**:

```ts
// interface.controller.ts
export interface Indexable   { index(req, res, next): ... }
export interface Storable    { store(req, res, next): ... }
export interface Showable    { show(req, res, next): ... }
export interface Editable    { edit(req, res, next): ... }
export interface Updatable   { update(req, res, next): ... }
export interface Destroyable { destroy(req, res, next): ... }

// Composite for full CRUD
export interface InterfaceController
  extends Indexable, Storable, Showable, Editable, Updatable, Destroyable {}
```

**Rule:** A controller implements only the interfaces it genuinely uses.

| Controller | Implements | Why |
|---|---|---|
| `UserController` | `InterfaceController` | Full CRUD — all 6 methods |
| `AuthController` | *(none)* | Custom methods (register, login, me) |
| `HealthController` | *(none)* | Single health-check method |

### BaseController — Response Helpers

All controllers extend `BaseController` to get standardised response methods:

```ts
class BaseController {
  // Success
  sendSuccess<T>(res, data, message, statusCode)
  sendCreated<T>(res, data, message)
  sendNoContent(res)

  // Errors
  sendError(res, message, statusCode, errors?)
  sendBadRequest(res, message, errors?)
  sendUnauthorized(res, message)
  sendForbidden(res, message)
  sendNotFound(res, message)
  sendValidationError(res, errors, message)
  sendServerError(res, error, fallbackMessage)

  // Validation
  validate(req, validations): Promise<errors[] | null>
  authorize(condition, message)
}
```

### Controller Pattern (Constructor Injection)

Controllers receive their service dependency via constructor:

```ts
export class UserController extends BaseController implements InterfaceController {
  constructor(private readonly userService: UserService) {
    super();
  }

  index: ControllerMethod = async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { items, total } = await this.userService.getAllUsers({ page, limit });
      return this.sendSuccess(res, {
        items,
        pagination: { page, limit, total },
      }, "Users retrieved successfully");
    } catch (error) {
      return this.sendServerError(res, error, "Failed to retrieve users");
    }
  };
  // ... store, show, edit, update, destroy follow the same pattern
}
```

### Controller Error Handling Rules

1. Wrap method body in try/catch
2. Catch known errors (AppError with statusCode) → `this.sendError(res, message, statusCode)`
3. Catch unknown errors → `this.sendServerError(res, error, fallbackMessage)`
4. Return the Response object from every code path (TypeScript strict)
5. Do NOT import models or databases in controllers — delegate to the service

---

## [LAYER 3] Services — `src/services/`

### Service Pattern (Constructor Injection)

Services receive their repository dependency via constructor:

```ts
export class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  async getAllUsers(options: IPaginationOptions) {
    return this.userRepo.findAll(options);
  }
}
```

### Service Rules

1. **Business logic only.** No Express objects (`req`, `res`), no HTTP headers, no response formatting.
2. **Throw AppError for expected failures.** Controllers catch and format them.
3. **No direct Mongoose calls.** The lowest-level data access is always `this.repo.method()`.
4. **Methods should be thin.** If a service method grows past 10 lines of business logic, extract it into a private method.
5. **Pure domain input/output.** Accept domain types (DTOs), return domain types.

### Example — AuthService

```ts
export class AuthService {
  constructor(private readonly userRepo: IUserRepository) {}

  async register(name, email, password): Promise<AuthResponse> {
    const existing = await this.userRepo.findOneByEmail(email);
    if (existing) throw new AppError("Email already in use", 409);

    const user = await this.userRepo.create({ name, email, password });
    const accessToken = this.generateToken(user);

    return {
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      tokens: { accessToken },
    };
  }
}
```

### Service vs Repository — Responsibility Boundary

| If the logic involves… | It belongs in |
|---|---|
| Validating business rules (email uniqueness, minimum balance) | **Service** |
| Combining multiple data sources | **Service** |
| Triggering side effects (emails, webhooks, audit logs) | **Service** |
| Choosing which fields to update or return | **Service** |
| Raw DB queries (find, create, update, delete) | **Repository** |
| Pagination, filtering, sorting at the DB level | **Repository** |
| Transaction management across documents | **Repository** |

---

## [LAYER 4] Repositories — `src/repositories/`

### Three-Layer Architecture

```
┌─────────────────────────────────────────────┐
│         IBaseRepository<T, C, U>             │  ← Generic CRUD contract
│  findAll, findById, create, update, delete   │
├─────────────────────────────────────────────┤
│         IUserRepository                      │  ← Domain interface
│  extends IBaseRepository<User, Create, Upd>  │
│  + findOneByEmail(email)                     │
├─────────────────────────────────────────────┤
│         MongoBaseRepository<T extends Doc>   │  ← Generic Mongoose impl
│  constructor(model) → all CRUD inherited     │
├─────────────────────────────────────────────┤
│         MongoUserRepository                  │  ← Domain impl
│  extends MongoBaseRepository                 │
│  + findOneByEmail(email)                     │
└─────────────────────────────────────────────┘
```

### Generic Base Interface

```ts
// repositories/interfaces/IBaseRepository.ts
export interface IBaseRepository<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  findAll(options: IPaginationOptions): Promise<{ items: T[]; total: number }>;
  findById(id: string): Promise<T | null>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T | null>;
  delete(id: string): Promise<void>;
}
```

### Generic Base Implementation

```ts
// repositories/mongo/BaseRepository.ts
export abstract class MongoBaseRepository<
  T extends Document,
  CreateDTO = Partial<T>,
  UpdateDTO = Partial<T>,
> implements IBaseRepository<T, CreateDTO, UpdateDTO>
{
  constructor(protected readonly model: Model<T>) {}

  async findAll(options: IPaginationOptions) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find().skip(skip).limit(limit),
      this.model.countDocuments(),
    ]);
    return { items, total };
  }

  async findById(id: string) { return this.model.findById(id); }
  async create(data: CreateDTO) { const doc = new this.model(data); return doc.save(); }
  async update(id: string, data: UpdateDTO) {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async delete(id: string) { await this.model.findByIdAndDelete(id); }
}
```

### Domain Interface

```ts
// repositories/interfaces/IUserRepository.ts
export interface IUserRepository
  extends IBaseRepository<UserDocument, ICreateUserDTO, IUpdateUserDTO>
{
  findOneByEmail(email: string): Promise<UserDocument | null>;
}
```

### Domain Implementation

```ts
// repositories/mongo/UserRepository.ts
export class MongoUserRepository
  extends MongoBaseRepository<UserDocument, ICreateUserDTO, IUpdateUserDTO>
  implements IUserRepository
{
  constructor() { super(User); }     // ← all 5 CRUD methods inherited

  async findOneByEmail(email: string) {  // ← only entity-specific query
    return this.model.findOne({ email });
  }
}
```

---

## [LAYER 5] Models — `src/models/`

### Mongoose Document + Schema

```ts
// models/user.model.ts
export interface UserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role:     { type: String, enum: ["admin", "user"], default: "user" },
}, { timestamps: true });

// Hooks
userSchema.pre<UserDocument>("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default model<UserDocument>("User", userSchema);
```

### Model Rules

1. **Export both the Document interface and the Model.** Services and repositories reference the Document type; the repository constructor receives the Model.
2. **Hooks for data integrity only** (password hashing, timestamps). Business rules (email uniqueness) go in the service or repository query layer.
3. **`select: false` on sensitive fields** (password). The repository must explicitly use `.select("+password")` when those fields are needed.
4. **Instance methods vs static methods** — instance methods (`comparePassword`) belong on the schema; static queries belong in the repository.
5. **Types must match the DTOs.** The schema fields should align with `ICreateUserDTO` (required fields) and `IUpdateUserDTO` (optional fields).

---

## [LAYER 6] Types — `src/types/`

### DTOs (Data Transfer Objects)

```ts
// types/user.types.ts
export interface IUser {
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateUserDTO {
  name: string;
  email: string;
  password: string;
}

export interface IUpdateUserDTO {
  name?: string;
  email?: string;
  password?: string;
}
```

**Why separate DTOs for create vs update?**
- Create: all fields required → TypeScript enforces complete data at compile time
- Update: all fields optional → TypeScript allows partial updates naturally
- This prevents accidentally omitting a required field during creation or forgetting to mark a field optional during updates

### Shared Types

```ts
// types/index.ts
export interface IApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  errors?: unknown[];
}

export type ControllerMethod = (req, res, next) => Promise<void | Response> | void | Response;

export interface IPaginationOptions {
  page: number;
  limit: number;
}
```

---

## [LAYER 7] Composition Root — `src/composition-root.ts`

The single file where all dependencies are wired together:

```ts
// composition-root.ts
import { MongoUserRepository } from "./repositories";
import { UserService } from "./services/user.service";
import { AuthService } from "./services/auth.service";
import { UserController } from "./controllers/examples/user.controller";
import { AuthController } from "./controllers/auth.controller";

// Repositories
const userRepo = new MongoUserRepository();

// Services
const userService = new UserService(userRepo);
const authService = new AuthService(userRepo);

// Controllers
const userController = new UserController(userService);
const authController = new AuthController(authService);

export { userController, authController };
```

**Rules:**
- `composition-root.ts` is the **only** file that calls `new` on repositories, services, or controllers (excluding utility classes)
- It **exports wired controllers**, which routes consume
- To swap a data source: change one line (`new MongoUserRepository()` → `new PostgresUserRepository(db)`)
- To add a new entity: create the repository + service + controller, then add 5 lines here

---

## [TUTORIAL] Adding a New Entity — Product

Let's walk through adding a `Product` entity end-to-end.

### Step 1: Types — `src/types/product.types.ts`

```ts
export interface IProduct {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateProductDTO {
  name: string;
  price: number;
  category: string;
}

export interface IUpdateProductDTO {
  name?: string;
  price?: number;
  category?: string;
  inStock?: boolean;
}
```

Export from `types/index.ts`:

```ts
export * from "./product.types";
```

### Step 2: Model — `src/models/product.model.ts`

```ts
import { Schema, model, Document } from "mongoose";
import { IProduct } from "../types";

export interface ProductDocument extends IProduct, Document {}

const productSchema = new Schema<ProductDocument>({
  name:     { type: String, required: true, trim: true },
  price:    { type: Number, required: true, min: 0 },
  category: { type: String, required: true, lowercase: true, trim: true },
  inStock:  { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ category: 1 });

export default model<ProductDocument>("Product", productSchema);
```

### Step 3: Repository Interface — `src/repositories/interfaces/IProductRepository.ts`

```ts
import { IBaseRepository } from "./IBaseRepository";
import { ProductDocument, ICreateProductDTO, IUpdateProductDTO } from "../../types";

export interface IProductRepository
  extends IBaseRepository<ProductDocument, ICreateProductDTO, IUpdateProductDTO>
{
  findByCategory(category: string): Promise<ProductDocument[]>;
}
```

### Step 4: Repository Implementation — `src/repositories/mongo/ProductRepository.ts`

```ts
import Product, { ProductDocument } from "../../models/product.model";
import { ICreateProductDTO, IUpdateProductDTO } from "../../types";
import { MongoBaseRepository } from "./BaseRepository";
import { IProductRepository } from "../interfaces/IProductRepository";

export class MongoProductRepository
  extends MongoBaseRepository<ProductDocument, ICreateProductDTO, IUpdateProductDTO>
  implements IProductRepository
{
  constructor() { super(Product); }

  async findByCategory(category: string): Promise<ProductDocument[]> {
    return this.model.find({ category });
  }
}
```

Export from `repositories/index.ts`:

```ts
export { IProductRepository } from "./interfaces/IProductRepository";
export { MongoProductRepository } from "./mongo/ProductRepository";
```

### Step 5: Service — `src/services/product.service.ts`

```ts
import { ProductDocument } from "../models/product.model";
import { ICreateProductDTO, IUpdateProductDTO, IPaginationOptions } from "../types";
import { IProductRepository } from "../repositories";

export class ProductService {
  constructor(private readonly productRepo: IProductRepository) {}

  async getAllProducts(options: IPaginationOptions) {
    return this.productRepo.findAll(options);
  }

  async getProductById(id: string) {
    return this.productRepo.findById(id);
  }

  async getProductsByCategory(category: string) {
    return this.productRepo.findByCategory(category);
  }

  async createProduct(data: ICreateProductDTO) {
    return this.productRepo.create(data);
  }

  async updateProduct(id: string, data: IUpdateProductDTO) {
    return this.productRepo.update(id, data);
  }

  async deleteProduct(id: string) {
    await this.productRepo.delete(id);
  }
}
```

### Step 6: Controller — `src/controllers/product.controller.ts`

```ts
import { Request, Response } from "express";
import BaseController from "./base.controller";
import { ProductService } from "../services/product.service";
import { InterfaceController } from "./interface.controller";
import { ControllerMethod } from "../types";

export class ProductController extends BaseController implements InterfaceController {
  constructor(private readonly productService: ProductService) {
    super();
  }

  index: ControllerMethod = async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { items, total } = await this.productService.getAllProducts({ page, limit });
      return this.sendSuccess(res, { items, pagination: { page, limit, total } });
    } catch (error) {
      return this.sendServerError(res, error, "Failed to retrieve products");
    }
  };

  show: ControllerMethod = async (req, res) => {
    try {
      const product = await this.productService.getProductById(req.params.id);
      if (!product) return this.sendNotFound(res, "Product not found");
      return this.sendSuccess(res, product);
    } catch (error) {
      return this.sendServerError(res, error, "Failed to retrieve product");
    }
  };

  store: ControllerMethod = async (req, res) => {
    try {
      const product = await this.productService.createProduct(req.body);
      return this.sendCreated(res, product);
    } catch (error) {
      return this.sendServerError(res, error, "Failed to create product");
    }
  };

  edit: ControllerMethod = async (req, res) => {
    try {
      const product = await this.productService.getProductById(req.params.id);
      if (!product) return this.sendNotFound(res, "Product not found");
      return this.sendSuccess(res, product);
    } catch (error) {
      return this.sendServerError(res, error, "Failed to retrieve product");
    }
  };

  update: ControllerMethod = async (req, res) => {
    try {
      const product = await this.productService.updateProduct(req.params.id, req.body);
      if (!product) return this.sendNotFound(res, "Product not found");
      return this.sendSuccess(res, product);
    } catch (error) {
      return this.sendServerError(res, error, "Failed to update product");
    }
  };

  destroy: ControllerMethod = async (req, res) => {
    try {
      await this.productService.deleteProduct(req.params.id);
      return this.sendSuccess(res, null, "Product deleted successfully");
    } catch (error) {
      return this.sendServerError(res, error, "Failed to delete product");
    }
  };
}
```

### Step 7: Wire in Composition Root — `src/composition-root.ts`

```ts
// Add these imports:
import { MongoProductRepository } from "./repositories";
import { ProductService } from "./services/product.service";
import { ProductController } from "./controllers/product.controller";

// Add after existing repositories:
const productRepo = new MongoProductRepository();
const productService = new ProductService(productRepo);
const productController = new ProductController(productService);

// Add to exports:
export { productController, authController, userController, productController };
```

### Step 8: Add Routes — `src/routes/index.ts`

```ts
router.get("/products",       productController.index);
router.post("/products",      productController.store);
router.get("/products/:id",   productController.show);
router.get("/products/:id/edit", productController.edit);
router.put("/products/:id",   productController.update);
router.delete("/products/:id", productController.destroy);
```

That's it. 8 steps, ~150 lines total, zero architectural surprise.

---

## [TESTING STRATEGY]

### Unit Testing Services

Inject a mock repository:

```ts
const mockRepo: IUserRepository = {
  findAll: async () => ({ items: [], total: 0 }),
  findById: async () => null,
  findOneByEmail: async () => null,
  create: async (data) => ({ ...data, _id: "123" } as any),
  update: async () => null,
  delete: async () => {},
};

const service = new UserService(mockRepo);
const result = await service.getAllUsers({ page: 1, limit: 10 });
expect(result.items).toHaveLength(0);
```

### Unit Testing Controllers

Mock the service and pass to the constructor:

```ts
const mockService = new UserService(mockRepo);
const controller = new UserController(mockService);

const req = { query: { page: "1", limit: "10" } } as any;
const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

await controller.index(req, res);
expect(res.status).toHaveBeenCalledWith(200);
```

### Integration Testing

Use `MongoUserRepository` with a test database (mongodb-memory-server). The service layer needs zero changes — swap the MongoDB URI in config.

---

## [SOLID SCORECARD]

| Principle | How it's achieved in this architecture |
|---|---|
| **S** — Single Responsibility | Every file has one job: model defines schema, repository queries data, service applies business rules, controller formats HTTP responses |
| **O** — Open/Closed | `IBaseRepository` is closed; domain interfaces extend it. `MongoBaseRepository` is closed; domain repos extend it. Services depend on abstractions, not concretions |
| **L** — Liskov Substitution | Controllers extend `BaseController` without overriding. `AppError` extends `Error` preserving the full contract. Repositories implement their interfaces faithfully |
| **I** — Interface Segregation | 6 atomic controller interfaces (`Indexable`, `Storable`, …) — no controller implements methods it doesn't use. DTOs separated per operation (`ICreateUserDTO` ≠ `IUpdateUserDTO`) |
| **D** — Dependency Inversion | Services depend on `IUserRepository` (abstraction), not `MongoUserRepository` (concretion). Controllers depend on `UserService` (abstraction), not a concrete instantiation |

---

## [QUICK REFERENCE — Common Tasks]

| Task | Files to touch |
|---|---|
| Add a new endpoint to an existing controller | Controller + routes file |
| Add a new entity (full CRUD) | Types → Model → Repository (interface + impl) → Service → Controller → Composition Root → Routes |
| Add a new query (e.g. `findByEmail`) | Repository interface + implementation |
| Add business logic (e.g. discount validation) | Service only |
| Swap database (e.g. Mongo → Postgres) | New repository implementation + one line in composition-root |
| Add new middleware (e.g. CSRF) | `middleware/` file + one line in `app.ts` |
| Mock for tests | Create a class that implements the repository interface — zero code changes to services |

---

*See `docs/open-close-principle.md` for the repository abstraction design rationale.*
