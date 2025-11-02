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
    id: "afrobeats",
    label: "Afrobeats",
    emoji: "🎵",
    description: "Latest Afrobeats music, artists, and culture",
    subTopics: [
      { id: "burna-boy", label: "Burna Boy", emoji: "🔥" },
      { id: "wizkid", label: "Wizkid", emoji: "⭐" },
      { id: "davido", label: "Davido", emoji: "💎" },
      { id: "tems", label: "Tems", emoji: "🌟" },
    ]
  },
  {
    id: "celebrity-gossip",
    label: "Celebrity Gossip",
    emoji: "⭐",
    description: "Hot celebrity news and entertainment gossip",
    subTopics: [
      { id: "hollywood", label: "Hollywood", emoji: "🎬" },
      { id: "music-celebs", label: "Music Stars", emoji: "🎤" },
      { id: "influencers", label: "Influencers", emoji: "📱" },
      { id: "reality-tv", label: "Reality TV", emoji: "📺" },
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
      { id: "tennis", label: "Tennis", emoji: "🎾" },
      { id: "athletics", label: "Athletics", emoji: "🏃" },
    ]
  },
  {
    id: "football",
    label: "Football",
    emoji: "⚽",
    description: "Football news, matches, and player updates",
    subTopics: [
      { id: "barcelona", label: "Barcelona", emoji: "🔵" },
      { id: "real-madrid", label: "Real Madrid", emoji: "⚪" },
      { id: "man-united", label: "Man United", emoji: "🔴" },
      { id: "chelsea", label: "Chelsea", emoji: "💙" },
      { id: "arsenal", label: "Arsenal", emoji: "🔴" },
      { id: "psg", label: "PSG", emoji: "💙" },
      { id: "bayern", label: "Bayern Munich", emoji: "🔴" },
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
    id: "anime",
    label: "Anime",
    emoji: "🎌",
    description: "Anime releases, manga updates, and otaku culture",
    subTopics: [
      { id: "shonen", label: "Shonen", emoji: "⚡" },
      { id: "seinen", label: "Seinen", emoji: "🗡️" },
      { id: "isekai", label: "Isekai", emoji: "🌍" },
      { id: "romance", label: "Romance", emoji: "💕" },
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
    description: "Political news, elections, and policy updates"
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