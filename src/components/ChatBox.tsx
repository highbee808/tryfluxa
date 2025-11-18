import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

export const ChatBox = ({
  initialContext,
  isOpen: controlledOpen,
  onOpenChange,
}: ChatBoxProps) => {
  const [internalOpen, setInternalOpen] = useState(controlledOpen ?? false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastContextRequestId = useRef<string | null>(null);

  const isOpen = typeof controlledOpen === "boolean" ? controlledOpen : internalOpen;

  const setOpen = (value: boolean) => {
    if (typeof controlledOpen !== "boolean") {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  /* Load chat history */
  useEffect(() => {
    const saved = localStorage.getItem("fluxa_feed_chat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
  }, []);

  /* Save chat history */
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("fluxa_feed_chat", JSON.stringify(messages));
    }
  }, [messages]);

  /* Handle context injection when Ask-Fluxa is triggered */
  useEffect(() => {
    if (initialContext && isOpen) {
      const requestKey =
        initialContext.requestId ||
        `${initialContext.topic}-${initialContext.summary}`;

      if (lastContextRequestId.current === requestKey) return;

      lastContextRequestId.current = requestKey;

      const contextMessage = `I'm reading "${initialContext.topic}". Here's what Fluxa wrote: ${initialContext.summary}. Can you give me more context?`;

      handleSend(contextMessage);
    }
  }, [initialContext, isOpen]);

  /* Auto-scroll */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* Stop audio when modal closes */
  useEffect(() => {
    if (!isOpen && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsSpeaking(false);
    }
  }, [isOpen]);

  /* Voice playback */
  const playFluxaVoice = async (text: string) => {
    setIsSpeaking(true);

    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text, voice: "shimmer", speed: 1.0 },
      });

      if (error) throw error;
      if (!data?.audioUrl) return;

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }

      const audio = new Audio(data.audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error("Error playing audio:", err);
      setIsSpeaking(false);
    }
  };

  /* Send Message */
  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);

    if (!messageText) setInput("");
    setIsLoading(true);

    const conversationHistory = [...messages.slice(-4), userMessage];

    try {
      const { data, error } = await supabase.functions.invoke("fluxa-chat", {
        body: {
          message: userMessage.content,
          conversationHistory,
        },
      });

      if (error) throw error;

      const fluxaMessage: Message = {
        role: "fluxa",
        content: data.reply,
      };

      setMessages((prev) => [...prev, fluxaMessage]);

      await playFluxaVoice(data.reply);
    } catch (err) {
      console.error("Error sending message:", err);
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
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform flex items-center justify-center z-50"
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto w-full md:w-96 h-[85vh] md:h-[32rem] bg-card border-t md:border border-border md:rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5 md:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-2xl animate-pulse">
                💅
              </div>
              <div>
                <h3 className="font-bold text-foreground">Chat with Fluxa</h3>
                {isSpeaking && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Speaking...
                  </p>
                )}
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
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 space-y-3 animate-fade-in">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-4xl animate-bounce">
                  💅
                </div>
                <p className="text-sm font-medium">Hey bestie! 👋</p>
                <p className="text-sm">Ask me anything about the gists!</p>
              </div>
            ) : (
              <div className="space-y-4">
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
                        "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground shadow-soft border border-border/20"
                      )}
                    >
                      {msg.role === "fluxa" && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">💅</span>
                          <span className="text-xs font-semibold text-primary">
                            Fluxa
                          </span>
                        </div>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start animate-fade-in-up">
                    <div className="bg-card text-foreground rounded-2xl px-4 py-3 shadow-soft border border-border/20">
                      <div className="flex items-center gap-2">
                        <div
                          className="loader"
                          style={{
                            width: "20px",
                            height: "20px",
                            borderWidth: "3px",
                          }}
                        />
                        <span className="text-sm text-muted-foreground">
                          Fluxa is typing...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
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
