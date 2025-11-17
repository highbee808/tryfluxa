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
      <Card className="max-w-6xl w-full p-6 mb-8 border-glass-border-light animate-pulse rounded-[24px] glass"
        style={{ 
          background: "var(--gradient-card)",
          boxShadow: "var(--shadow-card)"
        }}
      >
        <div className="h-8 bg-muted/50 rounded-full w-3/4" />
      </Card>
    );
  }

  return (
    <Card className="max-w-6xl w-full p-6 mb-8 border-glass-border-light animate-fade-in relative overflow-hidden rounded-[24px] glass hover-glow"
      style={{ 
        background: "var(--gradient-card)",
        boxShadow: "var(--shadow-card)"
      }}
    >
      {/* Fluxa avatar glow effect */}
      <div className="absolute -left-4 -top-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse" />
      
      <div className="relative flex items-center gap-4">
        {/* Animated Fluxa avatar */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center text-white font-bold text-xl animate-float"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          F
        </div>

        {/* Greeting text with typing animation */}
        <p className="text-base font-medium flex-1 text-foreground">
          {displayText}
          {isTyping && <span className="animate-pulse ml-1 text-primary">|</span>}
        </p>

        {/* Voice wave indicator (when Fluxa is "speaking") */}
        {isTyping && (
          <div className="flex gap-1.5 items-center">
            <div className="w-1.5 h-4 bg-primary/70 rounded-full animate-[wave_0.5s_ease-in-out_infinite]" />
            <div className="w-1.5 h-6 bg-primary/80 rounded-full animate-[wave_0.5s_ease-in-out_0.1s_infinite]" />
            <div className="w-1.5 h-8 bg-primary rounded-full animate-[wave_0.5s_ease-in-out_0.2s_infinite]" />
            <div className="w-1.5 h-6 bg-primary/80 rounded-full animate-[wave_0.5s_ease-in-out_0.3s_infinite]" />
            <div className="w-1.5 h-4 bg-primary/70 rounded-full animate-[wave_0.5s_ease-in-out_0.4s_infinite]" />
          </div>
        )}
      </div>
    </Card>
  );
};
