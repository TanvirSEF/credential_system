"use client";

import { useEffect, useState } from "react";
import { encryptPayload, generateVaultKey } from "@/lib/crypto";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Terminal } from "lucide-react";

export function LandingEncryptionSandbox() {
  const [inputText, setInputText] = useState("My Secret Password 2026!");
  const [ciphertext, setCiphertext] = useState("");
  const [iv, setIv] = useState("");
  const [encrypting, setEncrypting] = useState(false);

  useEffect(() => {
    let active = true;
    async function runLiveEncrypt() {
      if (!inputText) {
        setCiphertext("");
        setIv("");
        return;
      }
      setEncrypting(true);
      try {
        const dummyKey = await generateVaultKey();
        const res = await encryptPayload({ text: inputText }, dummyKey);
        if (active) {
          setCiphertext(res.ciphertext);
          setIv(res.iv);
        }
      } catch (err) {
        console.warn("Sandbox error:", err);
      } finally {
        if (active) setEncrypting(false);
      }
    }
    const timer = setTimeout(runLiveEncrypt, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputText]);

  return (
    <Card className="max-w-3xl mx-auto shadow-2xl border-blue-500/30 bg-slate-950/70 backdrop-blur-xl text-left overflow-hidden relative group transition-all duration-300 hover:border-blue-500/50">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-sky-500/10 to-blue-600/20 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />

      <CardHeader className="relative border-b border-blue-500/20 bg-slate-900/60 py-3.5 px-6 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
          <span className="text-xs font-mono text-slate-400 ml-2">spv-crypto-engine://browser-sandbox</span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30 font-mono flex items-center gap-1">
          <Terminal className="h-3 w-3" /> BROWSER CRYPTO TEST
        </Badge>
      </CardHeader>

      <CardContent className="relative p-6 space-y-5 font-mono text-xs text-slate-200">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
            <Lock className="h-3.5 w-3.5 text-blue-400" /> Type Sample Secret Text Below:
          </label>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type anything to test client-side AES-256 encryption..."
            className="font-mono text-sm bg-slate-900/90 border-blue-500/30 text-white focus-visible:ring-blue-500"
          />
        </div>

        <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200">Client-Side Output (AES-256-GCM Payload)</span>
            <span>{encrypting ? "Encrypting..." : "256-bit Encrypted"}</span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div>
              <span className="text-slate-400">Ciphertext: </span>
              <span className="text-blue-400 font-bold break-all">{ciphertext || "••••••••••••••••"}</span>
            </div>
            <div>
              <span className="text-slate-400">Initialization Vector (IV): </span>
              <span className="text-sky-400 font-bold">{iv || "••••••••"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px] font-sans">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Zero-Knowledge Boundary: Plaintext is encrypted locally using Web Crypto API.</span>
        </div>
      </CardContent>
    </Card>
  );
}
