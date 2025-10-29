import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InterestChip } from "@/components/InterestChip";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Button } from "@/components/ui/button";

const interests = [
  "Afrobeats",
  "Celebrity Gossip",
  "Sports",
  "Memes",
  "Tech",
  "Gaming",
  "Fashion",
  "Anime",
  "Music",
  "Movies",
  "Politics",
  "Food",
];

const Onboarding = () => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const navigate = useNavigate();

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleContinue = () => {
    if (selectedInterests.length >= 3) {
      navigate("/feed");
    }
  };

  const canContinue = selectedInterests.length >= 3;

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold text-foreground">
            Welcome to Fluxa 🎙️
          </h1>
          <p className="text-xl text-muted-foreground">
            What do you want gist about?
          </p>
          <p className="text-sm text-muted-foreground">
            Select at least 3 interests to continue
          </p>
        </div>

        {/* Interest Chips */}
        <div className="flex flex-wrap gap-3 justify-center">
          {interests.map((interest) => (
            <InterestChip
              key={interest}
              label={interest}
              selected={selectedInterests.includes(interest)}
              onClick={() => toggleInterest(interest)}
            />
          ))}
        </div>

        {/* Selection Counter */}
        <div className="text-center">
          <p className="text-muted-foreground">
            {selectedInterests.length} / {interests.length} selected
          </p>
        </div>

        {/* Continue Button */}
        {canContinue && (
          <div className="flex justify-center animate-slide-up">
            <Button
              onClick={handleContinue}
              size="lg"
              className="text-lg hover:scale-105"
            >
              Continue to Feed →
            </Button>
          </div>
        )}
      </div>
      
      <FeedbackButton />
    </div>
  );
};

export default Onboarding;
