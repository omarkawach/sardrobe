export const sardrobeOverview = {
  kind: 'sardrobe.site_overview',
  site: {
    name: 'Sardrobe',
    summary:
      'A private digital wardrobe for clothing cutouts, wardrobe metadata, outfits, and packing plans.',
  },
  privacy: {
    backgroundRemoval: 'Runs on the user\'s device in the browser.',
    importDrafts: 'Stay in the current browser tab until the user saves them.',
    savedData: 'Is account-scoped and only available after Google sign-in.',
  },
  webmcp: {
    availability: 'Operational tools register on the signed-in app page.',
    appUrl: '/app/',
    agentGuideUrl: '/.well-known/sardrobe-agent-guide.md',
    capabilities: [
      'Review wardrobe items and their authenticated cutout images.',
      'Inspect and edit browser-local import drafts before the user saves them.',
      'Create and update outfits from saved wardrobe items.',
      'Create and maintain packing plans and packed state.',
    ],
    guidance:
      'Open the app, complete Google sign-in if requested, then discover the current page tools instead of assuming a fixed tool list.',
    suggestedPrompts: [
      'Find wardrobe items with missing metadata and help me complete them.',
      'Review my ready import drafts and suggest accurate details before I save them.',
      'Create an outfit from pieces I already own.',
      'Build a packing plan for my next trip.',
    ],
  },
} as const

export const sardrobeOverviewTool: WebMCP.ModelContextTool = {
  name: 'sardrobe_overview',
  title: 'Learn how to use Sardrobe',
  description:
    'Explain what Sardrobe does, its browser-local image processing and privacy model, and how an agent should continue into the signed-in app where operational WebMCP tools register. Call this when starting from the public homepage.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  execute: () => sardrobeOverview,
}

export function registerSardrobeOverviewTool() {
  const modelContext = document.modelContext
  if (!modelContext?.registerTool) return undefined

  const controller = new AbortController()

  void modelContext.registerTool(sardrobeOverviewTool, { signal: controller.signal }).catch((error) => {
    if (!controller.signal.aborted) console.warn('Could not register the Sardrobe overview tool.', error)
  })

  return () => controller.abort()
}
