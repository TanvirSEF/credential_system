"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, Download } from "lucide-react";
import { getInstanceUpdateStatusAction } from "@/lib/actions/instance";
import type { InstanceUpdateStatus } from "@/lib/instance/updates";
import { Button, buttonVariants } from "@/components/ui/button";

export function InstanceUpdateNotice() {
  const [status, setStatus] = useState<InstanceUpdateStatus | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getInstanceUpdateStatusAction()
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch(() => {
        if (active) setStatus({ isOwner: false });
      });
    return () => {
      active = false;
    };
  }, []);

  if (!status || !status.isOwner || status.state !== "available") return null;

  async function copyUpdateCommand() {
    if (!status?.isOwner || !status.updateCommand) return;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(status.updateCommand);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = status.updateCommand;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <section className="rounded-xl border border-blue-500/25 bg-blue-500/[0.06] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/12 text-blue-400">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold">Update {status.latestVersion} is available</p>
            <p className="text-xs text-muted-foreground">
              Installed: {status.currentVersion}. Only the instance owner can see this notice.
            </p>
            {status.releaseNotes && (
              <details className="pt-2">
                <summary className="cursor-pointer text-xs font-semibold text-blue-400">
                  View release notes
                </summary>
                <p className="mt-2 max-w-3xl whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {status.releaseNotes}
                </p>
              </details>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {status.releaseUrl && (
            <a
              href={status.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Release
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          <Button size="sm" onClick={copyUpdateCommand}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy update command"}
          </Button>
        </div>
      </div>
    </section>
  );
}
