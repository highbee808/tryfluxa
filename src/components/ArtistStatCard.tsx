import React from "react";
import { cn } from "@/lib/utils";

interface ArtistStatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  formatValue?: (value: string | number) => string;
}

export default function ArtistStatCard({
  label,
  value,
  icon,
  formatValue,
}: ArtistStatCardProps) {
  const formattedValue = formatValue ? formatValue(value) : String(value);

  return (
    <div
      className={cn(
        "flex flex-col p-4 rounded-xl",
        "bg-white dark:bg-[#050816]",
        "border border-black/5 dark:border-white/5",
        "min-w-[140px]"
      )}
    >
      {icon && (
        <div className="text-black/40 dark:text-white/40 mb-2">{icon}</div>
      )}
      <div className="text-2xl font-bold text-black dark:text-white mb-1">
        {formattedValue}
      </div>
      <div className="text-xs text-black/60 dark:text-white/60">{label}</div>
    </div>
  );
}

