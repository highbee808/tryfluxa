import { motion } from "framer-motion";

interface StoryBubbleProps {
  story: {
    id: string;
    title: string;
    image_url: string | null;
    created_at: string;
  };
  onClick: () => void;
}

export const StoryBubble = ({ story, onClick }: StoryBubbleProps) => {
  return (
    <motion.div
      className="flex flex-col items-center gap-2 cursor-pointer"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative">
        {/* Gradient ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-accent to-primary p-[2px]">
          <div className="w-full h-full rounded-full bg-background" />
        </div>
        
        {/* Story image */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-background">
          <img
            src={story.image_url || "/placeholder.svg"}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Story title */}
      <p className="text-xs font-medium text-center max-w-[70px] truncate">
        Fluxa
      </p>
    </motion.div>
  );
};