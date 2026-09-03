import * as React from 'react'
import { Avatar as BaseAvatar } from '@base-ui/react/avatar'

export interface AvatarRootProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Root>,
  'className'
> {
    className?: string
}

export interface AvatarImageProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Image>,
  'className'
> {
    className?: string
}

export interface AvatarFallbackProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Fallback>,
  'className'
> {
    className?: string
}

function AvatarRoot({ className = '', ref, ...props }: AvatarRootProps & { ref?: React.Ref<HTMLSpanElement> }) {
    const classes = ['avatar', className].filter(Boolean).join(' ')
    return <BaseAvatar.Root ref={ref} className={classes} {...props} />
}

function AvatarImage({ className = '', ref, ...props }: AvatarImageProps & { ref?: React.Ref<HTMLImageElement> }) {
    const classes = ['avatar__image', className].filter(Boolean).join(' ')
    return <BaseAvatar.Image ref={ref} className={classes} {...props} />
}

function AvatarFallback({ className = '', ref, ...props }: AvatarFallbackProps & { ref?: React.Ref<HTMLSpanElement> }) {
    const classes = ['avatar__fallback', className].filter(Boolean).join(' ')
    return <BaseAvatar.Fallback ref={ref} className={classes} {...props} />
}

export const Avatar = {
  Root: AvatarRoot,
  Image: AvatarImage,
  Fallback: AvatarFallback,
}
