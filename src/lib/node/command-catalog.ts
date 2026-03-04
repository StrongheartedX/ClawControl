// Command catalog — declares all node commands, their metadata, and platform availability.

import type { PlatformType } from '../platform'

export interface CommandDefinition {
  command: string
  category: string
  label: string
  description: string
  /** Platforms where this command is available. Empty = all platforms. */
  platforms: PlatformType[]
  /** Dangerous commands require explicit user opt-in and show a warning badge. */
  dangerous: boolean
  /** Whether this command is enabled by default. */
  defaultEnabled: boolean
}

export const COMMAND_CATALOG: CommandDefinition[] = [
  // Device
  {
    command: 'device.status',
    category: 'Device',
    label: 'Device Status',
    description: 'Read basic device platform info (OS, architecture, hostname)',
    platforms: [],
    dangerous: false,
    defaultEnabled: true
  },
  {
    command: 'device.info',
    category: 'Device',
    label: 'Device Info',
    description: 'Read detailed device info including battery, memory, and model',
    platforms: [],
    dangerous: false,
    defaultEnabled: true
  },

  // System
  {
    command: 'system.notify',
    category: 'System',
    label: 'Notifications',
    description: 'Show a system notification on this device',
    platforms: [],
    dangerous: false,
    defaultEnabled: true
  },

  // Clipboard
  {
    command: 'clipboard.read',
    category: 'Clipboard',
    label: 'Read Clipboard',
    description: 'Read text from the device clipboard',
    platforms: [],
    dangerous: false,
    defaultEnabled: true
  },
  {
    command: 'clipboard.write',
    category: 'Clipboard',
    label: 'Write Clipboard',
    description: 'Write text to the device clipboard',
    platforms: [],
    dangerous: false,
    defaultEnabled: true
  },

  // Location (mobile only)
  {
    command: 'location.get',
    category: 'Location',
    label: 'Get Location',
    description: 'Read the device GPS location (latitude, longitude, accuracy)',
    platforms: ['ios', 'android'],
    dangerous: false,
    defaultEnabled: false
  },

  // Camera (mobile only, dangerous)
  {
    command: 'camera.snap',
    category: 'Camera',
    label: 'Take Photo',
    description: 'Take a photo using the device camera',
    platforms: ['ios', 'android'],
    dangerous: true,
    defaultEnabled: false
  },

  // Photos (mobile only)
  {
    command: 'photos.latest',
    category: 'Photos',
    label: 'Latest Photos',
    description: 'Read the most recent photos from the device photo library',
    platforms: ['ios', 'android'],
    dangerous: false,
    defaultEnabled: false
  },

  // Canvas
  {
    command: 'canvas.display',
    category: 'Canvas',
    label: 'Display Canvas',
    description: 'Allow the AI agent to render interactive canvas content on this device',
    platforms: [],
    dangerous: false,
    defaultEnabled: true
  },

  // Notifications (Android only)
  {
    command: 'notifications.list',
    category: 'Notifications',
    label: 'List Notifications',
    description: 'Read active notifications from the notification shade',
    platforms: ['android'],
    dangerous: false,
    defaultEnabled: false
  }
]

/** Get commands available on the given platform. */
export function getCommandsForPlatform(platform: PlatformType): CommandDefinition[] {
  return COMMAND_CATALOG.filter(
    cmd => cmd.platforms.length === 0 || cmd.platforms.includes(platform)
  )
}

/** Get default permissions for a platform (command -> enabled). */
export function getDefaultPermissions(platform: PlatformType): Record<string, boolean> {
  const perms: Record<string, boolean> = {}
  for (const cmd of getCommandsForPlatform(platform)) {
    perms[cmd.command] = cmd.defaultEnabled
  }
  return perms
}

/** Get unique categories for commands available on the given platform, in catalog order. */
export function getCategoriesForPlatform(platform: PlatformType): string[] {
  const seen = new Set<string>()
  const categories: string[] = []
  for (const cmd of getCommandsForPlatform(platform)) {
    if (!seen.has(cmd.category)) {
      seen.add(cmd.category)
      categories.push(cmd.category)
    }
  }
  return categories
}
