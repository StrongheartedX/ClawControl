// Invoke dispatcher — routes incoming node.invoke.request commands to handlers.

import type { InvokeRequest, InvokeResult } from './types'
import { handleDeviceStatus } from './handlers/device'
import { handleDeviceInfo } from './handlers/device-info'
import { handleSystemNotify } from './handlers/notify'
import { handleClipboardRead, handleClipboardWrite } from './handlers/clipboard'
import { handleLocationGet } from './handlers/location'
import { handleCameraSnap } from './handlers/camera'

export async function dispatch(request: InvokeRequest): Promise<InvokeResult> {
  let params: Record<string, unknown> = {}
  if (request.paramsJSON) {
    try {
      params = JSON.parse(request.paramsJSON)
    } catch {
      return { ok: false, error: { code: 'INVALID_PARAMS', message: 'Failed to parse paramsJSON' } }
    }
  }

  try {
    switch (request.command) {
      case 'device.status':
        return await handleDeviceStatus()
      case 'device.info':
        return await handleDeviceInfo()
      case 'system.notify':
        return await handleSystemNotify(params as { title?: string; body?: string })
      case 'clipboard.read':
        return await handleClipboardRead()
      case 'clipboard.write':
        return await handleClipboardWrite(params as { text?: string })
      case 'location.get':
        return await handleLocationGet(params as { maxAgeMs?: number; desiredAccuracy?: 'high' | 'low'; timeoutMs?: number })
      case 'camera.snap':
        return await handleCameraSnap(params as { facing?: 'front' | 'rear'; maxWidth?: number; quality?: number })
      case 'canvas.display':
        // Canvas display is handled by the iframe panel in the renderer.
        // We acknowledge the invoke so the server knows this node supports it.
        return { ok: true, payload: { supported: true } }
      case 'photos.latest':
        return { ok: false, error: { code: 'NOT_AVAILABLE', message: 'photos.latest is not yet implemented — requires a community plugin' } }
      case 'notifications.list':
        return { ok: false, error: { code: 'NOT_AVAILABLE', message: 'notifications.list is not yet implemented — requires a community plugin' } }
      default:
        return { ok: false, error: { code: 'UNKNOWN_COMMAND', message: `Unknown command: ${request.command}` } }
    }
  } catch (err) {
    return { ok: false, error: { code: 'HANDLER_ERROR', message: (err as Error).message } }
  }
}
