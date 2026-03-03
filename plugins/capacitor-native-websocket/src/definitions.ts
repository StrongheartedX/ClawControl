export interface TLSOptions {
  /** Reject connections when system trust fails. Default: true. */
  required?: boolean
  /** SHA-256 fingerprint to pin against (hex, no prefix). */
  expectedFingerprint?: string
  /** Trust-On-First-Use: store fingerprint on first connect. Default: false. */
  allowTOFU?: boolean
  /** Key for persisting/loading fingerprints (typically the host). */
  storeKey?: string
}

export interface ConnectOptions {
  /** WebSocket URL (wss:// or ws://). */
  url: string
  /** TLS certificate handling options. */
  tls?: TLSOptions
  /** Origin header to send with the WebSocket upgrade request. */
  origin?: string
  /** Unique connection ID. Included in all emitted events so listeners can filter by connection. */
  connectionId?: string
}

export interface SendOptions {
  /** Text data to send. */
  data: string
  /** Connection to send on. If omitted, sends on the most recent connection. */
  connectionId?: string
}

export interface DisconnectOptions {
  /** Connection to disconnect. If omitted, disconnects the most recent connection. */
  connectionId?: string
}

export interface StoredFingerprintOptions {
  /** The store key to look up. */
  storeKey: string
}

export interface StoredFingerprintResult {
  /** The stored fingerprint, or null if none. */
  fingerprint: string | null
}

export interface NativeWebSocketPlugin {
  /** Open a WebSocket connection with optional TLS options. */
  connect(options: ConnectOptions): Promise<void>

  /** Send a text message over the open WebSocket. */
  send(options: SendOptions): Promise<void>

  /** Close a WebSocket connection. If no connectionId, closes the most recent. */
  disconnect(options?: DisconnectOptions): Promise<void>

  /** Retrieve a previously stored TLS fingerprint. */
  getStoredFingerprint(options: StoredFingerprintOptions): Promise<StoredFingerprintResult>

  /** Clear a stored TLS fingerprint. */
  clearStoredFingerprint(options: StoredFingerprintOptions): Promise<void>

  /** Add a listener for plugin events. */
  addListener(
    eventName: 'open' | 'message' | 'close' | 'error' | 'tlsFingerprint',
    listenerFunc: (data: any) => void
  ): Promise<{ remove: () => Promise<void> }>

  /** Remove all listeners for this plugin. */
  removeAllListeners(): Promise<void>
}
