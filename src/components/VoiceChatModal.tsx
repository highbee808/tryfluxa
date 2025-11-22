import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type RealtimeEvent = {
  type: string;
  [key: string]: any;
};

interface VoiceChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VoiceChatModal: React.FC<VoiceChatModalProps> = ({ open, onOpenChange }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("Tap to start talking with Fluxa");
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const cleanup = async () => {
    setIsLive(false);

    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => s.track?.stop());
      pcRef.current.close();
      pcRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (!open && isLive) cleanup();
  }, [open, isLive]);

  const startLiveSession = async () => {
    try {
      setError(null);
      setStatus("Getting ready…");
      setIsConnecting(true);

      // ⛔ FIXED — sessionJson was declared twice before
      const { data, error: sessionError } = await supabase.functions.invoke("realtime-session", {
        body: {},
      });

      if (sessionError || !data) {
        console.error("Session error:", sessionError);
        throw new Error(sessionError?.message || "Failed to create Realtime session");
      }

      const ephemeralKey = data.client_secret?.value;
      const model = data.model ?? "gpt-4o-realtime-preview";

      if (!ephemeralKey) {
        throw new Error("No ephemeral key returned from realtime-session");
      }

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      if (!audioElRef.current) {
        audioElRef.current = new Audio();
        audioElRef.current.autoplay = true;
      }

      pc.ontrack = (event) => {
        audioElRef.current!.srcObject = event.streams[0];
      };

      pc.oniceconnectionstatechange = () => {
        if (["disconnected", "failed"].includes(pc.iceConnectionState)) {
          setStatus("Connection lost. Tap to reconnect.");
          cleanup();
        }
      };

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        setStatus("Fluxa is listening… just talk 💬");
        setIsLive(true);

        dc.send(
          JSON.stringify({
            type: "session.update",
            session: {
              instructions:
                "You are Fluxa, a playful Nigerian Gen-Z vibe, giving gist, reacting dramatically, and speaking with warmth and humor.",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              turn_detection: { type: "server_vad" },
              modalities: ["audio", "text"],
            },
          })
        );
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "response.delta" && msg.delta?.output_text) {
            setTranscript((prev) => prev + msg.delta.output_text);
          }

          if (msg.type === "response.completed" && msg.response?.output_text) {
            setTranscript((prev) => prev + msg.response.output_text);
          }
        } catch {
          console.warn("Non-JSON message:", event.data);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          body: offer.sdp || "",
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
            "OpenAI-Beta": "realtime=v1",
          },
        }
      );

      const answer = await response.text();
      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: "answer",
          sdp: answer,
        })
      );

      setIsConnecting(false);
      setStatus("You’re live with Fluxa 🎧 Just talk!");
    } catch (e: any) {
      console.error("Start session error:", e);
      setError(e.message);
      setStatus("Could not start live session");
      setIsConnecting(false);
      await cleanup();
    }
  };

  const stopLiveSession = async () => {
    await cleanup();
    setStatus("Session ended. Tap to start again.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-3xl font-bold">Talk to Fluxa 🎧</h2>

          <p className="text-sm text-muted-foreground">{status}</p>
          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={isLive ? stopLiveSession : startLiveSession}
            disabled={isConnecting}
            className={`px-8 py-3 rounded-2xl font-semibold transition-all ${
              isLive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:scale-105 shadow-lg"
            } ${isConnecting ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {isConnecting ? "Connecting…" : isLive ? "End Session" : "Start Live Session"}
          </button>

          {transcript && (
            <div className="mt-4 w-full max-w-md p-4 bg-muted rounded-xl text-left">
              <p className="font-semibold">Fluxa (live transcript):</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{transcript}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceChatModal;
