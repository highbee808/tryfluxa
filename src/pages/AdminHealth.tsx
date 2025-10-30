import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Activity, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { NavigationBar } from "@/components/NavigationBar";

interface HealthCheck {
  name: string;
  status: "✅ OK" | "⚠️ Warning" | "❌ Failed";
  details: string;
  timestamp: string;
  latency?: number;
}

interface HealthCheckResponse {
  timestamp: string;
  healthPercentage: number;
  totalChecks: number;
  passedChecks: number;
  results: HealthCheck[];
}

export default function AdminHealth() {
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fluxa-health-check");

      if (error) throw error;

      setHealthData(data);
      
      toast({
        title: "Health Check Complete",
        description: `${data.passedChecks}/${data.totalChecks} systems operational`,
      });
    } catch (error) {
      console.error("Health check failed:", error);
      toast({
        title: "Health Check Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status.includes("✅")) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status.includes("⚠️")) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status.includes("✅")) return "border-green-500/20 bg-green-500/5";
    if (status.includes("⚠️")) return "border-yellow-500/20 bg-yellow-500/5";
    return "border-red-500/20 bg-red-500/5";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-20">
      <NavigationBar />
      
      <div className="container max-w-5xl mx-auto px-4 pt-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              Fluxa System Health
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor all critical systems and integrations
            </p>
          </div>
          
          <Button
            onClick={runHealthCheck}
            disabled={loading}
            size="lg"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Running Tests..." : "Run Health Check"}
          </Button>
        </div>

        {healthData && (
          <>
            {/* Overall Health Card */}
            <Card className="mb-6 border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Overall System Health</CardTitle>
                <CardDescription>
                  Last checked: {new Date(healthData.timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - healthData.healthPercentage / 100)}`}
                        className={`${
                          healthData.healthPercentage >= 80
                            ? "text-green-500"
                            : healthData.healthPercentage >= 60
                            ? "text-yellow-500"
                            : "text-red-500"
                        } transition-all duration-1000`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">{healthData.healthPercentage}%</span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Checks</p>
                        <p className="text-2xl font-bold">{healthData.totalChecks}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Passed</p>
                        <p className="text-2xl font-bold text-green-500">{healthData.passedChecks}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-500">
                          {healthData.totalChecks - healthData.passedChecks}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual System Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {healthData.results.map((check, index) => (
                <Card
                  key={index}
                  className={`border-2 transition-all ${getStatusColor(check.status)}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(check.status)}
                        <CardTitle className="text-lg">{check.name}</CardTitle>
                      </div>
                      <span className="text-sm font-medium">{check.status}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{check.details}</p>
                    {check.latency && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Response time: {check.latency}ms
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {!healthData && (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Activity className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-2">No health check data yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Run your first health check to see system status
              </p>
              <Button onClick={runHealthCheck} disabled={loading} size="lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Initial Health Check
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
