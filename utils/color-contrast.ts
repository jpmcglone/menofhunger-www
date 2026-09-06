/** WCAG 2.2 sRGB relative luminance; opaque colors in #RGB or #RRGGBB. */
export function relativeLuminance(hex: string): number {
  const digits = hex.trim().replace(/^#/, '')
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(digits)) throw new Error('Expected an opaque hex color')
  const full = digits.length === 3 ? [...digits].map((x) => x + x).join('') : digits
  const linear = [0, 2, 4].map((i) => {
    const value = parseInt(full.slice(i, i + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722
}

export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first), b = relativeLuminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Pick the stronger black/white contrast, rather than estimating perceived brightness. */
export function pickTextColorForBg(background: string): '#ffffff' | '#000000' {
  try {
    const luminance = relativeLuminance(background)
    return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff'
  } catch {
    return '#ffffff'
  }
}
