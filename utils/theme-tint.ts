type PrimaryPalette = {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
}

// Default app brand (PrimeVue preset orange).
export const PRIMARY_ORANGE: PrimaryPalette = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#f39b4f',
  500: '#c77d1a',
  600: '#ad6815',
  700: '#8f5412',
  800: '#6f400f',
  900: '#53300c',
}

// Verified accent (X-style blue).
export const PRIMARY_VERIFIED_BLUE: PrimaryPalette = {
  50: '#eff6ff',
  100: '#dcecff',
  200: '#b9dbff',
  300: '#86c0f2',
  400: '#4f9fd8',
  500: '#2b7bb9',
  600: '#23679c',
  700: '#1f567f',
  800: '#1a4767',
  900: '#13354d',
}

// Premium accent (amber/orange).
export const PRIMARY_PREMIUM_ORANGE: PrimaryPalette = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#f39b4f',
  500: '#c77d1a',
  600: '#ad6815',
  700: '#8f5412',
  800: '#6f400f',
  900: '#53300c',
}

// Only-me accent (calmer violet).
export const PRIMARY_ONLYME_PURPLE: PrimaryPalette = {
  50: '#f3f1ff',
  100: '#e7e3ff',
  200: '#cfc6ff',
  300: '#b3a3ff',
  400: '#8f77f0',
  500: '#6b4fd3',
  600: '#5b3fb8',
  700: '#4a3397',
  800: '#3b2a78',
  900: '#2b1f55',
}

// Logged out / not verified tint: match text color (near-black in light, near-white in dark).
export const PRIMARY_TEXT_LIGHT: PrimaryPalette = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#141210',
  600: '#100f0d',
  700: '#0d0b0a',
  800: '#090807',
  900: '#050403',
}

export const PRIMARY_TEXT_DARK: PrimaryPalette = {
  50: '#0b0d10',
  100: '#14181d',
  200: '#1b2128',
  300: '#2a323d',
  400: '#3a4555',
  500: '#f1eee7',
  600: '#f6f4ee',
  700: '#fbfaf7',
  800: '#ffffff',
  900: '#ffffff',
}

/**
 * Spaces brand gradient: verified blue (left) → premium orange (right).
 * Uses CSS variables so it respects live theme changes automatically.
 * Use `spacesGradientStyle()` when you need an inline `style` object,
 * or reference `SPACES_GRADIENT` directly in a CSS `background` value.
 */
export const SPACES_GRADIENT = 'linear-gradient(90deg, var(--moh-verified), var(--moh-premium))'

/** Returns an inline-style `background` for the Spaces gradient (pill, circle, ring). */
export function spacesGradientStyle(): { background: string } {
  return { background: SPACES_GRADIENT }
}

export function primaryPaletteToCssVars(p: PrimaryPalette, selector: string, contrastColor: string): string {
  // PrimeVue semantic token naming: var(--p-primary-500), etc.
  // Use `!important` to ensure these overrides win over theme CSS.
  return [
    `${selector}{`,
    // PrimeVue v4+ convenience tokens
    `--p-primary-color:${p[500]} !important;`,
    `--p-primary-contrast-color:${contrastColor} !important;`,
    `--p-primary-50:${p[50]} !important;`,
    `--p-primary-100:${p[100]} !important;`,
    `--p-primary-200:${p[200]} !important;`,
    `--p-primary-300:${p[300]} !important;`,
    `--p-primary-400:${p[400]} !important;`,
    `--p-primary-500:${p[500]} !important;`,
    `--p-primary-600:${p[600]} !important;`,
    `--p-primary-700:${p[700]} !important;`,
    `--p-primary-800:${p[800]} !important;`,
    `--p-primary-900:${p[900]} !important;`,
    // Legacy/compat tokens (harmless if unused, helps if any theme token maps to these)
    `--primary-color:${p[500]} !important;`,
    `--primary-color-text:${contrastColor} !important;`,
    '}',
  ].join('')
}

/** Returns the primary-500 hex for loading indicators etc. */
export function primaryColor500ForUser(user: { verifiedStatus?: string | null; premium?: boolean | null } | null): string {
  if (user?.premium) return PRIMARY_PREMIUM_ORANGE[500]
  if (user?.verifiedStatus && user.verifiedStatus !== 'none') return PRIMARY_VERIFIED_BLUE[500]
  return PRIMARY_ORANGE[500]
}

export function primaryTintCssForUser(user: { verifiedStatus?: string | null; premium?: boolean | null } | null): string {
  if (user?.premium) {
    // Premium gold works best with dark text in both modes.
    return (
      primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, 'html', '#111827') +
      primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, 'html.dark', '#111827')
    )
  }
  if (user?.verifiedStatus && user.verifiedStatus !== 'none') {
    // Verified blue works best with white text in both modes (X-like).
    return (
      primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, 'html', '#ffffff') +
      primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, 'html.dark', '#ffffff')
    )
  }
  // Default: follow text color (light vs dark).
  return (
    primaryPaletteToCssVars(PRIMARY_TEXT_LIGHT, 'html', '#ffffff') +
    primaryPaletteToCssVars(PRIMARY_TEXT_DARK, 'html.dark', '#000000')
  )
}

