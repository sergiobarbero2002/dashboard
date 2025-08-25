import { useState, useCallback } from 'react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message?: string
  onClose: (id: string) => void
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message: string) => {
    const id = Date.now().toString()
    const newToast: Toast = { 
      id, 
      type: 'success',
      title: message,
      onClose: removeToast
    }
    setToasts(prev => [...prev, newToast])
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }, [removeToast])

  const showError = useCallback((message: string) => {
    const id = Date.now().toString()
    const newToast: Toast = { 
      id, 
      type: 'error',
      title: message,
      onClose: removeToast
    }
    setToasts(prev => [...prev, newToast])
    
    // Auto-remove after 5 seconds for errors
    setTimeout(() => {
      removeToast(id)
    }, 5000)
  }, [removeToast])

  return { toasts, removeToast, showSuccess, showError }
}
