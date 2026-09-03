import * as React from 'react'
import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'

export interface AlertDialogProps extends React.ComponentPropsWithRef<
  typeof BaseAlertDialog.Root
> {}

export interface AlertDialogTriggerProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseAlertDialog.Trigger>,
  'className'
> {
  className?: string
}

export interface AlertDialogBackdropProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseAlertDialog.Backdrop>,
  'className'
> {
  className?: string
}

export interface AlertDialogPopupProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseAlertDialog.Popup>,
  'className'
> {
  className?: string
    size?: 'sm' | 'md' | 'lg'
}

export interface AlertDialogTitleProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseAlertDialog.Title>,
  'className'
> {
  className?: string
}

export interface AlertDialogDescriptionProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseAlertDialog.Description>,
  'className'
> {
  className?: string
}

export interface AlertDialogCloseProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseAlertDialog.Close>,
  'className'
> {
  className?: string
    variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'
}

export const AlertDialog = BaseAlertDialog.Root

export function AlertDialogTrigger({ className = '', ref, ...props }: AlertDialogTriggerProps & { ref?: React.Ref<HTMLButtonElement> }) {
    const classes = ['alert-dialog__trigger', className].filter(Boolean).join(' ')
    return <BaseAlertDialog.Trigger ref={ref} className={classes} {...props} />
}

export const AlertDialogPortal = BaseAlertDialog.Portal

export function AlertDialogBackdrop({ className = '', ref, ...props }: AlertDialogBackdropProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['alert-dialog__backdrop', className].filter(Boolean).join(' ')
    return <BaseAlertDialog.Backdrop ref={ref} className={classes} {...props} />
}

export function AlertDialogPopup({ size = 'md', className = '', ref, ...props }: AlertDialogPopupProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = [
      'alert-dialog__popup',
      size !== 'md' && `alert-dialog__popup--${size}`,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return <BaseAlertDialog.Popup ref={ref} className={classes} {...props} />
}

export function AlertDialogTitle({ className = '', ref, ...props }: AlertDialogTitleProps & { ref?: React.Ref<HTMLHeadingElement> }) {
    const classes = ['alert-dialog__title', className].filter(Boolean).join(' ')
    return <BaseAlertDialog.Title ref={ref} className={classes} {...props} />
}

export function AlertDialogDescription({ className = '', ref, ...props }: AlertDialogDescriptionProps & { ref?: React.Ref<HTMLParagraphElement> }) {
  const classes = ['alert-dialog__description', className].filter(Boolean).join(' ')
  return <BaseAlertDialog.Description ref={ref} className={classes} {...props} />
}

export function AlertDialogClose({ variant = 'secondary', className = '', ref, ...props }: AlertDialogCloseProps & { ref?: React.Ref<HTMLButtonElement> }) {
    const classes = ['alert-dialog__action', `alert-dialog__action--${variant}`, className]
      .filter(Boolean)
      .join(' ')

    return <BaseAlertDialog.Close ref={ref} className={classes} {...props} />
}
