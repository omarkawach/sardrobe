import * as React from 'react'
import { Field as BaseField } from '@base-ui/react/field'

export interface FieldRootProps extends React.ComponentPropsWithoutRef<typeof BaseField.Root> {
    className?: string
}

export interface FieldLabelProps extends React.ComponentPropsWithoutRef<typeof BaseField.Label> {
    className?: string
}

export interface FieldControlProps extends React.ComponentPropsWithoutRef<
  typeof BaseField.Control
> {
    className?: string
}

export interface FieldDescriptionProps extends React.ComponentPropsWithoutRef<
  typeof BaseField.Description
> {
    className?: string
}

export interface FieldErrorProps extends React.ComponentPropsWithoutRef<typeof BaseField.Error> {
    className?: string
}

export interface FieldValidityProps extends React.ComponentPropsWithoutRef<
  typeof BaseField.Validity
> {}

function FieldRoot({ className = '', ref, ...props }: FieldRootProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['field', className].filter(Boolean).join(' ')
    return <BaseField.Root ref={ref} className={classes} {...props} />
}

function FieldLabel({ className = '', ref, ...props }: FieldLabelProps & { ref?: React.Ref<HTMLLabelElement> }) {
    const classes = ['field__label', className].filter(Boolean).join(' ')
    return <BaseField.Label ref={ref} className={classes} {...props} />
}

function FieldControl({ className = '', ref, ...props }: FieldControlProps & { ref?: React.Ref<HTMLInputElement> }) {
    const classes = ['field__control', className].filter(Boolean).join(' ')
    return <BaseField.Control ref={ref} className={classes} {...props} />
}

function FieldDescription({ className = '', ref, ...props }: FieldDescriptionProps & { ref?: React.Ref<HTMLParagraphElement> }) {
    const classes = ['field__description', className].filter(Boolean).join(' ')
    return <BaseField.Description ref={ref} className={classes} {...props} />
}

function FieldError({ className = '', ref, ...props }: FieldErrorProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['field__error', className].filter(Boolean).join(' ')
    return <BaseField.Error ref={ref} className={classes} {...props} />
}

const FieldValidity = BaseField.Validity

export const Field = {
  Root: FieldRoot,
  Label: FieldLabel,
  Control: FieldControl,
  Description: FieldDescription,
  Error: FieldError,
  Validity: FieldValidity,
}
