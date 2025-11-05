import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAutoUpdateScores = () => {
  useEffect(() => {
    console.log('🔄 Setting up auto updates for sports and music data...');

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

    // Validate sports data with alternative APIs
    const validateSportsData = async () => {
      try {
        console.log('🔍 Cross-validating sports data...');
        const { data, error } = await supabase.functions.invoke('validate-sports-data');
        
        if (error) {
          console.error('Error validating sports data:', error);
          return;
        }

        console.log(`✅ Validated ${data?.validated || 0} teams`);
      } catch (err) {
        console.error('Failed to validate sports data:', err);
      }
    };

    // Fetch artist data from Last.fm
    const fetchArtistData = async () => {
      try {
        console.log('🎵 Fetching artist data...');
        const { data, error } = await supabase.functions.invoke('fetch-artist-data');
        
        if (error) {
          console.error('Error fetching artist data:', error);
          return;
        }

        console.log(`✅ Updated ${data?.updated || 0} artists`);
      } catch (err) {
        console.error('Failed to fetch artist data:', err);
      }
    };

    // Fetch music news
    const fetchMusicNews = async () => {
      try {
        console.log('📰 Fetching music news...');
        const { data, error } = await supabase.functions.invoke('fetch-music-news');
        
        if (error) {
          console.error('Error fetching music news:', error);
          return;
        }

        console.log(`✅ Updated news for ${data?.updated || 0} artists`);
      } catch (err) {
        console.error('Failed to fetch music news:', err);
      }
    };

    // Fetch team news and comprehensive updates
    const fetchTeamNews = async () => {
      try {
        console.log('📰 Fetching team news and updates...');
        const { data, error } = await supabase.functions.invoke('fetch-team-news');
        
        if (error) {
          console.error('Error fetching team news:', error);
          return;
        }

        console.log(`✅ Updated news for ${data?.updated || 0} teams`);
      } catch (err) {
        console.error('Failed to fetch team news:', err);
      }
    };

    // Initial sync and updates
    syncSportsData();
    updateScores();
    fetchArtistData();
    fetchMusicNews();
    fetchTeamNews();

    // Sync sports data every hour
    const syncInterval = setInterval(syncSportsData, 60 * 60 * 1000);

    // Update live scores every 2 minutes
    const updateInterval = setInterval(updateScores, 2 * 60 * 1000);

    // Validate sports data every 3 hours
    const validateInterval = setInterval(validateSportsData, 3 * 60 * 60 * 1000);

    // Fetch artist data every 2 hours
    const artistInterval = setInterval(fetchArtistData, 2 * 60 * 60 * 1000);

    // Fetch music news every hour
    const newsInterval = setInterval(fetchMusicNews, 60 * 60 * 1000);

    // Fetch team news every 2 hours (comprehensive: news, injuries, standings)
    const teamNewsInterval = setInterval(fetchTeamNews, 2 * 60 * 60 * 1000);

    return () => {
      console.log('Cleaning up data sync intervals');
      clearInterval(syncInterval);
      clearInterval(updateInterval);
      clearInterval(validateInterval);
      clearInterval(artistInterval);
      clearInterval(newsInterval);
      clearInterval(teamNewsInterval);
    };
  }, []);
};
