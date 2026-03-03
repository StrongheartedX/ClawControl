import { WebPlugin } from '@capacitor/core'

import type {
  NativeWebSocketPlugin,
  ConnectOptions,
  SendOptions,
  DisconnectOptions,
  StoredFingerprintOptions,
  StoredFingerprintResult,
} from './definitions'

/**
 * Web fallback: delegates to the browser's native WebSocket.
 * TLS options are ignored since the browser handles certificates.
 */
export class NativeWebSocketWeb extends WebPlugin implements NativeWebSocketPlugin {
  private connections = new Map<string, WebSocket>()
  private lastConnectionId: string | null = null

  async connect(options: ConnectOptions): Promise<void> {
    const cid = options.connectionId ?? '__default__'

    // Close existing connection with the same ID
    const existing = this.connections.get(cid)
    if (existing) {
      try { existing.close() } catch { /* ignore */ }
      this.connections.delete(cid)
    }

    const ws = new WebSocket(options.url)
    this.connections.set(cid, ws)
    this.lastConnectionId = cid

    ws.onopen = () => {
      this.notifyListeners('open', { connectionId: cid })
    }

    ws.onmessage = (event) => {
      this.notifyListeners('message', { data: event.data, connectionId: cid })
    }

    ws.onclose = (event) => {
      // Only remove if this ws is still the current one for this ID
      if (this.connections.get(cid) === ws) this.connections.delete(cid)
      this.notifyListeners('close', { code: event.code, reason: event.reason, connectionId: cid })
    }

    ws.onerror = () => {
      this.notifyListeners('error', { message: 'WebSocket error', connectionId: cid })
    }
  }

  async send(options: SendOptions): Promise<void> {
    const cid = options.connectionId ?? this.lastConnectionId
    const ws = cid ? this.connections.get(cid) : null
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }
    ws.send(options.data)
  }

  async disconnect(options?: DisconnectOptions): Promise<void> {
    const cid = options?.connectionId ?? this.lastConnectionId
    if (cid) {
      const ws = this.connections.get(cid)
      if (ws) {
        ws.close()
        this.connections.delete(cid)
      }
    }
  }

  async getStoredFingerprint(_options: StoredFingerprintOptions): Promise<StoredFingerprintResult> {
    return { fingerprint: null }
  }

  async clearStoredFingerprint(_options: StoredFingerprintOptions): Promise<void> {
    // No-op on web
  }
}
