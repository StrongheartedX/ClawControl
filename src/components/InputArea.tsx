import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react'
import { useStore } from '../store'

export function InputArea() {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage, abortChat, isStreaming, connected } = useStore()

  const maxLength = 4000

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [message])

  const handleSubmit = async () => {
    if (!message.trim() || !connected) return

    const currentMessage = message
    setMessage('')
    await sendMessage(currentMessage)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxLength) {
      setMessage(e.target.value)
    }
  }

  return (
    <div className="input-area">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={connected ? "Type a message..." : "Connecting..."}
          rows={1}
          disabled={!connected}
          aria-label="Message input"
        />
        {isStreaming ? (
          <button
            className="send-btn stop-btn"
            onClick={abortChat}
            aria-label="Stop generation"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={handleSubmit}
            disabled={!message.trim() || !connected}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        )}
      </div>
      <div className="input-footer">
        <span className="char-count">
          <span className={message.length > maxLength * 0.9 ? 'warning' : ''}>
            {message.length}
          </span>
          {' '}/{' '}{maxLength}
        </span>
        <span className="keyboard-hint">
          Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line
        </span>
      </div>
    </div>
  )
}
