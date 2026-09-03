import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogBackdrop,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
} from '../components/AlertDialog'
import { Button } from '../components/Button'

const meta: Meta<typeof AlertDialog> = {
  title: 'Components/AlertDialog',
  component: AlertDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AlertDialog>

export const Default: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        Open Alert Dialog
      </AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogPopup>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and remove your
            data from our servers.
          </AlertDialogDescription>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose variant="destructive">Delete Account</AlertDialogClose>
          </div>
        </AlertDialogPopup>
      </AlertDialogPortal>
    </AlertDialog>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
          Small
        </AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup size="sm">
            <AlertDialogTitle>Small Dialog</AlertDialogTitle>
            <AlertDialogDescription>
              This is a smaller alert dialog for simple confirmations.
            </AlertDialogDescription>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <AlertDialogClose>Cancel</AlertDialogClose>
              <AlertDialogClose variant="primary">Confirm</AlertDialogClose>
            </div>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" />}>Medium</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup size="md">
            <AlertDialogTitle>Medium Dialog</AlertDialogTitle>
            <AlertDialogDescription>
              This is the default size for most alert dialogs. It provides enough space for a clear
              message while remaining focused.
            </AlertDialogDescription>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <AlertDialogClose>Cancel</AlertDialogClose>
              <AlertDialogClose variant="primary">Confirm</AlertDialogClose>
            </div>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" size="lg" />}>
          Large
        </AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup size="lg">
            <AlertDialogTitle>Large Dialog</AlertDialogTitle>
            <AlertDialogDescription>
              This is a larger alert dialog for when you need to display more content or provide
              additional context to the user before they make a decision.
            </AlertDialogDescription>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <AlertDialogClose>Cancel</AlertDialogClose>
              <AlertDialogClose variant="primary">Confirm</AlertDialogClose>
            </div>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  ),
}

export const DestructiveAction: Story = {
  name: 'Destructive Action',
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button color="destructive" />}>
        Delete Project
      </AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogPopup>
          <AlertDialogTitle>Delete Project?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;My Awesome Project&quot; and all of its contents
            including files, settings, and collaborator access. This action cannot be undone.
          </AlertDialogDescription>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose variant="destructive">Yes, Delete Project</AlertDialogClose>
          </div>
        </AlertDialogPopup>
      </AlertDialogPortal>
    </AlertDialog>
  ),
}

export const SubscriptionCancel: Story = {
  name: 'Cancel Subscription',
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" />}>
        Cancel Subscription
      </AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogPopup>
          <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            Your Pro plan benefits will remain active until the end of your billing period on March
            15, 2024. After that, your account will be downgraded to the Free plan.
          </AlertDialogDescription>
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: 'var(--radius)',
              fontSize: '0.875rem',
            }}
          >
            <p style={{ margin: 0, color: 'hsl(var(--foreground))', fontWeight: 500 }}>
              You&apos;ll lose access to:
            </p>
            <ul
              style={{
                margin: '0.5rem 0 0',
                paddingLeft: '1.25rem',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              <li>Unlimited projects</li>
              <li>Priority support</li>
              <li>Advanced analytics</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <AlertDialogClose>Keep Subscription</AlertDialogClose>
            <AlertDialogClose variant="destructive">Cancel Subscription</AlertDialogClose>
          </div>
        </AlertDialogPopup>
      </AlertDialogPortal>
    </AlertDialog>
  ),
}

export const UpgradeConfirmation: Story = {
  name: 'Upgrade Confirmation',
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button />}>Upgrade to Pro</AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogPopup>
          <AlertDialogTitle>Upgrade to Pro Plan</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;re about to upgrade to the Pro plan at $29/month. Your card ending in 4242 will
            be charged immediately.
          </AlertDialogDescription>
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: 'var(--radius)',
              fontSize: '0.875rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>Pro Plan (Monthly)</span>
            <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>$29.00</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose variant="primary">Confirm Upgrade</AlertDialogClose>
          </div>
        </AlertDialogPopup>
      </AlertDialogPortal>
    </AlertDialog>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    const [confirmed, setConfirmed] = React.useState(false)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Button onClick={() => setOpen(true)}>Open Controlled Dialog</Button>

        {confirmed && (
          <p style={{ color: 'hsl(var(--success))', fontWeight: 500 }}>Action confirmed!</p>
        )}

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogPortal>
            <AlertDialogBackdrop />
            <AlertDialogPopup>
              <AlertDialogTitle>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>
                This is a controlled alert dialog. The parent component manages the open state.
              </AlertDialogDescription>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <AlertDialogClose onClick={() => setConfirmed(false)}>Cancel</AlertDialogClose>
                <AlertDialogClose variant="primary" onClick={() => setConfirmed(true)}>
                  Confirm
                </AlertDialogClose>
              </div>
            </AlertDialogPopup>
          </AlertDialogPortal>
        </AlertDialog>
      </div>
    )
  },
}
