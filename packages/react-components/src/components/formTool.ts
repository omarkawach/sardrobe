import type {} from 'webmcp-types'
import { flushSync } from 'react-dom'
import { useEffect, useRef, type RefObject } from 'react'

export type FormToolDefinition = { name: string; title?: string; description: string }

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

function controls(form: HTMLFormElement) {
  return Array.from(form.elements).filter((element): element is Control =>
    (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)
    && Boolean(element.name) && !element.matches(':disabled, [readonly]')
    && !['hidden', 'file', 'submit', 'button', 'reset', 'image'].includes(element.type),
  )
}

function definition(form: HTMLFormElement, tool: FormToolDefinition | undefined) {
  if (!tool) return null
  const properties: Record<string, object> = {}
  const required: string[] = []
  for (const control of controls(form)) {
    const description = control.getAttribute('aria-description')
      ?? control.labels?.[0]?.textContent?.trim() ?? control.name
    const values = control instanceof HTMLSelectElement
      ? Array.from(control.options).filter((option) => !option.disabled).map((option) => option.value)
      : null
    const scalar = { type: 'string', ...(values ? { enum: values } : {}) }
    properties[control.name] = {
      ...(control instanceof HTMLSelectElement && control.multiple
        ? { type: 'array', items: scalar }
        : control.type === 'checkbox' ? { type: 'boolean' }
        : control.type === 'number' ? { type: 'number' } : scalar),
      description,
    }
    if (control.required) required.push(control.name)
  }
  return {
    ...tool,
    inputSchema: { type: 'object', properties, required, additionalProperties: false },
  }
}

function fill(form: HTMLFormElement, input: Record<string, unknown>) {
  const fields = controls(form)
  for (const name of Object.keys(input)) {
    if (!fields.some((control) => control.name === name)) throw new TypeError(`Unknown form field: ${name}`)
  }
  // Apply native controls in DOM order so dependent React fields stay in sync.
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(input, field.name)) continue
    const value = input[field.name]
    const control = controls(form).find((candidate) => candidate.name === field.name)
    if (!control) throw new TypeError(`Form field is unavailable: ${field.name}`)
    if (control instanceof HTMLSelectElement) {
      const values = control.multiple ? value : [value]
      if (!Array.isArray(values) || values.some((entry) => typeof entry !== 'string'
        || !Array.from(control.options).some((option) => !option.disabled && option.value === entry))) {
        throw new TypeError(`Choose an allowed value for ${control.name}`)
      }
      for (const option of control.options) option.selected = values.includes(option.value)
    } else if (control.type === 'checkbox') {
      if (typeof value !== 'boolean') throw new TypeError(`${control.name} must be a boolean`)
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')!.set!
      setter.call(control, value)
    } else {
      if (control.type === 'number' ? typeof value !== 'number' || !Number.isFinite(value) : typeof value !== 'string') {
        throw new TypeError(`${control.name} has an invalid value`)
      }
      const prototype = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(control, String(value))
      if (control.type === 'date' && control.value !== value) throw new TypeError(`${control.name} must be a valid calendar date`)
    }
    flushSync(() => {
      control.dispatchEvent(new Event('input', { bubbles: true }))
      control.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
}

// Register explicit imperative tools. Native controls supply allowed values and
// controlled React state; tool calls and human submissions share one save handler.
function connectFormTool(form: HTMLFormElement, getTool: () => FormToolDefinition | undefined, submit: () => Promise<unknown>) {
  let controller: AbortController | undefined
  let signature = ''
  let active = 0
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let observedContext: WebMCP.ModelContext | undefined

  const sync = () => {
    if (active) return
    if (disposed) { controller?.abort(); return }
    const context = document.modelContext
    if (!context) return
    if (observedContext !== context) {
      observedContext?.removeEventListener('toolchange', sync)
      observedContext = context
      context.addEventListener('toolchange', sync)
    }
    const tool = definition(form, getTool())
    const next = JSON.stringify(tool)
    if (signature === next) return
    signature = next
    controller?.abort()
    if (!tool) return
    const registration = controller = new AbortController()
    void context.registerTool({
      ...tool,
      execute: async (input, { signal }) => {
        signal.throwIfAborted()
        if (active) throw new Error('This form is still submitting. Wait for it to finish.')
        active++
        try {
          // Confirmation belongs to this attempt, even if filling later fails.
          const confirmation = form.elements.namedItem('confirm')
          if (confirmation instanceof HTMLInputElement) confirmation.checked = false
          const action = form.elements.namedItem('action')
          if (action instanceof HTMLSelectElement) {
            action.value = Array.from(action.options).find((option) => option.defaultSelected)?.value ?? action.options[0]?.value ?? ''
          }
          fill(form, input)
          return await submit()
        } finally {
          active--
          // Let the context settle the result before retiring a form removed by its save.
          timer = setTimeout(sync, 0)
        }
      },
    }, { signal: registration.signal }).catch((error) => {
      if (!registration.signal.aborted) {
        signature = ''
        console.warn(`Could not register form tool ${tool.name}.`, error)
      }
    })
  }
  const observer = new MutationObserver(sync)
  observer.observe(form, { subtree: true, childList: true, characterData: true, attributes: true })
  // Parent effects install WebMCP after child effects in a freshly mounted workspace.
  queueMicrotask(sync)
  return {
    refresh: sync,
    disconnect: () => {
      disposed = true
      observer.disconnect()
      observedContext?.removeEventListener('toolchange', sync)
      clearTimeout(timer)
      if (!active) controller?.abort()
    },
  }
}

export function useFormTool(formRef: RefObject<HTMLFormElement | null>, tool: FormToolDefinition | undefined, submit: () => Promise<unknown>) {
  const toolRef = useRef(tool)
  toolRef.current = tool
  const submitRef = useRef(submit)
  submitRef.current = submit
  const connection = useRef<ReturnType<typeof connectFormTool> | null>(null)
  useEffect(() => {
    if (!formRef.current) return
    const registered = connectFormTool(formRef.current, () => toolRef.current, () => submitRef.current())
    connection.current = registered
    return () => { registered.disconnect(); connection.current = null }
  }, [formRef])
  useEffect(() => { connection.current?.refresh() })
}
