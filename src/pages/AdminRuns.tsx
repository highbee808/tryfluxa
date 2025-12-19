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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Loader2, ArrowLeft, RefreshCw, Activity, ChevronDown, ChevronRight } from "lucide-react";
import { getRuns, getSources, type RunResponse, type SourceHealth } from "@/lib/adminApi";

type RunStatus = "completed" | "failed" | "skipped" | "running" | "no_adapter";

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
    case "success":
      return "default";
    case "failed":
    case "error":
      return "destructive";
    case "skipped":
    case "no_adapter":
      return "secondary";
    case "running":
      return "outline";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string, skippedReason: string | null): string {
  if (status === "skipped" && skippedReason) {
    return `Skipped (${skippedReason})`;
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const durationMs = end - start;
  
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60000).toFixed(1)}m`;
}

const AdminRuns = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Filters
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch sources for filter dropdown
    const sourcesResult = await getSources();
    if (sourcesResult.data) {
      setSources(sourcesResult.data.sources);
    }
    
    // Fetch runs with filters
    const params: { source_key?: string; status?: string; limit?: number } = {
      limit: 50,
    };
    if (sourceFilter !== "all") params.source_key = sourceFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    
    const runsResult = await getRuns(params);
    
    if (runsResult.error) {
      toast.error(`Failed to load runs: ${runsResult.error.message}`);
      console.error("Runs fetch error:", runsResult.error);
    } else if (runsResult.data) {
      setRuns(runsResult.data.runs);
      setTotal(runsResult.data.total);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [sourceFilter, statusFilter]);

  const toggleRow = (runId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
    { value: "skipped", label: "Skipped" },
    { value: "running", label: "Running" },
  ];

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
              <Activity className="w-8 h-8" />
              Ingestion Runs
            </h1>
            <p className="text-muted-foreground mt-1">
              View recent ingestion runs and debug failures
            </p>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Source:</span>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map(source => (
                    <SelectItem key={source.source_key} value={source.source_key}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground self-center">
              Showing {runs.length} of {total} runs
            </span>
          </div>
        </Card>

        {/* Runs Table */}
        <Card className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No ingestion runs found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items Created</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Started At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map(run => {
                  const hasError = run.error_message || run.skipped_reason;
                  const isExpanded = expandedRows.has(run.id);
                  
                  return (
                    <Collapsible key={run.id} asChild open={isExpanded}>
                      <>
                        <TableRow 
                          className={hasError ? "cursor-pointer hover:bg-muted/50" : ""}
                          onClick={() => hasError && toggleRow(run.id)}
                        >
                          <TableCell>
                            {hasError && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {run.id.slice(0, 8)}...
                            </code>
                          </TableCell>
                          <TableCell className="font-medium">{run.source_name}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(run.status)}>
                              {getStatusLabel(run.status, run.skipped_reason)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{run.items_created}</TableCell>
                          <TableCell className="text-right">
                            {formatDuration(run.started_at, run.completed_at)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatTimestamp(run.started_at)}
                          </TableCell>
                        </TableRow>
                        {hasError && (
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={7} className="py-4">
                                <div className="space-y-2 px-4">
                                  {run.error_message && (
                                    <div>
                                      <span className="text-sm font-medium text-red-500">Error: </span>
                                      <span className="text-sm text-muted-foreground">
                                        {run.error_message}
                                      </span>
                                    </div>
                                  )}
                                  {run.skipped_reason && (
                                    <div>
                                      <span className="text-sm font-medium text-yellow-500">Skipped Reason: </span>
                                      <span className="text-sm text-muted-foreground">
                                        {run.skipped_reason}
                                      </span>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-3 gap-4 text-sm mt-2 pt-2 border-t">
                                    <div>
                                      <span className="text-muted-foreground">Fetched: </span>
                                      <span>{run.items_fetched}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Skipped: </span>
                                      <span>{run.items_skipped}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Updated: </span>
                                      <span>{run.items_updated}</span>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        )}
                      </>
                    </Collapsible>
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

export default AdminRuns;
