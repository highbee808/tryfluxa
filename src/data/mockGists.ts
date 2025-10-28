/**
 * Mock Gist Data
 * 
 * TO CUSTOMIZE:
 * 1. Replace audioUrl with your actual MP3 file paths
 * 2. Update imageUrl with real gossip subject images
 * 3. Edit headline and context for your gist content
 */

export interface Gist {
  id: number;
  headline: string;
  context: string;
  imageUrl: string;
  audioUrl: string;
}

export const mockGists: Gist[] = [
  {
    id: 1,
    headline: "The tea is piping hot on this one! 🔥",
    context:
      "You won't believe what happened at last night's award show. The drama unfolded right on stage!",
    imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
    audioUrl: "/audio/fluxa_voice_1.mp3",
  },
  {
    id: 2,
    headline: "This celebrity couple is causing waves!",
    context:
      "After months of speculation, insiders finally spill the details about this power couple's secret getaway.",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
    audioUrl: "/audio/fluxa_voice_2.mp3",
  },
  {
    id: 3,
    headline: "Fashion week just got messy! 👗",
    context:
      "A surprise runway moment left everyone shocked. Let's dive into what really went down backstage.",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800",
    audioUrl: "/audio/fluxa_voice_3.mp3",
  },
];
