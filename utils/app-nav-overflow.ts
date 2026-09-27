/** How many primary nav rows the left rail can show before the rest go behind More. */
export function splitNavByCapacity<T>(
  items: readonly T[],
  capacity: number,
): { visible: T[]; overflow: T[] } {
  if (items.length === 0 || capacity <= 0) {
    return { visible: [], overflow: [...items] }
  }
  if (items.length <= capacity) {
    return { visible: [...items], overflow: [] }
  }
  const room = Math.max(0, capacity - 1)
  return { visible: items.slice(0, room), overflow: items.slice(room) }
}
