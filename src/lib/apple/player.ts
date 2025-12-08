import { getMusicKitInstance } from "./musickit";

export async function playPreview(songId: string) {
  const music = getMusicKitInstance();

  await music.setQueue({ song: songId });
  await music.play();
}

export async function pausePreview() {
  const music = getMusicKitInstance();
  music.pause();
}
