import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
} from '../components/Dialog'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectOption,
} from '../components/Select'

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button color="primary" onClick={() => setOpen(true)}>
          Open Dialog
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>
                This is a description of what the dialog is for.
              </DialogDescription>

              <div
                style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                }}
              >
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" onClick={() => setOpen(false)}>
                  Confirm
                </Button>
              </div>
            </DialogPopup>
          </DialogPortal>
        </Dialog>
      </>
    )
  },
}

export const SmallSize: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button color="neutral" onClick={() => setOpen(true)}>
          Open Small Dialog
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup size="sm">
              <DialogTitle>Small Dialog</DialogTitle>
              <DialogDescription>
                This is a smaller dialog for simple confirmations.
              </DialogDescription>

              <div
                style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                }}
              >
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button color="destructive" size="sm" onClick={() => setOpen(false)}>
                  Delete
                </Button>
              </div>
            </DialogPopup>
          </DialogPortal>
        </Dialog>
      </>
    )
  },
}

export const LargeSize: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button color="primary" onClick={() => setOpen(true)}>
          Open Large Dialog
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup size="lg">
              <DialogTitle>Large Dialog</DialogTitle>
              <DialogDescription>
                This is a larger dialog for more complex content.
              </DialogDescription>

              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <p style={{ margin: 0 }}>
                  This dialog can contain more detailed information, forms, or other complex content
                  that needs more space to display properly.
                </p>
              </div>

              <div
                style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                }}
              >
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" onClick={() => setOpen(false)}>
                  Save
                </Button>
              </div>
            </DialogPopup>
          </DialogPortal>
        </Dialog>
      </>
    )
  },
}

export const WithForm: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      console.log({ name, email })
      setOpen(false)
    }

    return (
      <>
        <Button color="primary" onClick={() => setOpen(true)}>
          Edit Profile
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup size="md">
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>Update your profile information below.</DialogDescription>

              <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <label htmlFor="name">Name</label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email">Email</label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '1.5rem',
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" color="primary">
                    Save Changes
                  </Button>
                </div>
              </form>
            </DialogPopup>
          </DialogPortal>
        </Dialog>
      </>
    )
  },
}

export const DangerConfirmation: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button color="destructive" onClick={() => setOpen(true)}>
          Delete Account
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup size="sm">
              <DialogTitle>Delete Account?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account and remove
                your data from our servers.
              </DialogDescription>

              <div
                style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                }}
              >
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button color="destructive" onClick={() => setOpen(false)}>
                  Delete Account
                </Button>
              </div>
            </DialogPopup>
          </DialogPortal>
        </Dialog>
      </>
    )
  },
}

export const WithSelect: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState('option2')

    return (
      <>
        <Button onClick={() => setOpen(true)}>Select options</Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup size="sm">
              <DialogTitle>Pick an option</DialogTitle>
              <Select value={value} onValueChange={(v) => setValue(v as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner sideOffset={4}>
                    <SelectPopup>
                      <SelectList>
                        <SelectOption value="option1">Option 1</SelectOption>
                        <SelectOption value="option2">Option 2</SelectOption>
                        <SelectOption value="option3">Option 3</SelectOption>
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </Select>
            </DialogPopup>
          </DialogPortal>
        </Dialog>
      </>
    )
  },
}
