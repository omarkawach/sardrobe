import { Button as BaseButton } from '@base-ui/react/button'
import type { ComponentPropsWithoutRef } from 'react'

export type ButtonVariant = 'normal' | 'outline' | 'ghost' | 'link'

export type ButtonColor = 'neutral' | 'primary' | 'destructive'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon'

export interface ButtonProps extends ComponentPropsWithoutRef<typeof BaseButton> {
    variant?: ButtonVariant

    color?: ButtonColor

    size?: ButtonSize
}

export function Button({ variant = 'normal', color = 'primary', size = 'md', className, ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
    const classes = [
      'button',
      `button--${variant}`,
      `button--${color}`,
      `button--${size}`,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return <BaseButton ref={ref} className={classes} {...props} />
}
