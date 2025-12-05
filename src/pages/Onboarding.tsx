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

    // Save interests to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Save main interests
      for (const interest of selectedInterests) {
        await supabase.from("user_interests").upsert({
          user_id: user.id,
          interest: interest,
        }, {
          onConflict: "user_id,interest"
        });
      }

      // Save sub-niches to database
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

    // Navigate based on selected interests
    if (selectedInterests.includes("Sports")) {
      toast.success("Nice picks! Now let's set up your football teams ⚽");
      navigate("/team-selection");
    } else {
      // Music onboarding is handled via SubNicheSelection flow
      toast.success("All set! Welcome to Fluxa 🎉");
      navigate("/feed");
    }
  };

  const canContinue = selectedInterests.length >= 3;

  if (showSubNiches && currentMainTopic) {
    const topic = topics.find(t => t.label === currentMainTopic);
    if (topic?.subTopics) {
      // Special handling for Music - navigate to artist selection after genres
      const isMusic = currentMainTopic === "Music";
      
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
          <div className="max-w-4xl w-full space-y-10">
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
                onClick={async () => {
                  if (isMusic) {
                    // For Music, navigate to artist selection with selected genres
                    const selectedGenres = subNicheSelections[currentMainTopic] || [];
                    if (selectedGenres.length === 0) {
                      toast.error("Please select at least one genre");
                      return;
                    }
                    navigate("/music-artist-selection", { 
                      state: { selectedGenres } 
                    });
                  } else {
                    setShowSubNiches(false);
                  }
                }}
                size="lg"
                className="text-lg font-bold shadow-xl"
                disabled={isMusic && (subNicheSelections[currentMainTopic] || []).length === 0}
              >
                {isMusic ? "Continue to Artists →" : "Done →"}
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
      <div className="max-w-4xl w-full space-y-10 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl md:text-7xl font-bold text-foreground">
            Welcome to Fluxa 🎙️
          </h1>
          <p className="text-2xl text-foreground font-medium">What do you want gist about?</p>
          <p className="text-base text-muted-foreground">Select at least 3 interests to personalize your feed</p>
        </div>

        {/* Interest Chips */}
        <div className="flex flex-wrap gap-4 justify-center">
          {topics.map((topic) => (
            <InterestChip
              key={topic.id}
              label={`${topic.emoji || ""} ${topic.label}`}
              selected={selectedInterests.includes(topic.label)}
              onClick={() => handleTopicClick(topic.id, !!topic.subTopics)}
            />
          ))}
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