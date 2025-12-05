import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { invokeAdminFunction } from "@/lib/invokeAdminFunction";

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
  const [permissionHint, setPermissionHint] = useState<string | null>(null);

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

  const explainMicError = (err: any) => {
    const name = err?.name || "";
    const message = err?.message || "Microphone access failed";

    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        error: "Microphone access was blocked.",
        hint:
          "Click the lock icon in your browser's address bar and allow microphone access, then try again.",
        status: "Microphone permission denied",
      };
    }

    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        error: "No microphone detected.",
        hint: "Plug in a microphone or make sure your device's mic is available.",
        status: "Microphone not found",
      };
    }

    if (name === "NotReadableError" || name === "TrackStartError") {
      return {
        error: "Another app is already using your microphone.",
        hint: "Close other apps that record audio (Zoom, Meet, etc.) and try again.",
        status: "Microphone busy",
      };
    }

    if (name === "SecurityError" || message.toLowerCase().includes("secure")) {
      return {
        error: "Live audio needs a secure (https) connection.",
        hint: "Open Fluxa over https:// or install the PWA / use localhost during development.",
        status: "Secure connection required",
      };
    }

    return {
      error: message,
      hint: null,
      status: "Could not start live session",
    };
  };

  const startLiveSession = async () => {
    try {
      setError(null);
      setPermissionHint(null);
      setStatus("Getting ready…");
      setIsConnecting(true);

      if (typeof window !== "undefined" && !window.isSecureContext) {
        setIsConnecting(false);
        setStatus("Secure connection required");
        setError("Live audio needs HTTPS or localhost. Please open Fluxa over https://");
        setPermissionHint("Tip: install the Fluxa PWA or use https://tryfluxa.com to enable live chat.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setIsConnecting(false);
        setStatus("Browser not supported");
        setError("Your browser doesn't allow microphone access. Try Chrome, Edge, or Safari on the latest version.");
        return;
      }

      // 1) Request microphone access upfront so the browser prompt appears immediately
      let micStream: MediaStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (mediaError: any) {
        const friendly = explainMicError(mediaError);
        setIsConnecting(false);
        setStatus(friendly.status);
        setError(friendly.error);
        setPermissionHint(friendly.hint);
        return;
      }

      // 1) Get ephemeral session from our backend edge function
      const {
        data: sessionJson,
        error: sessionError,
      } = await invokeAdminFunction("realtime-session", {}) as { data: RealtimeSessionResponse | null; error: any };

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

      // 3) Hook microphone stream into the connection
      micStreamRef.current = micStream;
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        setStatus("Fluxa is listening… just talk 💬");
        setIsLive(true);

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

          if (msg.type === "response.delta" && msg.delta?.output_text) {
            setTranscript((prev) => prev + msg.delta.output_text);
          } else if (msg.type === "response.completed" && msg.response?.output_text) {
            const full = msg.response.output_text;
            setTranscript((prev) => prev + (typeof full === "string" ? full : ""));
          }
        } catch {
          console.warn("Non-JSON Realtime message:", event.data);
        }
      };

      dc.onerror = (err) => {
        console.error("Data channel error:", err);
        setError("Fluxa connection error.");
      };

      // 5) Create SDP offer and send to OpenAI Realtime
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const url = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;

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
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: answerSdp })
      );

      setIsConnecting(false);
      setStatus("You’re live with Fluxa 🎧 Just talk!");
    } catch (e: any) {
      console.error("Error starting live session:", e);
      setIsConnecting(false);
      setIsLive(false);
      const friendly = explainMicError(e);
      setStatus(friendly.status);
      setError(friendly.error);
      setPermissionHint(friendly.hint);
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
          {error && (
            <div className="space-y-1">
              <p className="text-xs text-red-400">{error}</p>
              {permissionHint && (
                <p className="text-xs text-muted-foreground">{permissionHint}</p>
              )}
            </div>
          )}

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
