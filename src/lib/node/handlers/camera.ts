// camera.snap handler — takes a photo using the device camera (mobile only)

import type { InvokeResult } from '../types'

interface CameraParams {
  facing?: 'front' | 'rear'
  maxWidth?: number
  quality?: number
}

export async function handleCameraSnap(params: CameraParams): Promise<InvokeResult> {
  try {
    const { Camera, CameraResultType, CameraDirection } = await import('@capacitor/camera')

    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      direction: params.facing === 'front' ? CameraDirection.Front : CameraDirection.Rear,
      width: params.maxWidth ?? 1280,
      quality: params.quality ?? 80,
      allowEditing: false,
      saveToGallery: false
    })

    return {
      ok: true,
      payload: {
        base64: photo.base64String,
        format: photo.format
      }
    }
  } catch (err) {
    const msg = (err as Error).message
    // User cancelled is not an error
    if (msg?.includes('cancelled') || msg?.includes('canceled')) {
      return {
        ok: false,
        error: { code: 'USER_CANCELLED', message: 'Photo capture was cancelled by the user' }
      }
    }
    return {
      ok: false,
      error: { code: 'CAMERA_FAILED', message: msg }
    }
  }
}
