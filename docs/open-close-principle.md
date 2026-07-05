# Open/Closed Principle (O) + Dependency Inversion (D) — Repository Abstraction Layer

**Branch:** `open-close-principle`
**Date:** 2026-07-01
**Commits:**
  - `de3613c` — Repository abstraction layer (per-entity)
  - `05bc6b0` — Generic base repository to eliminate boilerplate

---

## [PROBLEM]

The service layer (`UserService`, `AuthService`) depended **concretely** on Mongoose model methods:

```ts
// BEFORE — violated OCP and DIP:
class UserService {
  async getAllUsers(options) {
    const users = await User.find()...        // concrete Mongoose
    const total = await User.countDocuments(); // concrete Mongoose
    return { users, total };
  }
}
```

This meant:
- **OCP violation:** Adding PostgreSQL, a cache layer, or a mock for testing required *modifying* `UserService`
- **DIP violation:** High-level business logic depended on low-level persistence details

---

## [SOLUTION]

Three layers introduced, each with a distinct role:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Generic Base (closed)                         │
│                                                                  │
│  IBaseRepository<T, CreateDTO, UpdateDTO>                        │
│  ├─ findAll → { items: T[]; total: number }                     │
│  ├─ findById(id)                                                 │
│  ├─ create(data)                                                 │
│  ├─ update(id, data)                                             │
│  └─ delete(id)                                                   │
│                                                                  │
│  MongoBaseRepository<T extends Document, ...> implements above   │
│  └─ constructor(model: Model<T>)                                 │
└─────────────────────────────────────────────────────────────────┘
                                    ↑ extends
┌─────────────────────────────────────────────────────────────────┐
│                    Domain Interface (open)                        │
│                                                                  │
│  IUserRepository extends IBaseRepository<UserDocument,           │
│                                            ICreateUserDTO,       │
│                                            IUpdateUserDTO>       │
│  └─ findOneByEmail(email)        ← entity-specific               │
└─────────────────────────────────────────────────────────────────┘
                                    ↑ implements + extends
┌─────────────────────────────────────────────────────────────────┐
│                    Domain Implementation                          │
│                                                                  │
│  MongoUserRepository extends MongoBaseRepository                 │
│                            implements IUserRepository            │
│  ├─ constructor() { super(User); }   ← full CRUD inherited      │
│  └─ findOneByEmail(email)            ← only actual code         │
└─────────────────────────────────────────────────────────────────┘
```

### Why generic + domain, not one generic to rule them all

A single `IRepository<T>` with no domain interfaces would force every entity to expose `findOneByEmail`, `findByCategory`, etc. — violating **ISP** (Interface Segregation). By placing only common CRUD in the base and entity-specific queries in the domain interface, every principle is respected simultaneously.

---

## [FILES CHANGED]

### Commit 1 — Repository abstraction (per-entity)

| File | Action |
|---|---|
| `src/repositories/interfaces/IUserRepository.ts` | **Created** |
| `src/repositories/mongo/UserRepository.ts` | **Created** |
| `src/repositories/index.ts` | **Created** |
| `src/composition-root.ts` | **Created** |
| `src/services/user.service.ts` | **Modified** — accepts `IUserRepository` via constructor |
| `src/services/auth.service.ts` | **Modified** — same pattern |
| `src/controllers/auth.controller.ts` | **Modified** — accepts `AuthService` via constructor |
| `src/controllers/examples/user.controller.ts` | **Modified** — accepts `UserService` via constructor |
| `src/routes/index.ts` | **Modified** — uses composition-root |
| `src/routes/auth.routes.ts` | **Modified** — uses composition-root |

### Commit 2 — Generic base (boilerplate elimination)

| File | Action |
|---|---|
| `src/repositories/interfaces/IBaseRepository.ts` | **Created** — generic CRUD interface |
| `src/repositories/mongo/BaseRepository.ts` | **Created** — generic Mongoose implementation |
| `src/repositories/interfaces/IUserRepository.ts` | **Modified** — extends `IBaseRepository` |
| `src/repositories/mongo/UserRepository.ts` | **Modified** — extends `MongoBaseRepository` |
| `src/repositories/index.ts` | **Modified** — exports base + domain types |
| `src/services/user.service.ts` | **Modified** — `{ users, total }` → `{ items, total }` |
| `src/controllers/examples/user.controller.ts` | **Modified** — same destructure rename |

---

## [HOW TO ADD A NEW ENTITY]

Minimal boilerplate — the generic base does all the repetitive work.

### 1. Domain interface — `src/repositories/interfaces/IProductRepository.ts`

```ts
import { IBaseRepository } from "./IBaseRepository";

export interface IProductRepository
  extends IBaseRepository<ProductDocument, ICreateProductDTO, IUpdateProductDTO>
{
  // Only entity-specific queries go here — CRUD is inherited
  findByCategory(category: string): Promise<ProductDocument[]>;
}
```

If the entity has **no** entity-specific queries, the interface is empty:

```ts
export interface IProductRepository
  extends IBaseRepository<ProductDocument, ICreateProductDTO, IUpdateProductDTO> {}
```

### 2. Implementation — `src/repositories/mongo/ProductRepository.ts`

```ts
import { MongoBaseRepository } from "./BaseRepository";

export class MongoProductRepository
  extends MongoBaseRepository<ProductDocument, ICreateProductDTO, IUpdateProductDTO>
  implements IProductRepository
{
  constructor() { super(Product); }  // ← all CRUD inherited

  // Only entity-specific:
  async findByCategory(category: string) {
    return this.model.find({ category });
  }
}
```

### 3. Wire — add to `src/composition-root.ts`

```ts
const productRepo = new MongoProductRepository();
const productService = new ProductService(productRepo);
const productController = new ProductController(productService);
```

---

## [HOW TO SWAP DATA SOURCE]

Create a new implementation of the domain interface, then change **one line** in `composition-root.ts`:

```ts
// Before:
const userRepo = new MongoUserRepository();

// After:
const userRepo = new PostgresUserRepository(db);
```

Zero changes to services, controllers, or routes.

---

## [VERIFICATION]

```bash
npx tsc --noEmit
# → Zero errors
```

---

## [SOLID SCOREBOARD]

| Principle | Before | After |
|---|---|---|
| **S** — Single Responsibility | ✅ | ✅ |
| **O** — Open/Closed | ⚠️ Partial | ✅ Full — base closed, domain open |
| **L** — Liskov Substitution | ✅ | ✅ |
| **I** — Interface Segregation | ✅ | ✅ Better — base has CRUD, domain has entity-specific only |
| **D** — Dependency Inversion | ❌ | ✅ Services depend on abstractions |

All five satisfied.
