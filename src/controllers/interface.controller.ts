import { Request, Response, NextFunction } from "express";

// ────────────────────────────────────────────────────────────────────────────────
//  CRUD CONTROLLER INTERFACES
// ────────────────────────────────────────────────────────────────────────────────
//  These interfaces define the standard RESTful controller method signatures.
//  Each corresponds to a specific HTTP verb and route pattern:
//
//    GET    /resource          → index()   – List all resources
//    POST   /resource          → store()   – Create a new resource
//    GET    /resource/:id      → show()    – Retrieve one resource (read-only)
//    GET    /resource/:id/edit → edit()    – Return resource data for an edit form
//    PUT    /resource/:id      → update()  – Replace/update a resource
//    PATCH  /resource/:id      → update()  – Partially update a resource
//    DELETE /resource/:id      → destroy() – Remove a resource
//
//  RULE: Every method must return the Response object (use `return this.send...()`)
//  so TypeScript is satisfied that all code paths return a value.
// ────────────────────────────────────────────────────────────────────────────────

/**
 * GET /resource
 * ─────────────────
 * Returns a list (array) of resources, typically with pagination, filtering,
 * or sorting through query parameters.
 *
 * @example `GET /api/configs` → returns `{ data: [ ... ] }`
 */
export interface Indexable {
  index(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> | void | Response;
}

/**
 * POST /resource
 * ─────────────────
 * Creates a **new** resource from the request body. Should return a 201 status
 * along with the created resource.
 *
 * @example `POST /api/configs` with body `{ key: "theme", value: "dark" }`
 */
export interface Storable {
  store(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> | void | Response;
}

/**
 * GET /resource/:id
 * ─────────────────
 * Retrieves a **single** resource by its identifier. Use this for read-only
 * consumption by an API client (e.g. a mobile app fetching details).
 *
 * ─── SHOW vs EDIT ───
 * Both fetch one resource by ID, but they serve different purposes:
 *
 *   show() – Return data for a client that only reads/views the resource.
 *            No form context needed.
 *
 *   edit() – Return data for a UI that wants to populate an edit form.
 *            May include extra metadata (allowed values, defaults, etc.).
 *
 * They share the same route param pattern (`:id`) but map to different routes:
 *   show() → GET     /resource/:id
 *   edit() → GET     /resource/:id/edit
 *
 * @example `GET /api/configs/abc123` → returns the config object
 */
export interface Showable {
  show(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> | void | Response;
}

/**
 * GET /resource/:id/edit
 * ────────────────────────
 * Returns the current state of a resource **for the purpose of editing it in a
 * UI form**. This follows the REST convention of separating "view" (show) from
 * "edit-form population" (edit).
 *
 * In many cases the implementation is identical to show(), but the semantic
 * difference allows you to:
 *   - Apply different auth/permission middleware.
 *   - Return additional fields (e.g. allowed values enum, validation rules).
 *   - Return a subset of fields suitable for the form.
 *
 * ─── EDIT vs UPDATE – THE KEY DISTINCTION ───
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                 │ Editable (edit)    │ Updatable (update)                  ║
 * ║──────────────┼────────────────────┼────────────────────────────────────║
 * ║ HTTP Verb    │ GET                │ PUT or PATCH                       ║
 * ║──────────────┼────────────────────┼────────────────────────────────────║
 * ║ Purpose      │ Read data for     │ Persist the changes made in        ║
 * ║              │ an edit form      │ the edit form                      ║
 * ║──────────────┼────────────────────┼────────────────────────────────────║
 * ║ Side-effect  │ None (read-only)  │ Modifies the resource in the DB    ║
 * ║──────────────┼────────────────────┼────────────────────────────────────║
 * ║ Route        │ /resource/:id/edit │ /resource/:id                      ║
 * ╚══════════════╧════════════════════╧════════════════════════════════════╝
 *
 * In short: edit() = "give me the data so I can edit it"
 *           update() = "here are my changes, save them"
 *
 * @example `GET /api/configs/abc123/edit` → returns config with form metadata
 */
export interface Editable {
  edit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> | void | Response;
}

/**
 * PUT|PATCH /resource/:id
 * ────────────────────────
 * Persists changes to an existing resource. The request body contains the
 * fields to update. Returns the updated resource.
 *
 * ─── UPDATE vs EDIT – RECAP ───
 * These are easily confused but represent two distinct steps in the
 * edit-workflow:
 *
 *   Step 1 – edit():  Fetch existing data so the UI can display a form.
 *   Step 2 – update(): Submit the form's changes and save them to the DB.
 *
 * In Rails/Express convention:
 *   edit()   responds to GET  /resource/:id/edit
 *   update() responds to PUT  /resource/:id
 *                     PATCH /resource/:id
 *
 * @example `PUT /api/configs/abc123` with body `{ value: "light" }`
 */
export interface Updatable {
  update(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> | void | Response;
}

/**
 * DELETE /resource/:id
 * ─────────────────────
 * Removes a resource (hard or soft delete). Should return the deleted resource
 * or a success confirmation.
 *
 * @example `DELETE /api/configs/abc123` → deletes the config
 */
export interface Destroyable {
  destroy(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> | void | Response;
}

/**
 * A composite interface that combines all 6 standard CRUD operations.
 * Use this when a controller implements every operation for full resource
 * management.
 *
 * Full set: Indexable, Storable, Showable, Editable, Updatable, Destroyable
 * corresponding to: index, store, show, edit, update, destroy.
 */
export interface InterfaceController
  extends Indexable, Storable, Showable, Editable, Updatable, Destroyable {}
