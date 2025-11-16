import React from "react";

const FluxaWaveform = () => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-16 animate-fade-in">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1.5 rounded-full"
          style={{
            height: "8px",
            animation: `waveform 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
            background: `linear-gradient(180deg, 
              hsl(270, 70%, 75%) 0%, 
              hsl(210, 85%, 68%) 50%, 
              hsl(330, 75%, 70%) 100%)`
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          0%, 100% {
            height: 8px;
            opacity: 0.5;
          }
          50% {
            height: 32px;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default FluxaWaveform;
