import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { topics } from "@/data/topics";

const Admin = () => {
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
    toast.info("Starting gist generation...");

    try {
      const { data, error } = await supabase.functions.invoke("publish-gist", {
        body: { 
          topic: topic.trim(),
          imageUrl: imageUrl.trim() || undefined 
        },
      });

      if (error) throw error;

      setLastGist(data.gist);
      toast.success("Gist published successfully! 🎉");
      setTopic("");
      setImageUrl("");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate gist");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Fluxa Admin</h1>
          <p className="text-muted-foreground">Generate and publish gists</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Gist</CardTitle>
            <CardDescription>
              Enter a trending topic and the AI will generate a complete gist with audio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category (optional)</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.label}>
                      {topic.emoji} {topic.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory && (
                <p className="text-xs text-muted-foreground">
                  {topics.find(t => t.label === selectedCategory)?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Topic *</label>
              <Input
                placeholder="e.g., Taylor Swift's new album announcement"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL (optional)</label>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating (this may take 30-60 seconds)...
                </>
              ) : (
                "Generate Gist"
              )}
            </Button>
          </CardContent>
        </Card>

        {lastGist && (
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Latest Generated Gist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Headline</p>
                <p className="text-foreground">{lastGist.headline}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Context</p>
                <p className="text-muted-foreground text-sm">{lastGist.context}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Audio URL</p>
                <a 
                  href={lastGist.audio_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline"
                >
                  {lastGist.audio_url}
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = "/feed"}
          >
            View Feed
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
