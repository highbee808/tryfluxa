import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminFunction } from "@/lib/invokeAdminFunction";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Loader2, RefreshCw, Activity, AlertCircle, CheckCircle, Database, Radio, ArrowLeft, Shield, Music, Newspaper } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminHealth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [monitorLogs, setMonitorLogs] = useState<any[]>([]);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    
    const { data: monLogs } = await supabase
      .from('data_monitor_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    setMonitorLogs(monLogs || []);

    const { data: matches } = await supabase
      .from('match_results')
      .select('*')
      .order('match_date', { ascending: false })
      .limit(100);
    
    setMatchResults(matches || []);

    const { data: entitiesData } = await supabase
      .from('fan_entities')
      .select('*')
      .eq('category', 'sports')
      .order('name');
    
    setEntities(entitiesData || []);
    setLoading(false);
  };

  const triggerSync = async (functionName: string) => {
    setRefreshing(prev => ({ ...prev, [functionName]: true }));
    toast.loading(`Triggering ${functionName}...`);

    try {
      const { data, error } = await invokeAdminFunction(functionName, {});
      if (error) throw new Error(error.message || 'Function failed');
      toast.success(`✅ ${functionName} completed`);
      fetchHealthData();
    } catch (err: any) {
      toast.error(`❌ ${functionName} failed`);
    } finally {
      setRefreshing(prev => ({ ...prev, [functionName]: false }));
    }
  };

  const monitorStats = {
    total: monitorLogs.length,
    autoFixed: monitorLogs.filter(l => l.auto_fixed).length,
    errors: monitorLogs.filter(l => l.severity === 'error' || l.severity === 'critical').length,
    warnings: monitorLogs.filter(l => l.severity === 'warning').length
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="w-8 h-8" />
              Data Consistency Monitor
            </h1>
          </div>
          <Button onClick={fetchHealthData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Checks</p>
            <p className="text-2xl font-bold">{monitorStats.total}</p>
          </Card>
          <Card className="p-4 bg-green-500/10">
            <p className="text-sm text-muted-foreground">Auto-Fixed</p>
            <p className="text-2xl font-bold text-green-500">{monitorStats.autoFixed}</p>
          </Card>
          <Card className="p-4 bg-yellow-500/10">
            <p className="text-sm text-muted-foreground">Warnings</p>
            <p className="text-2xl font-bold text-yellow-500">{monitorStats.warnings}</p>
          </Card>
          <Card className="p-4 bg-red-500/10">
            <p className="text-sm text-muted-foreground">Errors</p>
            <p className="text-2xl font-bold text-red-500">{monitorStats.errors}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-bold mb-4">Data Sync & Validation Controls</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <Button 
              onClick={() => triggerSync('data-consistency-monitor')} 
              disabled={refreshing['data-consistency-monitor']}
              variant="default"
            >
              {refreshing['data-consistency-monitor'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
              Sports Data Monitor
            </Button>

            <Button 
              onClick={() => triggerSync('validate-sports-data')} 
              disabled={refreshing['validate-sports-data']}
              variant="outline"
            >
              {refreshing['validate-sports-data'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Cross-Validate Sports
            </Button>

            <Button 
              onClick={() => triggerSync('fetch-artist-data')} 
              disabled={refreshing['fetch-artist-data']}
              variant="outline"
            >
              {refreshing['fetch-artist-data'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Music className="w-4 h-4 mr-2" />}
              Update Artist Data
            </Button>

            <Button 
              onClick={() => triggerSync('fetch-music-news')} 
              disabled={refreshing['fetch-music-news']}
              variant="outline"
            >
              {refreshing['fetch-music-news'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Newspaper className="w-4 h-4 mr-2" />}
              Fetch Music News
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Recent Monitor Logs</h4>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {monitorLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No logs yet. Run a monitor check to see results.</p>
              ) : (
                monitorLogs.map(log => (
                  <div key={log.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-bold">{log.entity_name || 'System'}</p>
                        <p className="text-sm text-muted-foreground">{log.issue_description}</p>
                        <p className="text-xs mt-1 text-muted-foreground">
                          <span className="font-semibold">Action:</span> {log.action_taken}
                          {log.auto_fixed && <Badge variant="outline" className="ml-2 text-green-500">Auto-Fixed</Badge>}
                        </p>
                      </div>
                      <Badge variant={
                        log.severity === 'critical' ? 'destructive' : 
                        log.severity === 'error' ? 'destructive' : 
                        log.severity === 'warning' ? 'secondary' : 
                        'outline'
                      }>
                        {log.severity}
                      </Badge>
                    </div>
                    <p className="text-xs mt-2 text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminHealth;
