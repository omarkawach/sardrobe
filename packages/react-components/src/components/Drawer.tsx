import * as React from 'react'
import { Drawer as BaseDrawer } from '@base-ui/react/drawer'

export interface DrawerProps extends React.ComponentPropsWithoutRef<typeof BaseDrawer.Root> {}

export interface DrawerTriggerProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseDrawer.Trigger>,
  'className'
> {
  className?: string
}

export interface DrawerPortalProps extends React.ComponentPropsWithoutRef<typeof BaseDrawer.Portal> {}

export interface DrawerBackdropProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseDrawer.Backdrop>,
  'className'
> {
  className?: string
}

export interface DrawerViewportProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseDrawer.Viewport>,
  'className'
> {
  className?: string
}

export interface DrawerPopupProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseDrawer.Popup>,
  'className'
> {
  className?: string
  side?: 'left' | 'right' | 'top' | 'bottom'
  size?: 'sm' | 'md' | 'lg' | 'fullscreen'
}

export interface DrawerContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseDrawer.Content>,
  'className'
> {
  className?: string
}

export interface DrawerTitleProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseDrawer.Title>,
  'className'
> {
  className?: string
}

export interface DrawerDescriptionProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseDrawer.Description>,
  'className'
> {
  className?: string
}

export interface DrawerCloseProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseDrawer.Close>,
  'className'
> {
  className?: string
}

export const Drawer = BaseDrawer.Root
export const DrawerTrigger = BaseDrawer.Trigger
export const DrawerPortal = BaseDrawer.Portal

export function DrawerBackdrop({ className = '', ref, ...props }: DrawerBackdropProps & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['drawer__backdrop', className].filter(Boolean).join(' ')
  return <BaseDrawer.Backdrop ref={ref} className={classes} {...props} />
}

export function DrawerViewport({ className = '', ref, ...props }: DrawerViewportProps & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['drawer__viewport', className].filter(Boolean).join(' ')
  return <BaseDrawer.Viewport ref={ref} className={classes} {...props} />
}

export function DrawerPopup({
  className = '',
  side = 'right',
  size = 'md',
  ref,
  ...props
}: DrawerPopupProps & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['drawer__popup', `drawer__popup--${side}`, size !== 'md' && `drawer__popup--${size}`, className]
    .filter(Boolean)
    .join(' ')

  return <BaseDrawer.Popup ref={ref} className={classes} {...props} />
}

export function DrawerContent({ className = '', ref, ...props }: DrawerContentProps & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['drawer__content', className].filter(Boolean).join(' ')
  return <BaseDrawer.Content ref={ref} className={classes} {...props} />
}

export function DrawerTitle({ className = '', ref, ...props }: DrawerTitleProps & { ref?: React.Ref<HTMLHeadingElement> }) {
  const classes = ['drawer__title', className].filter(Boolean).join(' ')
  return <BaseDrawer.Title ref={ref} className={classes} {...props} />
}

export function DrawerDescription({
  className = '',
  ref,
  ...props
}: DrawerDescriptionProps & { ref?: React.Ref<HTMLParagraphElement> }) {
  const classes = ['drawer__description', className].filter(Boolean).join(' ')
  return <BaseDrawer.Description ref={ref} className={classes} {...props} />
}

export function DrawerClose({ className = '', ref, ...props }: DrawerCloseProps & { ref?: React.Ref<HTMLButtonElement> }) {
  const classes = ['drawer__close', className].filter(Boolean).join(' ')
  return <BaseDrawer.Close ref={ref} className={classes} {...props} />
}
