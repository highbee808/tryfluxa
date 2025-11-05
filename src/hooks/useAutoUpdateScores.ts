import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAutoUpdateScores = () => {
  useEffect(() => {
    console.log('🔄 Setting up auto score updates and data sync...');

    // Sync comprehensive sports data every hour
    const syncSportsData = async () => {
      try {
        console.log('🔄 Syncing sports data from APIs...');
        const { data, error } = await supabase.functions.invoke('sync-sports-data');
        
        if (error) {
          console.error('Error syncing sports data:', error);
          return;
        }

        console.log(`✅ Synced ${data?.totalMatches || 0} matches`);
      } catch (err) {
        console.error('Failed to sync sports data:', err);
      }
    };

    // Update live scores frequently
    const updateScores = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('update-live-scores');
        
        if (error) {
          console.error('Error updating scores:', error);
          return;
        }

        if (data?.updated > 0) {
          console.log(`✅ Updated ${data.updated} team pages`);
        }
      } catch (err) {
        console.error('Failed to update scores:', err);
      }
    };

    // Initial sync and update
    syncSportsData();
    updateScores();

    // Sync sports data every hour
    const syncInterval = setInterval(syncSportsData, 60 * 60 * 1000);

    // Update live scores every 2 minutes
    const updateInterval = setInterval(updateScores, 2 * 60 * 1000);

    return () => {
      console.log('Cleaning up sports data sync');
      clearInterval(syncInterval);
      clearInterval(updateInterval);
    };
  }, []);
};
