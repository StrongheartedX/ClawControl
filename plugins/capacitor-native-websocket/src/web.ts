import { WebPlugin } from '@capacitor/core'

import type {
  NativeWebSocketPlugin,
  ConnectOptions,
  SendOptions,
  StoredFingerprintOptions,
  StoredFingerprintResult,
} from './definitions'

/**
 * Web fallback: delegates to the browser's native WebSocket.
 * TLS options are ignored since the browser handles certificates.
 */
export class NativeWebSocketWeb extends WebPlugin implements NativeWebSocketPlugin {
  private ws: WebSocket | null = null

  async connect(options: ConnectOptions): Promise<void> {
    if (this.ws) {
      try { this.ws.close() } catch { /* ignore */ }
    }

    const ws = new WebSocket(options.url)
    this.ws = ws

    ws.onopen = () => {
      this.notifyListeners('open', {})
    }

    ws.onmessage = (event) => {
      this.notifyListeners('message', { data: event.data })
    }

    ws.onclose = (event) => {
      this.notifyListeners('close', { code: event.code, reason: event.reason })
      this.ws = null
    }

    ws.onerror = () => {
      this.notifyListeners('error', { message: 'WebSocket error' })
    }
  }

  async send(options: SendOptions): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }
    this.ws.send(options.data)
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  async getStoredFingerprint(_options: StoredFingerprintOptions): Promise<StoredFingerprintResult> {
    return { fingerprint: null }
  }

  async clearStoredFingerprint(_options: StoredFingerprintOptions): Promise<void> {
    // No-op on web
  }
}
