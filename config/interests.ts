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
  {
    value: 'weightlifting',
    label: 'Weightlifting',
    group: 'Fitness',
    keywords: ['oly', 'olympic lifting', 'olympic weightlifting', 'snatch', 'clean and jerk', 'clean & jerk', 'c and j', 'c&j'],
  },
  { value: 'powerlifting', label: 'Powerlifting', group: 'Fitness', keywords: ['squat', 'bench', 'deadlift', 'sbd', '1rm', 'pr', 'ipf', 'usapl'] },
  { value: 'bodybuilding', label: 'Bodybuilding', group: 'Fitness', keywords: ['hypertrophy', 'physique', 'body building', 'mr olympia', 'arnold classic'] },
  { value: 'crossfit', label: 'CrossFit', group: 'Fitness', keywords: ['wod', 'cross fit', 'crossfit games', 'amrap', 'emom', 'metcon', 'rx'] },
  { value: 'calisthenics', label: 'Calisthenics', group: 'Fitness', keywords: ['bodyweight training', 'bodyweight', 'street workout', 'muscle up', 'handstand', 'planche'] },
  { value: 'kettlebells', label: 'Kettlebells', group: 'Fitness', keywords: ['kettlebell', 'kb', 'girevoy', 'kettlebell sport'] },
  { value: 'strongman', label: 'Strongman', group: 'Fitness', keywords: ['atlas stones', 'log press', 'yoke', 'farmers walk', "world's strongest man", 'wsm'] },
  { value: 'yoga', label: 'Yoga', group: 'Wellness', keywords: ['vinyasa', 'hatha', 'yin yoga', 'asana'] },
  { value: 'mobility', label: 'Mobility', group: 'Wellness', keywords: ['stretching', 'range of motion', 'rom', 'foam rolling', 'prehab'] },

  // Endurance
  { value: 'running', label: 'Running', group: 'Endurance', keywords: ['5k', '10k', 'half marathon', 'marathon', 'ultramarathon', 'ultra'] },
  { value: 'trail_running', label: 'Trail running', group: 'Endurance', keywords: ['trail run', 'trailrunner', 'trail running', 'utmb'] },
  { value: 'cycling', label: 'Cycling', group: 'Endurance', keywords: ['biking', 'bike ride', 'road cycling', 'mountain biking', 'mtb', 'peloton'] },
  { value: 'swimming', label: 'Swimming', group: 'Endurance', keywords: ['lap swim', 'open water', 'freestyle', 'butterfly'] },
  { value: 'triathlon', label: 'Triathlon', group: 'Endurance', keywords: ['ironman', '70.3', 'tri'] },
  { value: 'rowing', label: 'Rowing', group: 'Endurance', keywords: ['erg', 'concept2', 'rowing machine', 'c2'] },

  // Sports
  { value: 'basketball', label: 'Basketball', group: 'Sports', keywords: ['nba', 'wnba', 'hoops'] },
  { value: 'soccer', label: 'Soccer', group: 'Sports', keywords: ['fifa', 'mls', 'premier league', 'world cup', 'uefa'] },
  { value: 'baseball', label: 'Baseball', group: 'Sports', keywords: ['mlb', 'home run', 'pitching', 'batting'] },
  { value: 'football', label: 'Football', group: 'Sports', keywords: ['nfl', 'touchdown', 'quarterback', 'qb'] },
  { value: 'hockey', label: 'Hockey', group: 'Sports', keywords: ['nhl', 'ice hockey', 'stanley cup'] },
  { value: 'tennis', label: 'Tennis', group: 'Sports', keywords: ['atp', 'wta', 'grand slam', 'wimbledon', 'us open'] },
  { value: 'pickleball', label: 'Pickleball', group: 'Sports', keywords: ['pickle ball'] },
  { value: 'golf', label: 'Golf', group: 'Sports', keywords: ['pga', 'tee time', 'handicap'] },

  // Combat sports
  { value: 'martial_arts', label: 'Martial arts', group: 'Combat sports', keywords: ['martial arts', 'dojo', 'karate', 'taekwondo', 'kung fu', 'krav maga'] },
  { value: 'boxing', label: 'Boxing', group: 'Combat sports', keywords: ['sparring', 'heavyweight'] },
  { value: 'kickboxing', label: 'Kickboxing', group: 'Combat sports', keywords: ['kick boxing', 'k1', 'k 1', 'k-1'] },
  { value: 'muay_thai', label: 'Muay Thai', group: 'Combat sports', keywords: ['muaythai', 'thai boxing', 'clinch'] },
  { value: 'mma', label: 'MMA', group: 'Combat sports', keywords: ['mixed martial arts', 'ufc', 'octagon'] },
  { value: 'wrestling', label: 'Wrestling', group: 'Combat sports', keywords: ['takedown', 'pin', 'ncaa wrestling'] },
  { value: 'judo', label: 'Judo', group: 'Combat sports', keywords: ['ippon'] },
  { value: 'jiu_jitsu', label: 'Jiu-jitsu', group: 'Combat sports', keywords: ['jiu jitsu', 'jiujitsu', 'jiu-jitsu', 'bjj', 'brazilian jiu jitsu', 'nogi', 'no gi', 'guard', 'submission', 'ibjjf'] },

  // Outdoors
  { value: 'hiking', label: 'Hiking', group: 'Outdoors', keywords: ['day hike', 'trailhead', 'backcountry'] },
  { value: 'camping', label: 'Camping', group: 'Outdoors', keywords: ['tent', 'campfire', 'camp site'] },
  { value: 'backpacking', label: 'Backpacking', group: 'Outdoors', keywords: ['thru hike', 'through hike', 'appalachian trail', 'pacific crest trail', 'pct', 'at'] },
  { value: 'fishing', label: 'Fishing', group: 'Outdoors', keywords: ['angler', 'fly fishing', 'tackle'] },
  { value: 'hunting', label: 'Hunting', group: 'Outdoors', keywords: ['bowhunting', 'deer', 'elk', 'duck hunting'] },
  { value: 'climbing', label: 'Climbing', group: 'Outdoors', keywords: ['rock climbing'] },
  { value: 'skiing', label: 'Skiing', group: 'Outdoors', keywords: ['powder', 'apres'] },
  { value: 'snowboarding', label: 'Snowboarding', group: 'Outdoors', keywords: ['snowboard', 'halfpipe'] },
  { value: 'kayaking', label: 'Kayaking', group: 'Outdoors', keywords: ['kayak', 'whitewater'] },

  // Motors
  { value: 'motorcycles', label: 'Motorcycles', group: 'Motors', keywords: ['motorcycle', 'motorbike', 'harley', 'ducati', 'yamaha', 'honda'] },
  { value: 'cars', label: 'Cars', group: 'Motors', keywords: ['car', 'auto', 'tesla', 'mustang', 'bmw'] },
  { value: 'off_roading', label: 'Off-roading', group: 'Motors', keywords: ['4x4', '4wd', 'overlanding', 'overland', 'jeep'] },

  // Food & drink
  { value: 'cooking', label: 'Cooking', group: 'Food & drink', keywords: ['cook', 'recipes', 'recipe', 'meal prep', 'cookbook', 'air fryer', 'instant pot'] },
  { value: 'bbq', label: 'BBQ', group: 'Food & drink', keywords: ['barbecue', 'grilling', 'smoking', 'smoker', 'brisket', 'ribs', 'pulled pork', 'pitmaster', 'traeger'] },
  { value: 'coffee', label: 'Coffee', group: 'Food & drink', keywords: ['espresso', 'latte', 'cappuccino', 'pour over', 'aeropress', 'cold brew'] },
  { value: 'whiskey', label: 'Whiskey', group: 'Food & drink', keywords: ['bourbon', 'scotch', 'rye', 'single malt', 'whisky'] },
  { value: 'craft_beer', label: 'Craft beer', group: 'Food & drink', keywords: ['beer', 'ipa', 'stout', 'brewery', 'microbrew'] },
  { value: 'nutrition', label: 'Nutrition', group: 'Wellness', keywords: ['macros', 'protein', 'calories', 'cutting', 'bulking', 'diet', 'keto', 'carnivore', 'intermittent fasting'] },

  // Tech & games
  { value: 'tech', label: 'Tech', group: 'Tech & games', keywords: ['technology', 'software', 'hardware', 'gadgets', 'startup', 'saas'] },
  { value: 'programming', label: 'Programming', group: 'Tech & games', keywords: ['coding', 'developer', 'dev', 'software engineer', 'engineering', 'typescript', 'javascript', 'python', 'golang', 'java', 'rust', 'react', 'vue', 'nuxt', 'node', 'api', 'backend', 'frontend', 'open source', 'github'] },
  {
    value: 'ai',
    label: 'AI',
    group: 'Tech & games',
    keywords: [
      // Core terms
      'artificial intelligence',
      'machine learning',
      'deep learning',
      'ml',
      'llm',
      'llms',
      'large language model',
      'large language models',
      'generative ai',
      'gen ai',
      'chatbot',
      // Major vendors + products
      'openai',
      'chatgpt',
      'gpt',
      'gpt 4',
      'gpt 4o',
      'o1',
      'anthropic',
      'claude',
      'google ai',
      'gemini',
      'deepmind',
      'meta ai',
      'llama',
      'mistral',
      'cohere',
      'hugging face',
      // xAI / Grok
      'xai',
      'x ai',
      'x.ai',
      'grok',
      // Infra / concepts that are usually AI-specific
      'prompt',
      'prompting',
      'prompt engineering',
      'fine tuning',
      'finetuning',
      'rag',
      'retrieval augmented generation',
      'embeddings',
      'vector database',
      'vector db',
      'token',
      'tokens',
      'inference',
      // Common model repos/tools
      'stable diffusion',
      'midjourney',
      'dalle',
      'dall e',
      'whisper',
    ],
  },
  { value: 'cybersecurity', label: 'Cybersecurity', group: 'Tech & games', keywords: ['infosec', 'security', 'pentest', 'penetration testing', 'vulnerability', 'breach', 'malware', 'ransomware', 'phishing', 'zero day', 'cve', 'ctf'] },
  { value: 'gaming', label: 'Gaming', group: 'Tech & games', keywords: ['games', 'video games', 'pc gaming', 'steam', 'xbox', 'playstation', 'ps5', 'nintendo', 'switch'] },
  { value: 'board_games', label: 'Board games', group: 'Tech & games', keywords: ['tabletop games', 'tabletop', 'boardgame', 'dnd', 'd&d', 'dungeons and dragons', 'tabletop rpg'] },

  // Learning
  { value: 'books', label: 'Books', group: 'Learning', keywords: ['reading', 'kindle', 'goodreads', 'audiobook', 'audiobooks'] },
  { value: 'podcasts', label: 'Podcasts', group: 'Learning', keywords: ['podcast'] },
  { value: 'history', label: 'History', group: 'Learning' },
  { value: 'philosophy', label: 'Philosophy', group: 'Learning', keywords: ['stoicism', 'stoic'] },
  { value: 'psychology', label: 'Psychology', group: 'Learning' },
  { value: 'language_learning', label: 'Language learning', group: 'Learning', keywords: ['learning languages', 'duolingo', 'anki', 'flashcards'] },

  // Business
  { value: 'entrepreneurship', label: 'Entrepreneurship', group: 'Business', keywords: ['business', 'startups', 'startup', 'founder', 'bootstrapping', 'saas'] },
  { value: 'investing', label: 'Investing', group: 'Business', keywords: ['stocks', 'crypto', 'etf', 'index funds', '401k', 'roth', 'dividends'] },
  { value: 'real_estate', label: 'Real estate', group: 'Business', keywords: ['realestate', 'mortgage', 'rental property', 'airbnb'] },
  { value: 'career_growth', label: 'Career growth', group: 'Business', keywords: ['career', 'jobs', 'resume', 'interview', 'promotion'] },

  // Arts
  { value: 'music', label: 'Music', group: 'Arts', keywords: ['spotify', 'band', 'songwriting'] },
  { value: 'guitar', label: 'Guitar', group: 'Arts', keywords: ['electric guitar', 'acoustic guitar', 'chords', 'tabs', 'riff'] },
  { value: 'photography', label: 'Photography', group: 'Arts', keywords: ['dslr', 'mirrorless', 'lens', 'aperture', 'iso'] },
  { value: 'movies', label: 'Movies', group: 'Arts', keywords: ['film', 'cinema'] },

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
  { value: 'mentorship', label: 'Mentorship', group: 'Community', keywords: ['mentoring', 'mentor', 'coaching'] },

  // Wellness
  { value: 'nutrition', label: 'Nutrition', group: 'Wellness', keywords: ['macros', 'protein', 'calories', 'cutting', 'bulking', 'diet', 'keto', 'carnivore', 'intermittent fasting'] },
  { value: 'mental_health', label: 'Mental health', group: 'Wellness', keywords: ['therapy', 'anxiety', 'depression', 'counseling'] },
  { value: 'meditation', label: 'Meditation', group: 'Wellness', keywords: ['mindfulness', 'breathwork', 'breathing'] },
  { value: 'mobility', label: 'Mobility', group: 'Wellness', keywords: ['stretching', 'range of motion', 'rom', 'foam rolling', 'prehab'] },
  { value: 'yoga', label: 'Yoga', group: 'Wellness', keywords: ['vinyasa', 'hatha', 'yin yoga', 'asana'] },

  // Life
  { value: 'travel', label: 'Travel', group: 'Life', keywords: ['traveling', 'vacation', 'flight', 'hotel', 'passport'] },
  { value: 'road_trips', label: 'Road trips', group: 'Life', keywords: ['roadtrip', 'road trip', 'vanlife', 'van life'] },
]

