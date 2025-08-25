import usersConfig from '@/config/users.json'
import { getProfileImagePath } from '@/lib/image-utils'

export interface UserConfig {
  id: string
  name: string
  full_name: string
  hotel_id: string
  hotels: string[]
  role: string
  status: string
  profileImage?: string
}

export interface UsersConfig {
  users: Record<string, UserConfig>
}

export function getUserConfig(email: string): UserConfig | null {
  try {
    const config = usersConfig as UsersConfig
    return config.users[email] || null
  } catch (error) {
    console.error('Error loading user config:', error)
    return null
  }
}

export function getHotelIdFromUser(email: string): string | null {
  const userConfig = getUserConfig(email)
  return userConfig?.hotel_id || null
}

export function getHotelsFromUser(email: string): string[] {
  const userConfig = getUserConfig(email)
  return userConfig?.hotels || []
}

export function getUserNameFromConfig(email: string): string | null {
  const userConfig = getUserConfig(email)
  return userConfig?.full_name || userConfig?.name || null
}

export function getUserRoleFromConfig(email: string): string | null {
  const userConfig = getUserConfig(email)
  return userConfig?.role || null
}

export function getUserProfileImage(email: string): string {
  const userConfig = getUserConfig(email)
  return getProfileImagePath(userConfig?.profileImage)
}
