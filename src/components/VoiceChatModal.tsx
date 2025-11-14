import React, { useState, useRef, useEffect } from "react";

const VoiceChatModal = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fluxaReply, setFluxaReply] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [fluxaMood, setFluxaMood] = useState("neutral");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // 🎙️ Start Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Mic visualization setup
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendToFluxa(blob);
        stopMicVisualizer();
      };

      mediaRecorder.start();
      setIsRecording(true);
      visualizeMic();
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  // 🛑 Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
  };

  // 📡 Send to Fluxa (Realtime Streaming)
  const sendToFluxa = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.webm");

      const response = await fetch("/functions/v1/voice-to-fluxa-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let partialText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        try {
          const json = JSON.parse(chunk);
          if (json.event === "partial") {
            partialText += json.text;
            setFluxaReply(partialText);
          } else if (json.event === "done") {
            setFluxaReply(json.text);
            playFluxaReply(json.audioUrl, json.text);
          }
        } catch {
          console.warn("Non-JSON chunk:", chunk);
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎧 Play Fluxa’s reply with emotional reaction
  const playFluxaReply = async (audioUrl: string, text: string) => {
    const emotion = detectEmotion(text);
    setFluxaMood(emotion);

    const audio = new Audio(audioUrl);
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      maybePlayReaction(emotion);
    };
    await audio.play();
  };

  // 🧠 Detect emotion in reply
  const detectEmotion = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes("haha") || lower.includes("funny")) return "laugh";
    if (lower.includes("oh no") || lower.includes("sorry")) return "sad";
    if (lower.includes("yay") || lower.includes("great")) return "happy";
    if (lower.includes("wow") || lower.includes("omg")) return "surprised";
    return "neutral";
  };

  // 😂 Optional reaction sound
  const maybePlayReaction = (emotion: string) => {
    const reactions: Record<string, string[]> = {
      laugh: [
        "/audio/reactions/laugh/giggle.mp3",
        "/audio/reactions/laugh/softlaugh.mp3",
        "/audio/reactions/laugh/burstlaugh.mp3",
        "/audio/reactions/laugh/snicker.mp3",
      ],
      happy: ["/audio/reactions/hum/softhum.mp3"],
      sad: ["/audio/reactions/sigh/softsigh.mp3"],
      surprised: ["/audio/reactions/gasp/lightgasp.mp3"],
    };

    const options = reactions[emotion];
    if (options && options.length > 0) {
      const file = options[Math.floor(Math.random() * options.length)];
      const audio = new Audio(file);
      audio.play();
    }
  };

  // 🎚️ Mic Visualization
  const visualizeMic = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      if (!isRecording) return;
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(avg / 255);
      requestAnimationFrame(update);
    };

    update();
  };

  const stopMicVisualizer = () => setAudioLevel(0);

  // 🔊 Waveform Animation
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
                background:
                  fluxaMood === "laugh"
                    ? "rgba(255,180,80,0.8)"
                    : isRecording
                      ? "rgba(255,75,75,0.8)"
                      : "rgba(150,100,255,0.8)",
                transition: "height 0.1s ease",
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 mt-8 text-center">
      <h2 className="text-3xl font-bold text-foreground">Talk to Fluxa 🎧</h2>

      {/* Glowing orb indicator */}
      <div
        className={`mt-4 h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 ${
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

      {/* Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-8 py-3 rounded-2xl font-semibold mt-4 transition-all duration-300 ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:scale-105 shadow-lg"
        }`}
      >
        {isRecording ? "Stop Recording" : "Start Talking"}
      </button>

      {/* Response Text */}
      <div className="mt-4 w-full max-w-md">
        {isLoading && <p className="text-sm text-muted-foreground">Fluxa is thinking...</p>}
        {fluxaReply && (
          <div className="mt-4 p-4 bg-muted rounded-xl shadow-inner text-left">
            <p className="font-semibold text-foreground mb-1">Fluxa says:</p>
            <p className="text-muted-foreground">{fluxaReply}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChatModal;
