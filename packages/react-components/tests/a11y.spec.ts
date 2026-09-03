import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const storyUrl = (id: string) => `http://localhost:6011/iframe.html?id=${id}&viewMode=story`

async function openStory(page: Page, storyId: string) {
  const indexResponse = await page.request.get('http://localhost:6011/index.json')
  expect(indexResponse.ok()).toBe(true)
  const index = await indexResponse.json() as { entries: Record<string, unknown> }
  expect(index.entries).toHaveProperty(storyId)

  await page.goto(storyUrl(storyId))
  await expect(page.locator('#storybook-root *').first()).toBeAttached({ timeout: 5000 })
}

function scanStory(storyId: string) {
  return async ({ page }: { page: Page }) => {
    await openStory(page, storyId)
    await page.waitForTimeout(1000)
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  }
}

function scanStoryDarkMode(storyId: string) {
  return async ({ page }: { page: Page }) => {
    await openStory(page, storyId)
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.add('sardrobe-dark')
      document.documentElement.classList.remove('sardrobe-light')
    })
    await page.waitForTimeout(500)
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  }
}

test.describe('A11y regression stories', () => {
  test('form labels', scanStory('a11y-regression-tests--form-labels'))
  test('button accessible names', scanStory('a11y-regression-tests--button-accessible-names'))
  test('color contrast, light', scanStory('a11y-regression-tests--color-contrast-matrix'))
  test('color contrast, dark', scanStoryDarkMode('a11y-regression-tests--color-contrast-matrix'))
  test('interactive cards', scanStory('a11y-regression-tests--interactive-cards'))
  test('progress label', scanStory('a11y-regression-tests--progress-with-label'))
})

test.describe('Product component stories', () => {
  test('alert dialog', scanStory('components-alertdialog--default'))
  test('avatar', scanStory('components-avatar--default'))
  test('button', scanStory('components-button--primary'))
  test('card', scanStory('components-card--default'))
  test('checkbox', scanStory('components-checkbox--unchecked'))
  test('combobox', scanStory('components-combobox--default'))
  test('dialog', scanStory('components-dialog--default'))
  test('drawer', scanStory('components-drawer--right-side-panel'))
  test('field', scanStory('components-field--default'))
  test('input', scanStory('components-input--text'))
  test('menu', scanStory('components-menu--default'))
  test('progress', scanStory('components-progress--default'))
  test('select', scanStory('components-select--default'))
  test('tooltip', scanStory('components-tooltip--default'))
})

test.describe('Dark mode', () => {
  test('button', scanStoryDarkMode('components-button--primary'))
  test('input', scanStoryDarkMode('components-input--text'))
  test('card', scanStoryDarkMode('components-card--default'))
  test('dialog', scanStoryDarkMode('components-dialog--default'))
  test('select', scanStoryDarkMode('components-select--default'))
  test('checkbox', scanStoryDarkMode('components-checkbox--unchecked'))
})
