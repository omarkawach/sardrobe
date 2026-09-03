import { ClosetIcon, navIconName } from '../../components/closet/ClosetIcon'
import { UserMenu } from '../../components/UserMenu'
import { mobileNavItems, primaryNavItems, type ClosetSection } from './navigation'
import type { LocalAiStatus } from '../local-ai/types'

export type WorkspaceUser = {
  name: string | null
  email: string | null
  image: string | null
}

type WorkspaceNavigationProps = {
  activeFilterCount: number
  activeSection: ClosetSection
  isSidebarCollapsed: boolean
  mobileSearchOpen: boolean
  localAiStatus: LocalAiStatus
  localAiAvailableOnDevice: boolean
  privateAiEnabled: boolean
  onPrivateAiEnabledChange: (enabled: boolean) => void
  onMobileFiltersOpen: () => void
  onMobileSearchToggle: () => void
  onSectionChange: (section: ClosetSection) => void
  onSidebarCollapsedChange: (collapsed: boolean) => void
  user: WorkspaceUser
}

export function WorkspaceSidebar({
  activeSection,
  isSidebarCollapsed,
  onSectionChange,
  onSidebarCollapsedChange,
  localAiStatus,
  localAiAvailableOnDevice,
  privateAiEnabled,
  onPrivateAiEnabledChange,
  user,
}: Pick<
  WorkspaceNavigationProps,
  'activeSection' | 'isSidebarCollapsed' | 'localAiAvailableOnDevice' | 'localAiStatus' | 'onPrivateAiEnabledChange' | 'onSectionChange' | 'onSidebarCollapsedChange' | 'privateAiEnabled' | 'user'
>) {
  const accountName = user.name || 'Sardrobe user'
  const accountEmail = user.email || ''
  const sidebarClassName = `closet-sidebar${isSidebarCollapsed ? ' closet-sidebar--collapsed' : ''}`

  return (
    <aside className={sidebarClassName} aria-label="Sardrobe navigation">
      <div className="closet-sidebar__brand">
        <a href="/" aria-label="Sardrobe home">
          {isSidebarCollapsed ? 'S' : 'Sardrobe'}
        </a>
        <button
          className="closet-sidebar__toggle"
          type="button"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => onSidebarCollapsedChange(!isSidebarCollapsed)}
        >
          <ClosetIcon name={isSidebarCollapsed ? 'expandSidebar' : 'collapseSidebar'} />
        </button>
      </div>

      <nav className="closet-sidebar__nav" aria-label="Primary">
        {primaryNavItems.map((item, index) => (
          <button
            className={activeSection === item.section && !item.disabled ? 'closet-nav-item closet-nav-item--active' : 'closet-nav-item'}
            key={`${item.label}-${index}`}
            type="button"
            disabled={item.disabled}
            aria-current={activeSection === item.section && !item.disabled ? 'page' : undefined}
            aria-label={isSidebarCollapsed ? item.label : undefined}
            title={isSidebarCollapsed ? item.label : undefined}
            onClick={() => onSectionChange(item.section)}
          >
            <span aria-hidden="true">
              <ClosetIcon name={navIconName(item.label)} />
            </span>
            <span className="closet-nav-item__label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="closet-sidebar__account">
        <UserMenu
          name={accountName}
          email={accountEmail}
          image={user.image}
          compact={isSidebarCollapsed}
          variant={isSidebarCollapsed ? 'pill' : 'inline'}
          privateAiEnabled={privateAiEnabled}
          privateAiStatus={privateAiStatusLabel(privateAiEnabled, localAiStatus)}
          onPrivateAiEnabledChange={localAiAvailableOnDevice ? onPrivateAiEnabledChange : undefined}
        />
      </div>
    </aside>
  )
}

export function WorkspaceMobileHeader({
  activeFilterCount,
  activeSection,
  mobileSearchOpen,
  localAiStatus,
  localAiAvailableOnDevice,
  privateAiEnabled,
  onPrivateAiEnabledChange,
  onMobileFiltersOpen,
  onMobileSearchToggle,
  user,
}: Pick<
  WorkspaceNavigationProps,
  'activeFilterCount' | 'activeSection' | 'localAiAvailableOnDevice' | 'localAiStatus' | 'mobileSearchOpen' | 'onMobileFiltersOpen' | 'onMobileSearchToggle' | 'onPrivateAiEnabledChange' | 'privateAiEnabled' | 'user'
>) {
  const accountName = user.name || 'Sardrobe user'
  const accountEmail = user.email || ''

  return (
    <header className="closet-mobile-header">
      <a href="/">Sardrobe</a>
      <div className="closet-mobile-header__actions">
        {activeSection === 'wardrobe' ? (
          <>
            <button
              type="button"
              aria-label={mobileSearchOpen ? 'Hide search' : 'Search wardrobe'}
              aria-pressed={mobileSearchOpen}
              className={mobileSearchOpen ? 'closet-mobile-header__icon closet-mobile-header__icon--active' : 'closet-mobile-header__icon'}
              onClick={onMobileSearchToggle}
            >
              <ClosetIcon name="search" />
            </button>
            <button
              type="button"
              aria-label="Open filters"
              className="closet-mobile-header__icon"
              onClick={onMobileFiltersOpen}
            >
              <ClosetIcon name="filter" />
              {activeFilterCount > 0 ? <span className="closet-mobile-header__badge">{activeFilterCount}</span> : null}
            </button>
          </>
        ) : null}
        <UserMenu
          name={accountName}
          email={accountEmail}
          image={user.image}
          variant="pill"
          compact
          privateAiEnabled={privateAiEnabled}
          privateAiStatus={privateAiStatusLabel(privateAiEnabled, localAiStatus)}
          onPrivateAiEnabledChange={localAiAvailableOnDevice ? onPrivateAiEnabledChange : undefined}
        />
      </div>
    </header>
  )
}

function privateAiStatusLabel(enabled: boolean, status: LocalAiStatus) {
  if (!enabled) return ''
  if (status.phase === 'downloading') return `${status.progress ?? 0}% downloaded`
  if (status.phase === 'preparing') return 'Preparing on this device…'
  if (status.phase === 'running') return 'Working on this device…'
  if (status.phase === 'ready') return 'Ready on this device'
  if (status.phase === 'unsupported') return 'Unavailable in this browser'
  if (status.phase === 'error') return 'Needs attention'
  return 'Runs on this device'
}

export function WorkspaceMobileNav({
  activeSection,
  onSectionChange,
}: Pick<WorkspaceNavigationProps, 'activeSection' | 'onSectionChange'>) {
  return (
    <nav className="closet-mobile-nav" aria-label="Mobile primary">
      {mobileNavItems.map((item) => (
        <button
          className={activeSection === item.section && !item.disabled ? 'closet-mobile-nav__item closet-mobile-nav__item--active' : 'closet-mobile-nav__item'}
          key={item.label}
          type="button"
          disabled={item.disabled}
          aria-current={activeSection === item.section && !item.disabled ? 'page' : undefined}
          onClick={() => onSectionChange(item.section)}
        >
          <span aria-hidden="true">
            <ClosetIcon name={navIconName(item.label)} />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
