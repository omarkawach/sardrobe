import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Menu } from '../components/Menu'

const meta = {
  title: 'Components/Menu',
  component: Menu.Root,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Menu.Root>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Menu.Root>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup>
            <Menu.Item onClick={() => console.log('Edit')}>Edit</Menu.Item>
            <Menu.Item onClick={() => console.log('Duplicate')}>Duplicate</Menu.Item>
            <Menu.Separator />
            <Menu.Item onClick={() => console.log('Archive')}>Archive</Menu.Item>
            <Menu.Item onClick={() => console.log('Delete')}>Delete</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  ),
}

export const WithGroups: Story = {
  render: () => (
    <Menu.Root>
      <Menu.Trigger>File</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup>
            <Menu.Group>
              <Menu.GroupLabel>Document</Menu.GroupLabel>
              <Menu.Item>New File</Menu.Item>
              <Menu.Item>Open...</Menu.Item>
              <Menu.Item>Save</Menu.Item>
            </Menu.Group>
            <Menu.Separator />
            <Menu.Group>
              <Menu.GroupLabel>Export</Menu.GroupLabel>
              <Menu.Item>Export as PDF</Menu.Item>
              <Menu.Item>Export as PNG</Menu.Item>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  ),
}

export const WithCheckboxItems: Story = {
  render: function WithCheckboxItems() {
    const [showGrid, setShowGrid] = useState(true)
    const [showRulers, setShowRulers] = useState(false)
    const [showGuides, setShowGuides] = useState(true)

    return (
      <Menu.Root>
        <Menu.Trigger>View Options</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8}>
            <Menu.Popup>
              <Menu.CheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
                <Menu.CheckboxItemIndicator />
                Show Grid
              </Menu.CheckboxItem>
              <Menu.CheckboxItem checked={showRulers} onCheckedChange={setShowRulers}>
                <Menu.CheckboxItemIndicator />
                Show Rulers
              </Menu.CheckboxItem>
              <Menu.CheckboxItem checked={showGuides} onCheckedChange={setShowGuides}>
                <Menu.CheckboxItemIndicator />
                Show Guides
              </Menu.CheckboxItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    )
  },
}

export const WithRadioItems: Story = {
  render: function WithRadioItems() {
    const [sortBy, setSortBy] = useState('date')

    return (
      <Menu.Root>
        <Menu.Trigger>Sort By</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8}>
            <Menu.Popup>
              <Menu.RadioGroup value={sortBy} onValueChange={setSortBy}>
                <Menu.RadioItem value="name">
                  <Menu.RadioItemIndicator />
                  Name
                </Menu.RadioItem>
                <Menu.RadioItem value="date">
                  <Menu.RadioItemIndicator />
                  Date Modified
                </Menu.RadioItem>
                <Menu.RadioItem value="size">
                  <Menu.RadioItemIndicator />
                  Size
                </Menu.RadioItem>
                <Menu.RadioItem value="type">
                  <Menu.RadioItemIndicator />
                  Type
                </Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    )
  },
}

export const WithSubmenu: Story = {
  render: () => (
    <Menu.Root>
      <Menu.Trigger>Edit</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup>
            <Menu.Item>Undo</Menu.Item>
            <Menu.Item>Redo</Menu.Item>
            <Menu.Separator />
            <Menu.Item>Cut</Menu.Item>
            <Menu.Item>Copy</Menu.Item>
            <Menu.Item>Paste</Menu.Item>
            <Menu.Separator />
            <Menu.Root>
              <Menu.SubmenuTrigger>Find and Replace</Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner side="right" sideOffset={4}>
                  <Menu.Popup>
                    <Menu.Item>Find...</Menu.Item>
                    <Menu.Item>Find Next</Menu.Item>
                    <Menu.Item>Find Previous</Menu.Item>
                    <Menu.Separator />
                    <Menu.Item>Replace...</Menu.Item>
                    <Menu.Item>Replace All</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  ),
}

export const WithDisabledItems: Story = {
  render: () => (
    <Menu.Root>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup>
            <Menu.Item>New</Menu.Item>
            <Menu.Item>Open</Menu.Item>
            <Menu.Item disabled>Save (no changes)</Menu.Item>
            <Menu.Separator />
            <Menu.Item>Export</Menu.Item>
            <Menu.Item disabled>Share (not available)</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  ),
}

export const Positions: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Menu.Root>
        <Menu.Trigger>Bottom (default)</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" sideOffset={8}>
            <Menu.Popup>
              <Menu.Item>Item 1</Menu.Item>
              <Menu.Item>Item 2</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger>Top</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="top" sideOffset={8}>
            <Menu.Popup>
              <Menu.Item>Item 1</Menu.Item>
              <Menu.Item>Item 2</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger>Right</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="right" sideOffset={8}>
            <Menu.Popup>
              <Menu.Item>Item 1</Menu.Item>
              <Menu.Item>Item 2</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger>Left</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="left" sideOffset={8}>
            <Menu.Popup>
              <Menu.Item>Item 1</Menu.Item>
              <Menu.Item>Item 2</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  ),
}

export const WithArrow: Story = {
  render: () => (
    <Menu.Root>
      <Menu.Trigger>Menu with Arrow</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={12}>
          <Menu.Popup>
            <Menu.Arrow />
            <Menu.Item>Profile</Menu.Item>
            <Menu.Item>Settings</Menu.Item>
            <Menu.Separator />
            <Menu.Item>Sign out</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  ),
}

export const OpenOnHover: Story = {
  render: () => (
    <Menu.Root>
      <Menu.Trigger openOnHover delay={100}>
        Hover to Open
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup>
            <Menu.Item>Quick Action 1</Menu.Item>
            <Menu.Item>Quick Action 2</Menu.Item>
            <Menu.Item>Quick Action 3</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  ),
}

export const CompleteExample: Story = {
  render: function CompleteExample() {
    const [theme, setTheme] = useState('system')
    const [notifications, setNotifications] = useState(true)
    const [compactMode, setCompactMode] = useState(false)

    return (
      <Menu.Root>
        <Menu.Trigger>Settings</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8}>
            <Menu.Popup style={{ minWidth: '14rem' }}>
              <Menu.Group>
                <Menu.GroupLabel>Appearance</Menu.GroupLabel>
                <Menu.RadioGroup value={theme} onValueChange={setTheme}>
                  <Menu.RadioItem value="light">
                    <Menu.RadioItemIndicator />
                    Light
                  </Menu.RadioItem>
                  <Menu.RadioItem value="dark">
                    <Menu.RadioItemIndicator />
                    Dark
                  </Menu.RadioItem>
                  <Menu.RadioItem value="system">
                    <Menu.RadioItemIndicator />
                    System
                  </Menu.RadioItem>
                </Menu.RadioGroup>
              </Menu.Group>

              <Menu.Separator />

              <Menu.Group>
                <Menu.GroupLabel>Preferences</Menu.GroupLabel>
                <Menu.CheckboxItem checked={notifications} onCheckedChange={setNotifications}>
                  <Menu.CheckboxItemIndicator />
                  Enable Notifications
                </Menu.CheckboxItem>
                <Menu.CheckboxItem checked={compactMode} onCheckedChange={setCompactMode}>
                  <Menu.CheckboxItemIndicator />
                  Compact Mode
                </Menu.CheckboxItem>
              </Menu.Group>

              <Menu.Separator />

              <Menu.Item onClick={() => console.log('Open preferences')}>
                All Preferences...
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    )
  },
}
