import { APPLE_DEV_PREVIEW_TOKEN } from "./config";

declare global {
  interface Window {
    MusicKit: any;
  }
}

let musicKitPromise: Promise<void> | null = null;

export function loadMusicKit(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (musicKitPromise) return musicKitPromise;

  musicKitPromise = new Promise<void>((resolve, reject) => {
    if (window.MusicKit) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("musickit-js");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "musickit-js";
      script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onerror = () => reject(new Error("Failed to load MusicKit JS"));
      document.head.appendChild(script);
    }

    const onLoaded = () => {
      try {
        const developerToken = APPLE_DEV_PREVIEW_TOKEN;
        window.MusicKit.configure({
          developerToken,
          app: {
            name: "Fluxa",
            build: "1.0.0-dev",
          },
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    document.addEventListener("musickitloaded", onLoaded, { once: true });
  });

  return musicKitPromise;
}

export function getMusicKitInstance() {
  return window.MusicKit.getInstance();
}
