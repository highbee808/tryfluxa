import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InterestChip } from "@/components/InterestChip";
import { SubNicheSelection } from "@/components/SubNicheSelection";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/topics";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Onboarding = () => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [subNicheSelections, setSubNicheSelections] = useState<Record<string, string[]>>({});
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [showSubNiches, setShowSubNiches] = useState(false);
  const [currentMainTopic, setCurrentMainTopic] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => {
      const newInterests = prev.includes(interest) 
        ? prev.filter((i) => i !== interest) 
        : [...prev, interest];
      
      // If deselecting, remove sub-niches
      if (prev.includes(interest)) {
        const newSubNiches = { ...subNicheSelections };
        delete newSubNiches[interest];
        setSubNicheSelections(newSubNiches);
      }
      
      return newInterests;
    });
  };

  const handleTopicClick = (topicId: string, hasSubTopics: boolean) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    // Toggle selection
    toggleInterest(topic.label);

    // If has sub-topics and is now selected, show sub-niche selection
    if (hasSubTopics && !selectedInterests.includes(topic.label)) {
      setCurrentMainTopic(topic.label);
      setShowSubNiches(true);
    }
  };

  const toggleSubNiche = (mainTopic: string, subNiche: string) => {
    setSubNicheSelections(prev => {
      const current = prev[mainTopic] || [];
      const updated = current.includes(subNiche)
        ? current.filter(s => s !== subNiche)
        : [...current, subNiche];
      
      return { ...prev, [mainTopic]: updated };
    });
  };

  const handleContinue = async () => {
    if (selectedInterests.length < 3) {
      toast.error("Please select at least 3 interests to continue 💡");
      return;
    }

    // Save interests to localStorage
    localStorage.setItem("fluxaInterests", JSON.stringify(selectedInterests));

    // Save sub-niches to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      for (const [mainTopic, subNiches] of Object.entries(subNicheSelections)) {
        if (subNiches.length > 0) {
          await supabase.from("user_subniches").insert({
            user_id: user.id,
            main_topic: mainTopic,
            sub_niches: subNiches,
          });
        }
      }
    }

    // Navigate based on whether Sports is selected
    if (selectedInterests.includes("Sports")) {
      toast.success("Nice picks! Now let's set up your football teams ⚽");
      navigate("/team-selection");
    } else {
      toast.success("All set! Welcome to Fluxa 🎉");
      navigate("/feed");
    }
  };

  const canContinue = selectedInterests.length >= 3;

  if (showSubNiches && currentMainTopic) {
    const topic = topics.find(t => t.label === currentMainTopic);
    if (topic?.subTopics) {
      return (
        <div className="ios-page flex items-center justify-center">
          <div className="max-w-5xl w-full space-y-10">
            <SubNicheSelection
              mainTopic={currentMainTopic}
              emoji={topic.emoji}
              subTopics={topic.subTopics}
              selectedSubNiches={subNicheSelections[currentMainTopic] || []}
              onToggle={(subNiche) => toggleSubNiche(currentMainTopic, subNiche)}
              onBack={() => setShowSubNiches(false)}
            />

            {/* Continue Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => setShowSubNiches(false)}
                size="lg"
                className="px-10 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl"
              >
                Done →
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="ios-page flex items-center justify-center">
      <div className="w-full max-w-6xl space-y-10 animate-fade-in">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <div className="ios-hero text-left space-y-6 text-foreground">
            <div className="flex flex-wrap gap-3">
              <span className="ios-stat-badge text-xs uppercase tracking-[0.2em]">Fluxa</span>
              <span className="ios-stat-badge text-xs">Step 1 · Personalize</span>
            </div>
            <div>
              <h1 className="text-5xl lg:text-6xl font-semibold leading-tight tracking-tight">
                Tell Fluxa what you want to follow.
              </h1>
              <p className="mt-4 text-lg text-foreground/80 max-w-2xl">
                Choose at least three interests so the experience feels like a curated iOS 26 home screen—precise, calm, and yours.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="ios-panel p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Selected</p>
                <p className="text-3xl font-semibold mt-1">{selectedInterests.length}</p>
              </div>
              <div className="ios-panel p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Goal</p>
                <p className="text-3xl font-semibold mt-1">3+</p>
              </div>
              <div className="ios-panel p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Mode</p>
                <p className="text-xl font-semibold mt-1">Focus</p>
              </div>
            </div>
          </div>

          <div className="ios-card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Quick setup</p>
                <p className="text-2xl font-semibold">Fluxa Taste Profile</p>
              </div>
              <span className="ios-stat-badge text-sm">{selectedInterests.length}/3</span>
            </div>
            <div className="space-y-4 text-sm">
              {["Pick your favorite spaces", "Tap to expand deeper sub-niches", "Continue when you're ready"].map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/40 flex items-center justify-center text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <p className="text-foreground/80">{step}</p>
                </div>
              ))}
            </div>

            {selectedInterests.length > 0 && (
              <div className="ios-panel bg-white/40 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-[0.3em] mb-3">You've chosen</p>
                <div className="flex flex-wrap gap-2">
                  {selectedInterests.map((interest) => (
                    <span key={interest} className="px-3 py-1 text-sm rounded-full bg-gradient-to-r from-blue-500/15 to-purple-500/20 text-primary font-medium">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ios-panel space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xl font-semibold">Choose your channels</p>
              <p className="text-sm text-muted-foreground">Tap any tile. Hold to reveal more depth.</p>
            </div>
            <span className="ios-stat-badge text-sm">{selectedInterests.length} selected</span>
          </div>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            {topics.map((topic) => (
              <InterestChip
                key={topic.id}
                label={`${topic.emoji || ""} ${topic.label}`}
                selected={selectedInterests.includes(topic.label)}
                onClick={() => handleTopicClick(topic.id, !!topic.subTopics)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="ios-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-[0.3em]">Ready when you are</p>
              <p className="text-lg font-semibold">We'll use your choices to shape the Fluxa feed.</p>
            </div>
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              size="lg"
              className="px-10 text-lg font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-2xl disabled:opacity-60"
            >
              Continue to Feed →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;