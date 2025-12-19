import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, ArrowLeft, RefreshCw, Database, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { getSources, toggleSource, type SourceHealth } from "@/lib/adminApi";

type SourceStatus = "active" | "disabled" | "error";

function getSourceStatus(source: SourceHealth): SourceStatus {
  if (!source.is_active) return "disabled";
  if (source.health?.consecutive_failures && source.health.consecutive_failures > 0) return "error";
  if (source.health?.last_error_at && source.health?.last_success_at) {
    if (new Date(source.health.last_error_at) > new Date(source.health.last_success_at)) {
      return "error";
    }
  }
  return "active";
}

function StatusBadge({ status }: { status: SourceStatus }) {
  switch (status) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    case "disabled":
      return (
        <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Disabled
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
  }
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const AdminSources = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const fetchSources = async () => {
    setLoading(true);
    const { data, error } = await getSources();
    
    if (error) {
      toast.error(`Failed to load sources: ${error.message}`);
      console.error("Sources fetch error:", error);
    } else if (data) {
      setSources(data.sources);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleToggle = async (source: SourceHealth) => {
    const newState = !source.is_active;
    setToggling(prev => ({ ...prev, [source.source_key]: true }));
    
    const { data, error } = await toggleSource(source.source_key, newState);
    
    if (error) {
      toast.error(`Failed to toggle ${source.name}: ${error.message}`);
    } else if (data) {
      toast.success(`${source.name} ${newState ? "enabled" : "disabled"}`);
      // Update local state
      setSources(prev =>
        prev.map(s =>
          s.source_key === source.source_key
            ? { ...s, is_active: newState }
            : s
        )
      );
    }
    
    setToggling(prev => ({ ...prev, [source.source_key]: false }));
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="w-8 h-8" />
              Source Control Panel
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage content sources and view their health status
            </p>
          </div>
          <Button onClick={fetchSources} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Sources</p>
            <p className="text-2xl font-bold">{sources.length}</p>
          </Card>
          <Card className="p-4 bg-green-500/10">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-500">
              {sources.filter(s => getSourceStatus(s) === "active").length}
            </p>
          </Card>
          <Card className="p-4 bg-gray-500/10">
            <p className="text-sm text-muted-foreground">Disabled</p>
            <p className="text-2xl font-bold text-gray-400">
              {sources.filter(s => getSourceStatus(s) === "disabled").length}
            </p>
          </Card>
          <Card className="p-4 bg-red-500/10">
            <p className="text-sm text-muted-foreground">Errors</p>
            <p className="text-2xl font-bold text-red-500">
              {sources.filter(s => getSourceStatus(s) === "error").length}
            </p>
          </Card>
        </div>

        {/* Sources Table */}
        <Card className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No content sources configured
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Source Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead className="text-right">Items Created</TableHead>
                  <TableHead>Error Reason</TableHead>
                  <TableHead className="text-right">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map(source => {
                  const status = getSourceStatus(source);
                  return (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {source.source_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell>
                        {formatTimestamp(source.health?.last_success_at || null)}
                      </TableCell>
                      <TableCell className="text-right">
                        {source.health?.items_generated_last_run ?? 0}
                      </TableCell>
                      <TableCell>
                        {source.health?.last_error_reason ? (
                          <span className="text-xs text-red-400 max-w-[200px] truncate block">
                            {source.health.last_error_reason}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={source.is_active}
                          onCheckedChange={() => handleToggle(source)}
                          disabled={toggling[source.source_key]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminSources;
