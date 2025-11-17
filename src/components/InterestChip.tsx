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
      aria-pressed={selected}
      className={cn(
        "ios-pill group relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        "transition-transform duration-300",
        selected
          ? "ios-pill-active"
          : "ios-pill-idle hover:-translate-y-0.5 active:scale-95"
      )}
    >
      {selected && <span className="ios-pill-highlight" aria-hidden />}
      <span className="flex items-center gap-3 relative z-10">
        <span
          className={cn(
            "inline-block text-2xl transition-all duration-500",
            selected
              ? "scale-110 drop-shadow"
              : "opacity-80 group-hover:opacity-100 group-hover:-translate-y-0.5"
          )}
        >
          {emoji}
        </span>
        <span className="text-base font-semibold tracking-tight">{text}</span>
      </span>
    </button>
  );
};
