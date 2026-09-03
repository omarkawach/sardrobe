import { Progress, ProgressIndicator, ProgressTrack } from '@sardrobe/react-components'

type ClosetStatusTone = 'idle' | 'processing' | 'ready' | 'saving' | 'error'

export function ClosetStatus({
  busy,
  progressValue,
  message,
  summary,
  tone,
}: {
  busy: boolean
  progressValue: number | null
  message: string
  summary: string
  tone: ClosetStatusTone
}) {
  const hasSummary = summary !== 'No import drafts.'
  const showSummary = hasSummary && summary !== message
  const hasContent = Boolean(message || hasSummary)
  const className = [
    'closet-process-status',
    `closet-process-status--${tone}`,
    !hasContent && 'closet-process-status--empty',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      id="import-status"
      className={className}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {hasContent ? (
        <div className="closet-process-status__row">
          <span className="closet-process-status__dot" aria-hidden="true" />
          <span className="closet-process-status__copy">
            <span className="closet-process-status__label">Queue status</span>
            {message ? <span>{message}</span> : null}
            {showSummary ? <span className="closet-process-status__summary">{summary}</span> : null}
            {!message && hasSummary ? <span>{summary}</span> : null}
          </span>
        </div>
      ) : null}
      {hasContent && busy ? (
        <Progress value={progressValue} aria-label="Import progress" className="closet-process-status__progress">
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
      ) : null}
    </div>
  )
}
