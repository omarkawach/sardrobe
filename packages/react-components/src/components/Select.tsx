import * as React from 'react'
import { Select as BaseSelect } from '@base-ui/react/select'

type SelectLabelsContextType = {
  labels: Map<unknown, React.ReactNode>
  registerLabel: (value: unknown, label: React.ReactNode) => void
  unregisterLabel: (value: unknown) => void
}

const SelectLabelsContext = React.createContext<SelectLabelsContextType | null>(null)

export interface SelectProps extends React.ComponentPropsWithRef<typeof BaseSelect.Root> {
    items?: Array<{ label: React.ReactNode; value: unknown }>
}

export interface SelectTriggerProps extends Omit<BaseSelect.Trigger.Props, 'className'> {
  className?: string
    size?: 'sm' | 'md'
}

export interface SelectValueProps extends Omit<BaseSelect.Value.Props, 'children'> {
  placeholder?: string
  children?: BaseSelect.Value.Props['children']
}

export interface SelectPortalProps extends BaseSelect.Portal.Props {}
export interface SelectPositionerProps extends BaseSelect.Positioner.Props {}

export interface SelectPopupProps extends Omit<BaseSelect.Popup.Props, 'className'> {
  className?: string
}

export interface SelectListProps extends Omit<BaseSelect.List.Props, 'className'> {
  className?: string
}

export interface SelectOptionProps extends Omit<BaseSelect.Item.Props, 'className'> {
  className?: string
}

export interface SelectOptionGroupProps extends Omit<BaseSelect.Group.Props, 'className'> {
  className?: string
  label?: string
}

export function Select({ items, ...props }: SelectProps) {
  const [labels, setLabels] = React.useState<Map<unknown, React.ReactNode>>(() => new Map())

  // Build a stable map from the items prop for immediate label resolution
  const itemLabels = React.useMemo(() => {
    if (!items) return null
    const map = new Map<unknown, React.ReactNode>()
    for (const item of items) {
      map.set(item.value, item.label)
    }
    return map
  }, [items])

  const registerLabel = React.useCallback((value: unknown, label: React.ReactNode) => {
    setLabels((prev) => {
      if (prev.get(value) === label) {
        return prev
      }

      const next = new Map(prev)
      next.set(value, label)
      return next
    })
  }, [])

  const unregisterLabel = React.useCallback((value: unknown) => {
    setLabels((prev) => {
      if (!prev.has(value)) {
        return prev
      }

      const next = new Map(prev)
      next.delete(value)
      return next
    })
  }, [])

  // Merge: mounted option labels take priority, then fall back to items prop
  const mergedLabels = React.useMemo(() => {
    if (!itemLabels) return labels
    const merged = new Map(itemLabels)
    for (const [k, v] of labels) {
      merged.set(k, v)
    }
    return merged
  }, [labels, itemLabels])

  const contextValue = React.useMemo(
    () => ({ labels: mergedLabels, registerLabel, unregisterLabel }),
    [mergedLabels, registerLabel, unregisterLabel],
  )

  return (
    <SelectLabelsContext.Provider value={contextValue}>
      <BaseSelect.Root {...props} />
    </SelectLabelsContext.Provider>
  )
}

export function SelectTrigger({ size = 'md', className = '', ref, ...props }: SelectTriggerProps & { ref?: React.Ref<HTMLButtonElement> }) {
    const classes = ['select__trigger', size !== 'md' && `select__trigger--${size}`, className]
      .filter(Boolean)
      .join(' ')
    return <BaseSelect.Trigger ref={ref} className={classes} {...props} />
}

export function SelectValue({ placeholder, children, ref, ...props }: SelectValueProps & { ref?: React.Ref<HTMLSpanElement> }) {
    const context = React.useContext(SelectLabelsContext)

    if (children) {
      return (
        <BaseSelect.Value ref={ref} placeholder={placeholder} {...props}>
          {children}
        </BaseSelect.Value>
      )
    }

    return (
      <BaseSelect.Value ref={ref} {...props}>
        {(value) => {
          if (value === null || value === undefined || value === '') {
            return placeholder ? <span className="select__placeholder">{placeholder}</span> : null
          }
          const label = context?.labels.get(value)
          return label ?? value
        }}
      </BaseSelect.Value>
    )
}

export const SelectPortal = BaseSelect.Portal

export function SelectPositioner({ className = '', ref, ...props }: SelectPositionerProps & { className?: string } & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['select__positioner', className].filter(Boolean).join(' ')
  return <BaseSelect.Positioner ref={ref} className={classes} {...props} />
}

export function SelectPopup({ className = '', ref, ...props }: SelectPopupProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['select__popup', className].filter(Boolean).join(' ')
    return <BaseSelect.Popup ref={ref} className={classes} {...props} />
}

export function SelectList({ className = '', ref, ...props }: SelectListProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['select__list', className].filter(Boolean).join(' ')
    return <BaseSelect.List ref={ref} className={classes} {...props} />
}

export function SelectOption({ className = '', value, children, ref, ...props }: SelectOptionProps & { ref?: React.Ref<HTMLDivElement> }) {
    const context = React.useContext(SelectLabelsContext)
    const registerLabel = context?.registerLabel
    const unregisterLabel = context?.unregisterLabel

    // Register children as label on mount, unregister on unmount
    React.useEffect(() => {
      if (registerLabel && unregisterLabel && value !== undefined) {
        registerLabel(value, children)
        return () => unregisterLabel(value)
      }
    }, [registerLabel, unregisterLabel, value, children])

    const classes = ['select__option', className].filter(Boolean).join(' ')
    return (
      <BaseSelect.Item ref={ref} className={classes} value={value} {...props}>
        {children}
      </BaseSelect.Item>
    )
}

export function SelectOptionGroup({ label, className = '', children, ref, ...props }: SelectOptionGroupProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['select__option-group', className].filter(Boolean).join(' ')
    return (
      <BaseSelect.Group ref={ref} className={classes} {...props}>
        {label && (
          <BaseSelect.GroupLabel className="select__group-label">{label}</BaseSelect.GroupLabel>
        )}
        {children}
      </BaseSelect.Group>
    )
}
