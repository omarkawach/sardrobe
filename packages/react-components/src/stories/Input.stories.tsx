import type { Meta, StoryObj } from '@storybook/react'
import { Input } from '../components/Input'

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
      description: 'Input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Text: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
    'aria-label': 'Text input',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Input {...args} />
    </div>
  ),
}

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'you@example.com',
    'aria-label': 'Email input',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Input {...args} />
    </div>
  ),
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
    'aria-label': 'Password input',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Input {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    type: 'text',
    placeholder: 'Disabled input',
    disabled: true,
    'aria-label': 'Disabled input',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Input {...args} />
    </div>
  ),
}

export const WithValue: Story = {
  args: {
    type: 'text',
    defaultValue: 'Pre-filled value',
    'aria-label': 'Pre-filled input',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Input {...args} />
    </div>
  ),
}
