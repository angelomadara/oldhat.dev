# Project Skeleton — Backend

Express.js + TypeScript backend skeleton with MVC architecture, typed controller interfaces, and standardised patterns.

## Purpose

A stripped-down, copy-paste starter for new backend services. Contains the essential architectural patterns without any business logic:

- **MVC Pattern** — Models, Controllers, Services, Routes
- **Typed Controller Interfaces** — `InterfaceController` (composite) + 6 individual interfaces (`Indexable`, `Storable`, `Showable`, `Editable`, `Updatable`, `Destroyable`)
- **Base Controller** — `validate()`, `authorize()`, and standardised response methods
- **Service Layer** — Stateless business logic classes
- **Validation** — `express-validator` middleware
- **Error Handling** — Centralised error middleware + `AppError` utility
- **Logging** — Winston logger
- **Auth Middleware** — Skeleton JWT/role guard

## Architecture

```
Request → Route → Controller → Service → Model → Database
                                          ↓
Response ← Controller ← Service ← Model ←┘
```

### Controller Interface Contract

| Interface       | Method      | HTTP Verb   | Purpose                        |
|-----------------|-------------|-------------|--------------------------------|
| `Indexable`     | `index()`   | `GET`       | List all resources             |
| `Storable`      | `store()`   | `POST`      | Create a new resource          |
| `Showable`      | `show()`    | `GET`       | Retrieve a single resource     |
| `Editable`      | `edit()`    | `GET`       | Return resource for form       |
| `Updatable`     | `update()`  | `PUT/PATCH` | Update an existing resource    |
| `Destroyable`   | `destroy()` | `DELETE`    | Delete a resource              |

**Composite:** `InterfaceController` extends all six — one import for full CRUD.

### Usage Patterns

```typescript
// Full CRUD — one import
import { InterfaceController } from "./interface.controller";
class UserController extends BaseController implements InterfaceController { ... }

// Partial CRUD — pick what you need
import { Indexable, Showable } from "./interface.controller";
class ReadOnlyController extends BaseController implements Indexable, Showable { ... }

// Custom — no resource interface
class HealthController extends BaseController { ... }
```

## Project Structure

```
├── src/
│   ├── config/           # App configuration
│   ├── controllers/
│   │   ├── base.controller.ts     # Base class with response helpers
│   │   ├── interface.controller.ts # CRUD interface contracts
│   │   └── examples/              # Example controllers
│   ├── middleware/
│   │   ├── auth.ts                # Auth/role middleware
│   │   ├── errorHandler.ts        # Global error handler + 404
│   │   └── validators/            # express-validator rules
│   ├── models/           # Mongoose data models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── types/            # TypeScript definitions
│   ├── utils/            # Logger, AppError, helpers
│   ├── app.ts            # Express app setup
│   └── server.ts         # Entry point
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Run in development mode (hot-reload)
npm run dev

# Build and run in production mode
npm run build
npm start
```

## Adding a New Feature

### 1. Define Types

```typescript
// src/types/your.model.types.ts
export interface IYourModel { ... }
```

Export from `src/types/index.ts`.

### 2. Create a Model

```typescript
// src/models/your.model.ts
import { Schema, model } from "mongoose";
export default model<IYourModel>("YourModel", yourSchema);
```

### 3. Create a Service

```typescript
// src/services/your.service.ts
class YourService {
  async getAll() { ... }
}
export default new YourService();
```

### 4. Create a Controller

```typescript
// src/controllers/your.controller.ts
import BaseController from "./base.controller";
import { InterfaceController } from "./interface.controller";

class YourController extends BaseController implements InterfaceController { ... }
export default new YourController();
```

### 5. Register Routes

```typescript
// src/routes/index.ts
import yourController from "../controllers/your.controller";
router.use("/your-resource", yourController.index);
```

## License

MIT
