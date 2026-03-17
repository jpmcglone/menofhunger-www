export function formatTaxonomyLabel(label: string): string {
  return String(label ?? '').trim()
}

export function formatHashtagLabel(label: string): string {
  const clean = String(label ?? '').trim().replace(/^#+/, '')
  return clean ? `#${clean}` : '#'
}
