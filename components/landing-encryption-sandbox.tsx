"use client"

import { useEffect, useState } from "react"
import { encryptPayload, generateVaultKey } from "@/lib/crypto"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Lock, Terminal } from "lucide-react"

export function LandingEncryptionSandbox() {
  const [inputText, setInputText] = useState("My Secret Password 2026!")
  const [ciphertext, setCiphertext] = useState("")
  const [iv, setIv] = useState("")
  const [encrypting, setEncrypting] = useState(false)

  useEffect(() => {
    let active = true
    async function runLiveEncrypt() {
      if (!inputText) {
        setCiphertext("")
        setIv("")
        return
      }
      setEncrypting(true)
      try {
        const dummyKey = await generateVaultKey()
        const res = await encryptPayload({ text: inputText }, dummyKey)
        if (active) {
          setCiphertext(res.ciphertext)
          setIv(res.iv)
        }
      } catch (err) {
        console.warn("Sandbox error:", err)
      } finally {
        if (active) setEncrypting(false)
      }
    }
    const timer = setTimeout(runLiveEncrypt, 150)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [inputText])

  return (
    <Card className="group relative mx-auto max-w-3xl overflow-hidden border-blue-500/30 bg-slate-950/70 text-left shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-blue-500/50">
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-600/20 via-sky-500/10 to-blue-600/20 opacity-30 blur transition duration-500 group-hover:opacity-60" />

      <CardHeader className="relative flex flex-row items-center justify-between border-b border-blue-500/20 bg-slate-900/60 px-6 py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
          <span className="ml-2 font-mono text-xs text-slate-400">
            spv-crypto-engine://browser-sandbox
          </span>
        </div>
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-blue-500/30 bg-blue-500/10 font-mono text-[10px] text-blue-400"
        >
          <Terminal className="h-3 w-3" /> BROWSER CRYPTO TEST
        </Badge>
      </CardHeader>

      <CardContent className="relative space-y-5 p-6 font-mono text-xs text-slate-200">
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 font-sans text-xs font-semibold text-slate-300">
            <Lock className="h-3.5 w-3.5 text-blue-400" /> Type Sample Secret
            Text Below:
          </label>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type anything to test client-side AES-256 encryption..."
            className="border-blue-500/30 bg-slate-900/90 font-mono text-sm text-white focus-visible:ring-blue-500"
          />
        </div>

        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/90 p-4 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
            <span className="font-bold text-slate-200">
              Client-Side Output (AES-256-GCM Payload)
            </span>
            <span>{encrypting ? "Encrypting..." : "256-bit Encrypted"}</span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div>
              <span className="text-slate-400">Ciphertext: </span>
              <span className="font-bold break-all text-blue-400">
                {ciphertext || "••••••••••••••••"}
              </span>
            </div>
            <div>
              <span className="text-slate-400">
                Initialization Vector (IV):{" "}
              </span>
              <span className="font-bold text-sky-400">{iv || "••••••••"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-sans text-[11px] text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>
            Zero-Knowledge Boundary: Plaintext is encrypted locally using Web
            Crypto API.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
