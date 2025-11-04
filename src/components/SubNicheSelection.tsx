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
    <div className="space-y-8 animate-fade-in">
      {/* Back Button */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to topics
        </Button>
      </div>

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="text-6xl">{emoji}</div>
        <h2 className="text-4xl font-bold text-foreground">
          What kind of {mainTopic}?
        </h2>
        <p className="text-muted-foreground">Pick what interests you most</p>
      </div>

      {/* Sub-niche Chips */}
      <div className="flex flex-wrap gap-4 justify-center">
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
