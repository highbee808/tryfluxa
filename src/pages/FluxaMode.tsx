import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminFunction } from "@/lib/invokeAdminFunction";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { FluxaLogo } from "@/components/FluxaLogo";

interface Message {
  role: "user" | "fluxa";
  content: string;
  timestamp: Date;
}

const FluxaMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load chat history from localStorage and handle initial context
  useEffect(() => {
    const saved = localStorage.getItem("fluxa_chat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }

    // If there's initial context from navigation, automatically send it
    const initialContext = (location.state as any)?.initialContext;
    if (initialContext) {
      // Use custom prompt if provided, otherwise build from context
      const contextMessage = initialContext.prompt
        ? initialContext.prompt
        : `Tell me about: ${
            initialContext.summary ||
            initialContext.topic ||
            initialContext.fullContext ||
            "this story"
          }`;
      
      // Automatically send the message
      const sendInitialMessage = async () => {
        const userMessage: Message = {
          role: "user",
          content: contextMessage,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
          const { data, error } = await invokeAdminFunction("fluxa-chat", {
            message: contextMessage
          });

          if (error) throw error;

          const fluxaMessage: Message = {
            role: "fluxa",
            content: data.reply,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, fluxaMessage]);
          
          // Automatically play the voice response
          if (!isMuted) {
            await playFluxaVoice(data.reply);
          }
        } catch (error) {
          console.error("Error sending initial message:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          if (errorMessage.includes("401") || errorMessage.includes("auth")) {
            toast.error("Please sign in to use Fluxa");
          } else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
            toast.error("Fluxa is busy right now, try again in a moment");
          } else {
            toast.error("Fluxa couldn't load this one, try again in a moment");
          }
        } finally {
          setIsLoading(false);
        }
      };

      sendInitialMessage();
      
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("fluxa_chat", JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error("Couldn't hear you clearly! Try again? 🎤");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error("Voice input not supported in your browser 😢");
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

  const playFluxaVoice = async (text: string) => {
    if (isMuted) {
      console.log("🔇 Voice muted, skipping TTS");
      return;
    }

    if (!text || !text.trim()) {
      console.warn("⚠️ Empty text provided to playFluxaVoice");
      return;
    }

    setIsSpeaking(true);
    try {
      console.log("🎙️ Generating voice for:", text.slice(0, 50) + "...");
      const { data, error } = await invokeAdminFunction("text-to-speech", {
        text: text.trim(), 
        voice: "shimmer", 
        speed: 1.0
      });

      if (error) {
        console.error("❌ TTS error:", error);
        throw error;
      }

      if (!data?.audioUrl) {
        console.warn("⚠️ No audioUrl returned from TTS");
        setIsSpeaking(false);
        toast.error("Fluxa couldn't speak that one, but the text is still here.");
        return;
      }

      console.log("✅ Audio URL received:", data.audioUrl);

      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const audio = new Audio(data.audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        console.log("✅ Audio playback completed");
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };
      
      audio.onerror = (e) => {
        console.error("❌ Audio playback error:", e);
        setIsSpeaking(false);
        currentAudioRef.current = null;
        toast.error("Couldn't play audio. Try again?");
      };

      audio.onloadstart = () => {
        console.log("🔄 Audio loading...");
      };

      audio.oncanplay = () => {
        console.log("✅ Audio ready to play");
      };

      try {
        await audio.play();
        console.log("▶️ Audio playback started");
      } catch (playError) {
        console.error("❌ Error starting playback:", playError);
        setIsSpeaking(false);
        currentAudioRef.current = null;
        toast.error("Couldn't start audio playback. Check your browser permissions.");
      }
    } catch (error) {
      console.error("❌ Error in playFluxaVoice:", error);
      setIsSpeaking(false);
      // Don't show error toast for TTS failures - just log it
      // User can still read the text response
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call Fluxa chat function
      const { data, error } = await invokeAdminFunction("fluxa-chat", {
        message: userMessage.content,
        conversationHistory: messages.slice(-5) // Send last 5 messages for context
      });

      if (error) throw error;

      const fluxaMessage: Message = {
        role: "fluxa",
        content: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, fluxaMessage]);

      // Play Fluxa's voice response
      await playFluxaVoice(data.reply);

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

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("fluxa_chat");
    toast.success("Chat cleared! Start fresh 💫");
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border/20 bg-card/50 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/feed")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hey Fluxa 💬</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="rounded-full"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="rounded-full"
            >
              Clear Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-3 animate-fade-in">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center animate-bounce shadow-glow">
                <FluxaLogo size={48} fillColor="hsl(var(--primary-foreground))" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Hey bestie! 👋</h2>
              <p className="text-muted-foreground">
                Ask me about trending news, sports, music, or what's hot right now!
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground shadow-soft"
                }`}
              >
                {msg.role === "fluxa" && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <FluxaLogo size={16} fillColor="hsl(var(--primary))" />
                    </div>
                    <span className="text-xs font-semibold text-primary">Fluxa</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-fade-in-up">
              <div className="bg-card text-foreground rounded-2xl px-4 py-3 shadow-soft">
                <div className="flex items-center gap-2">
                  <div className="loader" style={{ width: '20px', height: '20px', borderWidth: '3px' }} />
                  <span className="text-sm text-muted-foreground">Fluxa is typing...</span>
                </div>
              </div>
            </div>
          )}

          {isSpeaking && (
            <div className="flex justify-start">
              <div className="bg-accent/20 text-foreground rounded-2xl px-4 py-2 shadow-soft">
                <div className="flex items-center gap-2">
                  <span className="animate-pulse">🎙️</span>
                  <span className="text-xs text-muted-foreground">Speaking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-border/20 bg-card/50 backdrop-blur">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            onClick={handleVoiceInput}
            className="shrink-0 rounded-full"
            disabled={isLoading}
          >
            <Mic className={`w-5 h-5 ${isListening ? "animate-pulse" : ""}`} />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Fluxa what's trending... 💬"
            disabled={isLoading || isListening}
            className="flex-1 rounded-2xl"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 rounded-full"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-3">
          Type your question or tap the mic to speak 🎤
        </p>
      </div>
    </div>
  );
};

export default FluxaMode;
