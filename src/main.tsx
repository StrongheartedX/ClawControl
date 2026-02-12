import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SubagentViewer } from './components/SubagentViewer'
import { ToolCallViewer } from './components/ToolCallViewer'
import './styles/index.css'

function parseSubagentHash(): {
  sessionKey: string
  serverUrl: string
  authToken: string
  authMode: 'token' | 'password'
} | null {
  const hash = window.location.hash
  if (!hash.startsWith('#subagent?')) return null

  const params = new URLSearchParams(hash.slice('#subagent?'.length))
  const sessionKey = params.get('sessionKey')
  const serverUrl = params.get('serverUrl')
  const authToken = params.get('authToken')
  const authMode = params.get('authMode')

  if (!sessionKey || !serverUrl || !authToken) return null

  return {
    sessionKey,
    serverUrl,
    authToken,
    authMode: authMode === 'password' ? 'password' : 'token'
  }
}

function parseToolCallHash(): { toolCallId: string } | null {
  const hash = window.location.hash
  if (!hash.startsWith('#toolcall?')) return null

  const params = new URLSearchParams(hash.slice('#toolcall?'.length))
  const id = params.get('id')
  if (!id) return null

  return { toolCallId: id }
}

const subagentParams = parseSubagentHash()
const toolCallParams = parseToolCallHash()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {toolCallParams ? (
      <ToolCallViewer toolCallId={toolCallParams.toolCallId} />
    ) : subagentParams ? (
      <SubagentViewer
        sessionKey={subagentParams.sessionKey}
        serverUrl={subagentParams.serverUrl}
        authToken={subagentParams.authToken}
        authMode={subagentParams.authMode}
      />
    ) : (
      <App />
    )}
  </React.StrictMode>
)
