import type { Meta, StoryObj } from '@storybook/react'
import { Combobox } from '../components/Combobox'

const meta = {
  title: 'Components/Combobox',
  component: Combobox.Root,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Combobox.Root>

export default meta
type Story = StoryObj<typeof meta>

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

interface Fruit {
  label: string
  value: string
}

const fruits: Fruit[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blueberry', value: 'blueberry' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Grape', value: 'grape' },
  { label: 'Lemon', value: 'lemon' },
  { label: 'Mango', value: 'mango' },
  { label: 'Orange', value: 'orange' },
  { label: 'Peach', value: 'peach' },
  { label: 'Strawberry', value: 'strawberry' },
]

export const Default: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid hsl(var(--input))',
        borderRadius: 'var(--radius)',
        width: '240px',
      }}
    >
      <Combobox.Root items={fruits}>
        <Combobox.Input placeholder="Select a fruit..." aria-label="Select a fruit" />
        <Combobox.Trigger aria-label="Open fruit list">
          <ChevronDownIcon />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4}>
            <Combobox.Popup>
              <Combobox.List>
                {(item: Fruit) => (
                  <Combobox.Item value={item} key={item.value}>
                    <Combobox.ItemIndicator>
                      <CheckIcon />
                    </Combobox.ItemIndicator>
                    {item.label}
                  </Combobox.Item>
                )}
              </Combobox.List>
              <Combobox.Empty>No fruits found</Combobox.Empty>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  ),
}

interface Country {
  label: string
  value: string
  region: string
}

const countries: Country[] = [
  { label: 'United States', value: 'us', region: 'Americas' },
  { label: 'Canada', value: 'ca', region: 'Americas' },
  { label: 'Mexico', value: 'mx', region: 'Americas' },
  { label: 'United Kingdom', value: 'uk', region: 'Europe' },
  { label: 'Germany', value: 'de', region: 'Europe' },
  { label: 'France', value: 'fr', region: 'Europe' },
  { label: 'Japan', value: 'jp', region: 'Asia' },
  { label: 'China', value: 'cn', region: 'Asia' },
  { label: 'India', value: 'in', region: 'Asia' },
]

export const WithGroups: Story = {
  render: () => {
    const groupedCountries = countries.reduce(
      (acc, country) => {
        if (!acc[country.region]) {
          acc[country.region] = []
        }
        acc[country.region].push(country)
        return acc
      },
      {} as Record<string, Country[]>,
    )

    const groups = Object.entries(groupedCountries).map(([region, items]) => ({
      value: region,
      items,
    }))

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid hsl(var(--input))',
          borderRadius: 'var(--radius)',
          width: '240px',
        }}
      >
        <Combobox.Root items={groups}>
          <Combobox.Input placeholder="Select a country..." aria-label="Select a country" />
          <Combobox.Trigger aria-label="Open country list">
            <ChevronDownIcon />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner sideOffset={4}>
              <Combobox.Popup>
                <Combobox.List>
                  {(group: { value: string; items: Country[] }) => (
                    <Combobox.Group items={group.items} key={group.value}>
                      <Combobox.GroupLabel>{group.value}</Combobox.GroupLabel>
                      {group.items.map((country) => (
                        <Combobox.Item value={country} key={country.value}>
                          <Combobox.ItemIndicator>
                            <CheckIcon />
                          </Combobox.ItemIndicator>
                          {country.label}
                        </Combobox.Item>
                      ))}
                    </Combobox.Group>
                  )}
                </Combobox.List>
                <Combobox.Empty>No countries found</Combobox.Empty>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      </div>
    )
  },
}

export const WithDefaultValue: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid hsl(var(--input))',
        borderRadius: 'var(--radius)',
        width: '240px',
      }}
    >
      <Combobox.Root items={fruits} defaultValue={fruits[2]}>
        <Combobox.Input placeholder="Select a fruit..." aria-label="Select a fruit" />
        <Combobox.Trigger aria-label="Open fruit list">
          <ChevronDownIcon />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4}>
            <Combobox.Popup>
              <Combobox.List>
                {(item: Fruit) => (
                  <Combobox.Item value={item} key={item.value}>
                    <Combobox.ItemIndicator>
                      <CheckIcon />
                    </Combobox.ItemIndicator>
                    {item.label}
                  </Combobox.Item>
                )}
              </Combobox.List>
              <Combobox.Empty>No fruits found</Combobox.Empty>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  ),
}

export const FormField: Story = {
  render: () => (
    <div style={{ width: '280px' }}>
      <label
        id="fruit-label"
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        Favorite Fruit
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid hsl(var(--input))',
          borderRadius: 'var(--radius)',
        }}
      >
        <Combobox.Root items={fruits}>
          <Combobox.Input placeholder="Select a fruit..." aria-labelledby="fruit-label" />
          <Combobox.Trigger aria-label="Open fruit list">
            <ChevronDownIcon />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner sideOffset={4}>
              <Combobox.Popup>
                <Combobox.List>
                  {(item: Fruit) => (
                    <Combobox.Item value={item} key={item.value}>
                      <Combobox.ItemIndicator>
                        <CheckIcon />
                      </Combobox.ItemIndicator>
                      {item.label}
                    </Combobox.Item>
                  )}
                </Combobox.List>
                <Combobox.Empty>No fruits found</Combobox.Empty>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      </div>
      <p
        style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: 'hsl(var(--muted-foreground))',
        }}
      >
        Choose your favorite fruit from the list.
      </p>
    </div>
  ),
}
