import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useStore } from '../store'
import type { Node } from '../lib/openclaw'
import type { ExecApprovalsResponse, ExecApprovalsFile, ExecApprovalsDefaults } from '../lib/openclaw'

function timeSince(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// SVG icon paths for each platform (rendered inline, theme-safe)
function PlatformSvgIcon({ platform, size = 18 }: { platform?: string; size?: number }) {
  const color = 'var(--text-primary)'
  const p = (platform || '').toLowerCase()

  if (p.includes('ios') || p.includes('iphone') || p.includes('ipad')) {
    // Phone icon
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    )
  }
  if (p.includes('android')) {
    // Phone with notch
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="10" y1="5" x2="14" y2="5" />
      </svg>
    )
  }
  if (p.includes('mac') || p.includes('darwin')) {
    // Monitor icon
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  }
  if (p.includes('win')) {
    // Window/grid icon
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  }
  if (p.includes('linux')) {
    // Terminal icon
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    )
  }
  // Generic device
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

// SVG icon as path string for embedding inside diagram <svg> via <g>
function DiagramPlatformIcon({ platform, x, y }: { platform?: string; x: number; y: number }) {
  const color = 'var(--text-primary)'
  const p = (platform || '').toLowerCase()
  // Scale 1.6x via transform, centered on (x, y-4)
  const s = 12

  if (p.includes('ios') || p.includes('iphone') || p.includes('ipad') || p.includes('android')) {
    return (
      <g transform={`translate(${x - s}, ${y - s - 6})`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="1" width="16" height="22" rx="3" />
        {p.includes('android')
          ? <line x1="9" y1="4" x2="15" y2="4" />
          : <line x1="12" y1="19" x2="12.01" y2="19" />
        }
      </g>
    )
  }
  if (p.includes('linux')) {
    return (
      <g transform={`translate(${x - s}, ${y - s - 6})`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 20 11 12 4 4" />
        <line x1="13" y1="21" x2="22" y2="21" />
      </g>
    )
  }
  // mac, win, generic = monitor
  return (
    <g transform={`translate(${x - s}, ${y - s - 6})`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="22" height="15" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </g>
  )
}

function nodeTypeLabel(node: Node): string {
  if (!node.platform) return 'Unknown'
  const p = node.platform.toLowerCase()
  if (p.includes('ios')) return 'iOS'
  if (p.includes('android')) return 'Android'
  if (p.includes('mac') || p.includes('darwin')) return 'macOS'
  if (p.includes('win')) return 'Windows'
  if (p.includes('linux')) return 'Linux'
  return node.platform
}

interface DiagramNode {
  id: string
  label: string
  type: string
  x: number
  y: number
  connected: boolean
  paired: boolean
  node: Node
}

// Deep-compare two ExecApprovalsFile objects for dirty tracking
function execApprovalsEqual(a: ExecApprovalsFile | null, b: ExecApprovalsFile | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function NodesView() {
  const { closeDetailView, fetchNodes, nodes, connected: serverConnected, execApprovals, fetchExecApprovals, devicePairings, fetchDevicePairings, agents, client } = useStore()
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)
  const [execTarget, setExecTarget] = useState<'gateway' | 'node'>('gateway')
  const [execTargetNodeId, setExecTargetNodeId] = useState<string | null>(null)
  const [nodeExecApprovals, setNodeExecApprovals] = useState<ExecApprovalsResponse | null>(null)

  // --- Exec Approvals editing state ---
  const [editedExecFile, setEditedExecFile] = useState<ExecApprovalsFile | null>(null)
  const [execApprovalsHash, setExecApprovalsHash] = useState<string>('')
  const [execSaving, setExecSaving] = useState(false)
  const [execSaveResult, setExecSaveResult] = useState<'success' | 'error' | null>(null)
  const execSaveTimeout = useRef<ReturnType<typeof setTimeout>>()

  // --- Exec Node Binding editing state ---
  const [bindingConfig, setBindingConfig] = useState<any>(null)
  const [editedBindingConfig, setEditedBindingConfig] = useState<any>(null)
  const [bindingHash, setBindingHash] = useState<string>('')
  const [bindingSaving, setBindingSaving] = useState(false)
  const [bindingSaveResult, setBindingSaveResult] = useState<'success' | 'error' | null>(null)
  const bindingSaveTimeout = useRef<ReturnType<typeof setTimeout>>()

  // --- Device action state ---
  const [deviceActionLoading, setDeviceActionLoading] = useState<string | null>(null)
  const [confirmRemoveDevice, setConfirmRemoveDevice] = useState<string | null>(null)

  const loadNodes = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchNodes(), fetchExecApprovals(), fetchDevicePairings()])
    setLoading(false)
  }, [fetchNodes, fetchExecApprovals, fetchDevicePairings])

  useEffect(() => {
    loadNodes()
  }, [loadNodes])

  // Sync edited exec approvals from fetched data
  useEffect(() => {
    const active = execTarget === 'gateway' ? execApprovals : nodeExecApprovals
    if (active?.file) {
      setEditedExecFile(JSON.parse(JSON.stringify(active.file)))
      setExecApprovalsHash(active.hash)
    } else {
      setEditedExecFile(null)
      setExecApprovalsHash('')
    }
  }, [execApprovals, nodeExecApprovals, execTarget])

  // Load server config for exec node binding
  useEffect(() => {
    if (!client) return
    client.getServerConfig().then((result) => {
      setBindingConfig(result.config)
      setEditedBindingConfig(JSON.parse(JSON.stringify(result.config)))
      setBindingHash(result.hash)
    }).catch(() => {})
  }, [client])

  // Fetch node-specific exec approvals when a connected node is selected as target
  const loadNodeExecApprovals = useCallback(async (nodeId: string) => {
    const { client } = useStore.getState()
    if (!client) return
    try {
      const result = await client.getNodeExecApprovals(nodeId)
      setNodeExecApprovals(result)
    } catch {
      setNodeExecApprovals(null)
    }
  }, [])

  // The active exec approvals based on target
  const activeExecApprovals = execTarget === 'gateway' ? execApprovals : nodeExecApprovals

  // Dirty tracking for exec approvals
  const execApprovalsDirty = useMemo(() => {
    if (!activeExecApprovals?.file || !editedExecFile) return false
    return !execApprovalsEqual(activeExecApprovals.file, editedExecFile)
  }, [activeExecApprovals, editedExecFile])

  // Dirty tracking for exec node binding
  const bindingDirty = useMemo(() => {
    if (!bindingConfig || !editedBindingConfig) return false
    const origNode = bindingConfig?.tools?.exec?.node
    const editedNode = editedBindingConfig?.tools?.exec?.node
    return JSON.stringify(origNode) !== JSON.stringify(editedNode)
  }, [bindingConfig, editedBindingConfig])

  // --- Exec Approvals save/discard ---
  const saveExecApprovals = useCallback(async () => {
    if (!client || !editedExecFile) return
    setExecSaving(true)
    setExecSaveResult(null)
    try {
      if (execTarget === 'gateway') {
        await client.setExecApprovals(editedExecFile, execApprovalsHash)
      } else if (execTargetNodeId) {
        await client.setNodeExecApprovals(execTargetNodeId, editedExecFile, execApprovalsHash)
      }
      // Reload to get fresh hash
      if (execTarget === 'gateway') {
        await fetchExecApprovals()
      } else if (execTargetNodeId) {
        await loadNodeExecApprovals(execTargetNodeId)
      }
      setExecSaveResult('success')
    } catch {
      setExecSaveResult('error')
    }
    setExecSaving(false)
    if (execSaveTimeout.current) clearTimeout(execSaveTimeout.current)
    execSaveTimeout.current = setTimeout(() => setExecSaveResult(null), 4000)
  }, [client, editedExecFile, execApprovalsHash, execTarget, execTargetNodeId, fetchExecApprovals, loadNodeExecApprovals])

  const discardExecApprovals = useCallback(() => {
    if (activeExecApprovals?.file) {
      setEditedExecFile(JSON.parse(JSON.stringify(activeExecApprovals.file)))
    }
  }, [activeExecApprovals])

  // Helper to update defaults in editedExecFile
  const updateExecDefault = useCallback((key: keyof ExecApprovalsDefaults, value: any) => {
    setEditedExecFile(prev => {
      if (!prev) return prev
      return {
        ...prev,
        defaults: { ...prev.defaults, [key]: value }
      }
    })
  }, [])

  const updateAllowlistPattern = useCallback((agentId: string, index: number, newPattern: string) => {
    setEditedExecFile(prev => {
      if (!prev?.agents?.[agentId]) return prev
      const agents = { ...prev.agents }
      const agent = { ...agents[agentId] }
      const allowlist = [...(agent.allowlist || [])]
      allowlist[index] = { ...allowlist[index], pattern: newPattern }
      agent.allowlist = allowlist
      agents[agentId] = agent
      return { ...prev, agents }
    })
  }, [])

  const removeAllowlistEntry = useCallback((agentId: string, index: number) => {
    setEditedExecFile(prev => {
      if (!prev?.agents?.[agentId]) return prev
      const agents = { ...prev.agents }
      const agent = { ...agents[agentId] }
      const allowlist = [...(agent.allowlist || [])]
      allowlist.splice(index, 1)
      agent.allowlist = allowlist
      agents[agentId] = agent
      return { ...prev, agents }
    })
  }, [])

  const addAllowlistEntry = useCallback(() => {
    setEditedExecFile(prev => {
      if (!prev) return prev
      // Add to first agent or create a default agent entry
      const agents = { ...prev.agents }
      const firstAgentId = Object.keys(agents)[0] || '_default'
      const agent = { ...(agents[firstAgentId] || {}) }
      const allowlist = [...(agent.allowlist || [])]
      allowlist.push({ pattern: '' })
      agent.allowlist = allowlist
      agents[firstAgentId] = agent
      return { ...prev, agents }
    })
  }, [])

  // --- Exec Node Binding save/discard ---
  const saveBinding = useCallback(async () => {
    if (!client || !editedBindingConfig) return
    setBindingSaving(true)
    setBindingSaveResult(null)
    try {
      const origNode = bindingConfig?.tools?.exec?.node
      const editedNode = editedBindingConfig?.tools?.exec?.node
      if (JSON.stringify(origNode) === JSON.stringify(editedNode)) return

      const patch: any = { tools: { exec: { node: editedNode } } }
      await client.patchServerConfig(patch, bindingHash)

      // config.patch triggers server restart — wait for reconnect
      await new Promise<void>((resolve) => {
        let resolved = false
        const onConnected = () => {
          if (resolved) return
          resolved = true
          client.off('connected', onConnected)
          resolve()
        }
        client.on('connected', onConnected)
        setTimeout(() => {
          if (!resolved) {
            resolved = true
            client.off('connected', onConnected)
            resolve()
          }
        }, 15000)
      })

      // Reload config
      const result = await client.getServerConfig()
      setBindingConfig(result.config)
      setEditedBindingConfig(JSON.parse(JSON.stringify(result.config)))
      setBindingHash(result.hash)
      setBindingSaveResult('success')
    } catch {
      setBindingSaveResult('error')
    }
    setBindingSaving(false)
    if (bindingSaveTimeout.current) clearTimeout(bindingSaveTimeout.current)
    bindingSaveTimeout.current = setTimeout(() => setBindingSaveResult(null), 4000)
  }, [client, editedBindingConfig, bindingConfig, bindingHash])

  const discardBinding = useCallback(() => {
    if (bindingConfig) {
      setEditedBindingConfig(JSON.parse(JSON.stringify(bindingConfig)))
    }
  }, [bindingConfig])

  // Helper: get/set binding value
  const getDefaultBinding = useCallback((): string => {
    return editedBindingConfig?.tools?.exec?.node ?? 'any'
  }, [editedBindingConfig])

  const setDefaultBinding = useCallback((value: string) => {
    setEditedBindingConfig((prev: any) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      if (!next.tools) next.tools = {}
      if (!next.tools.exec) next.tools.exec = {}
      next.tools.exec.node = value === 'any' ? undefined : value
      return next
    })
  }, [])

  // --- Device actions ---
  const handleApproveDevice = useCallback(async (requestId: string) => {
    if (!client) return
    setDeviceActionLoading(requestId)
    try {
      await client.approveDevicePairing(requestId)
      await fetchDevicePairings()
    } catch { /* ignore */ }
    setDeviceActionLoading(null)
  }, [client, fetchDevicePairings])

  const handleRejectDevice = useCallback(async (requestId: string) => {
    if (!client) return
    setDeviceActionLoading(requestId)
    try {
      await client.rejectDevicePairing(requestId)
      await fetchDevicePairings()
    } catch { /* ignore */ }
    setDeviceActionLoading(null)
  }, [client, fetchDevicePairings])

  const handleRemoveDevice = useCallback(async (deviceId: string) => {
    if (!client) return
    setDeviceActionLoading(deviceId)
    try {
      await client.removeDevice(deviceId)
      await fetchDevicePairings()
    } catch { /* ignore */ }
    setDeviceActionLoading(null)
    setConfirmRemoveDevice(null)
  }, [client, fetchDevicePairings])

  const handleRotateToken = useCallback(async (deviceId: string, role: string, scopes?: string[]) => {
    if (!client) return
    const key = `${deviceId}-rotate-${role}`
    setDeviceActionLoading(key)
    try {
      await client.rotateDeviceToken(deviceId, role, scopes)
      await fetchDevicePairings()
    } catch { /* ignore */ }
    setDeviceActionLoading(null)
  }, [client, fetchDevicePairings])

  const handleRevokeToken = useCallback(async (deviceId: string, role: string) => {
    if (!client) return
    const key = `${deviceId}-revoke-${role}`
    setDeviceActionLoading(key)
    try {
      await client.revokeDeviceToken(deviceId, role)
      await fetchDevicePairings()
    } catch { /* ignore */ }
    setDeviceActionLoading(null)
  }, [client, fetchDevicePairings])

  // Layout: gateway in center, nodes arranged in a circle around it
  const diagramNodes = useMemo((): DiagramNode[] => {
    if (!nodes.length) return []

    const cx = 400
    const cy = 300
    const radius = 220
    const count = nodes.length

    return nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      return {
        id: node.nodeId,
        label: node.displayName || node.nodeId.slice(0, 12),
        type: nodeTypeLabel(node),
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        connected: node.connected,
        paired: node.paired,
        node,
      }
    })
  }, [nodes])

  const gx = 400
  const gy = 300

  return (
    <div className="detail-view" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      <div className="detail-header">
        <button className="detail-back" onClick={closeDetailView} aria-label="Back to chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
        <div className="detail-title-section">
          <div className="detail-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <circle cx="12" cy="5" r="3" />
              <circle cx="5" cy="19" r="3" />
              <circle cx="19" cy="19" r="3" />
              <line x1="12" y1="8" x2="5" y2="16" />
              <line x1="12" y1="8" x2="19" y2="16" />
            </svg>
          </div>
          <div>
            <h1 className="detail-title">Nodes</h1>
            <p className="detail-subtitle">Connected devices and their relationship to the gateway.</p>
          </div>
        </div>
        <button
          onClick={loadNodes}
          style={{
            marginLeft: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '6px 14px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="detail-content" style={{ padding: 'var(--space-lg)', overflow: 'auto', flex: 1 }}>
        {!serverConnected ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <p>Not connected to server</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <p>Loading nodes...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity: 0.4, marginBottom: '16px' }}>
              <circle cx="12" cy="5" r="3" />
              <circle cx="5" cy="19" r="3" />
              <circle cx="19" cy="19" r="3" />
              <line x1="12" y1="8" x2="5" y2="16" />
              <line x1="12" y1="8" x2="19" y2="16" />
            </svg>
            <p>No nodes found</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Pair a device to see it here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
            {/* Network Diagram */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '24px',
              overflow: 'hidden',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Network Topology
              </h3>
              <svg
                viewBox="0 0 800 600"
                style={{ width: '100%', maxHeight: '500px' }}
              >
                <defs>
                  <filter id="glow-green">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-dim">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Connection lines from gateway to each node */}
                {diagramNodes.map((dn) => (
                  <line
                    key={`line-${dn.id}`}
                    x1={gx}
                    y1={gy}
                    x2={dn.x}
                    y2={dn.y}
                    stroke={dn.connected ? 'rgba(34,197,94,0.5)' : 'rgba(100,100,100,0.25)'}
                    strokeWidth={dn.connected ? 2 : 1}
                    strokeDasharray={dn.connected ? 'none' : '6 4'}
                  />
                ))}

                {/* Animated dot running along connected lines */}
                {diagramNodes.filter(dn => dn.connected).map((dn, i) => (
                  <circle key={`pulse-${dn.id}`} r="4" fill="#22c55e" opacity="0.9">
                    <animateMotion
                      dur={`${2.5 + i * 0.3}s`}
                      repeatCount="indefinite"
                      path={`M${gx},${gy} L${dn.x},${dn.y} L${gx},${gy}`}
                    />
                  </circle>
                ))}

                {/* Gateway node (center) */}
                <g>
                  <circle cx={gx} cy={gy} r="55" fill="var(--bg-elevated)" stroke="var(--accent-blue)" strokeWidth="2.5" filter="url(#glow-dim)" />
                  {/* Globe icon */}
                  <g transform={`translate(${gx - 14}, ${gy - 20})`} stroke="var(--text-primary)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="14" cy="14" r="12" />
                    <line x1="2" y1="14" x2="26" y2="14" />
                    <path d="M14 2a19 19 0 015 12 19 19 0 01-5 12 19 19 0 01-5-12 19 19 0 015-12z" />
                  </g>
                  <text x={gx} y={gy + 26} textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="600">
                    Gateway
                  </text>
                </g>

                {/* Device nodes */}
                {diagramNodes.map((dn) => (
                  <g
                    key={dn.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedNode(dn.node)}
                  >
                    <circle
                      cx={dn.x}
                      cy={dn.y}
                      r="50"
                      fill="var(--bg-elevated)"
                      stroke={dn.connected ? 'var(--accent-green)' : 'var(--border-color)'}
                      strokeWidth={dn.connected ? 2.5 : 1}
                      filter={dn.connected ? 'url(#glow-green)' : undefined}
                    />
                    {/* Status dot */}
                    <circle
                      cx={dn.x + 34}
                      cy={dn.y - 34}
                      r="7"
                      fill={dn.connected ? '#22c55e' : '#6b7280'}
                      stroke="var(--bg-elevated)"
                      strokeWidth="2.5"
                    />
                    <DiagramPlatformIcon platform={dn.node.platform} x={dn.x} y={dn.y} />
                    <text x={dn.x} y={dn.y + 20} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">
                      {dn.label.length > 14 ? dn.label.slice(0, 12) + '..' : dn.label}
                    </text>
                    <text x={dn.x} y={dn.y + 34} textAnchor="middle" fill="var(--text-secondary)" fontSize="10">
                      {dn.type}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  Connected
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6b7280', display: 'inline-block' }} />
                  Disconnected
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '24px', height: '0', borderTop: '1px dashed #6b7280', display: 'inline-block' }} />
                  Paired (offline)
                </span>
              </div>
            </div>

            {/* Node List */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '24px',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                All Nodes ({nodes.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {nodes.map((node) => (
                  <button
                    key={node.nodeId}
                    onClick={() => setSelectedNode(selectedNode?.nodeId === node.nodeId ? null : node)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: selectedNode?.nodeId === node.nodeId ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                      border: selectedNode?.nodeId === node.nodeId ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      color: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', flexShrink: 0 }}>
                      <PlatformSvgIcon platform={node.platform} size={24} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {node.displayName || node.nodeId.slice(0, 16)}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 500,
                          background: node.connected ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                          color: node.connected ? '#22c55e' : '#6b7280',
                        }}>
                          {node.connected ? 'Online' : 'Offline'}
                        </span>
                        {node.paired && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 500,
                            background: 'rgba(59,130,246,0.15)',
                            color: 'var(--accent-blue)',
                          }}>
                            Paired
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {nodeTypeLabel(node)}
                        {node.version && <> &middot; v{node.version}</>}
                        {node.remoteIp && <> &middot; {node.remoteIp}</>}
                        {node.connectedAtMs && <> &middot; Connected {timeSince(node.connectedAtMs)}</>}
                      </div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ opacity: 0.4, flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Node Detail Panel */}
            {selectedNode && (
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Node Details
                  </h3>
                  <button
                    onClick={() => setSelectedNode(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  <DetailField label="Node ID" value={selectedNode.nodeId} />
                  <DetailField label="Display Name" value={selectedNode.displayName || '-'} />
                  <DetailField label="Platform" value={nodeTypeLabel(selectedNode)} />
                  <DetailField label="Device Family" value={selectedNode.deviceFamily || '-'} />
                  <DetailField label="Model" value={selectedNode.modelIdentifier || '-'} />
                  <DetailField label="Version" value={selectedNode.version || '-'} />
                  <DetailField label="Core Version" value={selectedNode.coreVersion || '-'} />
                  <DetailField label="UI Version" value={selectedNode.uiVersion || '-'} />
                  <DetailField label="Remote IP" value={selectedNode.remoteIp || '-'} />
                  <DetailField label="Status" value={selectedNode.connected ? 'Connected' : 'Disconnected'} />
                  <DetailField label="Paired" value={selectedNode.paired ? 'Yes' : 'No'} />
                  {selectedNode.connectedAtMs && (
                    <DetailField label="Connected" value={timeSince(selectedNode.connectedAtMs)} />
                  )}
                </div>

                {selectedNode.caps.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Capabilities
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {selectedNode.caps.map((cap) => (
                        <span key={cap} style={{
                          fontSize: '11px',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          background: 'rgba(139,92,246,0.15)',
                          color: 'var(--accent-purple, #a78bfa)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNode.commands.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Commands
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {selectedNode.commands.map((cmd) => (
                        <span key={cmd} style={{
                          fontSize: '11px',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          background: 'rgba(59,130,246,0.15)',
                          color: 'var(--accent-blue)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {cmd}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNode.permissions && Object.keys(selectedNode.permissions).length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Permissions
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {Object.entries(selectedNode.permissions).map(([key, val]) => (
                        <span key={key} style={{
                          fontSize: '11px',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          background: val ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: val ? '#22c55e' : '#ef4444',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {key}: {val ? 'yes' : 'no'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== Exec Approvals ===== */}
            <SectionCard
              title="Exec Approvals"
              subtitle="Allowlist and approval policy for exec host=gateway/node."
            >
              {/* Target toggle */}
              <div style={{ marginBottom: '16px' }}>
                <SectionLabel>Target</SectionLabel>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                  Gateway edits local approvals; node edits the selected node.
                </p>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', borderRadius: '8px', padding: '3px', width: 'fit-content' }}>
                  <button
                    onClick={() => { setExecTarget('gateway'); setExecTargetNodeId(null) }}
                    style={{
                      padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                      background: execTarget === 'gateway' ? 'var(--bg-elevated)' : 'transparent',
                      color: execTarget === 'gateway' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      boxShadow: execTarget === 'gateway' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                    }}
                  >
                    Gateway
                  </button>
                  {nodes.filter(n => n.connected).map(n => (
                    <button
                      key={n.nodeId}
                      onClick={() => { setExecTarget('node'); setExecTargetNodeId(n.nodeId); loadNodeExecApprovals(n.nodeId) }}
                      style={{
                        padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                        background: execTarget === 'node' && execTargetNodeId === n.nodeId ? 'var(--bg-elevated)' : 'transparent',
                        color: execTarget === 'node' && execTargetNodeId === n.nodeId ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: execTarget === 'node' && execTargetNodeId === n.nodeId ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      {n.displayName || n.nodeId.slice(0, 12)}
                    </button>
                  ))}
                </div>
              </div>

              {editedExecFile ? (
                <>
                  {/* Policy fields - editable dropdowns */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    <EditablePolicyField
                      label="Security"
                      sublabel="Default: deny."
                      value={editedExecFile.defaults?.security || 'deny'}
                      options={[
                        { value: 'deny', label: 'deny' },
                        { value: 'allowlist', label: 'allowlist' },
                        { value: 'full', label: 'full' },
                      ]}
                      onChange={(v) => updateExecDefault('security', v)}
                    />
                    <EditablePolicyField
                      label="Mode"
                      sublabel="Ask"
                      value={editedExecFile.defaults?.ask || 'on-miss'}
                      options={[
                        { value: 'off', label: 'off' },
                        { value: 'on-miss', label: 'on-miss' },
                        { value: 'always', label: 'always' },
                      ]}
                      onChange={(v) => updateExecDefault('ask', v)}
                    />
                    <EditablePolicyField
                      label="Fallback"
                      sublabel="Ask fallback"
                      value={editedExecFile.defaults?.askFallback || 'deny'}
                      options={[
                        { value: 'deny', label: 'deny' },
                        { value: 'allowlist', label: 'allowlist' },
                        { value: 'full', label: 'full' },
                      ]}
                      onChange={(v) => updateExecDefault('askFallback', v)}
                    />
                    <div style={{
                      background: 'var(--bg-elevated)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        Auto-allow skill CLIs
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {editedExecFile.defaults?.autoAllowSkills ? 'Override (on).' : 'Off.'}
                      </div>
                      <button
                        className="toggle-switch"
                        role="switch"
                        aria-checked={!!editedExecFile.defaults?.autoAllowSkills}
                        onClick={() => updateExecDefault('autoAllowSkills', !editedExecFile.defaults?.autoAllowSkills)}
                        style={{
                          width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', position: 'relative',
                          background: editedExecFile.defaults?.autoAllowSkills ? '#22c55e' : 'var(--bg-primary)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <span style={{
                          display: 'block', width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                          position: 'absolute', top: '2px', transition: 'left 0.15s ease',
                          left: editedExecFile.defaults?.autoAllowSkills ? '18px' : '2px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }} />
                      </button>
                    </div>
                  </div>

                  {/* Allowlist - editable */}
                  <SectionLabel>Allowlist</SectionLabel>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                    Case-insensitive glob patterns.
                  </p>
                  {(() => {
                    const allEntries: { agentId: string; entry: { pattern: string; id?: string; lastUsedAt?: number }; index: number }[] = []
                    Object.entries(editedExecFile.agents || {}).forEach(([agentId, agent]) => {
                      (agent.allowlist || []).forEach((entry, index) => {
                        allEntries.push({ agentId, entry, index })
                      })
                    })
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {allEntries.length === 0 && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No patterns configured.</p>
                        )}
                        {allEntries.map(({ agentId, entry, index }) => (
                          <div key={`${agentId}-${index}`} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border-subtle)',
                          }}>
                            <input
                              type="text"
                              value={entry.pattern}
                              onChange={(e) => updateAllowlistPattern(agentId, index, e.target.value)}
                              placeholder="glob pattern..."
                              style={{
                                flex: 1, fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)',
                                background: 'transparent', border: 'none', outline: 'none', padding: '4px 0',
                              }}
                            />
                            {entry.lastUsedAt && (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                {timeSince(entry.lastUsedAt)}
                              </span>
                            )}
                            <button
                              onClick={() => removeAllowlistEntry(agentId, index)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'flex',
                              }}
                              title="Remove pattern"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={addAllowlistEntry}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                            background: 'transparent', border: '1px dashed var(--border-color)', borderRadius: '10px',
                            cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)',
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Add pattern
                        </button>
                      </div>
                    )
                  })()}

                  {/* Save/Discard bar */}
                  {execApprovalsDirty && (
                    <SaveBar
                      saving={execSaving}
                      saveResult={execSaveResult}
                      onSave={saveExecApprovals}
                      onDiscard={discardExecApprovals}
                    />
                  )}
                </>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {execTarget === 'node' ? 'Select a connected node to view its exec approvals.' : 'No exec approvals data available.'}
                </p>
              )}
            </SectionCard>

            {/* ===== Exec Node Binding ===== */}
            <SectionCard
              title="Exec Node Binding"
              subtitle="Pin agents to a specific node when using exec host=node."
            >
              <div style={{ marginBottom: '16px' }}>
                <SectionLabel>Default binding</SectionLabel>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                  Used when agents do not override a node binding.
                </p>
                <select
                  value={getDefaultBinding()}
                  onChange={(e) => setDefaultBinding(e.target.value)}
                  style={{
                    padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border-subtle)',
                    fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                    width: '100%', maxWidth: '300px',
                  }}
                >
                  <option value="any">any</option>
                  {nodes.map(n => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.displayName || n.nodeId.slice(0, 16)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {agents.map((agent) => (
                  <div key={agent.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {agent.name || agent.id}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                        ({agent.id})
                      </span>
                    </div>
                    <span style={{
                      fontSize: '11px', padding: '3px 10px', borderRadius: '8px',
                      background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      uses default ({getDefaultBinding()})
                    </span>
                  </div>
                ))}
              </div>

              {/* Save/Discard bar */}
              {bindingDirty && (
                <SaveBar
                  saving={bindingSaving}
                  saveResult={bindingSaveResult}
                  onSave={saveBinding}
                  onDiscard={discardBinding}
                />
              )}
            </SectionCard>

            {/* ===== Devices ===== */}
            <SectionCard
              title="Devices"
              subtitle="Pairing requests + role tokens."
            >
              {devicePairings ? (
                <>
                  {/* Pending requests */}
                  {devicePairings.pending.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <SectionLabel>Pending Requests</SectionLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        {devicePairings.pending.map((req) => (
                          <div key={req.requestId} style={{
                            padding: '12px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.25)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                {req.displayName || req.deviceId.slice(0, 16)}
                              </span>
                              <StatusBadge color="amber" text="Pending" />
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                              {req.deviceId}
                            </div>
                            {req.platform && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Platform: {req.platform}
                                {req.remoteIp && <> &middot; {req.remoteIp}</>}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                              <ActionButton
                                color="green"
                                loading={deviceActionLoading === req.requestId}
                                onClick={() => handleApproveDevice(req.requestId)}
                              >
                                Approve
                              </ActionButton>
                              <ActionButton
                                color="red"
                                loading={deviceActionLoading === req.requestId}
                                onClick={() => handleRejectDevice(req.requestId)}
                              >
                                Reject
                              </ActionButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Paired devices */}
                  <SectionLabel>Paired</SectionLabel>
                  {devicePairings.paired.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '8px' }}>No paired devices.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                      {devicePairings.paired.map((device) => (
                        <div key={device.deviceId} style={{
                          padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', width: '20px', height: '20px' }}>
                              <PlatformSvgIcon platform={device.platform} size={16} />
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', flex: 1 }}>
                              {device.displayName || device.deviceId.slice(0, 16)}
                            </span>
                            {/* Remove button */}
                            {confirmRemoveDevice === device.deviceId ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#ef4444' }}>Remove?</span>
                                <ActionButton
                                  color="red"
                                  loading={deviceActionLoading === device.deviceId}
                                  onClick={() => handleRemoveDevice(device.deviceId)}
                                  small
                                >
                                  Confirm
                                </ActionButton>
                                <ActionButton
                                  color="gray"
                                  loading={false}
                                  onClick={() => setConfirmRemoveDevice(null)}
                                  small
                                >
                                  Cancel
                                </ActionButton>
                              </div>
                            ) : (
                              <ActionButton
                                color="red"
                                loading={false}
                                onClick={() => setConfirmRemoveDevice(device.deviceId)}
                                small
                              >
                                Remove
                              </ActionButton>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', marginBottom: '6px' }}>
                            {device.deviceId}
                            {device.remoteIp && <> &middot; {device.remoteIp}</>}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                            {(device.roles || (device.role ? [device.role] : [])).map((role) => (
                              <StatusBadge key={role} color="blue" text={role} />
                            ))}
                            {(device.scopes || []).length > 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                scopes: {(device.scopes || []).join(', ') || 'none'}
                              </span>
                            )}
                            {(device.scopes || []).length === 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>scopes: none</span>
                            )}
                          </div>

                          {/* Tokens */}
                          {device.tokens && Object.keys(device.tokens).length > 0 && (
                            <div>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Tokens
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                {Object.entries(device.tokens).map(([role, token]) => (
                                  <div key={role} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                                    background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '11px',
                                  }}>
                                    <StatusBadge color="green" text={role} />
                                    <span style={{ color: '#22c55e', fontWeight: 500 }}>active</span>
                                    {(device.scopes || []).length > 0 && (
                                      <span style={{ color: 'var(--text-secondary)' }}>
                                        scopes: {(device.scopes || []).join(', ')}
                                      </span>
                                    )}
                                    {token.newestRotatedAt && (
                                      <span style={{ color: 'var(--text-secondary)' }}>
                                        {timeSince(token.newestRotatedAt)}
                                      </span>
                                    )}
                                    {!token.newestRotatedAt && token.newestCreatedAt && (
                                      <span style={{ color: 'var(--text-secondary)' }}>
                                        {timeSince(token.newestCreatedAt)}
                                      </span>
                                    )}
                                    <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                                      <ActionButton
                                        color="blue"
                                        loading={deviceActionLoading === `${device.deviceId}-rotate-${role}`}
                                        onClick={() => handleRotateToken(device.deviceId, role, device.scopes)}
                                        small
                                      >
                                        Rotate
                                      </ActionButton>
                                      <ActionButton
                                        color="red"
                                        loading={deviceActionLoading === `${device.deviceId}-revoke-${role}`}
                                        onClick={() => handleRevokeToken(device.deviceId, role)}
                                        small
                                      >
                                        Revoke
                                      </ActionButton>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No device pairing data available.</p>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: '10px',
      padding: '10px 14px',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '16px',
      border: '1px solid var(--border-subtle)',
      padding: '24px',
    }}>
      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-primary)', fontWeight: 600 }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {subtitle}
      </p>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
      {children}
    </span>
  )
}

function EditablePolicyField({ label, sublabel, value, options, onChange }: {
  label: string
  sublabel: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
        {sublabel}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)', background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)', borderRadius: '6px',
          padding: '4px 8px', cursor: 'pointer', width: '100%',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function SaveBar({ saving, saveResult, onSave, onDiscard }: {
  saving: boolean
  saveResult: 'success' | 'error' | null
  onSave: () => void
  onDiscard: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px',
      padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '10px',
      border: '1px solid var(--accent-blue)',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>
        {saving ? 'Saving...' : saveResult === 'success' ? 'Saved!' : saveResult === 'error' ? 'Save failed.' : 'Unsaved changes'}
      </span>
      <button
        onClick={onDiscard}
        disabled={saving}
        style={{
          padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-color)',
          background: 'transparent', color: 'var(--text-secondary)', cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: '12px', fontWeight: 600,
        }}
      >
        Discard
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          padding: '6px 14px', borderRadius: '6px', border: 'none',
          background: 'var(--accent-blue)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: '12px', fontWeight: 600, opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}

function ActionButton({ color, loading, onClick, children, small }: {
  color: 'green' | 'red' | 'blue' | 'gray'
  loading: boolean
  onClick: () => void
  children: React.ReactNode
  small?: boolean
}) {
  const colors = {
    green: { bg: 'rgba(34,197,94,0.15)', fg: '#22c55e', hover: 'rgba(34,197,94,0.25)' },
    red: { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444', hover: 'rgba(239,68,68,0.25)' },
    blue: { bg: 'rgba(59,130,246,0.15)', fg: 'var(--accent-blue)', hover: 'rgba(59,130,246,0.25)' },
    gray: { bg: 'var(--bg-secondary)', fg: 'var(--text-secondary)', hover: 'var(--bg-hover)' },
  }
  const c = colors[color]
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: small ? '3px 10px' : '6px 14px',
        borderRadius: small ? '6px' : '8px',
        border: 'none',
        background: c.bg,
        color: c.fg,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: small ? '10px' : '12px',
        fontWeight: 600,
        opacity: loading ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '...' : children}
    </button>
  )
}

function StatusBadge({ color, text }: { color: 'green' | 'blue' | 'amber' | 'red'; text: string }) {
  const colors = {
    green: { bg: 'rgba(34,197,94,0.15)', fg: '#22c55e' },
    blue: { bg: 'rgba(59,130,246,0.15)', fg: 'var(--accent-blue)' },
    amber: { bg: 'rgba(245,158,11,0.15)', fg: '#f59e0b' },
    red: { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444' },
  }
  const c = colors[color]
  return (
    <span style={{
      fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 500,
      background: c.bg, color: c.fg,
    }}>
      {text}
    </span>
  )
}
