import * as React from 'react'
import { Menu as BaseMenu } from '@base-ui/react/menu'

export interface MenuProps extends React.ComponentPropsWithoutRef<typeof BaseMenu.Root> {}

export interface MenuTriggerProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger>,
  'className'
> {
    className?: string
}

export interface MenuPortalProps extends React.ComponentPropsWithoutRef<typeof BaseMenu.Portal> {}

export interface MenuPositionerProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner>,
  'className'
> {
    className?: string
}

export interface MenuPopupProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.Popup>,
  'className'
> {
    className?: string
}

export interface MenuItemProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.Item>,
  'className'
> {
    className?: string
}

export interface MenuGroupProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.Group>,
  'className'
> {
    className?: string
}

export interface MenuGroupLabelProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel>,
  'className'
> {
    className?: string
}

export interface MenuArrowProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.Arrow>,
  'className'
> {
    className?: string
}

export interface MenuSeparatorProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>,
  'className'
> {
    className?: string
}

export interface MenuRadioGroupProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.RadioGroup>,
  'className'
> {
    className?: string
}

export interface MenuRadioItemProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.RadioItem>,
  'className'
> {
    className?: string
}

export interface MenuRadioItemIndicatorProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.RadioItemIndicator>,
  'className'
> {
    className?: string
}

export interface MenuCheckboxItemProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem>,
  'className'
> {
    className?: string
}

export interface MenuCheckboxItemIndicatorProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItemIndicator>,
  'className'
> {
    className?: string
}

export interface MenuSubmenuTriggerProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger>,
  'className'
> {
    className?: string
}

const MenuRoot = (props: MenuProps) => {
  return <BaseMenu.Root {...props} />
}

function MenuTrigger({ className = '', ref, ...props }: MenuTriggerProps & { ref?: React.Ref<HTMLButtonElement> }) {
    const classes = ['menu__trigger', className].filter(Boolean).join(' ')
    return <BaseMenu.Trigger ref={ref} className={classes} {...props} />
}

const MenuPortal = (props: MenuPortalProps) => {
  return <BaseMenu.Portal {...props} />
}

function MenuPositioner({ className = '', ref, ...props }: MenuPositionerProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__positioner', className].filter(Boolean).join(' ')
    return <BaseMenu.Positioner ref={ref} className={classes} {...props} />
}

function MenuPopup({ className = '', ref, ...props }: MenuPopupProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__popup', className].filter(Boolean).join(' ')
    return <BaseMenu.Popup ref={ref} className={classes} {...props} />
}

function MenuItem({ className = '', ref, ...props }: MenuItemProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__item', className].filter(Boolean).join(' ')
    return <BaseMenu.Item ref={ref} className={classes} {...props} />
}

function MenuGroup({ className = '', ref, ...props }: MenuGroupProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__group', className].filter(Boolean).join(' ')
    return <BaseMenu.Group ref={ref} className={classes} {...props} />
}

function MenuGroupLabel({ className = '', ref, ...props }: MenuGroupLabelProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__group-label', className].filter(Boolean).join(' ')
    return <BaseMenu.GroupLabel ref={ref} className={classes} {...props} />
}

function MenuArrow({ className = '', ref, ...props }: MenuArrowProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__arrow', className].filter(Boolean).join(' ')
    return <BaseMenu.Arrow ref={ref} className={classes} {...props} />
}

function MenuSeparator({ className = '', ref, ...props }: MenuSeparatorProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__separator', className].filter(Boolean).join(' ')
    return <BaseMenu.Separator ref={ref} className={classes} {...props} />
}

function MenuRadioGroup({ className = '', ref, ...props }: MenuRadioGroupProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__radio-group', className].filter(Boolean).join(' ')
    return <BaseMenu.RadioGroup ref={ref} className={classes} {...props} />
}

function MenuRadioItem({ className = '', ref, ...props }: MenuRadioItemProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__radio-item', className].filter(Boolean).join(' ')
    return <BaseMenu.RadioItem ref={ref} className={classes} {...props} />
}

function MenuRadioItemIndicator({ className = '', keepMounted = true, ref, ...props }: MenuRadioItemIndicatorProps & { ref?: React.Ref<HTMLSpanElement> }) {
    const classes = ['menu__radio-indicator', className].filter(Boolean).join(' ')
    return <BaseMenu.RadioItemIndicator ref={ref} className={classes} keepMounted={keepMounted} {...props} />
}

function MenuCheckboxItem({ className = '', ref, ...props }: MenuCheckboxItemProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__checkbox-item', className].filter(Boolean).join(' ')
    return <BaseMenu.CheckboxItem ref={ref} className={classes} {...props} />
}

function MenuCheckboxItemIndicator({ className = '', ref, ...props }: MenuCheckboxItemIndicatorProps & { ref?: React.Ref<HTMLSpanElement> }) {
    const classes = ['menu__checkbox-indicator', className].filter(Boolean).join(' ')
    return <BaseMenu.CheckboxItemIndicator ref={ref} className={classes} {...props} />
}

function MenuSubmenuTrigger({ className = '', ref, ...props }: MenuSubmenuTriggerProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['menu__submenu-trigger', className].filter(Boolean).join(' ')
    return <BaseMenu.SubmenuTrigger ref={ref} className={classes} {...props} />
}

export const Menu = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Portal: MenuPortal,
  Positioner: MenuPositioner,
  Popup: MenuPopup,
  Item: MenuItem,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  Arrow: MenuArrow,
  Separator: MenuSeparator,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  RadioItemIndicator: MenuRadioItemIndicator,
  CheckboxItem: MenuCheckboxItem,
  CheckboxItemIndicator: MenuCheckboxItemIndicator,
  SubmenuTrigger: MenuSubmenuTrigger,
}
