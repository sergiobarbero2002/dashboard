'use client'

import ErrorHandler from './error'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return <ErrorHandler error={error} reset={reset} />
}
