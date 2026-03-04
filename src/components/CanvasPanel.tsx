import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import { isNativeMobile, openExternal } from '../lib/platform'

export function CanvasPanel() {
  const canvasVisible = useStore(s => s.canvasVisible)
  const canvasScopedUrl = useStore(s => s.canvasScopedUrl)
  const canvasWidth = useStore(s => s.canvasWidth)
  const setCanvasWidth = useStore(s => s.setCanvasWidth)
  const setCanvasVisible = useStore(s => s.setCanvasVisible)

  const resizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const [isResizing, setIsResizing] = useState(false)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizing.current = true
    startX.current = e.clientX
    startWidth.current = canvasWidth
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [canvasWidth])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return
      // Dragging left edge: moving left = wider panel
      const delta = startX.current - e.clientX
      setCanvasWidth(startWidth.current + delta)
    }
    const handleMouseUp = () => {
      if (!resizing.current) return
      resizing.current = false
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setCanvasWidth])

  const handleOpenExternal = useCallback(() => {
    if (!canvasScopedUrl) return
    if (isNativeMobile() || typeof window.electronAPI !== 'undefined') {
      openExternal(canvasScopedUrl)
    } else {
      window.open(canvasScopedUrl, '_blank')
    }
  }, [canvasScopedUrl])

  if (!canvasVisible || !canvasScopedUrl) return null

  return (
    <div className="canvas-panel" style={{ width: canvasWidth }}>
      <div
        className="canvas-resize-handle"
        onMouseDown={handleResizeStart}
      />
      <div className="canvas-toolbar">
        <span className="canvas-toolbar-title">Canvas</span>
        <div className="canvas-toolbar-actions">
          <button
            className="canvas-toolbar-btn"
            onClick={() => window.open(canvasScopedUrl, 'canvas-popout', 'width=900,height=700')}
            aria-label="Pop out canvas"
            title="Pop out to window"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            </svg>
          </button>
          <button
            className="canvas-toolbar-btn"
            onClick={handleOpenExternal}
            aria-label="Open in browser"
            title="Open in browser"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </button>
          <button
            className="canvas-toolbar-btn"
            onClick={() => setCanvasVisible(false)}
            aria-label="Close canvas"
            title="Close canvas"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {/* Transparent overlay during resize to prevent iframe from capturing mouse events */}
      {isResizing && <div className="canvas-resize-overlay" />}
      <iframe
        className="canvas-iframe"
        src={canvasScopedUrl}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="Canvas"
      />
    </div>
  )
}
