import {
  Button,
  Field,
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipTrigger,
} from '@sardrobe/react-components'
import { Pencil } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

type EditableNameTitleProps = {
  value: string
  fallback: string
  label: string
  name: string
  onChange: (value: string) => void
  renderTitle: (className: string, children: ReactNode, title: string) => ReactNode
  className?: string
  disabled?: boolean
}

export function EditableNameTitle({
  value,
  fallback,
  label,
  name,
  onChange,
  renderTitle,
  className = '',
  disabled = false,
}: EditableNameTitleProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const initialValueRef = useRef(value)
  const displayTitle = value.trim() || fallback

  useEffect(() => {
    if (!editing) return
    const input = inputRef.current
    if (!input) return

    input.focus()
    input.setSelectionRange(0, input.value.length, 'forward')
    input.scrollLeft = 0

    const animationFrame = window.requestAnimationFrame(() => {
      input.scrollLeft = 0
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [editing])

  function startEditing() {
    if (disabled) return
    initialValueRef.current = value
    setEditing(true)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      setEditing(false)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onChange(initialValueRef.current)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className={['closet-editable-title', 'closet-editable-title--editing', className].filter(Boolean).join(' ')}>
        {renderTitle('sr-only', displayTitle, displayTitle)}
        <Field.Root className="closet-editable-title__field">
          <Field.Label className="sr-only">{label}</Field.Label>
          <Field.Control
            ref={inputRef}
            name={name}
            className="closet-editable-title__input"
            value={value}
            onBlur={() => setEditing(false)}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            required
            aria-required="true"
          />
        </Field.Root>
      </div>
    )
  }

  return (
    <div className={['closet-editable-title', className].filter(Boolean).join(' ')}>
      {renderTitle('closet-editable-title__text', displayTitle, displayTitle)}
      <Tooltip>
        <TooltipTrigger
          render={(
            <Button
              className="closet-editable-title__button"
              size="icon"
              variant="ghost"
              color="neutral"
              type="button"
              aria-label={`Edit ${label.toLowerCase()}`}
              disabled={disabled}
              onClick={startEditing}
            />
          )}
        >
          <Pencil size={15} strokeWidth={1.4} aria-hidden="true" />
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="top" sideOffset={4}>
            <TooltipPopup>
              <TooltipArrow />
              Edit {label.toLowerCase()}
            </TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </div>
  )
}
