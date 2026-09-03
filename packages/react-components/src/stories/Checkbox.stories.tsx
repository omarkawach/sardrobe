import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Checkbox } from '../components/Checkbox'

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Checked state',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = {
  args: {
    defaultChecked: false,
    'aria-label': 'Example checkbox',
  },
}

export const Checked: Story = {
  args: {
    defaultChecked: true,
    'aria-label': 'Example checkbox',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    'aria-label': 'Disabled checkbox',
  },
}

export const DisabledChecked: Story = {
  args: {
    checked: true,
    disabled: true,
    'aria-label': 'Disabled checked checkbox',
  },
}

export const WithLabel: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Checkbox
          id="terms"
          checked={checked}
          onCheckedChange={setChecked}
          aria-label="I agree to the terms and conditions"
        />
        <label htmlFor="terms" style={{ marginBottom: 0, cursor: 'pointer' }}>
          I agree to the terms and conditions
        </label>
      </div>
    )
  },
}

export const Indeterminate: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Checkbox id="indeterminate" indeterminate aria-label="Select all" />
      <label htmlFor="indeterminate" style={{ marginBottom: 0, cursor: 'pointer' }}>
        Select all (indeterminate)
      </label>
    </div>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Checkbox
            id="controlled"
            checked={checked}
            onCheckedChange={setChecked}
            aria-label="Toggle checkbox"
          />
          <label htmlFor="controlled" style={{ marginBottom: 0, cursor: 'pointer' }}>
            Toggle me {checked ? '✓' : ''}
          </label>
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          State: {checked ? 'Checked' : 'Unchecked'}
        </p>
      </div>
    )
  },
}
