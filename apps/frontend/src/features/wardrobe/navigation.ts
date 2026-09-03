export type ClosetSection = 'dashboard' | 'wardrobe' | 'import' | 'outfits' | 'packing'

export const sectionToHash: Record<ClosetSection, string> = {
  dashboard: 'dashboard',
  wardrobe: 'wardrobe',
  import: 'upload',
  outfits: 'outfits',
  packing: 'packing',
}

const hashToSection: Record<string, ClosetSection> = Object.entries(sectionToHash).reduce(
  (acc, [section, hash]) => {
    acc[hash] = section as ClosetSection
    return acc
  },
  {} as Record<string, ClosetSection>,
)

export function sectionFromLocationHash(): ClosetSection | null {
  if (typeof window === 'undefined') return null
  const raw = window.location.hash.replace(/^#/, '').toLowerCase()
  return hashToSection[raw] ?? null
}

export const primaryNavItems: { section: ClosetSection; label: string; disabled?: boolean }[] = [
  { section: 'wardrobe', label: 'Wardrobe' },
  { section: 'import', label: 'Upload clothes' },
  { section: 'outfits', label: 'Outfits' },
  { section: 'packing', label: 'Packing list' },
]

export const mobileNavItems: { section: ClosetSection; label: string; disabled?: boolean }[] = [
  { section: 'wardrobe', label: 'Wardrobe' },
  { section: 'import', label: 'Upload' },
  { section: 'outfits', label: 'Outfits' },
  { section: 'packing', label: 'Packing' },
]
