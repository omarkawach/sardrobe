import type { Meta, StoryObj } from '@storybook/react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    hover: {
      control: 'boolean',
      description: 'Enable hover animation',
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    hover: false,
  },
  render: (args) => (
    <Card {...args}>
      <h3 style={{ marginTop: 0 }}>Card Title</h3>
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
        This is a basic card with some content inside.
      </p>
    </Card>
  ),
}

export const WithHover: Story = {
  args: {
    hover: true,
  },
  render: (args) => (
    <Card {...args}>
      <h3 style={{ marginTop: 0 }}>Hover Me!</h3>
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
        This card has a hover effect. Try hovering over it!
      </p>
    </Card>
  ),
}

export const WithButton: Story = {
  args: {
    hover: false,
  },
  render: (args) => (
    <Card {...args}>
      <h3 style={{ marginTop: 0 }}>Card with Action</h3>
      <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
        Cards can contain any content, including buttons.
      </p>
      <Button color="primary">Click Me</Button>
    </Card>
  ),
}

export const LongContent: Story = {
  args: {
    hover: false,
  },
  render: (args) => (
    <Card {...args} style={{ maxWidth: '400px' }}>
      <h3 style={{ marginTop: 0 }}>Feature Card</h3>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        This card contains longer content to demonstrate how cards handle multiple paragraphs and
        more complex layouts.
      </p>
      <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Cards maintain consistent spacing and styling regardless of content length.
      </p>
    </Card>
  ),
}

export const Grid: Story = {
  args: {
    hover: true,
  },
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        maxWidth: '600px',
      }}
    >
      <Card {...args}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Feature 1</h4>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Interactive mapping
        </p>
      </Card>
      <Card {...args}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Feature 2</h4>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Real-time collaboration
        </p>
      </Card>
      <Card {...args}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Feature 3</h4>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Personal dashboards
        </p>
      </Card>
      <Card {...args}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Feature 4</h4>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Cloudflare powered
        </p>
      </Card>
    </div>
  ),
}
