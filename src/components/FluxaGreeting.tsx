import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface FluxaGreetingProps {
  greeting: string;
  isLoading?: boolean;
}

export const FluxaGreeting = ({ greeting, isLoading }: FluxaGreetingProps) => {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!greeting || isLoading) return;

    setIsTyping(true);
    setDisplayText("");

    let currentIndex = 0;
    const typingSpeed = 30; // ms per character

    const typingInterval = setInterval(() => {
      if (currentIndex < greeting.length) {
        setDisplayText(greeting.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, typingSpeed);

    return () => clearInterval(typingInterval);
  }, [greeting, isLoading]);

  if (isLoading) {
    return (
      <Card className="max-w-6xl w-full p-4 mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 animate-pulse">
        <div className="h-6 bg-muted rounded w-3/4" />
      </Card>
    );
  }

  return (
    <Card className="max-w-6xl w-full p-4 mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 animate-fade-in relative overflow-hidden">
      {/* Fluxa avatar glow effect */}
      <div className="absolute -left-2 -top-2 w-12 h-12 bg-primary/20 rounded-full blur-xl animate-pulse" />
      
      <div className="relative flex items-center gap-3">
        {/* Animated Fluxa avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold animate-float shadow-lg">
          F
        </div>

        {/* Greeting text with typing animation */}
        <p className="text-sm font-medium flex-1">
          {displayText}
          {isTyping && <span className="animate-pulse">|</span>}
        </p>

        {/* Voice wave indicator (when Fluxa is "speaking") */}
        {isTyping && (
          <div className="flex gap-1 items-center">
            <div className="w-1 h-3 bg-primary/60 rounded-full animate-[wave_0.5s_ease-in-out_infinite]" />
            <div className="w-1 h-4 bg-primary/70 rounded-full animate-[wave_0.5s_ease-in-out_0.1s_infinite]" />
            <div className="w-1 h-5 bg-primary/80 rounded-full animate-[wave_0.5s_ease-in-out_0.2s_infinite]" />
            <div className="w-1 h-4 bg-primary/70 rounded-full animate-[wave_0.5s_ease-in-out_0.3s_infinite]" />
            <div className="w-1 h-3 bg-primary/60 rounded-full animate-[wave_0.5s_ease-in-out_0.4s_infinite]" />
          </div>
        )}
      </div>
    </Card>
  );
};
