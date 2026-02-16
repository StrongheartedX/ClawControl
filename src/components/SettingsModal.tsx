import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { getPlatform } from '../lib/platform'

export function SettingsModal() {
  const {
    serverUrl,
    setServerUrl,
    authMode,
    setAuthMode,
    gatewayToken,
    setGatewayToken,
    showSettings,
    setShowSettings,
    connect,
    disconnect,
    connected,
    connecting,
    notificationsEnabled,
    setNotificationsEnabled,
    openServerSettings,
    theme,
    toggleTheme,
    pairingStatus,
    pairingDeviceId,
    retryConnect
  } = useStore()

  const [url, setUrl] = useState(serverUrl)
  const [mode, setMode] = useState(authMode)
  const [token, setToken] = useState(gatewayToken)
  const [error, setError] = useState('')
  const [connectionExpanded, setConnectionExpanded] = useState(!connected)

  useEffect(() => {
    setUrl(serverUrl)
    setMode(authMode)
    setToken(gatewayToken)
    setConnectionExpanded(!connected)
  }, [serverUrl, authMode, gatewayToken, showSettings, connected])

  const validateUrl = (value: string) => {
    try {
      const parsed = new URL(value)
      if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
        return 'URL must start with ws:// or wss://'
      }
      return ''
    } catch {
      return 'Invalid URL format'
    }
  }

  const handleSave = async () => {
    setError('')
    const trimmedUrl = url.trim()
    const trimmedToken = token.trim()

    if (!trimmedUrl) {
      setError('Server URL is required')
      return
    }

    const urlError = validateUrl(trimmedUrl)
    if (urlError) {
      setError(urlError)
      return
    }

    // Save settings
    setServerUrl(trimmedUrl)
    setAuthMode(mode)
    setGatewayToken(trimmedToken)

    // Try to connect
    try {
      await connect()
      setShowSettings(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Connection failed: ${msg}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setShowSettings(false)
    }
  }

  if (!showSettings) return null

  return (
    <div className="modal-overlay" onClick={() => setShowSettings(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={() => setShowSettings(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0', marginBottom: connectionExpanded ? '8px' : '0' }}
            onClick={() => setConnectionExpanded(!connectionExpanded)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`} />
              <span style={{ fontWeight: 600, fontSize: '14px' }}>
                {connected ? 'Connected' : connecting ? 'Connecting...' : pairingStatus === 'pending' ? 'Pairing required' : 'Disconnected'}
              </span>
              {connected && !connectionExpanded && (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {serverUrl}
                </span>
              )}
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform 0.2s', transform: connectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {connectionExpanded && (
            <>
              <div className="form-group">
                <label htmlFor="serverUrl">Server URL</label>
                <input
                  type="text"
                  id="serverUrl"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="wss://your-server.local"
                  autoComplete="off"
                />
                <span className="form-hint">WebSocket URL (e.g., wss://your-server.local or ws://localhost:8080)</span>
              </div>

              <div className="form-group">
                <label>Authentication Mode</label>
                <div className="auth-mode-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${mode === 'token' ? 'active' : ''}`}
                    onClick={() => setMode('token')}
                  >
                    Token
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${mode === 'password' ? 'active' : ''}`}
                    onClick={() => setMode('password')}
                  >
                    Password
                  </button>
                </div>
                <span className="form-hint">Choose based on your server's gateway.auth.mode setting.</span>
              </div>

              <div className="form-group">
                <label htmlFor="gatewayToken">{mode === 'token' ? 'Gateway Token' : 'Gateway Password'}</label>
                <input
                  id="gatewayToken"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={mode === 'token' ? 'Enter your gateway token' : 'Enter your gateway password'}
                  autoComplete="off"
                />
                <span className="form-hint">Required if authentication is enabled on the server.</span>
              </div>

              {error && <div className="form-error">{error}</div>}
            </>
          )}

          {pairingStatus === 'pending' && (() => {
            const approveCmd = `openclaw devices approve ${pairingDeviceId || '<device-id>'}`
            const canShare = typeof navigator.share === 'function' && getPlatform() !== 'electron'

            const handleCopy = async () => {
              try {
                await navigator.clipboard.writeText(approveCmd)
              } catch {
                // Fallback for environments without clipboard API
              }
            }

            const handleShare = async () => {
              try {
                await navigator.share({ text: approveCmd })
              } catch {
                // User cancelled or share not available
              }
            }

            return (
              <div className="form-group" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border)' }}>
                <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Device Pairing Required</label>
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  This device needs to be approved on the server. Run this command on your OpenClaw server:
                </p>
                <div style={{ position: 'relative' }}>
                  <code style={{ display: 'block', padding: '8px', paddingRight: canShare ? '72px' : '40px', background: 'var(--bg-primary)', borderRadius: '4px', fontSize: '12px', wordBreak: 'break-all', marginBottom: '8px' }}>
                    {approveCmd}
                  </code>
                  <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '4px' }}>
                    <button
                      onClick={handleCopy}
                      title="Copy command"
                      style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    {canShare && (
                      <button
                        onClick={handleShare}
                        title="Share command"
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={retryConnect}
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting...' : 'Retry Connection'}
                  </button>
                </div>
              </div>
            )
          })()}

          <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Appearance</span>
              <label className="toggle-switch" style={{ marginLeft: '8px' }}>
                <input
                  type="checkbox"
                  checked={theme === 'dark'}
                  onChange={() => toggleTheme()}
                />
                <span className="toggle-slider"></span>
              </label>
            </label>
            <span className="form-hint">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
          </div>

          <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Notifications</span>
              <label className="toggle-switch" style={{ marginLeft: '8px' }}>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </label>
            <span className="form-hint">Get notified when an agent responds</span>
          </div>

          {connected && (
            <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
              <button
                className="btn btn-secondary server-settings-link"
                onClick={() => { setShowSettings(false); openServerSettings() }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '8px' }}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                OpenClaw Server Settings
              </button>
              <span className="form-hint">Configure agent defaults, tools, memory, and channels</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {connected && (
            <button className="btn btn-danger" onClick={() => { disconnect(); setShowSettings(false); }}>
              Disconnect
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
            {connected ? 'Close' : 'Cancel'}
          </button>
          {(!connected || connectionExpanded) && (
            <button className="btn btn-primary" onClick={handleSave} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Save & Connect'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
