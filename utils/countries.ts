import { getCountries, getCountryCallingCode } from 'libphonenumber-js'

export interface CountryOption {
  code: string
  name: string
  callingCode: string
  flag: string
}

function codeToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

export const COUNTRIES: CountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: countryName(code),
    callingCode: getCountryCallingCode(code),
    flag: codeToFlag(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

/** All countries with US pinned first. */
export const COUNTRIES_US_FIRST: CountryOption[] = [
  COUNTRIES.find((c) => c.code === 'US')!,
  ...COUNTRIES.filter((c) => c.code !== 'US'),
]

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]))

export function countryByCode(code: string): CountryOption | undefined {
  return byCode.get(code)
}
