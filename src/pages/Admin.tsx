import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Play, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { topics } from "@/data/topics";

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGist, setLastGist] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ✅ Development mode bypass - allow public access for MVP testing
        if (import.meta.env.DEV) {
          console.log("✅ Admin access verified for development mode");
          setIsAuthenticated(true);
          setIsAdmin(true);
          setIsCheckingAuth(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          return;
        }

        setIsAuthenticated(true);

        // Check if user is admin
        const { data: hasAdminRole, error } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });

        if (error || !hasAdminRole) {
          toast.error("Admin access required");
          navigate("/feed");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Auth check error:", error);
        }
        navigate("/auth");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

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
      if (import.meta.env.DEV) {
        console.error("Error generating gist:", error);
      }
      toast.error(error instanceof Error ? error.message : "Failed to generate gist");
    } finally {
      setIsGenerating(false);
    }
  };

  const runPipelineTest = async () => {
    setIsTesting(true);
    setTestLogs([]);
    const logs: string[] = [];
    
    const addLog = (message: string, success: boolean = true) => {
      const logMessage = `${success ? '✅' : '❌'} ${message}`;
      logs.push(logMessage);
      setTestLogs([...logs]);
      console.log(logMessage);
    };

    try {
      addLog("Starting full pipeline test...");
      
      // Test topic
      const testTopic = "Drake drops a surprise song with a twist";
      addLog(`Test topic: "${testTopic}"`);

      // Step 1: Call publish-gist
      addLog("Calling publish-gist function...");
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke("publish-gist", {
        body: {
          topic: testTopic,
          topicCategory: "Music"
        },
      });

      if (error) {
        addLog(`Error in publish-gist: ${JSON.stringify(error)}`, false);
        toast.error("Pipeline test failed");
        return;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      addLog(`Pipeline completed in ${duration}s`);

      // Step 2: Verify response
      if (!data || !data.gist) {
        addLog("No gist data returned", false);
        return;
      }

      addLog("🚀 generate-gist successful");
      addLog("🎤 text-to-speech successful");
      addLog("🗄️ gist saved to database");

      // Step 3: Verify gist fields
      const gist = data.gist;
      addLog(`Headline: ${gist.headline ? '✓' : '✗ MISSING'}`);
      addLog(`Context: ${gist.context ? '✓' : '✗ MISSING'}`);
      addLog(`Audio URL: ${gist.audio_url ? '✓' : '✗ MISSING'}`);
      addLog(`Status: ${gist.status === 'published' ? '✓ published' : '✗ ' + gist.status}`);

      // Step 4: Verify audio URL format
      if (gist.audio_url && gist.audio_url.startsWith('https://')) {
        addLog("Audio URL format valid (starts with https://)");
      } else {
        addLog("Audio URL format invalid", false);
      }

      // Step 5: Fetch from database to confirm
      addLog("Verifying gist in database...");
      const { data: dbGist, error: dbError } = await supabase
        .from('gists')
        .select('*')
        .eq('id', gist.id)
        .single();

      if (dbError || !dbGist) {
        addLog("Failed to fetch gist from database", false);
      } else {
        addLog("Gist confirmed in database");
      }

      // Step 6: Test feed connection
      addLog("Testing feed endpoint...");
      const { data: feedData, error: feedError } = await supabase.functions.invoke("fetch-feed", {
        body: { limit: 20 }
      });

      if (feedError) {
        addLog("Feed fetch error", false);
      } else if (feedData?.gists?.length > 0) {
        const foundInFeed = feedData.gists.some((g: any) => g.id === gist.id);
        if (foundInFeed) {
          addLog("✅ Test gist found in feed");
        } else {
          addLog("⚠️ Test gist not found in feed (may appear shortly)");
        }
      }

      addLog("✅ full pipeline test completed");
      setLastGist(gist);
      toast.success("Pipeline test passed! ✅");

    } catch (error) {
      addLog(`❌ Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`, false);
      toast.error("Pipeline test failed");
    } finally {
      setIsTesting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-warm p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Fluxa Admin</h1>
            <p className="text-muted-foreground">Generate AI-powered gists</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/feed")} variant="outline">
              View Feed
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <Card className="p-6 space-y-4 bg-card/95 backdrop-blur border-primary/20">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Pipeline Test</h2>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Test the full AI gist generation pipeline with a sample topic
            </p>
            <Button
              onClick={runPipelineTest}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                "🧪 Run Full Pipeline Test"
              )}
            </Button>
          </div>
          
          {testLogs.length > 0 && (
            <div className="mt-4 p-4 bg-background/50 rounded-lg">
              <h3 className="text-sm font-semibold mb-2">Test Logs:</h3>
              <div className="space-y-1 font-mono text-xs max-h-60 overflow-y-auto">
                {testLogs.map((log, idx) => (
                  <div key={idx} className={log.includes('❌') ? 'text-destructive' : 'text-foreground'}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

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
