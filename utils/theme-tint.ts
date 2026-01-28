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

// Default app brand (current PrimeVue preset): Tailwind orange.
export const PRIMARY_ORANGE: PrimaryPalette = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
}

// Verified accent (X-style blue).
export const PRIMARY_VERIFIED_BLUE: PrimaryPalette = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#1D9BF0',
  600: '#0B6FBF',
  700: '#075985',
  800: '#0c4a6e',
  900: '#0b3b59',
}

// Premium accent (amber/orange).
export const PRIMARY_PREMIUM_ORANGE: PrimaryPalette = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400e',
  900: '#78350f',
}

// Logged out / not verified tint: match text color (near-black in light, near-white in dark).
export const PRIMARY_TEXT_LIGHT: PrimaryPalette = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#111827',
  600: '#0f172a',
  700: '#0b1220',
  800: '#060a12',
  900: '#000000',
}

export const PRIMARY_TEXT_DARK: PrimaryPalette = {
  50: '#09090b',
  100: '#18181b',
  200: '#27272a',
  300: '#3f3f46',
  400: '#52525b',
  500: '#fafafa',
  600: '#ffffff',
  700: '#ffffff',
  800: '#ffffff',
  900: '#ffffff',
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

export function primaryTintCssForUser(user: { verifiedStatus?: string | null; premium?: boolean | null } | null): string {
  if (user?.premium) {
    // Light: white text; Dark: black text (matches our UI treatment).
    return (
      primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, 'html', '#ffffff') +
      primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, 'html.dark', '#000000')
    )
  }
  if (user?.verifiedStatus && user.verifiedStatus !== 'none') {
    return (
      primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, 'html', '#ffffff') +
      primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, 'html.dark', '#000000')
    )
  }
  // Default: follow text color (light vs dark).
  return (
    primaryPaletteToCssVars(PRIMARY_TEXT_LIGHT, 'html', '#ffffff') +
    primaryPaletteToCssVars(PRIMARY_TEXT_DARK, 'html.dark', '#000000')
  )
}

