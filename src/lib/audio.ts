/**
 * Audio Player Utility for Fluxa
 * Handles playing, pausing, and resetting audio tracks
 */

let currentAudio: HTMLAudioElement | null = null;
let currentIndex: number | null = null;

/**
 * Play a gist’s audio by index
 * @param index - The index of the gist being played
 * @param setIsPlaying - React state setter to toggle UI playback state
 */
export function playGistAudio(index: number, setIsPlaying: (value: boolean) => void) {
  try {
    // Stop any currently playing audio first
    if (currentAudio && currentIndex !== index) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audioPath = `/audio/fluxa_voice_${index + 1}.mp3`; // assumes your files are named sequentially
    const audio = new Audio(audioPath);

    currentAudio = audio;
    currentIndex = index;

    audio.play().then(() => {
      setIsPlaying(true);
    });

    // When the audio finishes playing
    audio.onended = () => {
      setIsPlaying(false);
    };

    // Handle playback errors gracefully
    audio.onerror = () => {
      console.error(`⚠️ Error playing audio file: ${audioPath}`);
      setIsPlaying(false);
    };
  } catch (err) {
    console.error("Audio playback error:", err);
    setIsPlaying(false);
  }
}

/**
 * Stop the currently playing audio
 * @param setIsPlaying - React state setter to toggle UI playback state
 */
export function stopGistAudio(setIsPlaying: (value: boolean) => void) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    setIsPlaying(false);
  }
}
