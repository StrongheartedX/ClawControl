// Device Identity - Ed25519 keypair management and challenge signing
// Used for OpenClaw gateway device pairing on non-loopback connections.

import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const IDENTITY_KEY = 'clawcontrol-device-identity'
const DEVICE_TOKEN_PREFIX = 'clawcontrol-device-token:'

export interface DeviceIdentity {
  id: string              // SHA-256(publicKeyRaw).hex()
  publicKeyBase64url: string  // Raw 32-byte public key, base64url
  privateKeyJwk: JsonWebKey   // Ed25519 private key in JWK format
}

export interface DeviceConnectField {
  id: string
  publicKey: string       // Raw 32-byte public key, base64url
  signature: string       // Ed25519 signature, base64url
  signedAt: number        // ms since epoch
  nonce: string
}

// --- Helpers ---

function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform()
}

function toBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

// --- Storage ---

async function storageGet(key: string): Promise<string | null> {
  if (isNativeMobile()) {
    const result = await Preferences.get({ key })
    return result.value
  }
  return localStorage.getItem(key)
}

async function storageSet(key: string, value: string): Promise<void> {
  if (isNativeMobile()) {
    await Preferences.set({ key, value })
    return
  }
  localStorage.setItem(key, value)
}

async function storageRemove(key: string): Promise<void> {
  if (isNativeMobile()) {
    await Preferences.remove({ key })
    return
  }
  localStorage.removeItem(key)
}

// --- Core ---

/** Check if Electron main-process Ed25519 IPC is available. */
function hasElectronCrypto(): boolean {
  return typeof window !== 'undefined' &&
    !!(window as any).electronAPI?.generateEd25519KeyPair
}

/** Check if Web Crypto Ed25519 is available. */
async function isEd25519Available(): Promise<boolean> {
  if (hasElectronCrypto()) return true
  try {
    const testKey = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])
    // Ensure we can export raw public key
    await crypto.subtle.exportKey('raw', (testKey as CryptoKeyPair).publicKey)
    return true
  } catch {
    return false
  }
}

/**
 * Load existing device identity from storage, or generate a new Ed25519 keypair.
 * Returns null if Web Crypto Ed25519 is not available (graceful degradation).
 */
/**
 * Clear the stored device identity, forcing a new keypair to be generated
 * on next connect. Used when the server rejects a stale signature.
 */
export async function clearDeviceIdentity(): Promise<void> {
  await storageRemove(IDENTITY_KEY)
}

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity | null> {
  // Try loading from storage first
  try {
    const stored = await storageGet(IDENTITY_KEY)
    if (stored) {
      const identity = JSON.parse(stored) as DeviceIdentity
      // Validate the stored identity can still be used
      if (identity.id && identity.publicKeyBase64url && identity.privateKeyJwk) {
        return identity
      }
    }
  } catch {
    // Corrupted storage — regenerate
  }

  // Check availability before generating
  if (!await isEd25519Available()) {
    console.warn('[device-identity] Ed25519 not available in Web Crypto API')
    return null
  }

  try {
    let identity: DeviceIdentity

    if (hasElectronCrypto()) {
      // Use Electron main process (Node.js crypto) for Ed25519
      const result = await (window as any).electronAPI.generateEd25519KeyPair()
      identity = {
        id: result.id,
        publicKeyBase64url: result.publicKeyBase64url,
        privateKeyJwk: result.privateKeyJwk
      }
    } else {
      // Web Crypto path (browsers with Ed25519 support)
      const keyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair

      const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey)
      const publicKeyBase64url = toBase64url(publicKeyRaw)

      const idHash = await crypto.subtle.digest('SHA-256', publicKeyRaw)
      const id = toHex(idHash)

      const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

      identity = { id, publicKeyBase64url, privateKeyJwk }
    }

    // Persist
    await storageSet(IDENTITY_KEY, JSON.stringify(identity))

    return identity
  } catch (err) {
    console.warn('[device-identity] Failed to generate Ed25519 keypair:', err)
    return null
  }
}

/**
 * Sign a connect challenge using the device's Ed25519 key.
 * Returns the `device` field to include in the connect request.
 */
export async function signChallenge(
  identity: DeviceIdentity,
  nonce: string,
  token: string,
  scopes: string[]
): Promise<DeviceConnectField> {
  const signedAt = Date.now()
  const clientId = 'gateway-client'
  const clientMode = 'backend'
  const role = 'operator'
  const scopesStr = scopes.join(',')

  // v2 signing payload
  const payload = `v2|${identity.id}|${clientId}|${clientMode}|${role}|${scopesStr}|${signedAt}|${token}|${nonce}`

  let signature: string

  if (hasElectronCrypto()) {
    // Use Electron main process (Node.js crypto) for signing
    signature = await (window as any).electronAPI.signEd25519(identity.privateKeyJwk, payload)
  } else {
    // Web Crypto path
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      identity.privateKeyJwk,
      'Ed25519',
      false,
      ['sign']
    )
    const encoded = new TextEncoder().encode(payload)
    const signatureRaw = await crypto.subtle.sign('Ed25519', privateKey, encoded)
    signature = toBase64url(signatureRaw)
  }

  return {
    id: identity.id,
    publicKey: identity.publicKeyBase64url,
    signature,
    signedAt,
    nonce
  }
}

// --- Per-server device token storage ---

function deviceTokenKey(serverHost: string): string {
  return `${DEVICE_TOKEN_PREFIX}${serverHost}`
}

export async function getDeviceToken(serverHost: string): Promise<string | null> {
  return storageGet(deviceTokenKey(serverHost))
}

export async function saveDeviceToken(serverHost: string, token: string): Promise<void> {
  await storageSet(deviceTokenKey(serverHost), token)
}

export async function clearDeviceToken(serverHost: string): Promise<void> {
  await storageRemove(deviceTokenKey(serverHost))
}
