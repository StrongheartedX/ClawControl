// device.info handler — returns detailed device information

import type { InvokeResult } from '../types'
import { getPlatform } from '../../platform'

export async function handleDeviceInfo(): Promise<InvokeResult> {
  try {
    const platform = getPlatform()

    if (platform === 'ios' || platform === 'android') {
      // Dynamic import to avoid bundling Capacitor plugins on Electron
      const { Device } = await import('@capacitor/device')
      const [info, battery] = await Promise.all([
        Device.getInfo(),
        Device.getBatteryInfo()
      ])
      return {
        ok: true,
        payload: {
          platform: info.platform,
          model: info.model,
          manufacturer: info.manufacturer,
          osVersion: info.osVersion,
          isVirtual: info.isVirtual,
          memUsed: info.memUsed,
          webViewVersion: info.webViewVersion,
          batteryLevel: battery.batteryLevel,
          isCharging: battery.isCharging
        }
      }
    }

    // Electron / web: use electronAPI if available, otherwise basic navigator info
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getDeviceStatus) {
      const status = await (window as any).electronAPI.getDeviceStatus()
      return {
        ok: true,
        payload: {
          ...status,
          platform,
          userAgent: navigator.userAgent
        }
      }
    }

    return {
      ok: true,
      payload: {
        platform,
        userAgent: navigator.userAgent,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: { code: 'DEVICE_INFO_FAILED', message: (err as Error).message }
    }
  }
}
