import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/topics";
import { toast } from "sonner";
import { Headphones } from "lucide-react";

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

      toast.success("Nice picks! Let's personalize your feed ✨");
      navigate("/feed");
    } else {
      toast.error("Please select at least 3 interests to continue 💡");
    }
  };

  const canContinue = selectedInterests.length >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-pink-50 to-purple-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Headphones className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl mb-4 font-bold text-gray-900">Welcome to Fluxa</h1>
          <p className="text-xl text-gray-600 mb-2">
            Choose at least 3 topics you're interested in
          </p>
          <p className="text-sm text-gray-500">
            {selectedInterests.length}/3 topics selected
          </p>
        </div>

        {/* Topics Grid */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {topics.map((topic) => {
            const isSelected = selectedInterests.includes(topic.label);
            return (
              <button
                key={topic.id}
                onClick={() => toggleInterest(topic.label)}
                className={`
                  px-6 py-3 rounded-full text-base
                  flex items-center gap-2
                  transition-all duration-200
                  ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                      : "bg-white text-gray-700 hover:bg-gray-50 shadow-md"
                  }
                `}
              >
                <span className="text-xl transition-transform duration-200 hover:scale-125 hover:rotate-12">
                  {topic.emoji}
                </span>
                <span>{topic.label}</span>
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!canContinue}
            className={`
              px-12 py-6 text-lg rounded-full
              ${
                canContinue
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
              }
            `}
          >
            Continue
          </Button>
          {!canContinue && (
            <p className="text-sm text-gray-500 mt-3">
              Please select {3 - selectedInterests.length} more topic{3 - selectedInterests.length !== 1 ? 's' : ''} to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
