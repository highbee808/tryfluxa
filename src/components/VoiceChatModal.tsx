import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";

interface VoiceChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoiceChatModal = ({ open, onOpenChange }: VoiceChatModalProps) => {
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      
      toast({
        title: "Recording...",
        description: "Speak now! Click stop when done.",
      });
    } catch (error) {
      console.error("Recording error:", error);
      toast({
        title: "Microphone access denied",
        description: "Please enable microphone access to use voice chat",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      const { data, error } = await supabase.functions.invoke("voice-to-fluxa", {
        body: formData,
      });

      if (error) throw error;

      setTranscript(data.userSpeech);
      setReply(data.fluxaReply);
      setAudioUrl(data.audioUrl);

      // Auto-play Fluxa's response
      const audio = new Audio(data.audioUrl);
      audio.play();

      toast({
        title: "Response received",
        description: "Fluxa has replied!",
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const playResponse = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const handleClose = () => {
    setRecording(false);
    setProcessing(false);
    setAudioUrl(null);
    setTranscript("");
    setReply("");
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Talk to Fluxa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recording Controls */}
          <div className="flex flex-col items-center gap-4">
            {!recording && !processing && (
              <Button
                size="lg"
                className="w-24 h-24 rounded-full"
                onClick={startRecording}
              >
                <Mic className="h-8 w-8" />
              </Button>
            )}

            {recording && (
              <Button
                size="lg"
                variant="destructive"
                className="w-24 h-24 rounded-full animate-pulse"
                onClick={stopRecording}
              >
                <MicOff className="h-8 w-8" />
              </Button>
            )}

            {processing && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing your message...</p>
              </div>
            )}
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-semibold mb-1">You said:</p>
              <p className="text-sm">{transcript}</p>
            </div>
          )}

          {/* Fluxa's Reply */}
          {reply && (
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-1 text-primary">Fluxa replied:</p>
              <p className="text-sm">{reply}</p>
              {audioUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={playResponse}
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Play Again
                </Button>
              )}
            </div>
          )}

          {/* Instructions */}
          {!transcript && !recording && !processing && (
            <p className="text-sm text-muted-foreground text-center">
              Click the microphone to start a voice conversation with Fluxa
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
