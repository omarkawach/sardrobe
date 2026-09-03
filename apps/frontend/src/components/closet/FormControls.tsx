import {
  Combobox,
  Select,
  SelectList,
  SelectOption,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@sardrobe/react-components'
import { Check, ChevronDown } from 'lucide-react'

export type WardrobeSelectOption = { value: string; label: string }

export function toSelectOptions(values: readonly string[]): WardrobeSelectOption[] {
  return values.map((v) => ({ value: v, label: v }))
}

type WardrobeSelectProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: WardrobeSelectOption[]
  ariaLabel: string
  className?: string
  triggerClassName?: string
  positionerClassName?: string
  size?: 'sm' | 'md'
}

export function WardrobeSelect({
  value,
  onValueChange,
  placeholder,
  options,
  ariaLabel,
  className,
  triggerClassName,
  positionerClassName,
  size,
}: WardrobeSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange((next as string) ?? '')}
      items={options}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        size={size}
        className={[triggerClassName, className].filter(Boolean).join(' ') || undefined}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner
          sideOffset={4}
          className={['wardrobe-select__positioner', positionerClassName].filter(Boolean).join(' ') || undefined}
        >
          <SelectPopup>
            <SelectList>
              {options.map((option) => (
                <SelectOption key={option.value} value={option.value}>
                  {option.label}
                </SelectOption>
              ))}
            </SelectList>
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </Select>
  )
}

type WardrobeMultiSelectProps = {
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder: string
  options: readonly string[]
  ariaLabel: string
}

export function WardrobeMultiSelect({ value, onValueChange, placeholder, options, ariaLabel }: WardrobeMultiSelectProps) {
  const triggerLabel = value.length > 0 ? value.join(', ') : ''
  return (
    <Combobox.Root multiple value={value} onValueChange={onValueChange} items={options as unknown as string[]}>
      <Combobox.Trigger aria-label={ariaLabel} className="closet-multiselect__trigger">
        <span className={triggerLabel ? 'closet-multiselect__value' : 'closet-multiselect__placeholder'}>
          {triggerLabel || placeholder}
        </span>
        <ChevronDown className="closet-multiselect__chevron" aria-hidden="true" size={16} strokeWidth={1.15} />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="closet-multiselect__positioner">
          <Combobox.Popup className="closet-multiselect__popup">
            <Combobox.List>
              {options.map((option) => (
                <Combobox.Item key={option} value={option} className="closet-multiselect__item">
                  <span className="closet-multiselect__checkbox" aria-hidden="true">
                    <Combobox.ItemIndicator>
                      <Check size={12} strokeWidth={1.25} />
                    </Combobox.ItemIndicator>
                  </span>
                  {option}
                </Combobox.Item>
              ))}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
