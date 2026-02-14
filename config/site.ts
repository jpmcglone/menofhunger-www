export const siteConfig = {
  name: 'Men of Hunger',
  established: 2025,
  url: 'https://menofhunger.com',
  creator: {
    name: 'John McGlone',
    url: 'https://jpmcglone.com'
  },
  social: {
    twitter: '@MenOfHunger',
    xUrl: 'https://x.com/menofhunger',
    meetup: 'https://www.meetup.com/menofhunger/'
  },
  meta: {
    title: 'Men of Hunger',
    description: "Men of Hunger is an online and offline community for driven men. Ambition isn't a flaw — it's fuel. We rise. We build. We lead.",
    keywords: 'men of hunger, community, ambition, driven men, leadership, personal growth, vision, purpose, achievement'
  }
}

export function getCopyrightYear(establishedYear: number = new Date().getFullYear()) {
  const currentYear = new Date().getFullYear()
  return currentYear > establishedYear 
    ? `${establishedYear}–${currentYear}`
    : currentYear.toString()
} 