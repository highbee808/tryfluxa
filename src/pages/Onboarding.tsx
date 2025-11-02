import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InterestChip } from "@/components/InterestChip";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/topics";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

const Onboarding = () => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const handleTopicClick = (topicId: string, hasSubTopics: boolean) => {
    if (hasSubTopics) {
      setExpandedTopic(expandedTopic === topicId ? null : topicId);
    } else {
      const topic = topics.find(t => t.id === topicId);
      if (topic) {
        toggleInterest(topic.label);
      }
    }
  };

  const handleContinue = () => {
    if (selectedInterests.length >= 3) {
      // ✅ Save interests for feed personalization
      localStorage.setItem("fluxaInterests", JSON.stringify(selectedInterests));

      toast.success("Nice picks! Let's personalize your feed ✨");
      navigate("/feed");
    } else {
      toast.error("Please select at least 3 interests to continue 💡");
    }
  };

  const canContinue = selectedInterests.length >= 3;

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
      <div className="max-w-4xl w-full space-y-10 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Welcome to Fluxa 🎙️
          </h1>
          <p className="text-2xl text-foreground font-medium">What do you want gist about?</p>
          <p className="text-base text-muted-foreground">Select at least 3 interests to personalize your feed</p>
        </div>

        {/* Back button when viewing sub-topics */}
        {expandedTopic && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setExpandedTopic(null)}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to all topics
            </Button>
          </div>
        )}

        {/* Interest Chips */}
        <div className="flex flex-wrap gap-4 justify-center">
          {!expandedTopic ? (
            // Show main topics
            topics.map((topic) => (
              <InterestChip
                key={topic.id}
                label={`${topic.emoji || ""} ${topic.label}`}
                selected={selectedInterests.includes(topic.label)}
                onClick={() => handleTopicClick(topic.id, !!topic.subTopics)}
              />
            ))
          ) : (
            // Show sub-topics
            topics
              .find(t => t.id === expandedTopic)
              ?.subTopics?.map((subTopic) => (
                <InterestChip
                  key={subTopic.id}
                  label={`${subTopic.emoji || ""} ${subTopic.label}`}
                  selected={selectedInterests.includes(subTopic.label)}
                  onClick={() => toggleInterest(subTopic.label)}
                />
              ))
          )}
        </div>

        {/* Selection Counter */}
        <div className="text-center">
          <p className="text-foreground font-medium text-lg">
            {selectedInterests.length} selected
            {canContinue && " ✨"}
          </p>
          {selectedInterests.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {selectedInterests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center animate-slide-up">
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            size="lg"
            className="text-lg font-bold shadow-xl"
          >
            Continue to Feed →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;