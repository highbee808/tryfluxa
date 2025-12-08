import { getMusicKitInstance } from "./musickit";

export async function searchAppleMusic(query: string) {
  const music = getMusicKitInstance();

  if (!query) return [];

  const res = await music.api.search(query, {
    types: ["songs", "artists", "albums"],
    limit: 25,
  });

  return res;
}
