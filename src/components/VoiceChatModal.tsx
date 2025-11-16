import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VoiceChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VoiceChatModal: React.FC<VoiceChatModalProps> = ({ open, onOpenChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fluxaReply, setFluxaReply] = useState("");
  const [userSpeech, setUserSpeech] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [partialText, setPartialText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (open && !isRecording) {
      startRecording();
    }
    
    return () => {
      if (isRecording) {
        stopMic();
      }
      audioQueueRef.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioQueueRef.current = [];
    };
  }, [open]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      micStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendToFluxaStreaming(blob);
        audioChunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
      startVisualizeAndSilenceDetect();
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  // 🛑 Stop Recording manually
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const stopMic = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    analyserRef.current = null;
    audioContextRef.current = null;
    micStreamRef.current = null;
    setAudioLevel(0);
    if (silenceTimeoutRef.current) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  // 🎚️ Visualizer + Silence detection loop
  const startVisualizeAndSilenceDetect = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      if (!isRecording || !analyser) return;
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const level = avg / 255;
      setAudioLevel(level);

      const SILENCE_THRESHOLD = 0.02;
      const SILENCE_DURATION = 700; // 0.7 seconds

      if (level < SILENCE_THRESHOLD) {
        if (!silenceTimeoutRef.current) {
          silenceTimeoutRef.current = window.setTimeout(() => {
            console.log("🔇 Silence detected, auto-stopping...");
            stopRecording();
          }, SILENCE_DURATION);
        }
      } else {
        if (silenceTimeoutRef.current) {
          window.clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      }

      requestAnimationFrame(update);
    };

    update();
  };

  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    setIsSpeaking(true);

    while (audioQueueRef.current.length > 0) {
      const audio = audioQueueRef.current.shift()!;
      
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);

    if (open && !isRecording) {
      setTimeout(() => {
        startRecording();
      }, 300);
    }
  };

  const sendToFluxaStreaming = async (audioBlob: Blob) => {
    setIsLoading(true);
    setPartialText("");
    setFluxaReply("");

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.webm");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-fluxa-stream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Streaming request failed");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.event === "transcript") {
                setUserSpeech(parsed.data.text);
                setIsLoading(false);
              } else if (parsed.event === "partial_text") {
                setPartialText((prev) => prev + parsed.data.text);
                setFluxaReply((prev) => prev + parsed.data.text);
              } else if (parsed.event === "audio_chunk") {
                const audioData = parsed.data.audio;
                const audioBlob = new Blob(
                  [Uint8Array.from(atob(audioData), c => c.charCodeAt(0))],
                  { type: "audio/mpeg" }
                );
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audioQueueRef.current.push(audio);
                
                playAudioQueue();
              } else if (parsed.event === "done") {
                setFluxaReply(parsed.data.response);
                setPartialText("");
              } else if (parsed.event === "error") {
                console.error("Streaming error:", parsed.data.message);
              }
            } catch (e) {
              console.error("Error parsing SSE:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error in streaming:", err);
      setTimeout(() => {
        if (open) {
          startRecording();
        }
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const renderWaveform = () => {
    const bars = 12;
    return (
      <div className="flex gap-[3px] justify-center mt-2">
        {Array.from({ length: bars }).map((_, i) => {
          const height = audioLevel * 50 * Math.abs(Math.sin(i + Date.now() / 200)) + 4;
          return (
            <div
              key={i}
              style={{
                height: `${height}px`,
                width: "5px",
                borderRadius: "4px",
                background: isRecording ? "rgba(255,75,75,0.8)" : "rgba(150,100,255,0.8)",
                transition: "height 0.1s ease",
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">Talk to Fluxa 🎧</DialogTitle>
          <DialogDescription className="text-center">
            Click Start Talking to have a voice conversation with Fluxa
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 text-center py-4">
          {/* Glowing orb indicator */}
          <div
            className={`h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? "bg-red-500/60 animate-pulse"
                : isSpeaking
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_25px_rgba(200,100,255,0.8)] animate-pulse"
                  : "bg-muted"
            }`}
          >
            <span className="text-white text-2xl">{isRecording ? "🎙️" : isSpeaking ? "🦋" : "🎧"}</span>
          </div>

          {renderWaveform()}

          <div className="text-center min-h-[40px]">
            {isLoading && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Processing...
              </p>
            )}
            {partialText && (
              <p className="text-sm text-primary font-medium animate-pulse">
                {partialText}
              </p>
            )}
            {isSpeaking && !partialText && (
              <p className="text-sm text-primary font-medium">
                Fluxa is speaking...
              </p>
            )}
            {isRecording && !isLoading && !isSpeaking && !partialText && (
              <p className="text-sm text-foreground">
                Listening...
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              stopMic();
              onOpenChange(false);
            }}
            className="px-6 py-2 rounded-xl font-medium text-sm bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          >
            Close
          </button>

          {/* Status + reply */}
          <div className="w-full text-left">
            {isLoading && <p className="text-sm text-muted-foreground">Fluxa is thinking…</p>}
            {userSpeech && (
              <div className="mt-2 p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">You said:</p>
                <p className="text-foreground text-sm">{userSpeech}</p>
              </div>
            )}
            {fluxaReply && (
              <div className="mt-3 p-4 bg-muted rounded-xl shadow-inner">
                <p className="font-semibold text-foreground mb-1">Fluxa says:</p>
                <p className="text-muted-foreground">{fluxaReply}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceChatModal;
