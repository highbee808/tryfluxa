const audioFiles = [
  "/audio/fluxa_voice_1-2.mp3",
  "/audio/fluxa_voice_2-2.mp3",
  "/audio/fluxa_voice_3-2.mp3",
  "/audio/fluxa_voice_4.mp3",
  "/audio/fluxa_voice_5.mp3",
  "/audio/fluxa_voice_6.mp3",
  "/audio/fluxa_voice_7.mp3",
  "/audio/fluxa_voice_8.mp3",
  "/audio/fluxa_voice_9.mp3",
  "/audio/fluxa_voice_10.mp3",
];

let currentAudio: HTMLAudioElement | null = null;

export const playGistAudio = (index: number, onStart: () => void) => {
  stopGistAudio();
  currentAudio = new Audio(audioFiles[index]);
  currentAudio.play();
  onStart();
  currentAudio.onended = () => {
    currentAudio = null;
  };
};

export const stopGistAudio = (onStop?: () => void) => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  onStop?.();
};
