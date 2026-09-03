import { Avatar } from '@sardrobe/react-components'

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = name || email || 'Sardrobe'

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

export interface SessionAvatarProps {
  name?: string | null
  email?: string | null
  image?: string | null
  className?: string
}

export function SessionAvatar({ name, email, image, className = '' }: SessionAvatarProps) {
  return (
    <Avatar.Root className={className} aria-hidden="true">
      {image ? <Avatar.Image src={image} alt="" /> : null}
      <Avatar.Fallback>{getInitials(name, email)}</Avatar.Fallback>
    </Avatar.Root>
  )
}
