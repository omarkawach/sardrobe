import type { ReactNode } from 'react'

export function ClosetPanel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={['closet-panel', className].filter(Boolean).join(' ')}>{children}</div>
}

export function ClosetSectionHeader({
  title,
  titleId,
  summary,
  children,
  className = '',
}: {
  title: string
  titleId: string
  summary?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div>
        <h1 id={titleId}>{title}</h1>
        {summary}
      </div>
      {children}
    </div>
  )
}

export function ClosetEmptyState({
  title,
  description,
  children,
  className = '',
}: {
  title: string
  description: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={['closet-empty', className].filter(Boolean).join(' ')}>
      <strong>{title}</strong>
      <span>{description}</span>
      {children}
    </div>
  )
}

export function ClosetMediaFrame({
  src,
  fallback,
  alt = '',
  loading,
  className = '',
}: {
  src: string | null | undefined
  fallback: string
  alt?: string
  loading?: 'lazy' | 'eager'
  className: string
}) {
  return (
    <span className={className}>
      {src ? <img src={src} alt={alt} loading={loading} /> : <span>{fallback}</span>}
    </span>
  )
}
