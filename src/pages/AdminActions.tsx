import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Play,
  Pause,
  PlayCircle,
  Trash2,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  getSources,
  triggerIngestion,
  pauseIngestion,
  resumeIngestion,
  clearCache,
  type SourceHealth,
  type TriggerResult,
} from "@/lib/adminApi";

interface ActionResult {
  type: "trigger" | "pause" | "resume" | "clear";
  success: boolean;
  message: string;
  timestamp: Date;
  details?: TriggerResult[];
}

const AdminActions = () => {
  const navigate = useNavigate();
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<ActionResult[]>([]);

  useEffect(() => {
    const fetchSources = async () => {
      const { data, error } = await getSources();
      if (data) {
        setSources(data.sources.filter(s => s.is_active));
      }
    };
    fetchSources();
  }, []);

  const addResult = (result: ActionResult) => {
    setResults(prev => [result, ...prev].slice(0, 10)); // Keep last 10 results
  };

  const handleTriggerAll = async () => {
    setLoading(prev => ({ ...prev, triggerAll: true }));
    toast.info("Triggering ingestion for all sources...");
    
    const { data, error } = await triggerIngestion();
    
    if (error) {
      toast.error(`Failed: ${error.message}`);
      addResult({
        type: "trigger",
        success: false,
        message: error.message || "Trigger failed",
        timestamp: new Date(),
      });
    } else if (data) {
      const successCount = data.results?.filter(r => r.status === "success").length || 0;
      const failedCount = data.results?.filter(r => r.status === "failed" || r.status === "error").length || 0;
      
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }
      
      addResult({
        type: "trigger",
        success: data.success,
        message: data.message,
        timestamp: new Date(),
        details: data.results,
      });
    }
    
    setLoading(prev => ({ ...prev, triggerAll: false }));
  };

  const handleTriggerSingle = async () => {
    if (selectedSource === "all") {
      toast.error("Please select a specific source");
      return;
    }
    
    setLoading(prev => ({ ...prev, triggerSingle: true }));
    toast.info(`Triggering ingestion for ${selectedSource}...`);
    
    const { data, error } = await triggerIngestion(selectedSource);
    
    if (error) {
      toast.error(`Failed: ${error.message}`);
      addResult({
        type: "trigger",
        success: false,
        message: `${selectedSource}: ${error.message}`,
        timestamp: new Date(),
      });
    } else if (data) {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }
      
      addResult({
        type: "trigger",
        success: data.success,
        message: data.message,
        timestamp: new Date(),
        details: data.results,
      });
    }
    
    setLoading(prev => ({ ...prev, triggerSingle: false }));
  };

  const handlePause = async () => {
    setLoading(prev => ({ ...prev, pause: true }));
    
    const { data, error } = await pauseIngestion();
    
    if (error) {
      toast.error(`Failed to pause: ${error.message}`);
      addResult({
        type: "pause",
        success: false,
        message: error.message || "Pause failed",
        timestamp: new Date(),
      });
    } else if (data) {
      toast.success(data.message);
      addResult({
        type: "pause",
        success: true,
        message: data.message,
        timestamp: new Date(),
      });
    }
    
    setLoading(prev => ({ ...prev, pause: false }));
  };

  const handleResume = async () => {
    setLoading(prev => ({ ...prev, resume: true }));
    
    const { data, error } = await resumeIngestion();
    
    if (error) {
      toast.error(`Failed to resume: ${error.message}`);
      addResult({
        type: "resume",
        success: false,
        message: error.message || "Resume failed",
        timestamp: new Date(),
      });
    } else if (data) {
      toast.success(data.message);
      addResult({
        type: "resume",
        success: true,
        message: data.message,
        timestamp: new Date(),
      });
    }
    
    setLoading(prev => ({ ...prev, resume: false }));
  };

  const handleClearCache = async () => {
    setLoading(prev => ({ ...prev, clear: true }));
    
    const { data, error } = await clearCache();
    
    if (error) {
      toast.error(`Failed to clear cache: ${error.message}`);
      addResult({
        type: "clear",
        success: false,
        message: error.message || "Clear cache failed",
        timestamp: new Date(),
      });
    } else if (data) {
      toast.success(data.message);
      addResult({
        type: "clear",
        success: true,
        message: data.message,
        timestamp: new Date(),
      });
    }
    
    setLoading(prev => ({ ...prev, clear: false }));
  };

  const getActionIcon = (type: ActionResult["type"]) => {
    switch (type) {
      case "trigger":
        return <Play className="w-4 h-4" />;
      case "pause":
        return <Pause className="w-4 h-4" />;
      case "resume":
        return <PlayCircle className="w-4 h-4" />;
      case "clear":
        return <Trash2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8" />
            Manual Controls
          </h1>
          <p className="text-muted-foreground mt-1">
            Trigger, pause, or resume the ingestion pipeline
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-4">
          {/* Trigger All Sources */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-500" />
                  Trigger Ingestion (All Sources)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Run ingestion for all active sources immediately
                </p>
              </div>
              <Button
                onClick={handleTriggerAll}
                disabled={loading.triggerAll}
                size="lg"
              >
                {loading.triggerAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Trigger All
              </Button>
            </div>
          </Card>

          {/* Trigger Single Source */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-500" />
                  Trigger Ingestion (Single Source)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Run ingestion for a specific source
                </p>
                <div className="mt-3">
                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Select a source...</SelectItem>
                      {sources.map(source => (
                        <SelectItem key={source.source_key} value={source.source_key}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleTriggerSingle}
                disabled={loading.triggerSingle || selectedSource === "all"}
                size="lg"
                variant="secondary"
              >
                {loading.triggerSingle ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Trigger Source
              </Button>
            </div>
          </Card>

          {/* Pause/Resume */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Pause className="w-5 h-5 text-yellow-500" />
                  Pause / Resume Ingestion
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Stop or start the automated ingestion pipeline
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePause}
                  disabled={loading.pause}
                  variant="outline"
                  className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                >
                  {loading.pause ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Pause className="w-4 h-4 mr-2" />
                  )}
                  Pause
                </Button>
                <Button
                  onClick={handleResume}
                  disabled={loading.resume}
                  variant="outline"
                  className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                >
                  {loading.resume ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4 mr-2" />
                  )}
                  Resume
                </Button>
              </div>
            </div>
          </Card>

          {/* Clear Cache */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-orange-500" />
                  Clear Feed Cache
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Remove expired cache entries (safe operation)
                </p>
              </div>
              <Button
                onClick={handleClearCache}
                disabled={loading.clear}
                variant="outline"
              >
                {loading.clear ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Clear Cache
              </Button>
            </div>
          </Card>
        </div>

        {/* Results Log */}
        {results.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Recent Actions</h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-red-500/5 border-red-500/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={result.success ? "text-green-500" : "text-red-500"}>
                        {result.success ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {result.type.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">{result.message}</span>
                        </div>
                        {result.details && result.details.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {result.details.map((detail, i) => (
                              <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                                <span className="font-mono">{detail.source_key}</span>
                                <Badge
                                  variant={
                                    detail.status === "success"
                                      ? "default"
                                      : detail.status === "failed" || detail.status === "error"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {detail.status}
                                </Badge>
                                {detail.items_created > 0 && (
                                  <span>+{detail.items_created} items</span>
                                )}
                                {detail.error && (
                                  <span className="text-red-400 truncate max-w-[200px]">
                                    {detail.error}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminActions;
