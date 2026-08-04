const ORDER_GAP = 1000
const DENSE_THRESHOLD = 1

export function orderForInsert(
  prevOrder: number | null,
  nextOrder: number | null
): number {
  if (prevOrder === null && nextOrder === null) return ORDER_GAP
  if (prevOrder === null) return (nextOrder as number) - ORDER_GAP
  if (nextOrder === null) return prevOrder + ORDER_GAP
  return (prevOrder + nextOrder) / 2
}

export function rebalanceOrders(
  orderedTasks: { id: string; order: number }[]
): Map<string, number> | null {
  let needsRebalance = false
  for (let index = 1; index < orderedTasks.length; index++) {
    if (
      orderedTasks[index].order - orderedTasks[index - 1].order <
      DENSE_THRESHOLD
    ) {
      needsRebalance = true
      break
    }
  }
  if (!needsRebalance) return null
  const result = new Map<string, number>()
  orderedTasks.forEach((task, index) => {
    result.set(task.id, (index + 1) * ORDER_GAP)
  })
  return result
}

export function sortTasksByOrder<
  T extends { payload: { order: number } }
>(items: T[]): T[] {
  return [...items].sort((a, b) => a.payload.order - b.payload.order)
}

export function nextOrderInList<
  T extends { payload: { order: number } }
>(items: T[]): number {
  if (items.length === 0) return ORDER_GAP
  return Math.max(...items.map((item) => item.payload.order)) + ORDER_GAP
}

export function sortBySortOrder<
  T extends { sortOrder: number }
>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}
