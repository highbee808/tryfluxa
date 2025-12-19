import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  Activity,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Zap,
  TrendingUp,
} from "lucide-react";
import { getOverview, getFeedStatus, type OverviewResponse, type FeedStatusResponse } from "@/lib/adminApi";

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function getFreshnessStatus(timestamp: string | null): {
  status: "fresh" | "stale" | "critical";
  label: string;
  color: string;
} {
  if (!timestamp) {
    return { status: "critical", label: "No Data", color: "text-red-500" };
  }
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / 3600000;
  
  if (diffHours < 1) {
    return { status: "fresh", label: "Fresh", color: "text-green-500" };
  } else if (diffHours < 6) {
    return { status: "fresh", label: "Good", color: "text-green-400" };
  } else if (diffHours < 24) {
    return { status: "stale", label: "Stale", color: "text-yellow-500" };
  } else {
    return { status: "critical", label: "Critical", color: "text-red-500" };
  }
}

const AdminStatus = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewResponse["overview"] | null>(null);
  const [feedStatus, setFeedStatus] = useState<FeedStatusResponse | null>(null);

  const fetchData = async () => {
    setLoading(true);
    
    const [overviewResult, feedResult] = await Promise.all([
      getOverview(),
      getFeedStatus(),
    ]);
    
    if (overviewResult.error) {
      toast.error(`Failed to load overview: ${overviewResult.error.message}`);
    } else if (overviewResult.data) {
      setOverview(overviewResult.data.overview);
    }
    
    if (feedResult.error) {
      console.error("Feed status error:", feedResult.error);
    } else if (feedResult.data) {
      setFeedStatus(feedResult.data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const freshness = getFreshnessStatus(feedStatus?.lastIngestionAt || null);

  // Calculate items in last 24h from overview
  const itemsLast24h = overview?.last_cron_window?.total_items_created || 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="w-8 h-8" />
              Feed Health Status
            </h1>
            <p className="text-muted-foreground mt-1">
              Pipeline overview and feed freshness at a glance
            </p>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Primary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Active Sources */}
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Database className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Sources</p>
                    <p className="text-3xl font-bold">
                      {overview?.source_counts?.active || feedStatus?.activeSourceCount || 0}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Last Ingestion */}
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Clock className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Ingestion</p>
                    <p className="text-xl font-bold">
                      {formatRelativeTime(feedStatus?.lastIngestionAt || null)}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Items Created (Last Run) */}
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <TrendingUp className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Items (Last Run)</p>
                    <p className="text-3xl font-bold">{itemsLast24h}</p>
                  </div>
                </div>
              </Card>

              {/* Feed Freshness */}
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    freshness.status === "fresh" ? "bg-green-500/10" :
                    freshness.status === "stale" ? "bg-yellow-500/10" :
                    "bg-red-500/10"
                  }`}>
                    {freshness.status === "fresh" ? (
                      <CheckCircle className={`w-6 h-6 ${freshness.color}`} />
                    ) : freshness.status === "stale" ? (
                      <AlertCircle className={`w-6 h-6 ${freshness.color}`} />
                    ) : (
                      <XCircle className={`w-6 h-6 ${freshness.color}`} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Feed Freshness</p>
                    <p className={`text-xl font-bold ${freshness.color}`}>
                      {freshness.label}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Source Health Summary */}
            {overview?.source_counts && (
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Source Health Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{overview.source_counts.total}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10">
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-500">{overview.source_counts.active}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-500/10">
                    <p className="text-sm text-muted-foreground">Inactive</p>
                    <p className="text-2xl font-bold text-gray-400">{overview.source_counts.inactive}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10">
                    <p className="text-sm text-muted-foreground">Healthy</p>
                    <p className="text-2xl font-bold text-green-500">{overview.source_counts.healthy}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10">
                    <p className="text-sm text-muted-foreground">Unhealthy</p>
                    <p className="text-2xl font-bold text-red-500">{overview.source_counts.unhealthy}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Last Cron Window */}
            {overview?.last_cron_window && (
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Last Cron Run
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Started At</p>
                    <p className="text-sm font-medium">
                      {formatRelativeTime(overview.last_cron_window.started_at)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Processed</p>
                    <p className="text-2xl font-bold">{overview.last_cron_window.sources_processed}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10">
                    <p className="text-sm text-muted-foreground">Succeeded</p>
                    <p className="text-2xl font-bold text-green-500">
                      {overview.last_cron_window.sources_succeeded}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10">
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold text-red-500">
                      {overview.last_cron_window.sources_failed}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-500/10">
                    <p className="text-sm text-muted-foreground">Skipped</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {overview.last_cron_window.sources_skipped}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Recent Runs */}
            {overview?.recent_runs && overview.recent_runs.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Completed Runs
                </h3>
                <div className="space-y-2">
                  {overview.recent_runs.map((run, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {run.source_key}
                        </code>
                        <Badge
                          variant={
                            run.status === "completed"
                              ? "default"
                              : run.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {run.status}
                        </Badge>
                        {run.items_created > 0 && (
                          <span className="text-sm text-muted-foreground">
                            +{run.items_created} items
                          </span>
                        )}
                        {run.skipped_reason && (
                          <span className="text-xs text-yellow-500">
                            ({run.skipped_reason})
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(run.completed_at)}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => navigate("/admin/runs")}
                >
                  View All Runs
                </Button>
              </Card>
            )}

            {/* Per-Source Item Counts */}
            {feedStatus?.sources && feedStatus.sources.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Items by Source (Last 7 Days)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {feedStatus.sources.map(source => (
                    <div
                      key={source.source_key}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        {source.is_active ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="font-medium">{source.name}</span>
                      </div>
                      <Badge variant="outline">{source.item_count} items</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminStatus;
