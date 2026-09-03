import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Checkbox } from '../components/Checkbox'
import { Input } from '../components/Input'
import { Progress, ProgressTrack, ProgressIndicator } from '../components/Progress'

const meta = {
  title: 'A11y/Regression Tests',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj

export const FormLabels: Story = {
  render: () => (
    <form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label htmlFor="a11y-name">Full name</label>
        <Input id="a11y-name" type="text" autoComplete="name" />
        <label htmlFor="a11y-email">Email address</label>
        <Input id="a11y-email" type="email" autoComplete="email" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Checkbox id="a11y-terms" />
          <label htmlFor="a11y-terms">I agree to the terms of service</label>
        </div>
        <Button type="submit" color="primary">Submit form</Button>
      </div>
    </form>
  ),
}

export const ButtonAccessibleNames: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Button color="primary">Save changes</Button>
      <Button color="neutral" variant="outline">Cancel</Button>
      <Button color="destructive" variant="ghost" aria-label="Delete item" size="icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" />
        </svg>
      </Button>
    </div>
  ),
}

export const ColorContrastMatrix: Story = {
  render: () => {
    const variants = ['normal', 'outline', 'ghost'] as const
    const colors = ['primary', 'neutral', 'destructive'] as const

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {variants.map((variant) => (
          <div key={variant} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ width: '4rem', fontSize: '0.75rem' }}>{variant}</span>
            {colors.map((color) => (
              <Button key={`${variant}-${color}`} variant={variant} color={color}>{color}</Button>
            ))}
          </div>
        ))}
      </div>
    )
  },
}

export const InteractiveCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: '40rem' }}>
      <Card>
        <h3>Everyday capsule</h3>
        <p>Simple pieces for daily wear.</p>
        <Button color="primary" variant="outline">Open capsule</Button>
      </Card>
      <Card>
        <h3>Travel capsule</h3>
        <p>Saved pieces for the next trip.</p>
        <Button color="primary">Open capsule</Button>
      </Card>
    </div>
  ),
}

export const ProgressWithLabel: Story = {
  render: () => (
    <div style={{ maxWidth: '20rem' }}>
      <span id="upload-label">Upload progress</span>
      <Progress value={65} aria-labelledby="upload-label">
        <ProgressTrack><ProgressIndicator /></ProgressTrack>
      </Progress>
    </div>
  ),
}
