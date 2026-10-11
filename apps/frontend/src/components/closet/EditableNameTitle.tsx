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
  form?: string
  onChange: (value: string) => void
  renderTitle: (className: string, children: ReactNode, title: string) => ReactNode
  className?: string
  disabled?: boolean
  pendingSubmit?: boolean
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function EditableNameTitle({
  value,
  fallback,
  label,
  name,
  form,
  onChange,
  renderTitle,
  className = '',
  disabled = false,
  pendingSubmit = false,
  editing: controlledEditing,
  onEditingChange,
  onKeyDown,
}: EditableNameTitleProps) {
  const [localEditing, setLocalEditing] = useState(false)
  const editing = controlledEditing ?? localEditing
  const setEditing = onEditingChange ?? setLocalEditing
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

  return (
    <div className={['closet-editable-title', editing && 'closet-editable-title--editing', className].filter(Boolean).join(' ')}>
      {renderTitle(editing ? 'sr-only' : 'closet-editable-title__text', displayTitle, displayTitle)}
      <Field.Root className={editing ? 'closet-editable-title__field' : 'sr-only'} aria-hidden={editing ? undefined : true} inert={pendingSubmit}>
        <Field.Label className="sr-only">{label}</Field.Label>
        <Field.Control
          ref={inputRef}
          name={name}
          form={form}
          className="closet-editable-title__input"
          value={value}
          tabIndex={editing ? undefined : -1}
          onBlur={() => setEditing(false)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown ?? handleKeyDown}
          onInvalid={() => setEditing(true)}
          // Native WebMCP cancels a running call if disabling a named control changes its schema.
          disabled={disabled && !pendingSubmit}
          required
          aria-required="true"
        />
      </Field.Root>
      {!editing ? (
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
      ) : null}
    </div>
  )
}
