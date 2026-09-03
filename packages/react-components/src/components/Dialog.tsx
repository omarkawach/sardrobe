import * as React from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'

export interface DialogProps extends BaseDialog.Root.Props {}
export interface DialogTriggerProps extends BaseDialog.Trigger.Props {}
export interface DialogPortalProps extends BaseDialog.Portal.Props {}

export interface DialogBackdropProps extends Omit<BaseDialog.Backdrop.Props, 'className'> {
  className?: string
}

export interface DialogPopupProps extends Omit<BaseDialog.Popup.Props, 'className'> {
  className?: string
    size?: 'sm' | 'md' | 'lg' | 'fullscreen'
}

export interface DialogTitleProps extends Omit<BaseDialog.Title.Props, 'className'> {
  className?: string
}

export interface DialogDescriptionProps extends Omit<BaseDialog.Description.Props, 'className'> {
  className?: string
}

export interface DialogCloseProps extends Omit<BaseDialog.Close.Props, 'className'> {
  className?: string
}

export const Dialog = BaseDialog.Root
export const DialogTrigger = BaseDialog.Trigger
export const DialogPortal = BaseDialog.Portal

export function DialogBackdrop({ className = '', ref, ...props }: DialogBackdropProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['dialog__backdrop', className].filter(Boolean).join(' ')
    return <BaseDialog.Backdrop ref={ref} className={classes} {...props} />
}

export function DialogPopup({ size = 'md', className = '', ref, ...props }: DialogPopupProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['dialog__popup', size !== 'md' && `dialog__popup--${size}`, className]
      .filter(Boolean)
      .join(' ')
    return <BaseDialog.Popup ref={ref} className={classes} {...props} />
}

export function DialogTitle({ className = '', ref, ...props }: DialogTitleProps & { ref?: React.Ref<HTMLHeadingElement> }) {
    const classes = ['dialog__title', className].filter(Boolean).join(' ')
    return <BaseDialog.Title ref={ref} className={classes} {...props} />
}

export function DialogDescription({ className = '', ref, ...props }: DialogDescriptionProps & { ref?: React.Ref<HTMLParagraphElement> }) {
    const classes = ['dialog__description', className].filter(Boolean).join(' ')
    return <BaseDialog.Description ref={ref} className={classes} {...props} />
}

export function DialogClose({ className = '', ref, ...props }: DialogCloseProps & { ref?: React.Ref<HTMLButtonElement> }) {
    const classes = ['dialog__close', className].filter(Boolean).join(' ')
    return <BaseDialog.Close ref={ref} className={classes} {...props} />
}
