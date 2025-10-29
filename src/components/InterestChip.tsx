import { cn } from "@/lib/utils";

interface InterestChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export const InterestChip = ({ label, selected, onClick }: InterestChipProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-3 rounded-full font-medium transition-all duration-300",
        "border-2 hover:scale-105 active:scale-95",
        selected
          ? "bg-accent text-accent-foreground border-accent shadow-soft"
          : "bg-card text-foreground border-border hover:border-accent/50"
      )}
    >
      {label}
    </button>
  );
};
