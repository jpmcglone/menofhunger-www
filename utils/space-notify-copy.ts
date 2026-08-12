/** Host-facing copy for schedule Notify-me signup count (excludes the host). */
export function spaceNotifySignupTooltip(count: number): string {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (n === 0) return 'No one has signed up for a reminder yet. You still get a 15-min reminder.'
  if (n === 1) return '1 person signed up for a reminder. You get a 15-min reminder too.'
  return `${n} people signed up for a reminder. You get a 15-min reminder too.`
}
