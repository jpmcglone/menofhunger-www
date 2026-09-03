/** All iOS browsers (Safari, Chrome, Firefox) share WebKit autoplay rules. */
export function isIosWebKit(
  ua = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
): boolean {
  if (!ua) return false
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)
  return ios && /WebKit/.test(ua)
}
