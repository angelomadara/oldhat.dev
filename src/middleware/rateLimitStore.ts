/**
 * Rate-limit store placeholder.
 *
 * Currently using express-rate-limit's built-in MemoryStore,
 * which is sufficient for oldhat.dev's traffic volume.
 *
 * If rate-limit state needs to survive restarts or scale across
 * multiple processes, swap to an external store here.
 */
export {};
