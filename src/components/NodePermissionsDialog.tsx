import { useState, useMemo, useEffect } from 'react'
import { useStore } from '../store'
import { getPlatform } from '../lib/platform'
import {
  getCommandsForPlatform,
  getCategoriesForPlatform,
  getDefaultPermissions
} from '../lib/node/command-catalog'

interface Props {
  open: boolean
  onClose: () => void
}

export function NodePermissionsDialog({ open, onClose }: Props) {
  const { nodePermissions, setNodePermissions, reconnectNode, nodeEnabled } = useStore()
  const [draft, setDraft] = useState<Record<string, boolean>>({ ...nodePermissions })

  // Resync draft when dialog opens or external permissions change
  useEffect(() => {
    if (open) setDraft({ ...nodePermissions })
  }, [open, nodePermissions])

  const platform = getPlatform()
  const commands = useMemo(() => getCommandsForPlatform(platform), [platform])
  const categories = useMemo(() => getCategoriesForPlatform(platform), [platform])

  const isDirty = useMemo(() => {
    return commands.some(cmd => !!draft[cmd.command] !== !!nodePermissions[cmd.command])
  }, [draft, nodePermissions, commands])

  if (!open) return null

  const toggle = (command: string) => {
    setDraft(prev => ({ ...prev, [command]: !prev[command] }))
  }

  const resetDefaults = () => {
    setDraft(getDefaultPermissions(platform))
  }

  const handleSave = () => {
    setNodePermissions(draft)
    onClose()
    // Reconnect node to advertise updated capabilities
    if (nodeEnabled) {
      reconnectNode()
    }
  }

  const handleCancel = () => {
    setDraft({ ...nodePermissions })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div
        className="modal"
        style={{ maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Node Permissions</h2>
          <button className="modal-close" onClick={handleCancel}>&times;</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: 0, marginBottom: '16px' }}>
            Choose which commands the AI agent can invoke on this device.
            Changes take effect after saving (node will reconnect).
          </p>

          {categories.map(category => (
            <div key={category} style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                {category}
              </div>
              {commands
                .filter(cmd => cmd.category === category)
                .map(cmd => (
                  <label
                    key={cmd.command}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '8px 0',
                      cursor: 'pointer'
                    }}
                  >
                    <label className="toggle-switch" style={{ marginTop: '2px', flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={!!draft[cmd.command]}
                        onChange={() => toggle(cmd.command)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>{cmd.label}</span>
                        {cmd.dangerous && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: 'var(--error)',
                            background: 'color-mix(in srgb, var(--error) 15%, transparent)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                          }}>
                            Sensitive
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {cmd.description}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'monospace' }}>
                        {cmd.command}
                      </div>
                    </div>
                  </label>
                ))}
            </div>
          ))}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={resetDefaults} style={{ fontSize: '12px' }}>
            Reset Defaults
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
