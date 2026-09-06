const platforms = {
  ios: { key: 'ios', label: 'iOS', icon: 'platformIOS' },
  web: { key: 'web', label: 'Web', icon: 'platformWeb' },
  android: { key: 'android', label: 'Android', icon: 'platformAndroid' },
} as const

/** A stable order prevents row movement as sockets connect. Unknown clients make no platform claim. */
export function presencePlatforms(values: readonly string[] | null | undefined) {
  const active = new Set((values ?? []).map(value => value.toLowerCase()))
  return Object.values(platforms).filter(platform => active.has(platform.key))
}
