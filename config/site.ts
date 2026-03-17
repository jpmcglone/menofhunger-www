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
    meetup: 'https://www.meetup.com/menofhunger/',
  },
  // Contact email shown in Organization schema — helps Google trust the entity.
  // Set to an empty string to omit from schema.
  contactEmail: 'hello@menofhunger.com',
  // Core topics the community covers — used in Organization.knowsAbout schema.
  topics: [
    'Personal growth',
    'Accountability',
    'Discipline',
    'Leadership',
    'Ambition',
    'Men\'s community',
    'Brotherhood',
    'Fitness',
    'Business',
    'Faith',
    'Family',
  ],
  meta: {
    title: 'Men of Hunger',
    description: "Men of Hunger is a trusted community for men who want measurable progress in life. Structured conversations, accountability, cohorts, workshops, and premium playbooks — not just a forum.",
    keywords: 'men of hunger, community, measurable progress, personal growth, accountability, cohorts, workshops, leadership, ambition, driven men'
  }
}

export function getCopyrightYear(establishedYear: number = new Date().getFullYear()) {
  const currentYear = new Date().getFullYear()
  return currentYear > establishedYear
    ? `${establishedYear}–${currentYear}`
    : currentYear.toString()
}
