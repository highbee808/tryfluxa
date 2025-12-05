/**
 * Lightweight beat-reactive visualizer for Vibe Rooms
 * Uses CSS animations for performance
 */

import { useEffect, useRef, useState } from "react";

interface VibeRoomVisualizerProps {
  isPlaying: boolean;
  albumArt?: string | null;
}

export function VibeRoomVisualizer({ isPlaying, albumArt }: VibeRoomVisualizerProps) {
  const [albumImage, setAlbumImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (albumArt) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setAlbumImage(albumArt);
      img.onerror = () => setAlbumImage(null);
      img.src = albumArt;
    } else {
      setAlbumImage(null);
    }
  }, [albumArt]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      {/* Pulsing circles animation */}
      <div className="relative w-80 h-80 md:w-96 md:h-96">
        {/* Outer circle */}
        <div
          className={`absolute inset-0 rounded-full ${
            isPlaying
              ? "bg-primary/20 animate-pulse"
              : "bg-primary/10"
          }`}
          style={{
            animation: isPlaying ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
          }}
        />

        {/* Middle circle */}
        <div
          className={`absolute inset-4 rounded-full ${
            isPlaying
              ? "bg-primary/25 animate-pulse"
              : "bg-primary/15"
          }`}
          style={{
            animation: isPlaying ? "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
            animationDelay: "0.3s",
          }}
        />

        {/* Inner circle with album art */}
        <div className="absolute inset-8 rounded-full bg-primary/30 overflow-hidden flex items-center justify-center">
          {albumImage ? (
            <img
              src={albumImage}
              alt="Album art"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl">🎵</div>
            </div>
          )}
        </div>

        {/* Beat-reactive rings when playing */}
        {isPlaying && (
          <>
            <div
              className="absolute inset-0 rounded-full border-2 border-primary/40"
              style={{
                animation: "ripple 2s ease-out infinite",
              }}
            />
            <div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              style={{
                animation: "ripple 2s ease-out infinite",
                animationDelay: "0.5s",
              }}
            />
            <div
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              style={{
                animation: "ripple 2s ease-out infinite",
                animationDelay: "1s",
              }}
            />
          </>
        )}
      </div>

      <style>{`
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
