import {
  Check,
  ListFilter,
  Luggage,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Shirt,
  Sparkles,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'

export type ClosetIconName =
  | 'search'
  | 'filter'
  | 'close'
  | 'check'
  | 'wardrobe'
  | 'outfits'
  | 'packing'
  | 'upload'
  | 'collapseSidebar'
  | 'expandSidebar'
  | 'ai'

const icons: Record<ClosetIconName, LucideIcon> = {
  search: Search,
  filter: ListFilter,
  close: X,
  check: Check,
  wardrobe: Shirt,
  outfits: Layers,
  packing: Luggage,
  upload: Upload,
  collapseSidebar: PanelLeftClose,
  expandSidebar: PanelLeftOpen,
  ai: Sparkles,
}

export function ClosetIcon({ name }: { name: ClosetIconName }) {
  const LucideIcon = icons[name]

  return <LucideIcon className="closet-icon" strokeWidth={1.15} aria-hidden="true" />
}

export function navIconName(label: string): ClosetIconName {
  const names: Record<string, ClosetIconName> = {
    Wardrobe: 'wardrobe',
    'Upload clothes': 'upload',
    Upload: 'upload',
    Outfits: 'outfits',
    'Packing list': 'packing',
    Packing: 'packing',
  }

  return names[label] ?? 'wardrobe'
}
