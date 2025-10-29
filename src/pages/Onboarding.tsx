import { useState } from "react";
import { topics } from "@/data/topics";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Onboarding = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleTopic = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleContinue = () => {
    if (selected.length < 3) return;
    localStorage.setItem("fluxaInterests", JSON.stringify(selected));
    navigate("/feed");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-rose-50 to-white">
      <h1 className="text-4xl font-bold text-[#3A3A3A] mb-3 animate-fade-in">What do you want gist about?</h1>
      <p className="text-gray-500 mb-8 animate-fade-in">Pick at least 3 topics to personalize your feed ✨</p>

      <div className="flex flex-wrap justify-center gap-3 max-w-xl animate-slide-in">
        {topics.map((t) => (
          <button
            key={t.id}
            onClick={() => toggleTopic(t.id)}
            className={`px-5 py-2 rounded-full font-medium border transition-all ${
              selected.includes(t.id)
                ? "bg-[#FFDCB8] text-[#3A3A3A] border-[#FFDCB8]"
                : "bg-white text-gray-500 border-gray-200 hover:scale-105"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Button
        className="mt-10 bg-[#FFDCB8] text-[#3A3A3A] rounded-full px-10 py-3 font-semibold shadow-md hover:scale-105 transition-all"
        onClick={handleContinue}
        disabled={selected.length < 3}
      >
        Continue
      </Button>

      {selected.length < 3 && (
        <p className="text-sm text-gray-400 mt-4">Select {3 - selected.length} more to continue</p>
      )}
    </div>
  );
};

export default Onboarding;
