/** Only the production Android application is associated with the production website. */
export function androidAppLinks(rawFingerprints: string) {
  const fingerprints = rawFingerprints.split(',').map(value => value.trim().toUpperCase())
  if (!rawFingerprints.trim() || fingerprints.some(value => !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))) return []
  return [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.menofhunger.app',
      sha256_cert_fingerprints: [...new Set(fingerprints)],
    },
  }]
}
