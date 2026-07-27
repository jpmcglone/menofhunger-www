/**
 * Fires `onBoundary()` when the server's `nextPublishAt` timestamp is crossed,
 * then reschedules using the refreshed value.
 *
 * Usage:
 *   const { scheduleFromNextPublishAt } = usePublishBoundaryRollover(() => onBoundary())
 *   watch(() => dailyContent.value?.nextPublishAt, scheduleFromNextPublishAt)
 *   onMounted(() => scheduleFromNextPublishAt(dailyContent.value?.nextPublishAt))
 */
export function usePublishBoundaryRollover(onBoundary: () => void | Promise<void>) {
  let timer: ReturnType<typeof setTimeout> | null = null

  function cancel() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function scheduleFromNextPublishAt(nextPublishAt: string | null | undefined) {
    cancel()
    if (!nextPublishAt) return
    const msUntil = new Date(nextPublishAt).getTime() - Date.now()
    // Add a 2s buffer so we reliably cross the boundary before re-checking.
    timer = setTimeout(async () => {
      timer = null
      await onBoundary()
    }, Math.max(1000, msUntil + 2000))
  }

  if (import.meta.client) {
    onBeforeUnmount(() => cancel())
  }

  return { scheduleFromNextPublishAt, cancelPublishBoundary: cancel }
}
