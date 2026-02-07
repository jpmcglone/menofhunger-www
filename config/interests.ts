export type InterestOption = { value: string; label: string; group: string; keywords?: string[] }

export const interestGroupKeywords: Record<string, string[]> = {
  Fitness: ['gym', 'strength', 'lifting', 'hypertrophy'],
  Endurance: ['cardio', 'aerobic', 'stamina'],
  Sports: ['sports', 'athlete'],
  'Combat sports': ['fighting', 'fighter', 'martial', 'grappling', 'striking'],
  Outdoors: ['outdoor', 'nature', 'adventure', 'trail', 'mountains'],
  Motors: ['auto', 'automotive', 'vehicles', 'trucks'],
  'Food & drink': ['food', 'drink', 'cooking', 'bbq', 'grilling'],
  'Tech & games': ['tech', 'technology', 'software', 'coding', 'games', 'gaming'],
  Learning: ['learning', 'education', 'reading', 'study'],
  Business: ['business', 'money', 'finance', 'career'],
  Arts: ['art', 'creative', 'music', 'film'],
  Family: ['family', 'kids', 'parenting', 'dad'],
  Religion: ['religion', 'faith', 'spiritual'],
  Politics: ['politics', 'news', 'government', 'policy', 'elections'],
  Community: ['community', 'service', 'volunteer', 'mentoring'],
  Wellness: ['wellness', 'health', 'mindfulness', 'nutrition'],
  Life: ['life', 'travel', 'roadtrip'],
}

export const interestGroupOrder = [
  'Fitness',
  'Endurance',
  'Sports',
  'Combat sports',
  'Outdoors',
  'Motors',
  'Food & drink',
  'Tech & games',
  'Learning',
  'Business',
  'Arts',
  'Family',
  'Religion',
  'Politics',
  'Community',
  'Wellness',
  'Life',
] as const

export const interestOptions: InterestOption[] = [
  // Fitness
  { value: 'weightlifting', label: 'Weightlifting', group: 'Fitness', keywords: ['oly', 'olympic lifting'] },
  { value: 'powerlifting', label: 'Powerlifting', group: 'Fitness', keywords: ['squat', 'bench', 'deadlift'] },
  { value: 'bodybuilding', label: 'Bodybuilding', group: 'Fitness', keywords: ['hypertrophy'] },
  { value: 'crossfit', label: 'CrossFit', group: 'Fitness', keywords: ['wod'] },
  { value: 'calisthenics', label: 'Calisthenics', group: 'Fitness', keywords: ['bodyweight'] },
  { value: 'kettlebells', label: 'Kettlebells', group: 'Fitness', keywords: ['kettlebell'] },
  { value: 'strongman', label: 'Strongman', group: 'Fitness', keywords: ['atlas stones'] },

  // Endurance
  { value: 'running', label: 'Running', group: 'Endurance' },
  { value: 'trail_running', label: 'Trail running', group: 'Endurance' },
  { value: 'cycling', label: 'Cycling', group: 'Endurance' },
  { value: 'swimming', label: 'Swimming', group: 'Endurance' },
  { value: 'triathlon', label: 'Triathlon', group: 'Endurance' },
  { value: 'rowing', label: 'Rowing', group: 'Endurance' },

  // Sports
  { value: 'basketball', label: 'Basketball', group: 'Sports' },
  { value: 'soccer', label: 'Soccer', group: 'Sports' },
  { value: 'baseball', label: 'Baseball', group: 'Sports' },
  { value: 'football', label: 'Football', group: 'Sports' },
  { value: 'hockey', label: 'Hockey', group: 'Sports' },
  { value: 'tennis', label: 'Tennis', group: 'Sports' },
  { value: 'pickleball', label: 'Pickleball', group: 'Sports' },
  { value: 'golf', label: 'Golf', group: 'Sports' },

  // Combat sports
  { value: 'martial_arts', label: 'Martial arts', group: 'Combat sports', keywords: ['martial arts'] },
  { value: 'boxing', label: 'Boxing', group: 'Combat sports' },
  { value: 'kickboxing', label: 'Kickboxing', group: 'Combat sports' },
  { value: 'muay_thai', label: 'Muay Thai', group: 'Combat sports', keywords: ['muaythai'] },
  { value: 'mma', label: 'MMA', group: 'Combat sports', keywords: ['mixed martial arts'] },
  { value: 'wrestling', label: 'Wrestling', group: 'Combat sports' },
  { value: 'judo', label: 'Judo', group: 'Combat sports' },
  { value: 'jiu_jitsu', label: 'Jiu-jitsu', group: 'Combat sports', keywords: ['bjj', 'brazilian jiu jitsu'] },

  // Outdoors
  { value: 'hiking', label: 'Hiking', group: 'Outdoors' },
  { value: 'camping', label: 'Camping', group: 'Outdoors' },
  { value: 'backpacking', label: 'Backpacking', group: 'Outdoors' },
  { value: 'fishing', label: 'Fishing', group: 'Outdoors' },
  { value: 'hunting', label: 'Hunting', group: 'Outdoors' },
  { value: 'climbing', label: 'Climbing', group: 'Outdoors' },
  { value: 'skiing', label: 'Skiing', group: 'Outdoors' },
  { value: 'snowboarding', label: 'Snowboarding', group: 'Outdoors' },
  { value: 'kayaking', label: 'Kayaking', group: 'Outdoors' },

  // Motors
  { value: 'motorcycles', label: 'Motorcycles', group: 'Motors' },
  { value: 'cars', label: 'Cars', group: 'Motors' },
  { value: 'off_roading', label: 'Off-roading', group: 'Motors' },

  // Food & drink
  { value: 'cooking', label: 'Cooking', group: 'Food & drink', keywords: ['recipes', 'meal prep'] },
  { value: 'bbq', label: 'BBQ', group: 'Food & drink', keywords: ['barbecue', 'grilling', 'smoking'] },
  { value: 'coffee', label: 'Coffee', group: 'Food & drink' },
  { value: 'whiskey', label: 'Whiskey', group: 'Food & drink', keywords: ['bourbon', 'scotch'] },
  { value: 'craft_beer', label: 'Craft beer', group: 'Food & drink', keywords: ['beer'] },

  // Tech & games
  { value: 'tech', label: 'Tech', group: 'Tech & games', keywords: ['technology'] },
  { value: 'programming', label: 'Programming', group: 'Tech & games', keywords: ['coding', 'developer', 'dev'] },
  { value: 'ai', label: 'AI', group: 'Tech & games', keywords: ['machine learning', 'ml'] },
  { value: 'cybersecurity', label: 'Cybersecurity', group: 'Tech & games', keywords: ['infosec', 'security'] },
  { value: 'gaming', label: 'Gaming', group: 'Tech & games' },
  { value: 'board_games', label: 'Board games', group: 'Tech & games', keywords: ['tabletop'] },

  // Learning
  { value: 'books', label: 'Books', group: 'Learning' },
  { value: 'podcasts', label: 'Podcasts', group: 'Learning' },
  { value: 'history', label: 'History', group: 'Learning' },
  { value: 'philosophy', label: 'Philosophy', group: 'Learning' },
  { value: 'psychology', label: 'Psychology', group: 'Learning' },
  { value: 'language_learning', label: 'Language learning', group: 'Learning' },

  // Business
  { value: 'entrepreneurship', label: 'Entrepreneurship', group: 'Business' },
  { value: 'investing', label: 'Investing', group: 'Business' },
  { value: 'real_estate', label: 'Real estate', group: 'Business' },
  { value: 'career_growth', label: 'Career growth', group: 'Business' },

  // Arts
  { value: 'music', label: 'Music', group: 'Arts' },
  { value: 'guitar', label: 'Guitar', group: 'Arts' },
  { value: 'photography', label: 'Photography', group: 'Arts' },
  { value: 'movies', label: 'Movies', group: 'Arts' },

  // Family
  { value: 'fatherhood', label: 'Fatherhood', group: 'Family' },

  // Community
  // Religion
  { value: 'faith', label: 'Faith', group: 'Religion', keywords: ['spirituality', 'spiritual'] },
  { value: 'christianity', label: 'Christianity', group: 'Religion', keywords: ['christian'] },
  { value: 'catholicism', label: 'Catholicism', group: 'Religion', keywords: ['catholic'] },
  { value: 'protestantism', label: 'Protestantism', group: 'Religion', keywords: ['protestant'] },
  { value: 'orthodox_christianity', label: 'Orthodox Christianity', group: 'Religion', keywords: ['orthodox'] },
  { value: 'bible_study', label: 'Bible study', group: 'Religion', keywords: ['bible'] },

  // Politics
  { value: 'politics', label: 'Politics', group: 'Politics', keywords: ['political'] },
  { value: 'current_events', label: 'Current events', group: 'Politics', keywords: ['news'] },
  { value: 'civics', label: 'Civics', group: 'Politics', keywords: ['government'] },
  { value: 'policy', label: 'Policy', group: 'Politics', keywords: ['public policy'] },
  { value: 'elections', label: 'Elections', group: 'Politics', keywords: ['voting'] },
  { value: 'law', label: 'Law', group: 'Politics', keywords: ['legal'] },
  { value: 'economics', label: 'Economics', group: 'Politics', keywords: ['economy'] },
  { value: 'geopolitics', label: 'Geopolitics', group: 'Politics', keywords: ['international relations'] },

  // Community
  { value: 'volunteering', label: 'Volunteering', group: 'Community' },
  { value: 'mens_groups', label: "Men's groups", group: 'Community' },
  { value: 'mentorship', label: 'Mentorship', group: 'Community' },

  // Wellness
  { value: 'nutrition', label: 'Nutrition', group: 'Wellness' },
  { value: 'mental_health', label: 'Mental health', group: 'Wellness' },
  { value: 'meditation', label: 'Meditation', group: 'Wellness' },
  { value: 'mobility', label: 'Mobility', group: 'Wellness' },
  { value: 'yoga', label: 'Yoga', group: 'Wellness' },

  // Life
  { value: 'travel', label: 'Travel', group: 'Life' },
  { value: 'road_trips', label: 'Road trips', group: 'Life' },
]

