import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAutoUpdateScores = () => {
  useEffect(() => {
    console.log('🔴 Setting up auto score updates...');

    // Update scores every 30 seconds
    const updateScores = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('update-live-scores');
        
        if (error) {
          console.error('Error updating scores:', error);
          return;
        }

        if (data?.updated > 0) {
          console.log(`✅ Updated ${data.updated} live scores`);
        }
      } catch (err) {
        console.error('Failed to update scores:', err);
      }
    };

    // Initial update
    updateScores();

    // Set up interval (every 30 seconds)
    const interval = setInterval(updateScores, 30000);

    return () => {
      console.log('Cleaning up score updates');
      clearInterval(interval);
    };
  }, []);
};
