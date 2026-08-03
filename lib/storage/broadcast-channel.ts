const CHANNEL_NAME = "spv_session_sync"

export type BroadcastMessageType =
  { type: "VAULT_LOCKED" } | { type: "CACHE_INVALIDATED" }

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null
  if (!channel && "BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME)
  }
  return channel
}

export function broadcastMessage(msg: BroadcastMessageType): void {
  try {
    const ch = getChannel()
    ch?.postMessage(msg)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<BroadcastMessageType>("spv:broadcast", { detail: msg })
      )
    }
  } catch (err) {
    console.warn("BroadcastChannel error:", err)
  }
}

export function subscribeBroadcast(
  callback: (msg: BroadcastMessageType) => void,
  includeLocal = false
): () => void {
  const ch = getChannel()

  const handler = (event: MessageEvent<BroadcastMessageType>) => {
    callback(event.data)
  }
  const localHandler = (event: Event) => {
    callback((event as CustomEvent<BroadcastMessageType>).detail)
  }

  ch?.addEventListener("message", handler)
  if (includeLocal) window.addEventListener("spv:broadcast", localHandler)

  return () => {
    ch?.removeEventListener("message", handler)
    if (includeLocal) window.removeEventListener("spv:broadcast", localHandler)
  }
}
