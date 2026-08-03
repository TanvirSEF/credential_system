"use client"

import { useMemo, useState } from "react"
import { Check, Copy, RefreshCw, WandSparkles } from "lucide-react"
import {
  estimatePasswordEntropy,
  generatePassphrase,
  generatePassword,
  type PasswordOptions,
} from "@/lib/security/password-generator"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const DEFAULT_OPTIONS: PasswordOptions = {
  length: 24,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  avoidAmbiguous: true,
}

export function PasswordGeneratorDialog({
  onUse,
}: {
  onUse: (password: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"password" | "passphrase">("password")
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [wordCount, setWordCount] = useState(7)
  const [generated, setGenerated] = useState(() =>
    generatePassword(DEFAULT_OPTIONS)
  )
  const [copied, setCopied] = useState(false)

  const entropy = useMemo(
    () =>
      mode === "passphrase"
        ? wordCount * 10
        : estimatePasswordEntropy(generated),
    [generated, mode, wordCount]
  )

  function regenerate(nextMode = mode) {
    setGenerated(
      nextMode === "password"
        ? generatePassword(options)
        : generatePassphrase(wordCount)
    )
    setCopied(false)
  }

  function selectMode(nextMode: "password" | "passphrase") {
    setMode(nextMode)
    regenerate(nextMode)
  }

  function updateOptions(updates: Partial<PasswordOptions>) {
    const nextOptions = { ...options, ...updates }
    if (
      !nextOptions.uppercase &&
      !nextOptions.lowercase &&
      !nextOptions.numbers &&
      !nextOptions.symbols
    ) {
      return
    }
    setOptions(nextOptions)
    if (mode === "password") setGenerated(generatePassword(nextOptions))
    setCopied(false)
  }

  function updateWordCount(nextCount: number) {
    setWordCount(nextCount)
    if (mode === "passphrase") setGenerated(generatePassphrase(nextCount))
    setCopied(false)
  }

  async function copyGenerated() {
    await navigator.clipboard.writeText(generated)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Generate password"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <WandSparkles className="size-4" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Password generator</DialogTitle>
          <DialogDescription>
            Generated locally with the browser cryptographic random generator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
            {(["password", "passphrase"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => selectMode(item)}
                className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                  mode === item
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 text-sm font-semibold break-all">
                {generated}
              </code>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={copyGenerated}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => regenerate()}
              >
                <RefreshCw />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Estimated entropy: {entropy} bits
            </p>
          </div>

          {mode === "password" ? (
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium">
                <span>Length: {options.length}</span>
                <input
                  type="range"
                  min={12}
                  max={64}
                  value={options.length}
                  onChange={(event) =>
                    updateOptions({ length: Number(event.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </label>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(
                  [
                    ["uppercase", "Uppercase"],
                    ["lowercase", "Lowercase"],
                    ["numbers", "Numbers"],
                    ["symbols", "Symbols"],
                    ["avoidAmbiguous", "Avoid ambiguous"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(event) =>
                        updateOptions({ [key]: event.target.checked })
                      }
                      className="size-4 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <label className="block space-y-2 text-sm font-medium">
              <span>Word pairs: {wordCount}</span>
              <input
                type="range"
                min={5}
                max={10}
                value={wordCount}
                onChange={(event) =>
                  updateWordCount(Number(event.target.value))
                }
                className="w-full accent-primary"
              />
            </label>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onUse(generated)
              setOpen(false)
            }}
          >
            Use password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
