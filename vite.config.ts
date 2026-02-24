import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

// Capacitor modules are only used on mobile; externalize them for Electron builds
const capacitorExternals = [
  '@capacitor/core',
  '@capacitor/preferences',
  '@capacitor/browser',
  '@capacitor/app-launcher',
  '@capacitor/status-bar',
  '@capacitor/keyboard',
  '@capacitor/app',
  '@capacitor/local-notifications',
  '@capacitor/haptics',
  'capacitor-native-websocket',
]

export default defineConfig({
  build: {
    rollupOptions: {
      external: capacitorExternals,
    },
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}']
  }
})
