"use client"

import { useEffect, useRef } from "react"
import type { DecryptedTask } from "@/lib/types/task"

const SOON_WINDOW_MS = 24 * 60 * 60 * 1000

export function useTaskReminders(
  tasks: DecryptedTask[],
  now: number,
  enabled: boolean
) {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {})
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || now === 0) return
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (Notification.permission !== "granted") return

    for (const task of tasks) {
      if (task.parentId !== null) continue
      if (task.payload.completedAt) continue
      if (!task.payload.dueDate) continue
      const due = new Date(task.payload.dueDate).getTime()
      if (Number.isNaN(due)) continue
      const delta = due - now
      if (delta > SOON_WINDOW_MS) continue
      if (notifiedRef.current.has(task.id)) continue
      notifiedRef.current.add(task.id)

      const overdue = delta < 0
      try {
        new Notification(overdue ? "Task overdue" : "Task due soon", {
          body: task.payload.title,
          tag: task.id,
        })
      } catch {
        // notifications may be blocked; ignore
      }
    }
  }, [tasks, now, enabled])

  useEffect(() => {
    if (!enabled) notifiedRef.current = new Set()
  }, [enabled])
}
