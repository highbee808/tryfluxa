const audioFiles = [
  "/audio/fluxa_voice_1.mp3",
  "/audio/fluxa_voice_2.mp3",
  "/audio/fluxa_voice_3.mp3",
  "/audio/fluxa_voice_4.mp3",
  "/audio/fluxa_voice_5.mp3",
  "/audio/fluxa_voice_6.mp3",
  "/audio/fluxa_voice_7.mp3",
  "/audio/fluxa_voice_8.mp3",
  "/audio/fluxa_voice_9.mp3",
  "/audio/fluxa_voice_10.mp3",
];

export const playGistAudio = (index: number, onEnd: () => void) => {
  const audio = new Audio(audioFiles[index]);
  audio.play();
  audio.onended = onEnd;
};
