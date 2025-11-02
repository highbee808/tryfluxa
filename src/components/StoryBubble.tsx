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
      className="flex flex-col items-center gap-3 cursor-pointer"
      onClick={onClick}
      whileTap={{ scale: 0.90 }}
    >
      <div className="relative">
        {/* Gradient ring with glow */}
        <div 
          className="absolute inset-0 rounded-full p-[3px] animate-pulse"
          style={{ 
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))",
            boxShadow: "var(--shadow-glow)"
          }}
        >
          <div className="w-full h-full rounded-full bg-background" />
        </div>
        
        {/* Story image */}
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-[3px] border-background transition-transform duration-300 hover:scale-105">
          <img
            src={story.image_url || "/placeholder.svg"}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Story title */}
      <p className="text-sm font-semibold text-center max-w-[80px] truncate">
        Fluxa
      </p>
    </motion.div>
  );
};