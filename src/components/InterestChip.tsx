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
        "px-7 py-4 rounded-full font-semibold transition-all duration-400 group",
        "border-2 hover:scale-105 active:scale-95 relative overflow-visible",
        selected
          ? "bg-gradient-to-r from-primary to-accent text-white border-transparent shadow-xl hover-glow-strong"
          : "glass-light text-foreground border-glass-border-light hover:glass hover:border-glass-border-strong hover-glow"
      )}
      style={selected ? { boxShadow: "var(--shadow-glow)" } : {}}
    >
      <span className="flex items-center gap-3">
        <span 
          className={cn(
            "inline-block transition-all duration-400 text-xl",
            "animate-float",
            "group-hover:scale-125 group-hover:rotate-12",
            selected && "animate-pulse scale-110"
          )}
          style={{
            animationDuration: `${2 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * 2}s`
          }}
        >
          {emoji}
        </span>
        <span className="text-base">{text}</span>
      </span>
    </button>
  );
};
