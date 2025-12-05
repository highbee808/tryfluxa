import { Mic, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VoiceChatModal from "./VoiceChatModal";
import { FluxaLogo } from "./FluxaLogo";
import { cn } from "@/lib/utils";

export const FloatingActionButtons = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const navigate = useNavigate();

  const actions = [
    {
      icon: Mic,
      label: "Voice Chat",
      onClick: () => setShowVoiceChat(true),
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: MessageSquare,
      label: "Chat",
      onClick: () => navigate("/fluxa-mode"),
      gradient: "from-blue-500 to-cyan-500"
    },
  ];

  return (
    <>
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 flex flex-col-reverse items-end gap-3">
        {/* Action Buttons */}
        {isExpanded && actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={cn(
              "glass-strong hover:glass-glow group",
              "w-14 h-14 rounded-full flex items-center justify-center",
              "transition-all duration-300 hover:scale-110 active:scale-95",
              "hover-glow-strong animate-fade-in"
            )}
            style={{
              animationDelay: `${index * 50}ms`
            }}
            aria-label={action.label}
          >
            <action.icon className="w-6 h-6 text-foreground" />
          </button>
        ))}

        {/* Main Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "glass-strong hover:glass-glow",
            "w-16 h-16 rounded-full flex items-center justify-center",
            "transition-all duration-300 hover:scale-110 active:scale-95",
            "bg-gradient-to-br from-blue-600 to-purple-600 dark:from-primary dark:to-accent shadow-glass-glow",
            "hover-glow-strong"
          )}
          aria-label="Quick Actions"
        >
          <FluxaLogo 
            size={28}
            fillColor="currentColor"
            className={cn(
              "text-black dark:text-white transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </button>
      </div>

      <VoiceChatModal 
        open={showVoiceChat} 
        onOpenChange={setShowVoiceChat}
      />
    </>
  );
};
