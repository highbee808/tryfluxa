import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import FluxaIcon from "@/assets/fluxa-icon.svg";

type Message = {
  role: "user" | "fluxa";
  content: string;
};

type ChatContext = {
  topic: string;
  summary: string;
  requestId?: string;
};

interface ChatBoxProps {
  initialContext?: ChatContext;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ChatBox = ({ initialContext, isOpen: controlledOpen, onOpenChange }: ChatBoxProps) => {
  const [internalOpen, setInternalOpen] = useState(controlledOpen ?? false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastContextRequestId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof controlledOpen === "boolean") {
      setInternalOpen(controlledOpen);
    }
  }, [controlledOpen]);

  const isOpen = typeof controlledOpen === "boolean" ? controlledOpen : internalOpen;

  const setOpen = (value: boolean) => {
    if (typeof controlledOpen !== "boolean") {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fluxa_feed_chat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m })));
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("fluxa_feed_chat", JSON.stringify(messages));
    }
  }, [messages]);

  // Handle initial context (when "Ask Fluxa" is clicked)
  useEffect(() => {
    if (initialContext && isOpen) {
      const requestKey = initialContext.requestId || `${initialContext.topic}-${initialContext.summary}`;
      if (lastContextRequestId.current === requestKey) {
        return;
      }

      lastContextRequestId.current = requestKey;
      const contextMessage = `I'm reading "${initialContext.topic}". Here's what Fluxa wrote: ${initialContext.summary}. Can you give me more context?`;
      handleSend(contextMessage);
    }
  }, [initialContext, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!messageText) setInput("");
    setIsLoading(true);

    const conversationHistory = [...messages.slice(-4), userMessage];

    try {
      const { data, error } = await supabase.functions.invoke("fluxa-chat", {
        body: {
          message: userMessage.content,
          conversationHistory
        }
      });

      if (error) throw error;

      const fluxaMessage: Message = {
        role: "fluxa",
        content: data.reply,
      };

      setMessages((prev) => [...prev, fluxaMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Oops! Fluxa got distracted for a sec 😅");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full glass-strong border border-white/40 text-white shadow-glass-glow hover:scale-105 transition-transform flex items-center justify-center z-50 backdrop-blur-xl"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto w-full md:w-96 h-[85vh] md:h-[32rem] bg-background/80 backdrop-blur-2xl border border-white/10 md:rounded-3xl shadow-glass-glow flex flex-col z-50 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5 md:rounded-t-3xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl glass-strong flex items-center justify-center">
                <img src={FluxaIcon} alt="Fluxa" className="w-6 h-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Fluxa Assistant</p>
                <h3 className="font-semibold text-base">How can I help?</h3>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 space-y-3 animate-fade-in">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-4xl animate-bounce">
                  💅
                </div>
                <p className="text-sm font-medium">Hey bestie! 👋</p>
                <p className="text-sm">Ask me anything about the gists!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex animate-fade-in-up",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-3xl px-4 py-2 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "glass text-foreground border border-white/10"
                      )}
                    >
                      {msg.role === "fluxa" && (
                        <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-primary">
                          <img src={FluxaIcon} alt="Fluxa" className="w-4 h-4" /> Fluxa
                        </div>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-fade-in-up">
                    <div className="glass px-4 py-3 rounded-3xl border border-white/10 text-sm text-muted-foreground">
                      Fluxa is typing...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/5 bg-white/5 backdrop-blur-xl rounded-b-3xl">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
