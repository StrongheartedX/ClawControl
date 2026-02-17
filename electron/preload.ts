import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  connect: (url: string) => ipcRenderer.invoke('openclaw:connect', url),
  getConfig: () => ipcRenderer.invoke('openclaw:getConfig'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  trustHost: (hostname: string) => ipcRenderer.invoke('cert:trustHost', hostname),
  saveToken: (token: string) => ipcRenderer.invoke('auth:saveToken', token),
  getToken: () => ipcRenderer.invoke('auth:getToken'),
  isEncryptionAvailable: () => ipcRenderer.invoke('auth:isEncryptionAvailable'),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notification:show', title, body),
  openSubagentPopout: (params: { sessionKey: string; serverUrl: string; authToken: string; authMode: string; label: string }) =>
    ipcRenderer.invoke('subagent:openPopout', params),
  openToolCallPopout: (params: { toolCallId: string; name: string }) =>
    ipcRenderer.invoke('toolcall:openPopout', params),
  fetchUrl: (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) => ipcRenderer.invoke('net:fetchUrl', url, options),
  clawhubInstall: (slug: string, targetDir: string) => ipcRenderer.invoke('clawhub:install', slug, targetDir),
  generateEd25519KeyPair: () => ipcRenderer.invoke('crypto:generateEd25519'),
  signEd25519: (privateKeyJwk: JsonWebKey, payload: string) => ipcRenderer.invoke('crypto:signEd25519', privateKeyJwk, payload),
  platform: process.platform
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      connect: (url: string) => Promise<{ success: boolean; url: string }>
      getConfig: () => Promise<{ defaultUrl: string; theme: string }>
      openExternal: (url: string) => Promise<void>
      trustHost: (hostname: string) => Promise<{ trusted: boolean; hostname: string }>
      saveToken: (token: string) => Promise<{ saved: boolean }>
      getToken: () => Promise<string>
      isEncryptionAvailable: () => Promise<boolean>
      showNotification: (title: string, body: string) => Promise<void>
      openSubagentPopout: (params: { sessionKey: string; serverUrl: string; authToken: string; authMode: string; label: string }) => Promise<void>
      openToolCallPopout: (params: { toolCallId: string; name: string }) => Promise<void>
      fetchUrl: (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<string>
      clawhubInstall: (slug: string, targetDir: string) => Promise<{ ok: boolean; files: string[] }>
      generateEd25519KeyPair: () => Promise<{ id: string; publicKeyBase64url: string; privateKeyJwk: JsonWebKey }>
      signEd25519: (privateKeyJwk: JsonWebKey, payload: string) => Promise<string>
      platform: NodeJS.Platform
    }
  }
}
