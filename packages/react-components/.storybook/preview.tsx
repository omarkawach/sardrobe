import type { Preview } from '@storybook/react-vite'
import { useEffect } from 'react'
import '../src/styles/index.css'

const withTheme = (Story: React.ComponentType, context: { globals: { theme?: string } }) => {
  const theme = context.globals.theme

  useEffect(() => {
    const applyTheme = () => {
      let resolvedTheme: 'light' | 'dark'

      if (theme === 'dark') {
        resolvedTheme = 'dark'
        localStorage.theme = 'dark'
      } else if (theme === 'light') {
        resolvedTheme = 'light'
        localStorage.theme = 'light'
      } else {
        // 'system' or undefined - respect system preference
        localStorage.removeItem('theme')
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }

      // Set both data-theme and class to match design-tokens selectors
      document.documentElement.setAttribute('data-theme', resolvedTheme)
      document.documentElement.classList.toggle('sardrobe-dark', resolvedTheme === 'dark')
      document.documentElement.classList.toggle('sardrobe-light', resolvedTheme === 'light')

      // Also apply background to Storybook's body for full theming
      document.body.style.backgroundColor = `var(--sardrobe-background-color)`
      document.body.style.color = `var(--sardrobe-text-body)`
      document.body.style.transition = 'background-color 150ms ease, color 150ms ease'
    }

    applyTheme()

    // Listen for system preference changes when in system mode
    if (!theme || theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleMediaChange = () => applyTheme()

      mediaQuery.addEventListener('change', handleMediaChange)
      return () => mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [theme])

  return <Story />
}

const PRESETS = [
  'default',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'slate',
  'zinc',
  'stone',
] as const

const withPreset = (Story: React.ComponentType, context: { globals: { preset?: string } }) => {
  const preset = context.globals.preset || 'default'

  useEffect(() => {
    const root = document.documentElement
    for (const p of PRESETS) {
      root.classList.toggle(`sardrobe-${p}`, p === preset)
    }
  }, [preset])

  return <Story />
}

const STYLES = [
  { value: 'none', title: 'Sardrobe (default)' },
  { value: 'clean', title: 'Clean (Radix / shadcn)' },
  { value: 'material', title: 'Material' },
  { value: 'fluent', title: 'Fluent' },
  { value: 'base', title: 'Base UI' },
  { value: 'playful', title: 'Playful' },
] as const

const withStyle = (Story: React.ComponentType, context: { globals: { style?: string } }) => {
  const style = context.globals.style || 'none'

  useEffect(() => {
    const root = document.documentElement
    for (const s of STYLES) {
      if (s.value !== 'none') {
        root.classList.toggle(`sardrobe-style-${s.value}`, s.value === style)
      }
    }
    document.body.style.fontFamily = 'var(--sardrobe-font-family)'
  }, [style])

  return <Story />
}

const preview: Preview = {
  globalTypes: {
    style: {
      description: 'Style preset (shape, shadows, typography, density)',
      defaultValue: 'none',
      toolbar: {
        title: 'Style',
        icon: 'component',
        items: [...STYLES],
        dynamicTitle: true,
      },
    },
    preset: {
      description: 'Color preset for components',
      defaultValue: 'default',
      toolbar: {
        title: 'Preset',
        icon: 'paintbrush',
        items: PRESETS.map((p) => ({
          value: p,
          title: p.charAt(0).toUpperCase() + p.slice(1),
        })),
        dynamicTitle: true,
      },
    },
    theme: {
      description: 'Global theme for components',
      defaultValue: 'system',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
          { value: 'system', icon: 'browser', title: 'System' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      codePanel: true,
    },
    backgrounds: {
      disable: true,
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'error',
    },
  },
  decorators: [withTheme, withStyle, withPreset],
}

export default preview
