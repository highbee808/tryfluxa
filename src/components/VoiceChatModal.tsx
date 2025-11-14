import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceChatHistory } from "@/hooks/useVoiceChatHistory";
import { Clock, MessageCircle } from "lucide-react";

interface VoiceChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VoiceChatModal = ({ open, onOpenChange }: VoiceChatModalProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fluxaReply, setFluxaReply] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { history, loading: historyLoading } = useVoiceChatHistory();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendToFluxa(blob);
        setAudioLevel(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      visualizeMic();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    micStreamRef.current?.getTracks().forEach(t => t.stop());
  };

  const sendToFluxa = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.webm");
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-fluxa-stream`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let partialText = "";

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        try {
          const json = JSON.parse(decoder.decode(value));
          if (json.event === "partial") {
            partialText += json.text;
            setFluxaReply(partialText);
          } else if (json.event === "done") {
            setFluxaReply(json.text);
            playAudio(json.audioUrl);
          }
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.onplay = () => { setIsSpeaking(true); visualizePlayback(audio); };
    audio.onended = () => { setIsSpeaking(false); setAudioLevel(0); };
    audio.play();
  };

  const visualizeMic = () => {
    const update = () => {
      if (!isRecording || !analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      setAudioLevel(dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255);
      requestAnimationFrame(update);
    };
    update();
  };

  const visualizePlayback = (audio: HTMLAudioElement) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audio);
    playbackAnalyserRef.current = ctx.createAnalyser();
    source.connect(playbackAnalyserRef.current).connect(ctx.destination);
    
    const update = () => {
      if (!isSpeaking) return;
      const dataArray = new Uint8Array(playbackAnalyserRef.current!.frequencyBinCount);
      playbackAnalyserRef.current!.getByteFrequencyData(dataArray);
      setAudioLevel(dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255);
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Talk to Fluxa 🎧</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>
        </DialogHeader>

        {showHistory ? (
          <ScrollArea className="h-96">
            {historyLoading ? <p className="text-center py-8">Loading...</p> : 
             history.length === 0 ? <p className="text-center py-8">No history yet</p> :
             history.map(msg => (
              <div key={msg.id} className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {new Date(msg.created_at).toLocaleString()}
                </p>
                <div className="space-y-2">
                  <div><strong>You:</strong> {msg.user_message}</div>
                  <div><strong>Fluxa:</strong> {msg.fluxa_reply}</div>
                  {msg.audio_url && <audio controls src={msg.audio_url} className="w-full mt-2" />}
                </div>
              </div>
            ))}
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center ${
              isRecording ? "bg-red-500/60 animate-pulse" : 
              isSpeaking ? "bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" : "bg-muted"
            }`}>
              <span className="text-2xl">{isRecording ? "🎙️" : isSpeaking ? "🦋" : "🎧"}</span>
            </div>

            <div className="flex gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  height: `${audioLevel * 50 * Math.abs(Math.sin(i)) + 4}px`,
                  width: "5px",
                  borderRadius: "4px",
                  background: isRecording ? "rgba(255,75,75,0.8)" : "rgba(150,100,255,0.8)",
                }} />
              ))}
            </div>

            <Button onClick={isRecording ? stopRecording : startRecording} 
              className={isRecording ? "bg-red-500" : ""}>
              {isRecording ? "Stop" : "Start Talking"}
            </Button>

            {isLoading && <p className="text-sm text-muted-foreground">Fluxa is thinking...</p>}
            {fluxaReply && (
              <div className="p-4 bg-muted rounded-xl w-full">
                <p className="font-semibold mb-1">Fluxa says:</p>
                <p className="text-sm">{fluxaReply}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VoiceChatModal;
