// Enhance narration with emotional cues for Fluxa's personality

export const enhanceNarration = (text: string): string => {
  let enhanced = text;

  // Add natural pauses
  enhanced = enhanced.replace(/\.\s/g, "... ");
  enhanced = enhanced.replace(/!\s/g, "! ");

  // Convert emotional markers to natural expressions
  enhanced = enhanced.replace(/\[laugh\]/gi, "Haha! ");
  enhanced = enhanced.replace(/\[gasp\]/gi, "Oh my god! ");
  enhanced = enhanced.replace(/\[whisper\]/gi, "*whispers* ");
  enhanced = enhanced.replace(/\[excited\]/gi, "Omg! ");
  enhanced = enhanced.replace(/\[shock\]/gi, "Wait, what?! ");
  enhanced = enhanced.replace(/\[tease\]/gi, "Ooh... ");

  // Add personality flourishes based on context
  if (enhanced.toLowerCase().includes("celebrity") || enhanced.toLowerCase().includes("star")) {
    enhanced = enhanced.replace(/\bcelebrity\b/gi, "celeb");
  }

  if (enhanced.toLowerCase().includes("shocking") || enhanced.toLowerCase().includes("surprising")) {
    enhanced = "You're not ready for this... " + enhanced;
  }

  return enhanced;
};

// Emotional tone prompts for TTS
export const emotionalTones = {
  excited: "Use an excited, energetic tone with natural enthusiasm.",
  playful: "Use a playful, teasing tone with light laughter.",
  curious: "Use a curious, intrigued tone with natural pauses.",
  shocked: "Use a shocked, surprised tone with gasps and emphasis.",
  whisper: "Use a hushed, conspiratorial whisper tone.",
  default: "Use an expressive, conversational tone with natural emotion.",
};

// Analyze text and suggest appropriate tone
export const suggestTone = (text: string): keyof typeof emotionalTones => {
  const lower = text.toLowerCase();

  if (lower.includes("shocking") || lower.includes("unbelievable") || lower.includes("omg")) {
    return "shocked";
  }
  if (lower.includes("secret") || lower.includes("whisper") || lower.includes("quietly")) {
    return "whisper";
  }
  if (lower.includes("exciting") || lower.includes("amazing") || lower.includes("incredible")) {
    return "excited";
  }
  if (lower.includes("guess") || lower.includes("wonder") || lower.includes("curious")) {
    return "curious";
  }
  if (lower.includes("haha") || lower.includes("funny") || lower.includes("hilarious")) {
    return "playful";
  }

  return "default";
};