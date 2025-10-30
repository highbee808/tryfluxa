import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Heart } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Memory() {
  const navigate = useNavigate();
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemory();
  }, []);

  const fetchMemory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("fluxa_memory")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setMemory(data);
    } catch (error) {
      console.error("Error fetching memory:", error);
      toast.error("Couldn't load your memory 😅");
    } finally {
      setLoading(false);
    }
  };

  const resetMemory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("fluxa_memory")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setMemory(null);
      toast.success("Fluxa's memory cleared! Starting fresh 🧠💨");
    } catch (error) {
      console.error("Error resetting memory:", error);
      toast.error("Oops, couldn't reset memory");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  const gistHistory = memory?.gist_history || [];
  const favoriteTopics = memory?.favorite_topics || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/feed")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">Fluxa's Memory 🧠</h1>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                {memory?.name || "Hey bestie"} 👋
              </h2>
              <p className="text-muted-foreground text-sm">
                Last active:{" "}
                {memory?.last_active
                  ? new Date(memory.last_active).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset Memory
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Fluxa's Memory?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You sure? Fluxa will forget your gist history — even the juicy ones 😅
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetMemory}>
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>

        {favoriteTopics.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Favorite Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {favoriteTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Gist History</h3>
          {gistHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No gist history yet! Start listening to build your memory 💭
            </p>
          ) : (
            <div className="space-y-3">
              {gistHistory.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 bg-card border border-border rounded-lg"
                >
                  <p className="font-medium">{item.headline}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.topic} •{" "}
                    {new Date(item.date_played).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
