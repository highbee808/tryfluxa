import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

  // Helper to safely close everything
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup when modal closes
  useEffect(() => {
    if (!open && isLive) {
      cleanup();
    }
  }, [open, isLive]);

  const startLiveSession = async () => {
    try {
      setError(null);
      setStatus("Getting ready…");
      setIsConnecting(true);

      // 1) Get ephemeral session from our backend edge function
      const sessionRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/realtime-session`);
      if (!sessionRes.ok) {
        const errorText = await sessionRes.text();
        console.error("Session error:", errorText);
        throw new Error("Failed to create Realtime session");
      }
      const sessionJson = await sessionRes.json();
      const ephemeralKey: string = sessionJson.client_secret?.value;
      const model: string = sessionJson.model ?? "gpt-4o-realtime-preview";

      if (!ephemeralKey) {
        throw new Error("No ephemeral key returned from realtime-session");
      }

      // 2) Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Remote audio element (Fluxa's voice)
      if (!audioElRef.current) {
        audioElRef.current = new Audio();
        audioElRef.current.autoplay = true;
      }

      pc.ontrack = (event) => {
        if (audioElRef.current) {
          audioElRef.current.srcObject = event.streams[0];
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          setStatus("Connection lost. Tap to reconnect.");
          cleanup();
        }
      };

      // 3) Get mic and send audio to Realtime
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      micStream.getTracks().forEach((track) => {
        pc.addTrack(track, micStream);
      });

      // 4) Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        console.log("Data channel open");
        setStatus("Fluxa is listening… just talk 💬");
        setIsLive(true);

        // Send session.update so Fluxa acts like herself
        const sessionUpdate: RealtimeEvent = {
          type: "session.update",
          session: {
            instructions:
              "You are Fluxa, a playful, witty social AI companion. Speak like a Gen-Z best friend giving gist. Be warm, concise, a bit dramatic, and react naturally to what the user says.",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: { type: "server_vad" },
            modalities: ["audio", "text"],
          },
        };
        dc.send(JSON.stringify(sessionUpdate));
      };

      dc.onmessage = (event) => {
        try {
          const msg: RealtimeEvent = JSON.parse(event.data);
          // Basic handling of text deltas
          if (msg.type === "response.delta" && msg.delta?.output_text) {
            setTranscript((prev) => prev + msg.delta.output_text);
          } else if (msg.type === "response.completed" && msg.response?.output_text) {
            const full = msg.response.output_text;
            setTranscript((prev) => prev + (typeof full === "string" ? full : ""));
          } else if (msg.type === "input_audio.buffer_cleared") {
            console.log("Server cleared input buffer");
          } else {
            // Debug other events if needed
            // console.log("Realtime event:", msg.type, msg);
          }
        } catch (e) {
          console.warn("Non-JSON Realtime message:", event.data);
        }
      };

      dc.onerror = (err) => {
        console.error("Data channel error:", err);
        setError("Fluxa connection error.");
      };

      // 5) Create SDP offer and send to OpenAI Realtime over HTTPS
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const url = `${baseUrl}?model=${encodeURIComponent(model)}`;

      const sdpRes = await fetch(url, {
        method: "POST",
        body: offer.sdp || "",
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
      });

      if (!sdpRes.ok) {
        const text = await sdpRes.text();
        console.error("SDP error:", text);
        throw new Error("Failed to establish Realtime SDP session");
      }

      const answerSdp = await sdpRes.text();
      const answerDesc = new RTCSessionDescription({
        type: "answer",
        sdp: answerSdp,
      });
      await pc.setRemoteDescription(answerDesc);

      setIsConnecting(false);
      setStatus("You’re live with Fluxa 🎧 Just talk, she will reply in real time.");
    } catch (e: any) {
      console.error("Error starting live session:", e);
      setIsConnecting(false);
      setIsLive(false);
      setStatus("Could not start live session");
      setError(e?.message || "Unknown error");
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
          <h2 className="text-3xl font-bold text-foreground">Talk to Fluxa 🎧</h2>

          {/* Status */}
          <p className="text-sm text-muted-foreground max-w-md">{status}</p>
          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Big button */}
          <button
            onClick={isLive ? stopLiveSession : startLiveSession}
            disabled={isConnecting}
            className={`px-8 py-3 rounded-2xl font-semibold mt-2 transition-all duration-300 ${
              isLive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:scale-105 shadow-lg"
            } ${isConnecting ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {isConnecting ? "Connecting to Fluxa…" : isLive ? "End Live Session" : "Start Live Session"}
          </button>

          {/* Transcript */}
          <div className="mt-4 w-full max-w-md text-left">
            {transcript && (
              <div className="mt-3 p-4 bg-muted rounded-xl shadow-inner">
                <p className="font-semibold text-foreground mb-1">Fluxa (live transcript):</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{transcript}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceChatModal;
