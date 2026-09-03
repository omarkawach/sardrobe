import * as React from 'react'
import { Input as BaseInput } from '@base-ui/react/input'
import type { InputProps as BaseInputProps } from '@base-ui/react/input'

export interface InputProps extends Omit<BaseInputProps, 'className'> {
    className?: string
}

export function Input({ className = '', ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
    const classes = ['input', className].filter(Boolean).join(' ')

    return <BaseInput ref={ref} className={classes} {...props} />
}
