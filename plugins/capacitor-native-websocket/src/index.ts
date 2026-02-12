import { registerPlugin } from '@capacitor/core'

import type { NativeWebSocketPlugin } from './definitions'

const NativeWebSocket = registerPlugin<NativeWebSocketPlugin>('NativeWebSocket', {
  web: () => import('./web').then((m) => new m.NativeWebSocketWeb()),
})

export * from './definitions'
export { NativeWebSocket }
