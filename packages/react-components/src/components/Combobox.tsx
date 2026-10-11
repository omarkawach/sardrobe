import * as React from 'react'
import { FormSelect, formChangeDetails, type NativeSelectProps } from './Form'
import { Combobox as BaseCombobox } from '@base-ui/react/combobox'

function Root<Value, Multiple extends boolean | undefined = false>({ formOptions, formLabel, name, ...props }: BaseCombobox.Root.Props<Value, Multiple> & NativeSelectProps) {
  const nativeOptions = formOptions ?? (Array.isArray(props.items) && props.items.every((item) => typeof item === 'string') ? props.items.map((value) => ({ value: String(value), label: String(value) })) : undefined)
  const native = Boolean(name && nativeOptions)
  const [formValue, setFormValue] = React.useState(props.defaultValue ?? (props.multiple ? [] : null))
  const value = props.value === undefined ? formValue : props.value
  const change = (next: typeof props.value, details: BaseCombobox.Root.ChangeEventDetails) => {
    props.onValueChange?.(next as Parameters<NonNullable<typeof props.onValueChange>>[0], details)
    if (!details.isCanceled) setFormValue(next as typeof formValue)
  }
  return <>
    {native ? <FormSelect name={name} form={props.form} options={nativeOptions!} label={formLabel}
      value={(value ?? (props.multiple ? [] : '')) as string | string[]} multiple={props.multiple} disabled={props.disabled} required={props.required}
      onChange={(event) => change((props.multiple ? Array.from(event.currentTarget.selectedOptions, (option) => option.value) : event.currentTarget.value) as typeof props.value, formChangeDetails(event.nativeEvent))} /> : null}
    <BaseCombobox.Root {...props} name={native ? '' : name} value={native ? value as typeof props.value : props.value} onValueChange={native ? change : props.onValueChange} />
  </>
}

function Input({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.Input>, 'className'> & { className?: string } & { ref?: React.Ref<HTMLInputElement> }) {
  const classes = ['combobox__input', className].filter(Boolean).join(' ')
  return <BaseCombobox.Input ref={ref} className={classes} {...props} />
}

function Trigger({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.Trigger>, 'className'> & {     className?: string   } & { ref?: React.Ref<HTMLButtonElement> }) {
  const classes = ['combobox__trigger', className].filter(Boolean).join(' ')
  return <BaseCombobox.Trigger ref={ref} className={classes} {...props} />
}

function Clear({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.Clear>, 'className'> & { className?: string } & { ref?: React.Ref<HTMLButtonElement> }) {
  const classes = ['combobox__clear', className].filter(Boolean).join(' ')
  return <BaseCombobox.Clear ref={ref} className={classes} {...props} />
}

function Positioner({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.Positioner>, 'className'> & {     className?: string   } & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['combobox__positioner', className].filter(Boolean).join(' ')
  return <BaseCombobox.Positioner ref={ref} className={classes} {...props} />
}

function Popup({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.Popup>, 'className'> & { className?: string } & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['combobox__popup', className].filter(Boolean).join(' ')
  return <BaseCombobox.Popup ref={ref} className={classes} {...props} />
}

const List = BaseCombobox.List

function Item({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.Item>, 'className'> & { className?: string } & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['combobox__item', className].filter(Boolean).join(' ')
  return <BaseCombobox.Item ref={ref} className={classes} {...props} />
}

function ItemIndicator({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.ItemIndicator>, 'className'> & {     className?: string   } & { ref?: React.Ref<HTMLSpanElement> }) {
  const classes = ['combobox__item-indicator', className].filter(Boolean).join(' ')
  return <BaseCombobox.ItemIndicator ref={ref} className={classes} {...props} />
}

function Empty({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.Empty>, 'className'> & { className?: string } & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['combobox__empty', className].filter(Boolean).join(' ')
  return <BaseCombobox.Empty ref={ref} className={classes} {...props} />
}

function Group({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.Group>, 'className'> & { className?: string } & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['combobox__group', className].filter(Boolean).join(' ')
  return <BaseCombobox.Group ref={ref} className={classes} {...props} />
}

function GroupLabel({ className = '', ref, ...props }: Omit<React.ComponentPropsWithRef<typeof BaseCombobox.GroupLabel>, 'className'> & {     className?: string   } & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['combobox__group-label', className].filter(Boolean).join(' ')
  return <BaseCombobox.GroupLabel ref={ref} className={classes} {...props} />
}

export const Combobox = {
  Root,
  Input,
  Trigger,
  Clear,
  Portal: BaseCombobox.Portal,
  Positioner,
  Popup,
  List,
  Item,
  ItemIndicator,
  Empty,
  Group,
  GroupLabel,
}
