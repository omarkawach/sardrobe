import { describe, expect, it } from 'vitest'
import { sardrobeOverview, sardrobeOverviewTool } from './homepageTool'

describe('sardrobeOverviewTool', () => {
  it('is a public, read-only discovery tool with no inputs', () => {
    expect(sardrobeOverviewTool).toMatchObject({
      name: 'sardrobe_overview',
      title: 'Learn how to use Sardrobe',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: false,
      },
    })
  })

  it('orients agents without exposing account data', async () => {
    const result = await sardrobeOverviewTool.execute(
      {},
      { signal: new AbortController().signal },
    )

    expect(result).toBe(sardrobeOverview)

    expect(sardrobeOverview.webmcp.appUrl).toBe('/app/')
    expect(sardrobeOverview.webmcp.agentGuideUrl).toBe('/.well-known/sardrobe-agent-guide.md')
    expect(JSON.stringify(sardrobeOverview)).not.toMatch(/email|userId|itemId/)
  })
})
