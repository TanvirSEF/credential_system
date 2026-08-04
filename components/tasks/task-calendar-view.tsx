"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { DecryptedTask } from "@/lib/types/task"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function TaskCalendarView({
  tasks,
  now,
  onOpenTask,
}: {
  tasks: DecryptedTask[]
  now: number
  onOpenTask: (task: DecryptedTask) => void
}) {
  const today = now > 0 ? new Date(now) : null
  const [cursor, setCursor] = useState(() => {
    const base = now > 0 ? new Date(now) : new Date(2000, 0, 1)
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const tasksByDate = useMemo(() => {
    const map = new Map<string, DecryptedTask[]>()
    for (const task of tasks) {
      if (!task.payload.dueDate) continue
      const due = new Date(task.payload.dueDate)
      if (Number.isNaN(due.getTime())) continue
      const key = dateKey(due.getFullYear(), due.getMonth(), due.getDate())
      const list = map.get(key) ?? []
      list.push(task)
      map.set(key, list)
    }
    return map
  }, [tasks])

  const todayKey = today
    ? dateKey(today.getFullYear(), today.getMonth(), today.getDate())
    : null

  const cells: Array<{ day: number; key: string } | null> = []
  for (let index = 0; index < firstWeekday; index++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: dateKey(year, month, day) })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="flex size-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (today)
                setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
            }}
            className="rounded-lg border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="flex size-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="px-1 py-2 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
            >
              {weekday}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, index) => {
            if (!cell) {
              return <div key={`blank-${index}`} className="min-h-24 border-b border-r bg-muted/10" />
            }
            const dayTasks = tasksByDate.get(cell.key) ?? []
            const isToday = cell.key === todayKey
            return (
              <div
                key={cell.key}
                className="min-h-24 border-b border-r p-1.5 last:border-r-0"
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {cell.day}
                </span>
                <div className="mt-1 space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onOpenTask(task)}
                      className="block w-full truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-left text-[11px] font-medium text-primary hover:bg-primary/20"
                    >
                      {task.payload.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="block px-1 text-[10px] text-muted-foreground">
                      +{dayTasks.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
