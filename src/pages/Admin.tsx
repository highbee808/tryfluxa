import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { topics } from "@/data/topics";

const Admin = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGist, setLastGist] = useState<any>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("publish-gist", {
        body: {
          topic: topic.trim(),
          imageUrl: imageUrl.trim() || undefined,
          topicCategory: selectedCategory || undefined,
        },
      });

      if (error) throw error;

      toast.success("Gist generated successfully!");
      setLastGist(data.gist);
      setTopic("");
      setImageUrl("");
      setSelectedCategory("");
    } catch (error) {
      console.error("Error generating gist:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate gist");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Fluxa Admin</h1>
            <p className="text-muted-foreground">Generate AI-powered gists</p>
          </div>
          <Button onClick={() => navigate("/feed")} variant="outline">
            View Feed
          </Button>
        </div>

        <Card className="p-6 space-y-4 bg-card/95 backdrop-blur">
          <h2 className="text-2xl font-semibold">Create New Gist</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category (Optional)</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.label}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Topic *</label>
              <Input
                placeholder="E.g., Drake surprise drop, Messi transfer rumors..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Image URL (Optional)</label>
              <Input
                placeholder="Leave empty for auto-generated image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Gist"
              )}
            </Button>
          </div>
        </Card>

        {lastGist && (
          <Card className="p-6 space-y-4 bg-card/95 backdrop-blur">
            <h2 className="text-2xl font-semibold">Last Generated Gist</h2>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Headline:</span>
                <p className="text-muted-foreground">{lastGist.headline}</p>
              </div>
              <div>
                <span className="font-medium">Context:</span>
                <p className="text-muted-foreground">{lastGist.context}</p>
              </div>
              <div>
                <span className="font-medium">Category:</span>
                <p className="text-muted-foreground">{lastGist.topic_category || 'Trending'}</p>
              </div>
              <div>
                <span className="font-medium">Audio:</span>
                <div className="flex items-center gap-2 mt-1">
                  <audio controls src={lastGist.audio_url} className="w-full" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      const audio = new Audio(lastGist.audio_url);
                      audio.play();
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin;
