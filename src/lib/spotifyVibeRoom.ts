/**
 * Spotify integration for Vibe Rooms
 * Handles playback control and sync for host and listeners
 */

import type { SpotifyTrack, VibeRoomTrackState } from "@/types/vibeRooms";
import { updateTrackState } from "./vibeRooms";

// Spotify Web Playback SDK types
declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

const SYNC_INTERVAL_MS = 5000; // 5 seconds
const DRIFT_THRESHOLD_MS = 2000; // 2 seconds

export class SpotifyVibeRoomPlayer {
  private player: any = null;
  private deviceId: string | null = null;
  private syncInterval: number | null = null;
  private roomId: string;
  private isHost: boolean;
  private currentTrack: SpotifyTrack | null = null;
  private lastPosition: number = 0;
  private isPlaying: boolean = false;
  private onStateChange?: (state: VibeRoomTrackState) => void;

  constructor(roomId: string, isHost: boolean) {
    this.roomId = roomId;
    this.isHost = isHost;
  }

  /**
   * Initialize Spotify Web Playback SDK
   */
  async initialize(accessToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Spotify) {
        this.setupPlayer(accessToken, resolve, reject);
      } else {
        window.onSpotifyWebPlaybackSDKReady = () => {
          this.setupPlayer(accessToken, resolve, reject);
        };
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        script.onerror = () => reject(new Error("Failed to load Spotify SDK"));
        document.head.appendChild(script);
      }
    });
  }

  private setupPlayer(
    accessToken: string,
    resolve: () => void,
    reject: (error: Error) => void
  ) {
    try {
      this.player = new window.Spotify.Player({
        name: "Fluxa Vibe Room",
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken);
        },
        volume: 0.5,
      });

      this.player.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("Spotify player ready, device ID:", device_id);
        this.deviceId = device_id;
        resolve();
      });

      this.player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
        console.log("Device ID has gone offline", device_id);
        this.deviceId = null;
      });

      this.player.addListener("player_state_changed", (state: any) => {
        if (!state) return;

        const track = state.track_window?.current_track;
        const position = state.position;
        const isPlaying = !state.paused;

        if (track) {
          this.currentTrack = {
            id: track.id,
            name: track.name,
            artists: track.artists.map((a: any) => ({ name: a.name })),
            album: {
              name: track.album.name,
              images: track.album.images,
            },
            duration_ms: track.duration_ms,
            uri: track.uri,
          };
        }

        this.lastPosition = position;
        this.isPlaying = isPlaying;

        // If host, sync state to server
        if (this.isHost) {
          this.syncTrackState();
        }
      });

      this.player.connect().catch((error: Error) => {
        console.error("Failed to connect Spotify player:", error);
        reject(error);
      });
    } catch (error) {
      reject(error as Error);
    }
  }

  /**
   * Play a track (host only)
   */
  async playTrack(trackUri: string, positionMs: number = 0): Promise<void> {
    if (!this.isHost) {
      throw new Error("Only the host can control playback");
    }

    if (!this.deviceId) {
      throw new Error("Spotify player not ready");
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error("No Spotify access token");
    }

    // Play track via Spotify Web API
    const response = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: [trackUri],
          position_ms: positionMs,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to play track: ${error}`);
    }

    // Start sync interval
    this.startSyncInterval();
  }

  /**
   * Pause playback (host only)
   */
  async pause(): Promise<void> {
    if (!this.isHost) {
      throw new Error("Only the host can control playback");
    }

    if (!this.deviceId) {
      throw new Error("Spotify player not ready");
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error("No Spotify access token");
    }

    await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${this.deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    this.isPlaying = false;
    this.syncTrackState();
  }

  /**
   * Resume playback (host only)
   */
  async resume(): Promise<void> {
    if (!this.isHost) {
      throw new Error("Only the host can control playback");
    }

    if (!this.deviceId) {
      throw new Error("Spotify player not ready");
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error("No Spotify access token");
    }

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    this.isPlaying = true;
    this.syncTrackState();
  }

  /**
   * Seek to position (host only)
   */
  async seek(positionMs: number): Promise<void> {
    if (!this.isHost) {
      throw new Error("Only the host can control playback");
    }

    if (!this.deviceId) {
      throw new Error("Spotify player not ready");
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error("No Spotify access token");
    }

    await fetch(
      `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${this.deviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    this.lastPosition = positionMs;
    this.syncTrackState();
  }

  /**
   * Sync track state (for listeners - called when receiving track_state_update)
   */
  async syncToHostState(state: VibeRoomTrackState): Promise<void> {
    if (this.isHost) return; // Host doesn't sync to their own state

    if (!this.deviceId) {
      console.warn("Spotify player not ready, cannot sync");
      return;
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      console.warn("No access token, cannot sync");
      return;
    }

    // Get current player state
    const currentState = await this.player.getCurrentState();
    if (!currentState) {
      console.warn("No current state, cannot sync");
      return;
    }

    const currentPosition = currentState.position || 0;
    const currentTrackId = currentState.track_window?.current_track?.id;
    const drift = Math.abs(currentPosition - state.position_ms);

    // If track changed, play new track
    if (state.track_id && state.track_id !== currentTrackId) {
      try {
        await this.playTrack(`spotify:track:${state.track_id}`, state.position_ms);
        this.onStateChange?.(state);
        return;
      } catch (error) {
        console.error("Failed to play new track:", error);
        return;
      }
    }

    // If drift is too large, seek to correct position
    if (drift > DRIFT_THRESHOLD_MS) {
      try {
        await fetch(
          `https://api.spotify.com/v1/me/player/seek?position_ms=${state.position_ms}&device_id=${this.deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        this.lastPosition = state.position_ms;
      } catch (error) {
        console.error("Failed to seek:", error);
      }
    }

    // Sync play/pause state
    if (state.is_playing && currentState.paused) {
      await this.resume();
    } else if (!state.is_playing && !currentState.paused) {
      await this.pause();
    }

    this.onStateChange?.(state);
  }

  /**
   * Start sync interval (host only - sends state every 5 seconds)
   */
  private startSyncInterval(): void {
    if (!this.isHost) return;

    this.stopSyncInterval();

    this.syncInterval = window.setInterval(() => {
      this.syncTrackState();
    }, SYNC_INTERVAL_MS);
  }

  /**
   * Stop sync interval
   */
  stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync current track state to server (host only)
   */
  private async syncTrackState(): Promise<void> {
    if (!this.isHost || !this.currentTrack) return;

    try {
      await updateTrackState({
        room_id: this.roomId,
        track_id: this.currentTrack.id,
        track_name: this.currentTrack.name,
        track_artist: this.currentTrack.artists[0]?.name || "",
        track_album_art: this.currentTrack.album.images[0]?.url || "",
        position_ms: this.lastPosition,
        is_playing: this.isPlaying,
      });
    } catch (error) {
      console.error("Failed to sync track state:", error);
    }
  }

  /**
   * Get Spotify access token from user session
   * Automatically refreshes if expired
   */
  private async getAccessToken(): Promise<string | null> {
    // Import the shared auth utility
    const { getSpotifyAccessToken } = await import("./spotifyAuth");
    return getSpotifyAccessToken();
  }

  /**
   * Cleanup
   */
  disconnect(): void {
    this.stopSyncInterval();
    if (this.player) {
      this.player.disconnect();
    }
  }

  /**
   * Set callback for state changes
   */
  setOnStateChange(callback: (state: VibeRoomTrackState) => void): void {
    this.onStateChange = callback;
  }
}
