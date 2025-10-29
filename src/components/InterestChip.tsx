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
        "px-6 py-3 rounded-full font-semibold transition-all duration-300",
        "border-0 hover:scale-105 active:scale-95",
        selected
          ? "bg-primary text-primary-foreground shadow-soft"
          : "bg-card text-foreground shadow-soft hover:shadow-hover"
      )}
    >
      {label}
    </button>
  );
};
