import * as React from 'react'

const hiddenStyle: React.CSSProperties = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0 }

export type FormOption = { value: string; label: React.ReactNode }
export type NativeSelectProps = {
  formOptions?: readonly FormOption[]
  formLabel?: string
}

// Named controls retain native option and array semantics alongside the existing UI.
export function FormSelect({ options, label, onChange, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: readonly FormOption[]; label?: string
}) {
  const ref = React.useRef<HTMLSelectElement>(null)
  const initialValue = React.useRef(props.defaultValue ?? props.value)
  React.useEffect(() => {
    const control = ref.current
    const form = control?.form
    if (!control || !form) return
    const reset = (event: Event) => queueMicrotask(() => {
      if (event.defaultPrevented) return
      const values = Array.isArray(initialValue.current) ? initialValue.current.map(String) : [String(initialValue.current ?? '')]
      for (const option of control.options) option.selected = values.includes(option.value)
      control.dispatchEvent(new Event('change', { bubbles: true }))
    })
    form.addEventListener('reset', reset)
    return () => form.removeEventListener('reset', reset)
  }, [])
  return <select {...props} ref={ref} style={hiddenStyle} aria-hidden="true" tabIndex={-1} aria-description={label} onChange={onChange}>
    {!props.multiple && !props.required ? <option value="">Select {label ?? props.name}</option> : null}
    {options.map((option) => <option key={option.value} value={option.value}>{typeof option.label === 'string' || typeof option.label === 'number' ? option.label : option.value}</option>)}
  </select>
}

// Native changes supply the same public event-details shape as Base UI changes.
export function formChangeDetails(event: Event) {
  const details = { reason: 'none' as const, event, trigger: undefined as Element | undefined,
    isCanceled: false, isPropagationAllowed: false,
    cancel: () => { details.isCanceled = true }, allowPropagation: () => { details.isPropagationAllowed = true },
  }
  return details
}

declare global {
  interface SubmitEvent {
    readonly agentInvoked: boolean
    respondWith(response: Promise<unknown>): void
  }
}

export type FormSubmission = { action: string; agentInvoked: boolean; submitter: HTMLElement | null; fields: ReadonlySet<string> }
export type FormProps = Omit<React.ComponentPropsWithRef<'form'>, 'onSubmit'> & {
  toolname?: string; tooltitle?: string; tooldescription?: string; toolautosubmit?: string
  actions?: readonly string[]
  defaultAction?: string
  confirmActions?: readonly string[]
  skipValidationActions?: readonly string[]
  onSubmit: (data: FormData, submission: FormSubmission) => unknown | Promise<unknown>
  onSubmitError?: (message: string) => void
}

// Human and WebMCP submissions capture the same FormData and await the same operation.
export function Form({ onSubmit, onSubmitError, actions, defaultAction = 'save', confirmActions = [], skipValidationActions = [], children, ...props }: FormProps) {
  const pending = React.useRef(false)
  return <form {...props} noValidate={props.noValidate ?? Boolean(actions)} onSubmit={(event) => {
    event.preventDefault()
    const native = event.nativeEvent
    const data = new FormData(event.currentTarget)
    const fields = new Set(Array.from(event.currentTarget.elements)
      .filter((control) => !control.matches(':disabled'))
      .map((control) => control.getAttribute('name') ?? ''))
    const agentInvoked = native.agentInvoked === true
    const button = native.submitter as HTMLButtonElement | null
    const action = agentInvoked ? String(data.get('action') ?? defaultAction) : button?.name === 'intent' ? button.value : defaultAction
    const valid = skipValidationActions.includes(action) || event.currentTarget.checkValidity()
    const actionControl = event.currentTarget.elements.namedItem('action') as HTMLSelectElement | null
    const confirmation = event.currentTarget.elements.namedItem('confirm') as HTMLInputElement | null
    if (actionControl) actionControl.value = defaultAction
    if (confirmation) confirmation.checked = false
    const alreadyPending = pending.current
    if (!alreadyPending) pending.current = true
    const response = Promise.resolve().then(() => {
      if (alreadyPending) throw new Error('This form is still submitting. Wait for it to finish.')
      if (!valid) throw new Error('Check the required fields and their allowed values.')
      if (actions && !actions.includes(action)) throw new Error(`Choose an action from: ${actions.join(', ')}.`)
      if (agentInvoked && confirmActions.includes(action) && data.get('confirm') !== 'yes') throw new Error(`Set confirm: true to ${action}.`)
      return onSubmit(data, { action, agentInvoked, submitter: native.submitter, fields })
    }).catch((error: unknown) => {
      onSubmitError?.(error instanceof Error ? error.message : 'Could not submit this form.')
      throw error
    }).finally(() => { if (!alreadyPending) pending.current = false })
    if (agentInvoked) native.respondWith(response)
    else void response.catch(() => {})
  }}>
    {actions ? <FormSelect name="action" label="Operation to perform. Omit to use the Save button." defaultValue={defaultAction} options={actions.map((value) => ({ value, label: value }))} /> : null}
    {confirmActions.length ? <input style={hiddenStyle} aria-hidden="true" tabIndex={-1} type="checkbox" name="confirm" value="yes" aria-description={`Required true for: ${confirmActions.join(', ')}. Each attempt needs fresh confirmation.`} /> : null}
    {children}
  </form>
}
