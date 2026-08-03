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
  } catch (err) {
    console.warn("BroadcastChannel error:", err)
  }
}

export function subscribeBroadcast(
  callback: (msg: BroadcastMessageType) => void
): () => void {
  const ch = getChannel()
  if (!ch) return () => {}

  const handler = (event: MessageEvent<BroadcastMessageType>) => {
    callback(event.data)
  }

  ch.addEventListener("message", handler)

  return () => {
    ch.removeEventListener("message", handler)
  }
}
