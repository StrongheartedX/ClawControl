import { useRef, useCallback, type ReactNode } from 'react'
import { useStore } from '../store'
import { useSwipeGesture, type SwipeDirection } from '../hooks/useSwipeGesture'

interface Props {
  children: ReactNode
}

/**
 * Orchestrates swipe gestures on mobile. Wraps the app content and translates
 * edge swipes into sidebar/right-panel open/close or detail-view navigation.
 *
 * Swipe logic:
 * | Direction     | State                          | Action              |
 * |---------------|--------------------------------|---------------------|
 * | Left-to-right | rightPanelOpen                 | Close right panel   |
 * | Left-to-right | mainView !== 'chat'            | Close detail view   |
 * | Left-to-right | chat & sidebar closed          | Open sidebar        |
 * | Right-to-left | sidebarOpen                    | Close sidebar       |
 * | Right-to-left | sidebar closed                 | Open right panel    |
 */
export function MobileGestureLayer({ children }: Props) {
  const sidebarRef = useRef<HTMLElement | null>(null)
  const rightPanelRef = useRef<HTMLElement | null>(null)
  const overlayRef = useRef<HTMLElement | null>(null)

  // Track current gesture state
  const gestureAction = useRef<string | null>(null)
  const gestureStartTime = useRef(0)

  const acquireRefs = useCallback(() => {
    if (!sidebarRef.current) {
      sidebarRef.current = document.querySelector('.sidebar')
    }
    if (!rightPanelRef.current) {
      rightPanelRef.current = document.querySelector('.right-panel')
    }
    if (!overlayRef.current) {
      overlayRef.current = document.querySelector('.overlay')
    }
  }, [])

  const addSwipingClass = useCallback((el: HTMLElement | null) => {
    el?.classList.add('swiping')
  }, [])

  const removeSwipingClass = useCallback((el: HTMLElement | null) => {
    el?.classList.remove('swiping')
  }, [])

  const resolveAction = useCallback((direction: SwipeDirection): string | null => {
    const state = useStore.getState()

    if (direction === 'right') {
      // Left-to-right swipe
      if (state.rightPanelOpen) return 'close-right-panel'
      if (state.mainView !== 'chat') return 'navigate-back'
      if (!state.sidebarOpen) return 'open-sidebar'
    } else {
      // Right-to-left swipe
      if (state.sidebarOpen) return 'close-sidebar'
      if (!state.rightPanelOpen) return 'open-right-panel'
    }
    return null
  }, [])

  const onSwipeStart = useCallback((direction: SwipeDirection) => {
    acquireRefs()
    const action = resolveAction(direction)
    gestureAction.current = action
    gestureStartTime.current = Date.now()

    if (!action) return

    // Add swiping class to suppress CSS transitions during drag
    if (action === 'open-sidebar' || action === 'close-sidebar') {
      addSwipingClass(sidebarRef.current)
      addSwipingClass(overlayRef.current)
    } else if (action === 'open-right-panel' || action === 'close-right-panel') {
      addSwipingClass(rightPanelRef.current)
      addSwipingClass(overlayRef.current)
    }
  }, [acquireRefs, resolveAction, addSwipingClass])

  const onSwipeMove = useCallback((_direction: SwipeDirection, progress: number) => {
    const action = gestureAction.current
    if (!action) return

    const clampedProgress = Math.max(0, Math.min(1, progress))

    requestAnimationFrame(() => {
      const sidebar = sidebarRef.current
      const rightPanel = rightPanelRef.current
      const overlay = overlayRef.current
      const sidebarWidth = sidebar?.offsetWidth || 280

      switch (action) {
        case 'open-sidebar': {
          // Sidebar starts at translateX(-100%), move toward translateX(0)
          const offset = -sidebarWidth + (sidebarWidth * clampedProgress)
          if (sidebar) sidebar.style.transform = `translateX(${offset}px)`
          if (overlay) {
            overlay.style.opacity = `${clampedProgress * 0.5}`
            overlay.style.visibility = 'visible'
            overlay.style.pointerEvents = 'auto'
          }
          break
        }
        case 'close-sidebar': {
          // Sidebar starts at translateX(0), move toward translateX(-100%)
          const offset = -(sidebarWidth * clampedProgress)
          if (sidebar) sidebar.style.transform = `translateX(${offset}px)`
          if (overlay) {
            overlay.style.opacity = `${(1 - clampedProgress) * 0.5}`
          }
          break
        }
        case 'open-right-panel': {
          const panelWidth = rightPanel?.offsetWidth || 320
          // Right panel starts at translateX(100%), move toward translateX(0)
          const offset = panelWidth - (panelWidth * clampedProgress)
          if (rightPanel) rightPanel.style.transform = `translateX(${offset}px)`
          if (overlay) {
            overlay.style.opacity = `${clampedProgress * 0.5}`
            overlay.style.visibility = 'visible'
            overlay.style.pointerEvents = 'auto'
          }
          break
        }
        case 'close-right-panel': {
          const panelWidth = rightPanel?.offsetWidth || 320
          // Right panel starts at translateX(0), move toward translateX(100%)
          const offset = panelWidth * clampedProgress
          if (rightPanel) rightPanel.style.transform = `translateX(${offset}px)`
          if (overlay) {
            overlay.style.opacity = `${(1 - clampedProgress) * 0.5}`
          }
          break
        }
        // 'navigate-back' has no visual follow-through
      }
    })
  }, [])

  const onSwipeEnd = useCallback((_direction: SwipeDirection, _completed: boolean) => {
    const action = gestureAction.current
    if (!action) return

    // Remove swiping class (re-enable CSS transitions for snap animation)
    removeSwipingClass(sidebarRef.current)
    removeSwipingClass(rightPanelRef.current)
    removeSwipingClass(overlayRef.current)

    // Clear inline styles — let CSS classes handle final position
    const clearInlineStyles = (el: HTMLElement | null) => {
      if (!el) return
      el.style.transform = ''
      el.style.opacity = ''
      el.style.visibility = ''
      el.style.pointerEvents = ''
    }

    clearInlineStyles(sidebarRef.current)
    clearInlineStyles(rightPanelRef.current)
    clearInlineStyles(overlayRef.current)

    const store = useStore.getState()

    // Determine completion — for now, always trigger action since the
    // useSwipeGesture hook already applies edge-only + directional lock.
    // The gesture had to travel meaningfully to reach onSwipeEnd with completed=true.
    switch (action) {
      case 'open-sidebar':
        store.setSidebarOpen(true)
        break
      case 'close-sidebar':
        store.setSidebarOpen(false)
        break
      case 'open-right-panel':
        store.setRightPanelOpen(true)
        break
      case 'close-right-panel':
        store.setRightPanelOpen(false)
        break
      case 'navigate-back':
        store.closeDetailView()
        break
    }

    gestureAction.current = null
  }, [removeSwipingClass])

  useSwipeGesture({
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
  })

  return <>{children}</>
}
