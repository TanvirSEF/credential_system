"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { VaultGuard } from "@/components/vault-guard"
import { AvatarUpload } from "@/components/avatar-upload"
import { PwaSettingsCard } from "@/components/pwa-manager"
import {
  getProfileAction,
  updateProfileNameAction,
} from "@/lib/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

interface ProfileState {
  email: string
  fullName: string
  avatarUrl: string | null
}

function SettingsContent() {
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [name, setName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<string | null>(null)

  useEffect(() => {
    getProfileAction().then((p) => {
      if (p) {
        setProfile(p)
        setName(p.fullName)
      }
    })
  }, [])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    setNameMsg(null)
    const res = await updateProfileNameAction(name)
    if (res.error) {
      setNameMsg(res.error)
    } else {
      setNameMsg("Saved.")
      setProfile((prev) => (prev ? { ...prev, fullName: name.trim() } : prev))
    }
    setSavingName(false)
  }

  if (!profile) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading profile…</div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6 p-6 lg:p-8">
      <div className="space-y-1">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to dashboard
        </Link>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile picture</CardTitle>
          <CardDescription>
            Upload a display picture (PNG, JPEG, or WebP, max 5 MB).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            avatarUrl={profile.avatarUrl}
            name={profile.fullName}
            onUpdated={(url) =>
              setProfile((prev) => (prev ? { ...prev, avatarUrl: url } : prev))
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display name</CardTitle>
          <CardDescription>
            Shown in your dashboard greeting and sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <Button
              type="submit"
              disabled={savingName || name.trim().length === 0}
            >
              {savingName ? "Saving…" : "Save"}
            </Button>
          </form>
          {nameMsg && (
            <p
              className={`mt-2 text-xs ${
                nameMsg === "Saved." ? "text-emerald-500" : "text-destructive"
              }`}
            >
              {nameMsg}
            </p>
          )}
        </CardContent>
      </Card>

      <PwaSettingsCard />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <VaultGuard>
      <SettingsContent />
    </VaultGuard>
  )
}
