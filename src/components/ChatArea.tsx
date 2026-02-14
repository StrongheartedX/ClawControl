import { useState, useRef, useEffect, useMemo, Fragment, memo } from 'react'
import { useStore, selectIsStreaming, selectHadStreamChunks, selectActiveToolCalls, ToolCall, SubagentInfo } from '../store'
import { Message, stripAnsi } from '../lib/openclaw'
import { resolveToolDisplay, extractToolDetail } from '../lib/openclaw/tool-display'
import { ToolIcon } from './ToolIcon'
import { SubagentBlock } from './SubagentBlock'
import { format, isSameDay } from 'date-fns'
import { marked } from 'marked'
import logoUrl from '../../build/icon.png'

// Configure marked for chat-friendly rendering: single newlines become <br>,
// GFM tables/strikethrough enabled, synchronous parsing.
marked.setOptions({ breaks: true, gfm: true, async: false })

export function ChatArea() {
  const { messages: allMessages, agents, currentAgentId, sessions, currentSessionId, activeSubagents, openSubagentPopout, openToolCallPopout } = useStore()
  const isStreaming = useStore(selectIsStreaming)
  const hadStreamChunks = useStore(selectHadStreamChunks)
  const activeToolCalls = useStore(selectActiveToolCalls)
  const messages = useMemo(
    () => allMessages.filter((m) => m.role !== 'system'),
    [allMessages]
  )
  const chatEndRef = useRef<HTMLDivElement>(null)
  // Track session switches so we can instant-scroll when history loads
  const prevSessionRef = useRef(currentSessionId)
  const needsInstantScroll = useRef(true)

  // Resolve agent from the current session's agentId (e.g. from key "agent:jerry:...")
  // so each chat shows the correct agent name/avatar, not just the globally selected one.
  const currentSession = sessions.find(s => (s.key || s.id) === currentSessionId)
  const sessionAgentId = currentSession?.agentId || currentAgentId
  const currentAgent = agents.find((a) => a.id === sessionAgentId)

  // Build lookup maps: tool calls and subagents grouped by afterMessageId
  // Must be before the early return to satisfy Rules of Hooks.
  const toolCallsByMessageId = useMemo(() => {
    const map = new Map<string, ToolCall[]>()
    for (const tc of activeToolCalls) {
      const key = tc.afterMessageId || '__trailing__'
      const list = map.get(key)
      if (list) list.push(tc)
      else map.set(key, [tc])
    }
    return map
  }, [activeToolCalls])

  const subagentsByMessageId = useMemo(() => {
    const map = new Map<string, SubagentInfo[]>()
    for (const sa of activeSubagents) {
      // Only show subagents belonging to this session
      if (sa.parentSessionId && sa.parentSessionId !== currentSessionId) continue
      const key = sa.afterMessageId || '__trailing__'
      const list = map.get(key)
      if (list) list.push(sa)
      else map.set(key, [sa])
    }
    return map
  }, [activeSubagents, currentSessionId])

  // Mark session switches so the next render with messages jumps instantly
  useEffect(() => {
    if (prevSessionRef.current !== currentSessionId) {
      prevSessionRef.current = currentSessionId
      needsInstantScroll.current = true
    }
  }, [currentSessionId])

  // Scroll to bottom: instant on history load, smooth for incremental updates
  useEffect(() => {
    if (messages.length === 0) return
    const behavior = needsInstantScroll.current ? 'instant' : 'smooth'
    needsInstantScroll.current = false
    chatEndRef.current?.scrollIntoView({ behavior })
  }, [messages, activeToolCalls, activeSubagents])

  if (messages.length === 0) {
    return (
      <div className="chat-area">
        <div className="chat-empty">
          <div className="empty-logo">
            <img src={logoUrl} alt="ClawControl logo" />
          </div>
          <h2>Start a Conversation</h2>
          <p>Send a message to begin chatting with {currentAgent?.name || 'the AI assistant'}</p>
          <div className="quick-actions">
            <button className="quick-action">
              <span>Explain a concept</span>
            </button>
            <button className="quick-action">
              <span>Help me code</span>
            </button>
            <button className="quick-action">
              <span>Analyze data</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-area">
      <div className="chat-container">
        {messages.map((message, index) => {
          const isNewDay = index === 0 || !isSameDay(new Date(message.timestamp), new Date(messages[index - 1].timestamp))
          const msgToolCalls = toolCallsByMessageId.get(message.id)
          const msgSubagents = subagentsByMessageId.get(message.id)

          return (
            <Fragment key={message.id}>
              {isNewDay && <DateSeparator date={new Date(message.timestamp)} />}
              <MessageBubble
                message={message}
                agentName={currentAgent?.name}
                agentAvatar={currentAgent?.avatar}
              />
              {msgToolCalls && (
                <div className="tool-calls-container">
                  {msgToolCalls.map((tc) => (
                    <ToolCallBlock key={tc.toolCallId} toolCall={tc} onOpenPopout={openToolCallPopout} />
                  ))}
                </div>
              )}
              {msgSubagents && (
                <div className="subagents-container">
                  {msgSubagents.map((sa) => (
                    <SubagentBlock key={sa.sessionKey} subagent={sa} onOpen={openSubagentPopout} />
                  ))}
                </div>
              )}
            </Fragment>
          )
        })}

        {/* Trailing tool calls and subagents (no afterMessageId) */}
        {toolCallsByMessageId.has('__trailing__') && (
          <div className="tool-calls-container">
            {toolCallsByMessageId.get('__trailing__')!.map((tc) => (
              <ToolCallBlock key={tc.toolCallId} toolCall={tc} onOpenPopout={openToolCallPopout} />
            ))}
          </div>
        )}
        {subagentsByMessageId.has('__trailing__') && (
          <div className="subagents-container">
            {subagentsByMessageId.get('__trailing__')!.map((sa) => (
              <SubagentBlock key={sa.sessionKey} subagent={sa} onOpen={openSubagentPopout} />
            ))}
          </div>
        )}

        {isStreaming && !hadStreamChunks && (
          <div className="message agent typing-indicator-container">
            <div className="message-avatar">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-4 12a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
              </svg>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  )
}

function DateSeparator({ date }: { date: Date }) {
  let dateText = ''
  try {
    dateText = format(date, 'EEEE, MMMM d, yyyy')
  } catch (e) {
    return null
  }

  return (
    <div className="date-separator">
      <span>{dateText}</span>
    </div>
  )
}

const MessageBubble = memo(function MessageBubble({
  message,
  agentName,
  agentAvatar
}: {
  message: Message
  agentName?: string
  agentAvatar?: string
}) {
  const isUser = message.role === 'user'
  const time = format(new Date(message.timestamp), 'h:mm a')

  return (
    <div className={`message ${isUser ? 'user' : 'agent'}`}>
      {!isUser && (
        <div className="message-avatar">
          {agentAvatar ? (
            <img src={agentAvatar} alt={agentName || 'Agent'} />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-4 12a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            </svg>
          )}
        </div>
      )}

      <div className="message-content">
        <div className="message-header">
          {isUser ? (
            <>
              <span className="message-time">{time}</span>
              <span className="message-author">You</span>
            </>
          ) : (
            <>
              <span className="message-author">{agentName || 'Assistant'}</span>
              <span className="message-time">{time}</span>
            </>
          )}
        </div>
        <div className="message-bubble">
          {message.thinking && (
            <div className="thinking-block">
              <div className="thinking-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>Thinking...</span>
              </div>
              <div className="thinking-content">{message.thinking}</div>
            </div>
          )}
          <MessageContent content={message.content} />
        </div>
      </div>

      {isUser && (
        <div className="message-avatar user-avatar">
          <span>You</span>
        </div>
      )}
    </div>
  )
})

function ToolCallBlock({ toolCall, onOpenPopout }: { toolCall: ToolCall; onOpenPopout: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = toolCall.phase === 'start'
  const display = resolveToolDisplay(toolCall.name)
  const detail = extractToolDetail(toolCall.args, display.detailKeys)

  return (
    <div className={`tool-call-block ${isRunning ? 'running' : 'completed'}`}>
      <div className="tool-call-header">
        <button className="tool-call-main" onClick={() => setExpanded(!expanded)}>
          {isRunning ? (
            <svg className="tool-call-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          ) : (
            <ToolIcon type={display.icon} size={14} className="tool-call-icon" />
          )}
          <span className="tool-call-label">{display.title}</span>
          {detail && <span className="tool-call-detail">{detail}</span>}
          <span className="tool-call-status">{isRunning ? 'Running...' : 'Done'}</span>
          <svg className={`tool-call-chevron ${expanded ? 'expanded' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {toolCall.result && (
          <button
            className="tool-call-popout-btn"
            onClick={(e) => { e.stopPropagation(); onOpenPopout(toolCall.toolCallId) }}
            title="Open in new window"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        )}
      </div>
      {expanded && toolCall.result && (
        <div className="tool-call-result">
          <pre>{stripAnsi(toolCall.result)}</pre>
        </div>
      )}
    </div>
  )
}

// Custom marked renderer that wraps fenced code blocks with a copy button
const renderer = new marked.Renderer()
const originalCode = renderer.code.bind(renderer)
renderer.code = function (this: unknown, ...args: Parameters<typeof originalCode>) {
  const html = originalCode.apply(this, args)
  return `<div class="code-block-wrapper"><button class="code-copy-btn" type="button" aria-label="Copy code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>${html}</div>`
}

function MessageContent({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const html = useMemo(
    () => marked.parse(stripAnsi(content), { async: false, renderer }) as string,
    [content]
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.code-copy-btn')
      if (!btn) return
      const wrapper = btn.closest('.code-block-wrapper')
      const code = wrapper?.querySelector('code')
      if (!code) return
      navigator.clipboard.writeText(code.textContent || '').then(() => {
        btn.classList.add('copied')
        setTimeout(() => btn.classList.remove('copied'), 2000)
      })
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [html])

  return <div className="markdown-content" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}
