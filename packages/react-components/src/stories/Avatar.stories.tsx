import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from '../components/Avatar'

const meta = {
  title: 'Components/Avatar',
  component: Avatar.Root,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar.Root>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Avatar.Root>
      <Avatar.Image
        src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=128&h=128&fit=crop"
        alt="User avatar"
      />
      <Avatar.Fallback>JD</Avatar.Fallback>
    </Avatar.Root>
  ),
}

export const WithFallback: Story = {
  render: () => (
    <Avatar.Root>
      <Avatar.Image src="/non-existent-image.jpg" alt="User avatar" />
      <Avatar.Fallback>AB</Avatar.Fallback>
    </Avatar.Root>
  ),
}

export const FallbackOnly: Story = {
  render: () => (
    <Avatar.Root>
      <Avatar.Fallback>MK</Avatar.Fallback>
    </Avatar.Root>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Avatar.Root style={{ width: '2rem', height: '2rem' }}>
        <Avatar.Image
          src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=64&h=64&fit=crop"
          alt="Small avatar"
        />
        <Avatar.Fallback style={{ fontSize: '0.75rem' }}>SM</Avatar.Fallback>
      </Avatar.Root>

      <Avatar.Root>
        <Avatar.Image
          src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=128&h=128&fit=crop"
          alt="Medium avatar"
        />
        <Avatar.Fallback>MD</Avatar.Fallback>
      </Avatar.Root>

      <Avatar.Root style={{ width: '4rem', height: '4rem' }}>
        <Avatar.Image
          src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=256&h=256&fit=crop"
          alt="Large avatar"
        />
        <Avatar.Fallback style={{ fontSize: '1.25rem' }}>LG</Avatar.Fallback>
      </Avatar.Root>

      <Avatar.Root style={{ width: '6rem', height: '6rem' }}>
        <Avatar.Image
          src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=384&h=384&fit=crop"
          alt="Extra large avatar"
        />
        <Avatar.Fallback style={{ fontSize: '1.5rem' }}>XL</Avatar.Fallback>
      </Avatar.Root>
    </div>
  ),
}

export const Group: Story = {
  render: () => (
    <div style={{ display: 'flex' }}>
      <Avatar.Root style={{ marginLeft: 0 }}>
        <Avatar.Image
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop"
          alt="User 1"
        />
        <Avatar.Fallback>U1</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root
        style={{
          marginLeft: '-0.75rem',
          border: '2px solid hsl(var(--background))',
        }}
      >
        <Avatar.Image
          src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&h=128&fit=crop"
          alt="User 2"
        />
        <Avatar.Fallback>U2</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root
        style={{
          marginLeft: '-0.75rem',
          border: '2px solid hsl(var(--background))',
        }}
      >
        <Avatar.Image
          src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=128&h=128&fit=crop"
          alt="User 3"
        />
        <Avatar.Fallback>U3</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root
        style={{
          marginLeft: '-0.75rem',
          border: '2px solid hsl(var(--background))',
        }}
      >
        <Avatar.Fallback>+5</Avatar.Fallback>
      </Avatar.Root>
    </div>
  ),
}

export const WithDelayedFallback: Story = {
  render: () => (
    <Avatar.Root>
      <Avatar.Image src="/very-slow-loading-image.jpg" alt="Slow image" />
      <Avatar.Fallback delay={500}>...</Avatar.Fallback>
    </Avatar.Root>
  ),
}

export const SquareAvatar: Story = {
  render: () => (
    <Avatar.Root style={{ borderRadius: 'var(--radius)' }}>
      <Avatar.Image
        src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=128&h=128&fit=crop"
        alt="Square avatar"
      />
      <Avatar.Fallback>SQ</Avatar.Fallback>
    </Avatar.Root>
  ),
}
