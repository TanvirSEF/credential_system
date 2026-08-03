export interface AutoLockPreferences {
  minutes: number
  lockWhenHidden: boolean
}

export const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 60] as const
export const DEFAULT_AUTO_LOCK_PREFERENCES: AutoLockPreferences = {
  minutes: 15,
  lockWhenHidden: false,
}

const STORAGE_KEY = "spv-auto-lock-preferences-v1"

export function loadAutoLockPreferences(): AutoLockPreferences {
  if (typeof window === "undefined") return DEFAULT_AUTO_LOCK_PREFERENCES
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
    return {
      minutes: AUTO_LOCK_OPTIONS.includes(parsed?.minutes)
        ? parsed.minutes
        : DEFAULT_AUTO_LOCK_PREFERENCES.minutes,
      lockWhenHidden:
        typeof parsed?.lockWhenHidden === "boolean"
          ? parsed.lockWhenHidden
          : DEFAULT_AUTO_LOCK_PREFERENCES.lockWhenHidden,
    }
  } catch {
    return DEFAULT_AUTO_LOCK_PREFERENCES
  }
}

export function saveAutoLockPreferences(
  preferences: AutoLockPreferences
): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}
