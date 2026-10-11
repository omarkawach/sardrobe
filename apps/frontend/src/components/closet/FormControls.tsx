import { arrayToCsv, categories, COLORS, csvToArray, OCCASIONS, SEASONS, SUBCATEGORIES_BY_CATEGORY, type WardrobeFormState } from '../../features/wardrobe/domain'
import type { PackingPlanFormState } from '../../features/packing/domain'
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
  name?: string
  // Subcategory exposes the full enum so category and subcategory can change in one call.
  formOptions?: WardrobeSelectOption[]
}

// Named native selects keep form serialization, WebMCP schemas, and controlled
// React state in sync without exposing a duplicate control to keyboard or AT users.
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
  name,
  formOptions,
}: WardrobeSelectProps) {
  return (
    <>
      <Select
        name={name}
        formOptions={formOptions}
        formLabel={ariaLabel}
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
    </>
  )
}

type WardrobeMultiSelectProps = {
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder: string
  options: readonly string[]
  ariaLabel: string
  name?: string
}

export function WardrobeMultiSelect({ value, onValueChange, placeholder, options, ariaLabel, name }: WardrobeMultiSelectProps) {
  const triggerLabel = value.length > 0 ? value.join(', ') : ''
  return (
    <>
      <Combobox.Root name={name} formLabel={ariaLabel} multiple value={value} onValueChange={onValueChange} items={options as unknown as string[]}>
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
    </>
  )
}

const allSubcategories = toSelectOptions(Array.from(new Set(Object.values(SUBCATEGORIES_BY_CATEGORY).flat())))
const multiFields = [
  { key: 'season', label: 'Season', options: SEASONS },
  { key: 'occasion', label: 'Occasion', options: OCCASIONS },
] as const

// Item and import editors share their UI controls and declarative input schema.
export function WardrobeDetailsFields({ form, onChange }: {
  form: WardrobeFormState
  onChange: (key: keyof WardrobeFormState, value: string) => void
}) {
  function selectField(
    key: 'category' | 'subcategory' | 'color',
    label: string,
    values: readonly string[],
    placeholder = `Select ${label.toLowerCase()}`,
  ) {
    return (
      <div className="closet-field">
        <span>{label}</span>
        <WardrobeSelect
          name={key}
          value={form[key]}
          onValueChange={(value) => onChange(key, value)}
          placeholder={placeholder}
          options={toSelectOptions(values)}
          formOptions={key === 'subcategory' ? allSubcategories : undefined}
          ariaLabel={label}
        />
      </div>
    )
  }

  const subcategories = SUBCATEGORIES_BY_CATEGORY[form.category] ?? []
  return (
    <>
      <div className="closet-details__row">
        {selectField('category', 'Category', categories)}
        {selectField('subcategory', 'Subcategory', subcategories, subcategories.length ? 'Select subcategory' : 'Pick a category first')}
      </div>
      {selectField('color', 'Color', COLORS)}
      <div className="closet-details__row">
        {multiFields.map(({ key, label, options }) => (
          <div className="closet-field" key={key}>
            <span>{label}</span>
            <WardrobeMultiSelect
              name={key}
              value={csvToArray(form[key])}
              onValueChange={(values) => onChange(key, arrayToCsv(values))}
              placeholder={`Select ${label.toLowerCase()}s`}
              options={options}
              ariaLabel={label}
            />
          </div>
        ))}
      </div>
      {(['description', 'notes'] as const).map((key) => (
        <label className={key === 'description' ? 'sr-only' : 'closet-field'} aria-hidden={key === 'description' ? true : undefined} key={key}>
          <span>{key === 'description' ? 'Description' : 'Notes'}</span>
          <textarea
            name={key}
            tabIndex={key === 'description' ? -1 : undefined}
            value={form[key]}
            onChange={(event) => onChange(key, event.target.value)}
            rows={key === 'description' ? 2 : 3}
          />
        </label>
      ))}
    </>
  )
}

export function readWardrobeForm(data: FormData, current: WardrobeFormState, fields: ReadonlySet<string>): WardrobeFormState {
  const next = { ...current }
  for (const key of ['name', 'category', 'subcategory', 'color', 'description', 'notes'] as const) {
    if (data.has(key)) next[key] = String(data.get(key))
  }
  // A named multiple select has no FormData entry when its selection is empty.
  for (const key of ['season', 'occasion'] as const) {
    if (fields.has(key)) next[key] = arrayToCsv(data.getAll(key).map(String))
  }
  validateWardrobeForm(next)
  return next
}

export function validateWardrobeForm(form: WardrobeFormState) {
  if (!form.name.trim()) throw new Error('Name is required.')
  if (!categories.includes(form.category)) throw new Error('Choose a valid category.')
  if (form.subcategory && !(SUBCATEGORIES_BY_CATEGORY[form.category] ?? []).includes(form.subcategory)) {
    throw new Error(`Subcategory must belong to ${form.category}.`)
  }
  if (form.color && !(COLORS as readonly string[]).includes(form.color)) throw new Error('Choose a valid color.')
  for (const [label, values, allowed] of [
    ['season', csvToArray(form.season), SEASONS],
    ['occasion', csvToArray(form.occasion), OCCASIONS],
  ] as const) {
    if (values.some((value) => !(allowed as readonly string[]).includes(value))) throw new Error(`Choose valid ${label} values.`)
  }
}

export function readPackingForm(data: FormData): PackingPlanFormState {
  const form = {
    plan: String(data.get('name') ?? ''),
    startDate: String(data.get('startDate') ?? ''),
    endDate: String(data.get('endDate') ?? ''),
    status: String(data.get('status') ?? 'planning'),
    notes: String(data.get('notes') ?? ''),
  }
  if (!form.plan.trim()) throw new Error('Plan is required.')
  if (form.status !== 'planning' && form.status !== 'packed') throw new Error('Choose a valid packing status.')
  for (const date of [form.startDate, form.endDate]) {
    if (!date) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Dates must be valid yyyy-mm-dd values.')
  }
  if (form.startDate && form.endDate && form.endDate < form.startDate) throw new Error('End date cannot precede start date.')
  return { ...form, status: form.status }
}
