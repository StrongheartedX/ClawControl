// WebSocket-compatible wrapper around the NativeWebSocket Capacitor plugin.
// Provides the same interface as the browser WebSocket so it can be used as
// a drop-in replacement via the WebSocketFactory injection in OpenClawClient.

import { NativeWebSocket } from 'capacitor-native-websocket'
import type { TLSOptions } from 'capacitor-native-websocket'

export type { TLSOptions }

type ListenerHandle = { remove: () => Promise<void> }

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

  constructor(url: string, tlsOptions?: TLSOptions) {
    this.readyState = NativeWebSocketWrapper.CONNECTING
    this.init(url, tlsOptions)
  }

  private async init(url: string, tlsOptions?: TLSOptions): Promise<void> {
    try {
      console.log('[NativeWS] init', url)

      const openHandle = await NativeWebSocket.addListener('open', () => {
        console.log('[NativeWS] open')
        this.readyState = NativeWebSocketWrapper.OPEN
        this.onopen?.({ type: 'open' })
      })
      this.listeners.push(openHandle)

      const msgHandle = await NativeWebSocket.addListener('message', (event: any) => {
        if (this.readyState !== NativeWebSocketWrapper.OPEN) return
        this.onmessage?.({ type: 'message', data: event.data })
      })
      this.listeners.push(msgHandle)

      const closeHandle = await NativeWebSocket.addListener('close', (event: any) => {
        console.log('[NativeWS] close', event.code, event.reason)
        this.readyState = NativeWebSocketWrapper.CLOSED
        this.onclose?.({ type: 'close', code: event.code, reason: event.reason })
        this.cleanup()
      })
      this.listeners.push(closeHandle)

      const errorHandle = await NativeWebSocket.addListener('error', (event: any) => {
        console.error('[NativeWS] error', event.message)
        this.onerror?.({ type: 'error', message: event.message })
      })
      this.listeners.push(errorHandle)

      await NativeWebSocket.connect({ url, tls: tlsOptions })
      console.log('[NativeWS] connect call resolved (native)')
    } catch (err) {
      console.error('[NativeWS] init failed', err)
      this.readyState = NativeWebSocketWrapper.CLOSED
      this.onerror?.({ type: 'error', message: String(err) })
    }
  }

  send(data: string): void {
    if (this.readyState !== NativeWebSocketWrapper.OPEN) {
      throw new Error('WebSocket is not open')
    }
    NativeWebSocket.send({ data }).catch((err: unknown) => {
      this.onerror?.({ type: 'error', message: String(err) })
    })
  }

  close(): void {
    if (this.readyState === NativeWebSocketWrapper.CLOSED ||
        this.readyState === NativeWebSocketWrapper.CLOSING) {
      return
    }
    this.readyState = NativeWebSocketWrapper.CLOSING
    NativeWebSocket.disconnect().catch(() => {}).finally(() => {
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
