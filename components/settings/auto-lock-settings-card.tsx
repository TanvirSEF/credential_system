"use client"

import { useEffect, useState } from "react"
import { Clock3, EyeOff, ShieldCheck } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import {
  AUTO_LOCK_OPTIONS,
  loadAutoLockPreferences,
  saveAutoLockPreferences,
} from "@/lib/security/auto-lock"

export function AutoLockSettingsCard() {
  const setStorePreferences = useVaultSessionStore(
    (state) => state.setAutoLockPreferences
  )
  const [minutes, setMinutes] = useState(15)
  const [lockWhenHidden, setLockWhenHidden] = useState(false)

  useEffect(() => {
    const preferences = loadAutoLockPreferences()
    window.setTimeout(() => {
      setMinutes(preferences.minutes)
      setLockWhenHidden(preferences.lockWhenHidden)
    }, 0)
  }, [])

  function update(nextMinutes: number, nextHidden: boolean) {
    setMinutes(nextMinutes)
    setLockWhenHidden(nextHidden)
    saveAutoLockPreferences({
      minutes: nextMinutes,
      lockWhenHidden: nextHidden,
    })
    setStorePreferences(nextMinutes, nextHidden)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Clock3 className="size-5" />
          </div>
          <div>
            <CardTitle>Automatic locking</CardTitle>
            <CardDescription>
              Device-local controls for clearing the in-memory vault key.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="auto-lock-delay">Lock after inactivity</Label>
          <Select
            value={String(minutes)}
            onValueChange={(value) =>
              update(Number(value || 15), lockWhenHidden)
            }
          >
            <SelectTrigger id="auto-lock-delay">
              <SelectValue>{minutes} minutes</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AUTO_LOCK_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} minute{option === 1 ? "" : "s"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
          <input
            type="checkbox"
            checked={lockWhenHidden}
            onChange={(event) => update(minutes, event.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <EyeOff className="mt-0.5 size-4 text-muted-foreground" />
          <span>
            <span className="block text-sm font-semibold">
              Lock when app goes to background
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Recommended on shared devices. Switching tabs or minimizing the
              installed app immediately clears the key.
            </span>
          </span>
        </label>
        <p className="flex items-center gap-2 text-xs text-emerald-500">
          <ShieldCheck className="size-4" /> Preferences are stored only on this
          device.
        </p>
      </CardContent>
    </Card>
  )
}
