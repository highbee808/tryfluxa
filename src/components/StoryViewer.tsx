import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Story {
  id: string;
  title: string;
  image_url: string | null;
  audio_url: string;
  duration: number;
  gist_id: string;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

const REACTIONS = ["😂", "🔥", "😱", "💋"];

export const StoryViewer = ({ stories, initialIndex, onClose }: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [topReactions, setTopReactions] = useState<{ reaction: string; count: number }[]>([]);

  const currentStory = stories[currentIndex];

  // Load top reactions for current story
  useEffect(() => {
    loadTopReactions();
  }, [currentStory?.id]);

  const loadTopReactions = async () => {
    if (!currentStory) return;

    const { data, error } = await supabase
      .from("story_reactions")
      .select("reaction")
      .eq("story_id", currentStory.id);

    if (error) {
      console.error("Error loading reactions:", error);
      return;
    }

    // Count reactions
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      counts[r.reaction] = (counts[r.reaction] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([reaction, count]) => ({ reaction, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    setTopReactions(sorted);
  };

  // Play audio and manage progress
  useEffect(() => {
    if (!currentStory) return;

    const newAudio = new Audio(currentStory.audio_url);
    setAudio(newAudio);
    newAudio.play();

    const interval = setInterval(() => {
      if (newAudio.duration) {
        const currentProgress = (newAudio.currentTime / newAudio.duration) * 100;
        setProgress(currentProgress);
      }
    }, 100);

    newAudio.onended = () => {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    };

    return () => {
      newAudio.pause();
      clearInterval(interval);
    };
  }, [currentIndex, currentStory]);

  const handleReaction = async (reaction: string) => {
    setSelectedReaction(reaction);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to react");
      return;
    }

    const { error } = await supabase
      .from("story_reactions")
      .upsert({
        user_id: user.id,
        story_id: currentStory.id,
        reaction,
      });

    if (error) {
      console.error("Error saving reaction:", error);
      toast.error("Failed to save reaction");
    } else {
      loadTopReactions();
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? "100%" : "0%",
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Story content */}
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={currentStory.image_url || "/placeholder.svg"}
            alt={currentStory.title}
            className="w-full h-full object-cover"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

          {/* Story title */}
          <div className="absolute bottom-32 left-0 right-0 px-6">
            <h2 className="text-white text-xl font-bold mb-2">{currentStory.title}</h2>
          </div>

          {/* Navigation areas */}
          <div className="absolute inset-0 flex">
            <div className="flex-1" onClick={handlePrevious} />
            <div className="flex-1" onClick={handleNext} />
          </div>

          {/* Top reactions */}
          {topReactions.length > 0 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2">
              {topReactions.map((r) => (
                <motion.span
                  key={r.reaction}
                  className="text-2xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {r.reaction} {r.count}
                </motion.span>
              ))}
            </div>
          )}

          {/* Reaction buttons */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-6">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction}
                onClick={() => handleReaction(reaction)}
                className={`text-3xl transition-transform ${
                  selectedReaction === reaction ? "scale-125" : "hover:scale-110"
                }`}
              >
                {reaction}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};