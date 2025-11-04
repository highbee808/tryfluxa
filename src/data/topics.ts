export interface SubTopic {
  id: string;
  label: string;
  emoji?: string;
}

export interface TopicData {
  id: string;
  label: string;
  emoji: string;
  description: string;
  subTopics?: SubTopic[];
}

export const topics: TopicData[] = [
  {
    id: "celebrity-gossip",
    label: "Celebrity Gossip",
    emoji: "⭐",
    description: "Hot celebrity news and entertainment gossip",
    subTopics: [
      { id: "reality-tv", label: "Reality TV", emoji: "📺" },
      { id: "movie-stars", label: "Movie Stars", emoji: "🎬" },
      { id: "influencers", label: "Influencers", emoji: "📱" },
    ]
  },
  {
    id: "sports",
    label: "Sports",
    emoji: "⚽",
    description: "Sports highlights, scores, and athlete news",
    subTopics: [
      { id: "football", label: "Football", emoji: "⚽" },
      { id: "basketball", label: "Basketball", emoji: "🏀" },
      { id: "formula-1", label: "Formula 1", emoji: "🏎️" },
      { id: "ufc", label: "UFC", emoji: "🥊" },
      { id: "tennis", label: "Tennis", emoji: "🎾" },
    ]
  },
  {
    id: "memes",
    label: "Memes",
    emoji: "😂",
    description: "Trending memes and viral internet content"
  },
  {
    id: "tech",
    label: "Tech",
    emoji: "💻",
    description: "Technology news, gadgets, and innovations",
    subTopics: [
      { id: "ai", label: "AI", emoji: "🤖" },
      { id: "crypto", label: "Crypto", emoji: "₿" },
      { id: "gadgets", label: "Gadgets", emoji: "📱" },
      { id: "startups", label: "Startups", emoji: "🚀" },
    ]
  },
  {
    id: "gaming",
    label: "Gaming",
    emoji: "🎮",
    description: "Video game releases, esports, and gaming culture",
    subTopics: [
      { id: "console", label: "Console", emoji: "🎮" },
      { id: "pc-gaming", label: "PC Gaming", emoji: "💻" },
      { id: "mobile-games", label: "Mobile Games", emoji: "📱" },
      { id: "esports", label: "Esports", emoji: "🏆" },
    ]
  },
  {
    id: "fashion",
    label: "Fashion",
    emoji: "👗",
    description: "Fashion trends, style tips, and runway news",
    subTopics: [
      { id: "streetwear", label: "Streetwear", emoji: "👟" },
      { id: "luxury", label: "Luxury", emoji: "💎" },
      { id: "beauty", label: "Beauty", emoji: "💄" },
      { id: "sustainable", label: "Sustainable", emoji: "🌱" },
    ]
  },
  {
    id: "music",
    label: "Music",
    emoji: "🎧",
    description: "Music releases, concerts, and artist updates",
    subTopics: [
      { id: "hip-hop", label: "Hip Hop", emoji: "🎤" },
      { id: "pop", label: "Pop", emoji: "🎵" },
      { id: "rnb", label: "R&B", emoji: "🎶" },
      { id: "rock", label: "Rock", emoji: "🎸" },
      { id: "afrobeats", label: "Afrobeats", emoji: "🎵" },
      { id: "kpop", label: "K-Pop", emoji: "🎤" },
      { id: "country", label: "Country", emoji: "🤠" },
    ]
  },
  {
    id: "anime",
    label: "Anime",
    emoji: "🎌",
    description: "Anime releases, manga updates, and otaku culture",
    subTopics: [
      { id: "series", label: "Series", emoji: "📺" },
      { id: "movies", label: "Movies", emoji: "🎬" },
      { id: "games", label: "Games", emoji: "🎮" },
      { id: "kdrama", label: "K-Drama", emoji: "🎭" },
    ]
  },
  {
    id: "movies",
    label: "Movies",
    emoji: "🎬",
    description: "Movie releases, reviews, and box office news",
    subTopics: [
      { id: "action", label: "Action", emoji: "💥" },
      { id: "comedy", label: "Comedy", emoji: "😂" },
      { id: "drama", label: "Drama", emoji: "🎭" },
      { id: "thriller", label: "Thriller", emoji: "😱" },
    ]
  },
  {
    id: "politics",
    label: "Politics",
    emoji: "🏛️",
    description: "Political news, elections, and policy updates",
    subTopics: [
      { id: "elections", label: "Elections", emoji: "🗳️" },
      { id: "foreign-policy", label: "Foreign Policy", emoji: "🌍" },
      { id: "local-news", label: "Local News", emoji: "📰" },
      { id: "political-satire", label: "Political Satire", emoji: "🎭" },
    ]
  },
  {
    id: "food",
    label: "Food",
    emoji: "🍔",
    description: "Food trends, recipes, and restaurant news",
    subTopics: [
      { id: "recipes", label: "Recipes", emoji: "📖" },
      { id: "restaurants", label: "Restaurants", emoji: "🍽️" },
      { id: "street-food", label: "Street Food", emoji: "🌮" },
      { id: "desserts", label: "Desserts", emoji: "🍰" },
    ]
  },
];

// Export all valid category labels for validation
export const validCategories = topics.map(t => t.label);