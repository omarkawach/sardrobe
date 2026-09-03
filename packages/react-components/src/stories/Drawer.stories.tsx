import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerDescription,
  DrawerPortal,
  DrawerPopup,
  DrawerTitle,
  DrawerViewport,
} from '../components/Drawer'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

const meta = {
  title: 'Components/Drawer',
  component: Drawer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

export const RightSidePanel: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <div style={{ padding: '2rem' }}>
        <Button color="primary" onClick={() => setOpen(true)}>
          Open Drawer
        </Button>

        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerPortal>
            <DrawerBackdrop />
            <DrawerViewport>
              <DrawerPopup side="right">
                <DrawerContent>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'start',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <DrawerTitle>Edit garment details</DrawerTitle>
                      <DrawerDescription>
                        Update shared metadata for the selected wardrobe items.
                      </DrawerDescription>
                    </div>
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                      Close
                    </Button>
                  </div>

                  <form
                    style={{
                      display: 'grid',
                      gap: '1rem',
                      marginTop: '1.5rem',
                    }}
                    onSubmit={(event) => {
                      event.preventDefault()
                      setOpen(false)
                    }}
                  >
                    <div>
                      <label htmlFor="drawer-category">Category</label>
                      <Input id="drawer-category" defaultValue="Tops" />
                    </div>
                    <div>
                      <label htmlFor="drawer-occasion">Occasion</label>
                      <Input id="drawer-occasion" placeholder="No change" />
                    </div>
                    <div>
                      <label htmlFor="drawer-color">Color</label>
                      <Input id="drawer-color" placeholder="No change" />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'flex-end',
                        marginTop: '0.5rem',
                      }}
                    >
                      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" color="primary">
                        Apply changes
                      </Button>
                    </div>
                  </form>
                </DrawerContent>
              </DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      </div>
    )
  },
}

export const BottomSheet: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <div style={{ padding: '2rem' }}>
        <Button color="neutral" onClick={() => setOpen(true)}>
          Open Bottom Sheet
        </Button>

        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerPortal>
            <DrawerBackdrop />
            <DrawerViewport>
              <DrawerPopup side="bottom" size="sm">
                <DrawerContent>
                  <DrawerTitle>Filters</DrawerTitle>
                  <DrawerDescription>
                    A compact sheet for mobile-friendly controls and quick actions.
                  </DrawerDescription>
                  <div
                    style={{
                      display: 'grid',
                      gap: '0.75rem',
                      marginTop: '1.25rem',
                    }}
                  >
                    <Button color="primary" onClick={() => setOpen(false)}>
                      Done
                    </Button>
                    <Button variant="outline" color="neutral" onClick={() => setOpen(false)}>
                      Clear filters
                    </Button>
                  </div>
                </DrawerContent>
              </DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      </div>
    )
  },
}
