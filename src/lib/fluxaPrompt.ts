/**
 * Shared helper to build Ask Fluxa prompts
 */
export interface FluxaPostLike {
  title?: string | null;
  headline?: string | null;
  summary?: string | null;
  context?: string | null;
  category?: string | null;
  sourceName?: string | null;
}

function truncate(text: string | null | undefined, max: number) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export function buildAskFluxaPrompt(post: FluxaPostLike) {
  const summary = truncate(post.summary || post.context || "", 300);
  return summary || "Tell me about this post";
}

