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
      { id: "barcelona", label: "Barcelona", emoji: "🔵" },
      { id: "real-madrid", label: "Real Madrid", emoji: "⚪" },
      { id: "man-united", label: "Man United", emoji: "🔴" },
      { id: "chelsea", label: "Chelsea", emoji: "💙" },
      { id: "arsenal", label: "Arsenal", emoji: "🔴" },
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
      { id: "burna-boy", label: "Burna Boy", emoji: "🔥" },
      { id: "wizkid", label: "Wizkid", emoji: "⭐" },
    ]
  },
];