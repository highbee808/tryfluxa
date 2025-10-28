/**
 * Audio Player Utility for Fluxa
 * 
 * Usage:
 * const player = new AudioPlayer();
 * player.load('path/to/audio.mp3');
 * player.play();
 */

export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.audio) return;

    this.audio.addEventListener("ended", () => {
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    });
  }

  load(src: string) {
    if (!this.audio) return;
    this.audio.src = src;
    this.audio.load();
  }

  play() {
    if (!this.audio) return;
    return this.audio.play();
  }

  pause() {
    if (!this.audio) return;
    this.audio.pause();
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  get isPlaying() {
    return this.audio ? !this.audio.paused : false;
  }

  get duration() {
    return this.audio?.duration || 0;
  }

  get currentTime() {
    return this.audio?.currentTime || 0;
  }
}
