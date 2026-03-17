/**
 * Men of Hunger voice system.
 *
 * Canonical copy tokens for high-traffic surfaces. Keep strings short,
 * imperative, and purpose-driven — no fluffy qualifiers, no passive voice.
 *
 * Tone principles:
 *   - Grounded, competent, principled (not macho caricature)
 *   - Discipline + service over dominance
 *   - Short imperative headings, second-person direct address
 */

export const VOICE = {
  // ── Identity ────────────────────────────────────────────────────────────────
  tagline: 'A trusted community for men who want measurable progress in life.',
  lodgeDescription:
    'The town square is for reach. Men of Hunger is the lodge — real dialogue, accountability, and outcomes.',

  // ── Onboarding ──────────────────────────────────────────────────────────────
  onboarding: {
    setupHeading: 'Set up your profile.',
    setupSubtitle: 'A few things before you get in.',
    findYourMen: 'Find your men.',
    showUpDaily: 'Show up every day.',
    streakBody:
      'Any post — text, photos, a daily check-in — keeps your streak alive. Consistency is the game.',
    verifyHeading: 'Prove who you are.',
    verifyBody:
      'Verification unlocks public posting, daily check-ins, and your streak.',
    menConfirm:
      "I understand Men of Hunger is a men's community, and I'm joining as a man.",
    ctaStart: "Let's go",
    ctaAllSet: "I'm in",
  },

  // ── Feed ────────────────────────────────────────────────────────────────────
  feed: {
    emptyTitle: 'Your feed is waiting.',
    emptyBody: "Find men worth following, or see what the community is building.",
    followingEmptyHeading: 'Find your men.',
    postHeading: 'Say something.',
    postBody: "Don't wait for the perfect thought. Get in the conversation.",
    checkinHeading: 'Check in today.',
    checkinBody: 'Report in — share how the day is going.',
    verifyHeading: 'Prove who you are.',
    verifyBody: 'Unlock posting, check-ins, and your streak.',
  },

  // ── Actions / CTAs ──────────────────────────────────────────────────────────
  actions: {
    explore: 'Explore',
    findPeople: 'Find your men',
    seeAllSuggestions: 'See all',
    verify: 'Get verified',
    checkIn: 'Check in',
    post: 'Post',
    letsGo: "Let's go",
  },

  // ── Welcome card (post-signup, in-feed) ─────────────────────────────────────
  welcome: {
    heading: 'Welcome to Men of Hunger.',
    subtitleFullAccess: 'Full access. Here\'s how to make it count.',
    subtitlePremium: 'Premium access. Here\'s how to make it count.',
    subtitleVerified: "You're verified. Here's how to make the most of it.",
    subtitleDefault: "Here's where to start.",
    step1Heading: 'Find your men.',
    step2HeadingVerify: 'Prove who you are.',
    step2HeadingStreak: 'Show up every day.',
    step2BodyVerify:
      'Verification unlocks posting, check-ins, and your streak.',
    step2BodyStreak:
      'Any post — text, a reply, a daily check-in — keeps your streak alive.',
    dismiss: "I'm in",
  },
} as const
