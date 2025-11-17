import { InterestChip } from "@/components/InterestChip";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface SubNicheSelectionProps {
  mainTopic: string;
  emoji: string;
  subTopics: Array<{ id: string; label: string; emoji?: string }>;
  selectedSubNiches: string[];
  onToggle: (subNiche: string) => void;
  onBack: () => void;
}

export const SubNicheSelection = ({
  mainTopic,
  emoji,
  subTopics,
  selectedSubNiches,
  onToggle,
  onBack,
}: SubNicheSelectionProps) => {
  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex justify-center">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 px-6 py-3 rounded-full bg-white/40 hover:bg-white/60 border border-white/50 shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to topics
        </Button>
      </div>

      <div className="ios-card text-center px-6 py-10 space-y-3">
        <div className="text-6xl drop-shadow-sm">{emoji}</div>
        <h2 className="text-4xl font-semibold text-foreground tracking-tight">
          What kind of {mainTopic}?
        </h2>
        <p className="text-muted-foreground text-base">Pick what interests you most</p>
      </div>

      <div className="ios-panel flex flex-wrap gap-4 justify-center">
        {subTopics.map((subTopic) => (
          <InterestChip
            key={subTopic.id}
            label={`${subTopic.emoji || ""} ${subTopic.label}`}
            selected={selectedSubNiches.includes(subTopic.label)}
            onClick={() => onToggle(subTopic.label)}
          />
        ))}
      </div>
    </div>
  );
};
