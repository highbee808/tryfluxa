import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Square, Play, Pause, Upload, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceCommentaryRecorderProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

export const VoiceCommentaryRecorder = ({ matchId, homeTeam, awayTeam }: VoiceCommentaryRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Share your reaction to the match!",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      toast({
        title: "Recording stopped",
        description: "Preview or upload your commentary",
      });
    }
  };

  const playRecording = () => {
    if (audioBlob && !isPlaying) {
      const url = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(url);
      audioRef.current.play();
      audioRef.current.onended = () => setIsPlaying(false);
      setIsPlaying(true);
    } else if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const uploadCommentary = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to storage
      const fileName = `commentary-${matchId}-${user.id}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gist-audio')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gist-audio')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('fan_posts')
        .insert({
          user_id: user.id,
          entity_id: matchId,
          content: `Voice commentary on ${homeTeam} vs ${awayTeam}`,
          media_url: publicUrl,
        });

      if (dbError) throw dbError;

      toast({
        title: "Commentary shared! 🎉",
        description: "Your reaction has been posted to the community",
      });

      // Reset
      setAudioBlob(null);
      setIsPlaying(false);
    } catch (error) {
      console.error('Error uploading:', error);
      toast({
        title: "Upload failed",
        description: "Could not share your commentary",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">🎙️ Voice Commentary</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Record your reaction and share with the community
      </p>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {!audioBlob ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                className="w-full max-w-xs h-20"
              >
                {isRecording ? (
                  <>
                    <Square className="w-6 h-6 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-6 h-6 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="playback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={playRecording}
                  className="flex-1"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setAudioBlob(null)}
                >
                  Re-record
                </Button>
              </div>

              <Button
                onClick={uploadCommentary}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Share Commentary
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center justify-center gap-2 text-red-500"
          >
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">Recording...</span>
          </motion.div>
        )}
      </div>
    </Card>
  );
};