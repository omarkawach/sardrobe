import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectOption,
  SelectOptionGroup,
} from '../components/Select'

const meta = {
  title: 'Components/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('')

    return (
      <Select value={value} onValueChange={(v) => setValue(v as string)}>
        <SelectTrigger aria-label="Select an option">
          <SelectValue placeholder="Select an option..." />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner sideOffset={4}>
            <SelectPopup>
              <SelectList>
                <SelectOption value="option1">Option 1</SelectOption>
                <SelectOption value="option2">Option 2</SelectOption>
                <SelectOption value="option3">Option 3</SelectOption>
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    )
  },
}

export const WithDefaultValue: Story = {
  render: () => {
    const [value, setValue] = useState('Option 2')

    return (
      <Select value={value} onValueChange={(v) => setValue(v as string)}>
        <SelectTrigger aria-label="Select an option">
          <SelectValue placeholder="Select an option..." />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner sideOffset={4}>
            <SelectPopup>
              <SelectList>
                <SelectOption value="option1">Option 1</SelectOption>
                <SelectOption value="option2">Option 2</SelectOption>
                <SelectOption value="option3">Option 3</SelectOption>
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    )
  },
}

export const SmallSize: Story = {
  render: () => {
    const [value, setValue] = useState('')

    return (
      <Select value={value} onValueChange={(v) => setValue(v as string)}>
        <SelectTrigger size="sm" aria-label="Select size">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner sideOffset={4}>
            <SelectPopup>
              <SelectList>
                <SelectOption value="sm">Small</SelectOption>
                <SelectOption value="md">Medium</SelectOption>
                <SelectOption value="lg">Large</SelectOption>
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    )
  },
}

export const Disabled: Story = {
  render: () => {
    const [value, setValue] = useState('option1')

    return (
      <Select value={value} onValueChange={(v) => setValue(v as string)} disabled>
        <SelectTrigger aria-label="Select an option">
          <SelectValue placeholder="Select an option..." />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner sideOffset={4}>
            <SelectPopup>
              <SelectList>
                <SelectOption value="option1">Option 1</SelectOption>
                <SelectOption value="option2">Option 2</SelectOption>
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    )
  },
}

export const WithGroups: Story = {
  render: () => {
    const [value, setValue] = useState('')

    return (
      <Select value={value} onValueChange={(v) => setValue(v as string)}>
        <SelectTrigger aria-label="Select a color scheme">
          <SelectValue placeholder="Select a color scheme..." />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner sideOffset={4}>
            <SelectPopup>
              <SelectList>
                <SelectOptionGroup label="Sequential">
                  <SelectOption value="blues">Blues</SelectOption>
                  <SelectOption value="greens">Greens</SelectOption>
                  <SelectOption value="reds">Reds</SelectOption>
                </SelectOptionGroup>
                <SelectOptionGroup label="Diverging">
                  <SelectOption value="rdbu">Red-Blue</SelectOption>
                  <SelectOption value="rdylbu">Red-Yellow-Blue</SelectOption>
                </SelectOptionGroup>
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    )
  },
}

export const ClassificationMethod: Story = {
  render: () => {
    const [value, setValue] = useState('quantile')

    return (
      <Select value={value} onValueChange={(v) => setValue(v as string)}>
        <SelectTrigger aria-label="Select classification method">
          <SelectValue placeholder="Select method..." />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner sideOffset={4}>
            <SelectPopup>
              <SelectList>
                <SelectOption value="quantile">Quantile</SelectOption>
                <SelectOption value="equal-interval">Equal Interval</SelectOption>
                <SelectOption value="natural-breaks">Natural Breaks</SelectOption>
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    )
  },
}

export const ManyOptions: Story = {
  render: () => {
    const [value, setValue] = useState('')

    const countries = [
      'United States',
      'Canada',
      'Mexico',
      'Brazil',
      'Argentina',
      'Chile',
      'United Kingdom',
      'France',
      'Germany',
      'Italy',
      'Spain',
      'Portugal',
      'China',
      'Japan',
      'South Korea',
      'India',
      'Australia',
      'New Zealand',
    ]

    return (
      <Select value={value} onValueChange={(v) => setValue(v as string)}>
        <SelectTrigger aria-label="Select a country">
          <SelectValue placeholder="Select a country..." />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner sideOffset={4}>
            <SelectPopup>
              <SelectList>
                {countries.map((country) => (
                  <SelectOption key={country} value={country.toLowerCase().replace(/\s+/g, '-')}>
                    {country}
                  </SelectOption>
                ))}
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    )
  },
}

export const InForm: Story = {
  render: () => {
    const [layer, setLayer] = useState('')
    const [field, setField] = useState('')
    const [method, setMethod] = useState('quantile')

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '300px',
        }}
      >
        <div>
          <label
            id="layer-label"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Layer
          </label>
          <Select value={layer} onValueChange={(v) => setLayer(v as string)}>
            <SelectTrigger size="sm" aria-label="Select a layer">
              <SelectValue placeholder="Select a layer..." />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    <SelectOption value="us-states">US States</SelectOption>
                    <SelectOption value="counties">Counties</SelectOption>
                    <SelectOption value="cities">Cities</SelectOption>
                  </SelectList>
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>
        </div>

        <div>
          <label
            id="field-label"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Field
          </label>
          <Select value={field} onValueChange={(v) => setField(v as string)}>
            <SelectTrigger size="sm" aria-label="Select a field">
              <SelectValue placeholder="Select a field..." />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    <SelectOption value="population">Population</SelectOption>
                    <SelectOption value="density">Density</SelectOption>
                    <SelectOption value="area">Area (sq km)</SelectOption>
                  </SelectList>
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>
        </div>

        <div>
          <label
            id="method-label"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Method
          </label>
          <Select value={method} onValueChange={(v) => setMethod(v as string)}>
            <SelectTrigger size="sm" aria-label="Select method">
              <SelectValue placeholder="Select method..." />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    <SelectOption value="quantile">Quantile</SelectOption>
                    <SelectOption value="equal-interval">Equal Interval</SelectOption>
                    <SelectOption value="natural-breaks">Natural Breaks</SelectOption>
                  </SelectList>
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>
        </div>
      </div>
    )
  },
}
