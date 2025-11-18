import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { FluxaLogo } from "@/components/FluxaLogo";

interface Message {
  role: "user" | "fluxa";
  content: string;
  timestamp: Date;
}

type ChatContextState = {
  gistId?: string;
  topic?: string;
  summary?: string;
  fullContext?: string;
};

const FluxaMode = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [chatContext, setChatContext] = useState<ChatContextState | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const contextSignatureRef = useRef<string | null>(null);
  const explanationFetchedRef = useRef<string | null>(null);

  // Load chat history + auto message from initialContext
  useEffect(() => {
    const saved = localStorage.getItem("fluxa_chat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
      } catch {}
    }

    const initialContext = (location.state as any)?.initialContext;
    if (initialContext) {
      const contextMessage = `Tell me about: ${initialContext.summary}`;

      const sendInitialMessage = async () => {
        const userMessage: Message = {
          role: "user",
          content: contextMessage,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
          const { data, error } = await supabase.functions.invoke("fluxa-chat", {
            body: {
              message: contextMessage,
              conversationHistory: [],
            },
          });

          if (error) throw error;

          const fluxaMessage: Message = {
            role: "fluxa",
            content: data.reply,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, fluxaMessage]);

          if (!isMuted) {
            await playFluxaVoice(data.reply);
          }
        } catch {
          toast.error("Failed to analyze content! 😢");
        } finally {
          setIsLoading(false);
        }
      };

      sendInitialMessage();
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load context (from Feed → FluxaMode)
  useEffect(() => {
    const state = location.state as {
      initialContext?: ChatContextState;
    } | null;

    if (state?.initialContext) {
      setChatContext(state.initialContext);
    }
  }, [location.state]);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("fluxa_chat", JSON.stringify(messages));
    }
  }, [messages]);

  // Show intro message based on context
  useEffect(() => {
    if (!chatContext) return;

    const signature =
      chatContext.gistId ||
      `${chatContext.topic || ""}-${chatContext.summary || chatContext.fullContext || ""}`;

    if (!signature || contextSignatureRef.current === signature) return;
    contextSignatureRef.current = signature;

    const intro =
      `Let's chat about ${chatContext.topic || "this"}` +
      (chatContext.summary ? `: ${chatContext.summary}` : "");

    setMessages((prev) => [
      ...prev,
      { role: "fluxa", content: intro.trim(), timestamp: new Date() },
    ]);
  }, [chatContext]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        setInput(event.results[0][0].transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error("Couldn't hear you clearly! 🎤");
      };
    }

    return () => {
      recognitionRef.current?.abort();
      currentAudioRef.current?.pause();
    };
  }, []);

  // Voice input
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error("Your browser does not support voice input 😢");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
      toast.info("Listening... 🎤");
    }
  };

  // Fluxa voice playback
  const playFluxaVoice = async (text: string, cachedUrl?: string | null) => {
    if (isMuted) return;

    setIsSpeaking(true);

    try {
      let audioUrl = cachedUrl || null;

      if (!audioUrl) {
        const { data } = await supabase.functions.invoke("text-to-speech", {
          body: { text, voice: "shimmer", speed: 1.0 },
        });

        audioUrl = data?.audioUrl;
      }

      if (audioUrl) {
        currentAudioRef.current?.pause();
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };

        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("fluxa-chat", {
        body: {
          message: userMessage.content,
          conversationHistory: messages.slice(-5),
          gistContext: chatContext ?? undefined,
        },
      });

      if (error) throw error;

      const fluxaMessage: Message = {
        role: "fluxa",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, fluxaMessage]);

      await playFluxaVoice(data.reply);
    } catch {
      toast.error("Fluxa got distracted 😅");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("fluxa_chat");
    toast.success("Chat cleared! 💫");
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border/20 bg-card/50 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/feed")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="rounded-full"
            >
              {isMuted ? <VolumeX /> : <Volume2 />}
            </Button>

            <Button variant="outline" size="sm" className="rounded-full" onClick={clearChat}>
              Clear Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Empty State */}
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/30 flex items-center justify-center animate-bounce shadow-glow">
                <FluxaLogo size={48} fillColor="hsl(var(--primary-foreground))" />
              </div>
              <h2 className="text-xl font-bold">Hey bestie! 👋</h2>
              <p className="text-muted-foreground">
                Ask me anything about trending gist.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card shadow-soft"
                }`}
              >
                {msg.role === "fluxa" && (
                  <div className="flex items-center gap-2 mb-1">
                    <FluxaLogo size={16} fillColor="hsl(var(--primary))" />
                    <span className="text-xs font-semibold text-primary">Fluxa</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card rounded-2xl px-4 py-3 shadow-soft">
                <span className="text-sm text-muted-foreground">Fluxa is typing...</span>
              </div>
            </div>
          )}

          {isSpeaking && (
            <div className="flex justify-start">
              <div className="bg-accent/20 rounded-2xl px-3 py-2">
                <span className="text-xs">🎙️ Speaking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-border/20 bg-card/50">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            onClick={handleVoiceInput}
            disabled={isLoading}
            className="rounded-full"
          >
            <Mic className={isListening ? "animate-pulse" : ""} />
          </Button>

          <Input
            placeholder="Ask Fluxa what's trending... 💬"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading || isListening}
            className="rounded-2xl"
          />

          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-full"
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FluxaMode;
