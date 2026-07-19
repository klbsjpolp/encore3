// Heartbeat ping the client sends to the realtime API. AWS API Gateway closes
// idle WebSocket connections after ~10 minutes; 4 minutes keeps us well below.
export const WEBSOCKET_PING_INTERVAL_MS = 4 * 60 * 1000

// Backoff schedule for reconnect attempts on the realtime WebSocket. Attempts
// continue indefinitely, clamped to the last delay (retry forever with capped
// backoff); the loop only stops when the session ends (intentional leave, a
// room closed/finished, or the hook unmounting).
export const RECONNECT_DELAYS_MS: readonly number[] = [1_000, 2_000, 5_000]
