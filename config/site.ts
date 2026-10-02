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
    'Community',
    'Fitness',
    'Business',
    'Faith',
    'Family',
  ],
  // Editable Figma master: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=1075-397
  // Versioned, repository-owned artwork; served by the web app, not uploaded to R2.
  homeShare: {
    title: 'Men of Hunger — Join men who show up.',
    image: '/images/social/home-v1.png',
    imageAlt: 'Join men who show up. A trusted community for men who want real conversation. Join now at menofhunger.com.',
    imageWidth: 1200,
    imageHeight: 630,
  },
  meta: {
    title: 'Men of Hunger',
    description: "Join a trusted community for men who want real conversation, not more noise. Bring your friends, find your people, and show up together.",
    keywords: 'men of hunger, community, measurable progress, personal growth, accountability, cohorts, workshops, leadership, ambition, driven men'
  }
}

export function getCopyrightYear(establishedYear: number = new Date().getFullYear()) {
  const currentYear = new Date().getFullYear()
  return currentYear > establishedYear
    ? `${establishedYear}–${currentYear}`
    : currentYear.toString()
}
