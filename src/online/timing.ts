// Heartbeat ping the client sends to the realtime API. AWS API Gateway closes
// idle WebSocket connections after ~10 minutes; 4 minutes keeps us well below.
export const WEBSOCKET_PING_INTERVAL_MS = 4 * 60 * 1000

// Backoff schedule for reconnect attempts on the realtime WebSocket. After the
// last entry we stop retrying automatically and surface a disconnected status.
export const RECONNECT_DELAYS_MS: readonly number[] = [1_000, 2_000, 5_000]
