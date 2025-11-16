import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);

  // Auto-start recording when modal opens
  useEffect(() => {
    if (open && !isRecording) {
      startRecording();
    }
    
    // Cleanup when modal closes
    return () => {
      if (isRecording) {
        stopMic();
      }
    };
  }, [open]);

  // 🎙️ Start Recording with silence detection
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Setup Web Audio for visualization + silence detection
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stopMic();
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendToFluxa(blob);
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
      const SILENCE_DURATION = 800; // 0.8 seconds for faster, more natural conversation

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

  // 📡 Send audio to /voice-to-fluxa
  const sendToFluxa = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.webm");

      const { data, error } = await supabase.functions.invoke("voice-to-fluxa", {
        body: formData,
      });

      if (error) {
        console.error("Error calling voice-to-fluxa:", error);
        throw error;
      }
      console.log("Fluxa voice response:", data);

      if (data.userSpeech) setUserSpeech(data.userSpeech);
      if (data.fluxaReply) setFluxaReply(data.fluxaReply);

      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          // Auto-restart recording after Fluxa finishes speaking
          setTimeout(() => {
            if (open) {
              startRecording();
            }
          }, 500);
        };
        audio.play();
      } else {
        setIsSpeaking(false);
        // If no audio, restart recording immediately
        setTimeout(() => {
          if (open) {
            startRecording();
          }
        }, 500);
      }
    } catch (err) {
      console.error("Error calling voice-to-fluxa:", err);
      // Restart recording even on error
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

          {/* Status indicator */}
          <div className="text-center min-h-[40px]">
            {isLoading && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Fluxa is thinking...
              </p>
            )}
            {isSpeaking && (
              <p className="text-sm text-primary font-medium">
                Fluxa is speaking...
              </p>
            )}
            {isRecording && !isLoading && !isSpeaking && (
              <p className="text-sm text-foreground">
                Listening... speak now
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
