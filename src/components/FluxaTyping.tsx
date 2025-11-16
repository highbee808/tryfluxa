import React from "react";

const FluxaTyping = () => {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-muted/50 rounded-2xl rounded-bl-sm max-w-[80px] animate-fade-in">
      <div
        className="w-2 h-2 rounded-full bg-[hsl(270,70%,75%)]"
        style={{
          animation: "bounce 1.4s ease-in-out infinite",
          animationDelay: "0s",
        }}
      />
      <div
        className="w-2 h-2 rounded-full bg-[hsl(210,85%,68%)]"
        style={{
          animation: "bounce 1.4s ease-in-out infinite",
          animationDelay: "0.2s",
        }}
      />
      <div
        className="w-2 h-2 rounded-full bg-[hsl(330,75%,70%)]"
        style={{
          animation: "bounce 1.4s ease-in-out infinite",
          animationDelay: "0.4s",
        }}
      />
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
};

export default FluxaTyping;
import React from "react";

export const FluxaTyping = () => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#2A2A3D] rounded-xl w-fit mt-2 shadow-lg">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-[#B794F6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
        <span className="w-2 h-2 bg-[#60A5FA] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
        <span className="w-2 h-2 bg-[#F472B6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
      </div>
    </div>
  );
};
