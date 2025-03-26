export const siteConfig = {
  name: 'Men of Hunger',
  established: 2025,
  url: 'https://menofhunger.com',
  creator: {
    name: 'John McGlone',
    url: 'https://jpmcglone.com'
  },
  social: {
    twitter: '@MenOfHunger'
  },
  meta: {
    title: 'Men of Hunger - Coming soon',
    description: "Men of Hunger — an online and offline brotherhood for driven men. Ambition isn't a flaw — it's fuel. We rise. We build. We lead.",
    keywords: 'men of hunger, brotherhood, ambition, driven men, leadership, personal growth, vision, purpose, masculine excellence, achievement'
  }
}

export function getCopyrightYear(establishedYear: number = new Date().getFullYear()) {
  const currentYear = new Date().getFullYear()
  return currentYear > establishedYear 
    ? `${establishedYear}–${currentYear}`
    : currentYear.toString()
} 