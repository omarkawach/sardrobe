import * as React from 'react'
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'

export interface TooltipProps extends BaseTooltip.Root.Props {}
export interface TooltipTriggerProps extends BaseTooltip.Trigger.Props {}
export interface TooltipPortalProps extends BaseTooltip.Portal.Props {}
export interface TooltipPositionerProps extends Omit<BaseTooltip.Positioner.Props, 'className'> {
  className?: string
}

export interface TooltipPopupProps extends Omit<BaseTooltip.Popup.Props, 'className'> {
  className?: string
}

export interface TooltipArrowProps extends Omit<BaseTooltip.Arrow.Props, 'className'> {
  className?: string
}

export const Tooltip = BaseTooltip.Root
export const TooltipTrigger = BaseTooltip.Trigger
export const TooltipPortal = BaseTooltip.Portal

export function TooltipPositioner({ className = '', ref, ...props }: TooltipPositionerProps & { ref?: React.Ref<HTMLDivElement> }) {
  const classes = ['tooltip__positioner', className].filter(Boolean).join(' ')
  return <BaseTooltip.Positioner ref={ref} className={classes} {...props} />
}

export function TooltipPopup({ className = '', ref, ...props }: TooltipPopupProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['tooltip__popup', className].filter(Boolean).join(' ')
    return <BaseTooltip.Popup ref={ref} className={classes} {...props} />
}

export function TooltipArrow({ className = '', ref, ...props }: TooltipArrowProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['tooltip__arrow', className].filter(Boolean).join(' ')
    return <BaseTooltip.Arrow ref={ref} className={classes} {...props} />
}
