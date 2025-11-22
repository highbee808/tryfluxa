import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type RealtimeEvent = {
  type: string;
  [key: string]: any;
};

type RealtimeSessionResponse = {
  client_secret?: { value?: string };
  model?: string;
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
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!open && isLive) cleanup();
  }, [open, isLive]);

  const startLiveSession = async () => {
    try {
      setError(null);
      setStatus("Getting ready…");
      setIsConnecting(true);

      // ----------- FIX: Only ONE declaration ----------------
      const { data: sessionJson, error: sessionError } =
        await supabase.functions.invoke<RealtimeSessionResponse>("realtime-session", {
          body: {},
        });

      if (sessionError || !sessionJson) {
        console.error("Session error:", sessionError);
        throw new Error(sessionError?.message || "Failed to create Realtime session");
      }

      const ephemeralKey = sessionJson.client_secret?.value;
      const model = sessionJson.model ?? "gpt-4o-realtime-preview";

      if (!ephemeralKey) throw new Error("No ephemeral key returned");

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
      micStream.getTracks().forEach((t) => pc.addTrack(t, micStream));

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
                "You are Fluxa, a playful, witty social AI companion. Speak like a Gen-Z best friend giving gist.",
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
          const msg: RealtimeEvent = JSON.parse(event.data);

          if (msg.type === "response.delta" && msg.delta?.output_text) {
            setTranscript((p) => p + msg.delta.output_text);
          }

          if (msg.type === "response.completed" && msg.response?.output_text) {
            const full = msg.response.output_text;
            setTranscript((p) => p + (typeof full === "string" ? full : ""));
          }
        } catch {
          console.warn("Non-JSON realtime message:", event.data);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const sdpRes = await fetch(`${baseUrl}?model=${encodeURIComponent(model)}`, {
        method: "POST",
        body: offer.sdp || "",
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
      });

      if (!sdpRes.ok) throw new Error("Failed SDP exchange");

      const answer = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });

      setIsConnecting(false);
      setStatus("You’re live with Fluxa 🎧 Just talk.");
    } catch (e: any) {
      console.error("Error starting session:", e);
      setIsConnecting(false);
      setStatus("Could not start live session");
      setError(e.message || "Unknown error");
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

          <p className="text-sm text-muted-foreground max-w-md">{status}</p>
          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={isLive ? stopLiveSession : startLiveSession}
            disabled={isConnecting}
            className={`px-8 py-3 rounded-2xl font-semibold mt-2 transition-all ${
              isLive
                ? "bg-red-500 text-white"
                : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:scale-105"
            } ${isConnecting ? "opacity-60" : ""}`}
          >
            {isConnecting ? "Connecting…" : isLive ? "End Live Session" : "Start Live Session"}
          </button>

          {transcript && (
            <div className="mt-3 p-4 bg-muted rounded-xl shadow-inner w-full max-w-md text-left">
              <p className="font-semibold mb-1">Fluxa (live transcript):</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{transcript}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceChatModal;
