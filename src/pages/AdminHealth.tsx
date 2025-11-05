import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, RefreshCw, Activity, AlertCircle, CheckCircle, Database, Radio, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SyncStatus {
  function: string;
  status: 'success' | 'error' | 'running';
  lastRun?: string;
  message?: string;
  details?: any;
}

const AdminHealth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [healthLogs, setHealthLogs] = useState<any[]>([]);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkUserRole();
    fetchHealthData();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in");
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      toast.error("Unauthorized access");
      navigate("/");
    }
  };

  const fetchHealthData = async () => {
    setLoading(true);
    
    // Fetch health logs
    const { data: logs } = await supabase
      .from('fluxa_health_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    setHealthLogs(logs || []);

    // Fetch match results
    const { data: matches } = await supabase
      .from('match_results')
      .select('*')
      .order('match_date', { ascending: false })
      .limit(100);
    
    setMatchResults(matches || []);

    // Fetch entities with match data
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
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;

      toast.success(`✅ ${functionName} completed`, {
        description: data?.message || 'Sync successful'
      });

      fetchHealthData();
    } catch (err: any) {
      toast.error(`❌ ${functionName} failed`, {
        description: err.message
      });
    } finally {
      setRefreshing(prev => ({ ...prev, [functionName]: false }));
    }
  };

  const refreshEntityData = async (entityId: string, entityName: string) => {
    setRefreshing(prev => ({ ...prev, [entityId]: true }));
    toast.loading(`Refreshing ${entityName} data...`);

    try {
      await supabase.functions.invoke('update-live-scores');
      toast.success(`✅ ${entityName} refreshed`);
      fetchHealthData();
    } catch (err: any) {
      toast.error(`❌ Failed to refresh ${entityName}`);
    } finally {
      setRefreshing(prev => ({ ...prev, [entityId]: false }));
    }
  };

  const getMatchStats = () => {
    const total = matchResults.length;
    const live = matchResults.filter(m => m.status === 'InProgress' || m.status === 'Halftime').length;
    const scheduled = matchResults.filter(m => m.status === 'Scheduled' || m.status === 'Not Started').length;
    const completed = matchResults.filter(m => m.status === 'FullTime' || m.status === 'Finished').length;

    return { total, live, scheduled, completed };
  };

  const stats = getMatchStats();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/admin")}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="w-8 h-8" />
              API Monitoring Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage sports data synchronization
            </p>
          </div>
          <Button onClick={fetchHealthData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Matches</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Database className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-4 bg-red-500/10 border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live Matches</p>
                <p className="text-2xl font-bold text-red-500">{stats.live}</p>
              </div>
              <Radio className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
          </Card>

          <Card className="p-4 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-500">{stats.scheduled}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="sync" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sync">Sync Functions</TabsTrigger>
            <TabsTrigger value="entities">Teams ({entities.length})</TabsTrigger>
            <TabsTrigger value="matches">Matches ({matchResults.length})</TabsTrigger>
            <TabsTrigger value="logs">Logs ({healthLogs.length})</TabsTrigger>
          </TabsList>

          {/* Sync Functions Tab */}
          <TabsContent value="sync" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-bold mb-4">Manual Sync Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-bold mb-2">Sync Sports Data</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Fetch latest match data from SportsData API (past 7 days + next 14 days)
                  </p>
                  <Button 
                    onClick={() => triggerSync('sync-sports-data')}
                    disabled={refreshing['sync-sports-data']}
                    className="w-full"
                  >
                    {refreshing['sync-sports-data'] ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    Sync Match Data
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-bold mb-2">Update Live Scores</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update all team pages with latest match information
                  </p>
                  <Button 
                    onClick={() => triggerSync('update-live-scores')}
                    disabled={refreshing['update-live-scores']}
                    className="w-full"
                  >
                    {refreshing['update-live-scores'] ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Update Scores
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Entities Tab */}
          <TabsContent value="entities" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-bold mb-4">Sports Teams</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {entities.map(entity => (
                  <div key={entity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      {entity.logo_url && (
                        <img src={entity.logo_url} alt={entity.name} className="w-10 h-10 rounded-full object-contain bg-white" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold">{entity.name}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {entity.stats?.league || 'Unknown'}
                          </Badge>
                          {entity.current_match && (
                            <Badge variant="destructive" className="text-xs">🔴 LIVE</Badge>
                          )}
                          {entity.next_match && (
                            <Badge variant="outline" className="text-xs">
                              Next: {new Date(entity.next_match.date).toLocaleDateString()}
                            </Badge>
                          )}
                          {entity.last_match && (
                            <Badge variant="outline" className="text-xs">
                              Last: {entity.last_match.home_score}-{entity.last_match.away_score}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => refreshEntityData(entity.id, entity.name)}
                      disabled={refreshing[entity.id]}
                    >
                      {refreshing[entity.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Match Results Tab */}
          <TabsContent value="matches" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-bold mb-4">Recent Match Results</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {matchResults.map(match => (
                  <div key={match.id} className="p-3 border rounded-lg flex items-center justify-between text-sm hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <p className="font-bold">{match.team_home} vs {match.team_away}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{match.league}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(match.match_date).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-center px-4">
                      {match.score_home !== null && match.score_away !== null ? (
                        <p className="font-bold text-lg">{match.score_home} - {match.score_away}</p>
                      ) : (
                        <p className="text-muted-foreground">-</p>
                      )}
                    </div>
                    <Badge variant={
                      match.status === 'InProgress' || match.status === 'Halftime' ? 'destructive' :
                      match.status === 'Scheduled' || match.status === 'Not Started' ? 'secondary' :
                      'outline'
                    }>
                      {match.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Health Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-bold mb-4">System Health Logs</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {healthLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No health logs available</p>
                ) : (
                  healthLogs.map(log => (
                    <div key={log.id} className="p-3 border rounded-lg flex items-start gap-3 text-sm">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold">{log.component}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="mb-2">
                          {log.status}
                        </Badge>
                        {log.details && (
                          <pre className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminHealth;
