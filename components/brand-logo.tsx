import Image from "next/image"
import { cn } from "@/lib/utils"

export function BrandLogo({
  variant = "wordmark",
  className,
  preload = false,
}: {
  variant?: "wordmark" | "icon"
  className?: string
  preload?: boolean
}) {
  if (variant === "icon") {
    return (
      <span
        className={cn(
          "relative block h-9 w-9 shrink-0 overflow-hidden",
          className
        )}
      >
        <Image
          src="/images/logo.png"
          alt="Secure Personal Vault"
          width={1536}
          height={1024}
          preload={preload}
          className="absolute -top-[76px] -left-[42px] h-[205px] w-[307px] max-w-none"
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        "relative block h-11 w-[220px] shrink-0 overflow-hidden",
        className
      )}
    >
      <Image
        src="/images/logo.png"
        alt="Secure Personal Vault — Zero-Knowledge Encryption"
        width={1536}
        height={1024}
        preload={preload}
        className="absolute top-[70%] left-1/2 h-auto w-[300px] max-w-none -translate-x-1/2 -translate-y-1/2 transition-[filter] dark:brightness-0 dark:invert"
      />
    </span>
  )
}
