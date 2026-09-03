import type { Meta, StoryObj } from '@storybook/react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
  TooltipArrow,
} from '../components/Tooltip'
import { Button } from '../components/Button'

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button color="primary" />}>Hover me</TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner side="top" sideOffset={4}>
          <TooltipPopup>This is a tooltip</TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  ),
}

export const WithArrow: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button color="neutral" />}>Hover me</TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner side="top" sideOffset={8}>
          <TooltipPopup>
            <TooltipArrow />
            Tooltip with arrow
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  ),
}

export const AllSides: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 200px)',
        gap: '4rem',
        padding: '4rem',
      }}
    >
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="sm" />}>Top</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="top" sideOffset={4}>
            <TooltipPopup>Tooltip on top</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="sm" />}>Right</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="right" sideOffset={4}>
            <TooltipPopup>Tooltip on right</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="sm" />}>Bottom</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="bottom" sideOffset={4}>
            <TooltipPopup>Tooltip on bottom</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="sm" />}>Left</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="left" sideOffset={4}>
            <TooltipPopup>Tooltip on left</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </div>
  ),
}

export const LongContent: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button color="primary" />}>Hover for more info</TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner side="top" sideOffset={4}>
          <TooltipPopup>
            This is a longer tooltip with multiple lines of text.
            <br />
            It can contain formatted content and wraps appropriately.
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  ),
}

export const OnIcon: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label="Help information"
            style={{
              padding: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '0.375rem',
              transition: 'background-color 0.2s',
              color: 'var(--text-secondary)',
            }}
          />
        }
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="8" />
          <line x1="10" y1="14" x2="10" y2="10" />
          <line x1="10" y1="6" x2="10.01" y2="6" />
        </svg>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner side="bottom" sideOffset={4}>
          <TooltipPopup>Help information</TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  ),
}

export const Interactive: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Tooltip>
        <TooltipTrigger render={<Button color="primary" size="sm" />}>Save</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="bottom" sideOffset={4}>
            <TooltipPopup>Save changes</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger render={<Button color="destructive" size="sm" />}>Delete</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="bottom" sideOffset={4}>
            <TooltipPopup>Delete permanently</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="sm" />}>Export</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="bottom" sideOffset={4}>
            <TooltipPopup>
              <TooltipArrow />
              Export as GeoJSON
            </TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </div>
  ),
}
