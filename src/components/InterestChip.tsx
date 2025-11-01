import { cn } from "@/lib/utils";

interface InterestChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export const InterestChip = ({ label, selected, onClick }: InterestChipProps) => {
  // Split emoji from text
  const parts = label.split(" ");
  const emoji = parts[0];
  const text = parts.slice(1).join(" ");

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-3 rounded-full font-medium transition-all duration-300 group",
        "border-2 hover:scale-105 active:scale-95 relative overflow-visible",
        selected
          ? "bg-accent text-accent-foreground border-accent shadow-soft"
          : "bg-card text-foreground border-border hover:border-accent/50"
      )}
    >
      <span className="flex items-center gap-2">
        <span 
          className={cn(
            "inline-block transition-all duration-300",
            "animate-float",
            "group-hover:scale-125 group-hover:rotate-12",
            selected && "animate-pulse"
          )}
          style={{
            animationDuration: `${2 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * 2}s`
          }}
        >
          {emoji}
        </span>
        <span>{text}</span>
      </span>
    </button>
  );
};
