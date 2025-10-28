// Fluxa Audio Player - supports multiple gist audio files

const audioFiles = [
  "/audio/fluxa_voice_1.mp3",
  "/audio/fluxa_voice_2.mp3",
  "/audio/fluxa_voice_3.mp3"
];

let currentAudio: HTMLAudioElement | null = null;

export function playGistAudio(
  index: number,
  setIsPlaying: (p: boolean) => void
) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  currentAudio = new Audio(audioFiles[index]);
  currentAudio.play();
  setIsPlaying(true);

  currentAudio.onended = () => setIsPlaying(false);
}

export function stopGistAudio(setIsPlaying: (p: boolean) => void) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    setIsPlaying(false);
  }
}
