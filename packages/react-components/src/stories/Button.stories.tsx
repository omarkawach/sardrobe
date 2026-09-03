import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { Button } from '../components/Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['normal', 'outline', 'ghost', 'link'],
      description: 'Visual rendering style',
    },
    color: {
      control: 'select',
      options: ['neutral', 'primary', 'destructive'],
      description: 'Semantic color intent',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'icon'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    color: 'primary',
    children: 'Primary',
  },
}

export const Neutral: Story = {
  args: {
    color: 'neutral',
    children: 'Neutral',
  },
}

export const Destructive: Story = {
  args: {
    color: 'destructive',
    children: 'Destructive',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
}

export const Small: Story = {
  args: {
    color: 'primary',
    size: 'sm',
    children: 'Small',
  },
}

export const Large: Story = {
  args: {
    color: 'primary',
    size: 'lg',
    children: 'Large',
  },
}

export const Icon: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    children: '★',
  },
}

export const Disabled: Story = {
  args: {
    color: 'primary',
    disabled: true,
    children: 'Disabled',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <Button color="primary">Primary</Button>
      <Button color="primary" disabled>
        Disabled
      </Button>
      <Button color="neutral">Neutral</Button>
      <Button color="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Button color="primary" size="sm">
        Small
      </Button>
      <Button color="primary" size="md">
        Medium
      </Button>
      <Button color="primary" size="lg">
        Large
      </Button>
      <Button variant="outline" size="icon">
        ★
      </Button>
    </div>
  ),
}
