import * as React from 'react'
import { Progress as BaseProgress } from '@base-ui/react/progress'

export type ProgressColor = 'primary' | 'success' | 'warning' | 'destructive'

export interface ProgressProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseProgress.Root>,
  'className'
> {
  className?: string
    color?: ProgressColor
}

export interface ProgressTrackProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseProgress.Track>,
  'className'
> {
  className?: string
}

export interface ProgressIndicatorProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseProgress.Indicator>,
  'className'
> {
  className?: string
}

export function Progress({ color = 'primary', className = '', ref, ...props }: ProgressProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['progress', `progress--${color}`, className].filter(Boolean).join(' ')

    return <BaseProgress.Root ref={ref} className={classes} {...props} />
}

export function ProgressTrack({ className = '', ref, ...props }: ProgressTrackProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['progress__track', className].filter(Boolean).join(' ')
    return <BaseProgress.Track ref={ref} className={classes} {...props} />
}

export function ProgressIndicator({ className = '', ref, ...props }: ProgressIndicatorProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['progress__indicator', className].filter(Boolean).join(' ')
    return <BaseProgress.Indicator ref={ref} className={classes} {...props} />
}
