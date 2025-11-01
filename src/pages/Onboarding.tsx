import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InterestChip } from "@/components/InterestChip";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/topics";
import { toast } from "sonner";

const Onboarding = () => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const navigate = useNavigate();

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const handleContinue = () => {
    if (selectedInterests.length >= 3) {
      // ✅ Save interests for feed personalization
      localStorage.setItem("fluxaInterests", JSON.stringify(selectedInterests));

      toast.success("Nice picks! Let’s personalize your feed ✨");
      navigate("/feed");
    } else {
      toast.error("Please select at least 3 interests to continue 💡");
    }
  };

  const canContinue = selectedInterests.length >= 3;

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold text-foreground">Welcome to Fluxa 🎙️</h1>
          <p className="text-xl text-muted-foreground">What do you want gist about?</p>
          <p className="text-sm text-muted-foreground">Select at least 3 interests to continue</p>
        </div>

        {/* Interest Chips */}
        <div className="flex flex-wrap gap-3 justify-center">
          {topics.map((topic) => (
            <InterestChip
              key={topic.id}
              label={`${topic.emoji || ""} ${topic.label}`}
              selected={selectedInterests.includes(topic.label)}
              onClick={() => toggleInterest(topic.label)}
            />
          ))}
        </div>

        {/* Selection Counter */}
        <div className="text-center">
          <p className="text-muted-foreground">
            {selectedInterests.length} / {topics.length} selected
          </p>
        </div>

        {/* Continue Button */}
        <div className="flex justify-center animate-slide-up">
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`px-12 py-6 text-lg font-semibold rounded-2xl transition-all duration-300 shadow-soft ${
              canContinue
                ? "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-hover hover:scale-105"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
            }`}
          >
            Continue to Feed →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
