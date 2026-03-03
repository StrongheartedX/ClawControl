// WebSocket-compatible wrapper around the NativeWebSocket Capacitor plugin.
// Provides the same interface as the browser WebSocket so it can be used as
// a drop-in replacement via the WebSocketFactory injection in OpenClawClient.

import { NativeWebSocket } from 'capacitor-native-websocket'
import type { TLSOptions } from 'capacitor-native-websocket'

export type { TLSOptions }

type ListenerHandle = { remove: () => Promise<void> }

export interface NativeWebSocketOptions extends TLSOptions {
  origin?: string
}

let nextConnectionId = 1

export class NativeWebSocketWrapper {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3

  readyState: number = NativeWebSocketWrapper.CONNECTING

  onopen: ((ev: any) => void) | null = null
  onclose: ((ev: any) => void) | null = null
  onerror: ((ev: any) => void) | null = null
  onmessage: ((ev: any) => void) | null = null

  private listeners: ListenerHandle[] = []

  /** Set when close() is called; prevents the async init() from continuing. */
  private disposed = false

  /** Unique ID for this connection; events from the native plugin include this
   *  so each wrapper only processes events belonging to its own connection. */
  private readonly connectionId: string

  constructor(url: string, options?: NativeWebSocketOptions) {
    this.connectionId = `ws_${nextConnectionId++}_${Date.now()}`
    this.readyState = NativeWebSocketWrapper.CONNECTING
    this.init(url, options)
  }

  /** Browser WebSocket used as fallback when native plugin isn't available. */
  private fallbackWs: WebSocket | null = null

  /** Returns true if the event belongs to this connection (or has no connectionId for backward compat). */
  private isOwnEvent(event: any): boolean {
    return !event.connectionId || event.connectionId === this.connectionId
  }

  private async init(url: string, options?: NativeWebSocketOptions): Promise<void> {
    try {
      const openHandle = await NativeWebSocket.addListener('open', (event: any) => {
        if (this.disposed || !this.isOwnEvent(event)) return
        this.readyState = NativeWebSocketWrapper.OPEN
        this.onopen?.({ type: 'open' })
      })
      if (this.disposed) { openHandle.remove().catch(() => {}); return }
      this.listeners.push(openHandle)

      const msgHandle = await NativeWebSocket.addListener('message', (event: any) => {
        if (this.disposed || !this.isOwnEvent(event)) return
        if (this.readyState !== NativeWebSocketWrapper.OPEN) return
        this.onmessage?.({ type: 'message', data: event.data })
      })
      if (this.disposed) { msgHandle.remove().catch(() => {}); this.cleanup(); return }
      this.listeners.push(msgHandle)

      const closeHandle = await NativeWebSocket.addListener('close', (event: any) => {
        if (this.disposed || !this.isOwnEvent(event)) return
        this.readyState = NativeWebSocketWrapper.CLOSED
        this.onclose?.({ type: 'close', code: event.code, reason: event.reason })
        this.cleanup()
      })
      if (this.disposed) { closeHandle.remove().catch(() => {}); this.cleanup(); return }
      this.listeners.push(closeHandle)

      const errorHandle = await NativeWebSocket.addListener('error', (event: any) => {
        if (this.disposed || !this.isOwnEvent(event)) return
        const msg = event.message || ''
        // Tag TLS errors from the native side so the client can detect them
        const isTLS = typeof msg === 'string' && msg.startsWith('TLS_CERTIFICATE_ERROR:')
        this.onerror?.({ type: 'error', message: msg, isTLSError: isTLS })
      })
      if (this.disposed) { errorHandle.remove().catch(() => {}); this.cleanup(); return }
      this.listeners.push(errorHandle)

      const { origin, ...tlsOptions } = options || {} as NativeWebSocketOptions
      await NativeWebSocket.connect({ url, tls: tlsOptions, origin, connectionId: this.connectionId })

      // If disposed while connect was in-flight, disconnect immediately
      if (this.disposed) {
        NativeWebSocket.disconnect({ connectionId: this.connectionId }).catch(() => {})
      }
    } catch (err) {
      const msg = String(err)
      // If the native plugin isn't registered, fall back to browser WebSocket
      if (msg.includes('not implemented')) {
        this.cleanup()
        if (!this.disposed) {
          this.initBrowserFallback(url)
        }
        return
      }
      // Clean up any listeners that were already added before the error
      this.cleanup()
      this.readyState = NativeWebSocketWrapper.CLOSED
      if (!this.disposed) {
        this.onerror?.({ type: 'error', message: msg })
      }
    }
  }

  private initBrowserFallback(url: string): void {
    const ws = new WebSocket(url)
    this.fallbackWs = ws

    ws.onopen = (ev) => {
      this.readyState = NativeWebSocketWrapper.OPEN
      this.onopen?.(ev)
    }
    ws.onmessage = (ev) => {
      this.onmessage?.(ev)
    }
    ws.onclose = (ev) => {
      this.readyState = NativeWebSocketWrapper.CLOSED
      this.onclose?.(ev)
    }
    ws.onerror = (ev) => {
      this.onerror?.(ev)
    }
  }

  send(data: string): void {
    if (this.readyState !== NativeWebSocketWrapper.OPEN) {
      throw new Error('WebSocket is not open')
    }
    if (this.fallbackWs) {
      this.fallbackWs.send(data)
      return
    }
    NativeWebSocket.send({ data, connectionId: this.connectionId }).catch((err: unknown) => {
      this.onerror?.({ type: 'error', message: String(err) })
    })
  }

  close(): void {
    this.disposed = true
    if (this.readyState === NativeWebSocketWrapper.CLOSED ||
        this.readyState === NativeWebSocketWrapper.CLOSING) {
      return
    }
    this.readyState = NativeWebSocketWrapper.CLOSING
    if (this.fallbackWs) {
      this.fallbackWs.close()
      return
    }
    NativeWebSocket.disconnect({ connectionId: this.connectionId }).catch(() => {}).finally(() => {
      this.readyState = NativeWebSocketWrapper.CLOSED
      this.cleanup()
    })
  }

  private cleanup(): void {
    for (const handle of this.listeners) {
      handle.remove().catch(() => {})
    }
    this.listeners = []
  }
}
