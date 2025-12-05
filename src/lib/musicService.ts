/**
 * Music Service Layer
 * Abstracts music API calls and caching for cost efficiency
 */

import { supabase } from "@/integrations/supabase/client";

// Music API Provider Configuration
const MUSIC_API_PROVIDER = import.meta.env.VITE_MUSIC_API_PROVIDER || 'lastfm';
const MUSIC_API_KEY = import.meta.env.VITE_MUSIC_API_KEY || '';
const CACHE_TTL_HOURS = 12; // Refresh cache every 12 hours

export interface Artist {
  id: string;
  name: string;
  slug?: string;
  bio?: string;
  imageUrl?: string;
  genres?: string[];
  topTracks?: Track[];
  topAlbums?: Album[];
  stats?: {
    popularityScore?: number;
    fluxaRank?: number;
    engagementScore?: number;
    buzzScore?: number;
    // Legacy fields (for backward compatibility)
    monthlyListeners?: number;
    globalRank?: number;
    totalStreams?: number;
    debutYear?: number;
  };
  relatedArtists?: Artist[];
}

export type MusicArtist = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

export type ArtistSearchResult = {
  id: string;
  name: string;
  imageUrl?: string | null;
  genres?: string[];
  popularity?: number;
  source: "local" | "spotify";
};

const artistSearchCache = new Map<string, MusicArtist[]>();

export interface Track {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  album?: string;
  imageUrl?: string;
  duration?: number;
  publishedAt?: string;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  imageUrl?: string;
  year?: number;
  publishedAt?: string;
}

// New hybrid MusicItem type for Last.fm + curated fallback
export type MusicItem = {
  id: string;
  title: string; // track or release title
  artist: string; // primary artist
  imageUrl?: string | null;
  url?: string | null; // external URL (Last.fm or article)
  category: "trending" | "latest";
  source: "spotify" | "lastfm" | "curated";
  tags?: string[]; // e.g. ["Afrobeats", "Global", "K-Pop"]
  publishedAt?: string | null; // ISO string if available
};

// Legacy interface for backward compatibility (if needed elsewhere)
export interface LegacyMusicItem {
  id: string;
  type: 'track' | 'album' | 'news' | 'gossip';
  title: string;
  summary?: string;
  imageUrl?: string;
  artistId?: string;
  artistName?: string;
  genre?: string;
  publishedAt?: string;
}

/**
 * Get artwork URL for music item with Option B logic:
 * - Real API items (Spotify/Last.fm) → use real imageUrl
 * - Curated items → use curated fallback artwork by tag/genre
 * - Fallback → default music artwork
 */
export function getArtworkForMusicItem(item: MusicItem): string | undefined {
  // 1. If item has an explicit imageUrl (spotify or lastfm), use it
  if (item.imageUrl) {
    return item.imageUrl;
  }

  // 2. For curated items, choose a gradient SVG based on tags or category
  if (item.source === "curated") {
    const tags = (item.tags || []).map(t => t.toLowerCase());

    if (tags.includes("afrobeats") || tags.includes("afrobeat") || tags.includes("afropop") || tags.includes("naija")) {
      return "/img/music/artwork-afrobeats-1.svg";
    }
    if (tags.includes("hip-hop") || tags.includes("hiphop") || tags.includes("rap")) {
      return "/img/music/artwork-hiphop-1.svg";
    }
    if (tags.includes("pop")) {
      return "/img/music/artwork-pop-1.svg";
    }
    if (tags.includes("k-pop") || tags.includes("kpop")) {
      return "/img/music/artwork-kpop-1.svg";
    }
    if (tags.includes("amapiano")) {
      return "/img/music/artwork-amapiano-1.svg";
    }

    // 3. Fallback default curated art
    return "/img/music/artwork-curated-default.svg";
  }

  // 4. If no image and not curated, fall back to global music default
  return "/img/music/artwork-music-default.svg";
}

/**
 * Check if cache is stale
 */
function isCacheStale(lastRefreshedAt: string | null): boolean {
  if (!lastRefreshedAt) return true;
  const lastRefresh = new Date(lastRefreshedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= CACHE_TTL_HOURS;
}

/**
 * Fetch artist profile from Edge Function (Spotify + Last.fm hybrid)
 */
export async function fetchArtistProfile(artistId: string): Promise<Artist | null> {
  try {
    console.log(`[fetchArtistProfile] Starting fetch for: ${artistId}`);
    
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.error('[fetchArtistProfile] Missing Supabase credentials');
      return null;
    }

    // Call the new artist-profile Edge Function
    const url = `${SUPABASE_URL}/functions/v1/artist-profile`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'x-client-info': 'fluxa-frontend',
      },
      body: JSON.stringify({ artist: artistId }),
    });

    if (!response.ok) {
      console.error(`[fetchArtistProfile] Edge Function failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error(`[fetchArtistProfile] Edge Function error: ${data.error}`);
      return null;
    }

    // Map Edge Function response to Artist type
    const artist: Artist = {
      id: artistId,
      name: data.name || artistId,
      slug: artistId,
      bio: data.bio || undefined,
      imageUrl: data.imageUrl || undefined,
      genres: data.genres || [],
      topTracks: data.topTracks || [],
      topAlbums: data.topAlbums || [],
      stats: {
        popularityScore: data.popularityScore ?? 0,
        fluxaRank: data.fluxaRank ?? 999,
        engagementScore: data.engagementScore ?? 0,
        buzzScore: data.buzzScore ?? 0,
      },
      relatedArtists: [],
    };

    console.log(`[fetchArtistProfile] ✅ Successfully fetched Fluxa-native profile:`, {
      name: artist.name,
      hasImage: !!artist.imageUrl,
      genresCount: artist.genres.length,
      popularityScore: artist.stats?.popularityScore,
      fluxaRank: artist.stats?.fluxaRank,
    });

    return artist;
  } catch (error) {
    console.error('[fetchArtistProfile] Error:', error);
    return null;
  }
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(url: string, ms = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Get Last.fm API key from Edge Function (via Supabase)
 */
async function getLastFmData(artistName: string, method: string, params: Record<string, string> = {}): Promise<any> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (!SUPABASE_URL || !API_KEY) {
      console.warn("[getLastFmData] Missing Supabase config");
      return null;
    }

    // Call our Edge Function that proxies Last.fm API
    const endpoint = `${SUPABASE_URL}/functions/v1/fetch-artist-data`;
    
    const response = await fetchWithTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'apikey': API_KEY,
        },
        body: JSON.stringify({ 
          artist: artistName,
          method,
          ...params 
        }),
      }),
      4500
    );

    if (!response.ok) {
      console.warn(`[getLastFmData] ${method} returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`[getLastFmData] ${method} failed:`, err);
    return null;
  }
}

/**
 * Fetch Last.fm artist info via Edge Function
 */
async function fetchLastFmArtistInfo(artistName: string): Promise<any> {
  console.log(`[fetchLastFmArtistInfo] Fetching info for: ${artistName}`);
  
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (!SUPABASE_URL || !API_KEY) {
      console.warn("[fetchLastFmArtistInfo] Missing Supabase config");
      return null;
    }

    const endpoint = `${SUPABASE_URL}/functions/v1/fetch-artist-profile`;
    
    const response = await fetchWithTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'apikey': API_KEY,
        },
        body: JSON.stringify({ artist: artistName, method: 'getinfo' }),
      }),
      4500
    );
    
    if (!response.ok) {
      console.warn(`[fetchLastFmArtistInfo] HTTP ${response.status}`);
      return null;
    }

    const result = await response.json();
    
    if (result.error || !result.data) {
      console.warn(`[fetchLastFmArtistInfo] Error: ${result.error || 'No data'}`);
      return null;
    }

    const artist = result.data.artist;
    if (!artist) {
      console.warn(`[fetchLastFmArtistInfo] No artist data in response`);
      return null;
    }

    console.log(`[fetchLastFmArtistInfo] ✅ Success for: ${artistName}`);
    return artist;
  } catch (err) {
    console.error(`[fetchLastFmArtistInfo] Error:`, err);
    return null;
  }
}

/**
 * Fetch Last.fm top tracks via Edge Function
 */
async function fetchLastFmTopTracks(artistName: string, limit = 5): Promise<Track[]> {
  console.log(`[fetchLastFmTopTracks] Fetching top tracks for: ${artistName}`);
  
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (!SUPABASE_URL || !API_KEY) {
      console.warn("[fetchLastFmTopTracks] Missing Supabase config");
      return [];
    }

    const endpoint = `${SUPABASE_URL}/functions/v1/fetch-artist-profile`;
    
    const response = await fetchWithTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'apikey': API_KEY,
        },
        body: JSON.stringify({ artist: artistName, method: 'gettoptracks', limit }),
      }),
      4500
    );
    
    if (!response.ok) {
      console.warn(`[fetchLastFmTopTracks] HTTP ${response.status}`);
      return [];
    }

    const result = await response.json();
    
    if (result.error || !result.data) {
      console.warn(`[fetchLastFmTopTracks] Error: ${result.error || 'No data'}`);
      return [];
    }

    const data = result.data;
    if (!data.toptracks?.track) {
      console.warn(`[fetchLastFmTopTracks] No tracks found`);
      return [];
    }

    const tracks = Array.isArray(data.toptracks.track) ? data.toptracks.track : [data.toptracks.track];
    
    const mappedTracks: Track[] = tracks.slice(0, limit).map((track: any, index: number) => {
      const imageUrl = track.image?.find((img: any) => img.size === 'large' || img.size === 'extralarge')?.['#text'] ||
                      track.image?.find((img: any) => img.size === 'medium')?.['#text'] ||
                      null;

      return {
        id: track.mbid || `${artistName}-track-${index}`,
        name: track.name || '',
        artist: artistName,
        artistId: artistName.toLowerCase().replace(/\s+/g, '-'),
        album: undefined,
        imageUrl: imageUrl,
        duration: undefined,
        publishedAt: undefined,
      };
    });

    console.log(`[fetchLastFmTopTracks] ✅ Found ${mappedTracks.length} tracks`);
    return mappedTracks;
  } catch (err) {
    console.error(`[fetchLastFmTopTracks] Error:`, err);
    return [];
  }
}

/**
 * Fetch Last.fm top albums via Edge Function
 */
async function fetchLastFmTopAlbums(artistName: string, limit = 6): Promise<Album[]> {
  console.log(`[fetchLastFmTopAlbums] Fetching top albums for: ${artistName}`);
  
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (!SUPABASE_URL || !API_KEY) {
      console.warn("[fetchLastFmTopAlbums] Missing Supabase config");
      return [];
    }

    const endpoint = `${SUPABASE_URL}/functions/v1/fetch-artist-profile`;
    
    const response = await fetchWithTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'apikey': API_KEY,
        },
        body: JSON.stringify({ artist: artistName, method: 'gettopalbums', limit }),
      }),
      4500
    );
    
    if (!response.ok) {
      console.warn(`[fetchLastFmTopAlbums] HTTP ${response.status}`);
      return [];
    }

    const result = await response.json();
    
    if (result.error || !result.data) {
      console.warn(`[fetchLastFmTopAlbums] Error: ${result.error || 'No data'}`);
      return [];
    }

    const data = result.data;
    if (!data.topalbums?.album) {
      console.warn(`[fetchLastFmTopAlbums] No albums found`);
      return [];
    }

    const albums = Array.isArray(data.topalbums.album) ? data.topalbums.album : [data.topalbums.album];
    
    const mappedAlbums: Album[] = albums.slice(0, limit).map((album: any, index: number) => {
      const imageUrl = album.image?.find((img: any) => img.size === 'large' || img.size === 'extralarge')?.['#text'] ||
                      album.image?.find((img: any) => img.size === 'medium')?.['#text'] ||
                      null;

      return {
        id: album.mbid || `${artistName}-album-${index}`,
        name: album.name || '',
        artist: artistName,
        artistId: artistName.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: imageUrl,
        year: undefined,
        publishedAt: undefined,
      };
    });

    console.log(`[fetchLastFmTopAlbums] ✅ Found ${mappedAlbums.length} albums`);
    return mappedAlbums;
  } catch (err) {
    console.error(`[fetchLastFmTopAlbums] Error:`, err);
    return [];
  }
}

/**
 * Fetch Last.fm similar artists via Edge Function
 */
async function fetchLastFmSimilarArtists(artistName: string, limit = 5): Promise<Artist[]> {
  console.log(`[fetchLastFmSimilarArtists] Fetching similar artists for: ${artistName}`);
  
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (!SUPABASE_URL || !API_KEY) {
      console.warn("[fetchLastFmSimilarArtists] Missing Supabase config");
      return [];
    }

    const endpoint = `${SUPABASE_URL}/functions/v1/fetch-artist-profile`;
    
    const response = await fetchWithTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'apikey': API_KEY,
        },
        body: JSON.stringify({ artist: artistName, method: 'getsimilar', limit }),
      }),
      4500
    );
    
    if (!response.ok) {
      console.warn(`[fetchLastFmSimilarArtists] HTTP ${response.status}`);
      return [];
    }

    const result = await response.json();
    
    if (result.error || !result.data) {
      console.warn(`[fetchLastFmSimilarArtists] Error: ${result.error || 'No data'}`);
      return [];
    }

    const data = result.data;
    if (!data.similarartists?.artist) {
      console.warn(`[fetchLastFmSimilarArtists] No similar artists found`);
      return [];
    }

    const artists = Array.isArray(data.similarartists.artist) ? data.similarartists.artist : [data.similarartists.artist];
    
    const mappedArtists: Artist[] = artists.slice(0, limit).map((artist: any, index: number) => {
      const imageUrl = artist.image?.find((img: any) => img.size === 'large' || img.size === 'extralarge')?.['#text'] ||
                      artist.image?.find((img: any) => img.size === 'medium')?.['#text'] ||
                      null;

      return {
        id: artist.mbid || artist.name.toLowerCase().replace(/\s+/g, '-'),
        name: artist.name || '',
        slug: artist.name.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: imageUrl,
        bio: undefined,
        genres: undefined,
        topTracks: undefined,
        topAlbums: undefined,
        stats: undefined,
        relatedArtists: undefined,
      };
    });

    console.log(`[fetchLastFmSimilarArtists] ✅ Found ${mappedArtists.length} similar artists`);
    return mappedArtists;
  } catch (err) {
    console.error(`[fetchLastFmSimilarArtists] Error:`, err);
    return [];
  }
}

/**
 * Extract debut year from bio text
 */
function extractDebutYear(bio: string): number | undefined {
  if (!bio) return undefined;
  
  // Look for patterns like "formed in 2006", "debuted in 2011", "since 2008"
  const patterns = [
    /(?:formed|started|debuted|established|founded).*?(\d{4})/i,
    /since\s+(\d{4})/i,
    /(?:from|active since)\s+(\d{4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = bio.match(pattern);
    if (match && match[1]) {
      const year = parseInt(match[1], 10);
      if (year >= 1950 && year <= new Date().getFullYear()) {
        return year;
      }
    }
  }
  
  return undefined;
}

/**
 * Compute global rank from playcount (heuristic)
 */
function computeGlobalRank(playcount: number): number {
  // Rough heuristic: top 1% = rank 1-10, top 5% = rank 11-50, etc.
  // This is a placeholder - real ranking would require comparing against all artists
  if (playcount > 1000000000) return Math.floor(Math.random() * 10) + 1;
  if (playcount > 500000000) return Math.floor(Math.random() * 40) + 11;
  if (playcount > 100000000) return Math.floor(Math.random() * 100) + 51;
  if (playcount > 50000000) return Math.floor(Math.random() * 200) + 151;
  return Math.floor(Math.random() * 300) + 351;
}

/**
 * Normalize artist name from slug to proper format
 */
function normalizeArtistName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Fetch artist from Last.fm API (artist.getinfo)
 */
async function fetchArtistFromAPI(artistNameOrSlug: string): Promise<Artist | null> {
  // Normalize the artist name before calling Last.fm
  let normalizedName = normalizeArtistName(artistNameOrSlug);
  console.log(`[fetchArtistFromAPI] Normalized "${artistNameOrSlug}" to "${normalizedName}"`);
  
  try {
    const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY;
    
    if (!LASTFM_KEY) {
      console.warn("[fetchArtistFromAPI] No Last.fm API key configured");
      return null;
    }

    // First, fetch top tracks to get the official artist name
    const topTracksUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(
      normalizedName
    )}&api_key=${LASTFM_KEY}&format=json&limit=1`;

    let officialArtistName = normalizedName;
    
    try {
      const tracksRes = await fetchWithTimeout(topTracksUrl, 3000);
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        if (tracksData.toptracks?.track) {
          const track = Array.isArray(tracksData.toptracks.track) 
            ? tracksData.toptracks.track[0] 
            : tracksData.toptracks.track;
          if (track?.artist?.name) {
            officialArtistName = track.artist.name;
            console.log(`[fetchArtistFromAPI] Using official name from tracks: "${officialArtistName}"`);
          }
        }
      }
    } catch (e) {
      console.warn("[fetchArtistFromAPI] Could not fetch official name from tracks, using normalized name");
    }

    // Now fetch artist info using the official name
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
      officialArtistName
    )}&api_key=${LASTFM_KEY}&format=json`;

    const res = await fetchWithTimeout(url, 4500);
    
    if (!res.ok) {
      console.warn(`[fetchArtistFromAPI] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    
    if (data.error) {
      console.warn(`[fetchArtistFromAPI] Last.fm error: ${data.message}`);
      return null;
    }

    if (!data?.artist) {
      console.warn(`[fetchArtistFromAPI] No artist data in response`);
      return null;
    }

    const artist = data.artist;
    
    // Fix image extraction - use index 4, fallback to 3
    const imageUrl =
      Array.isArray(artist.image) &&
      artist.image.length > 0 &&
      artist.image[4]?.['#text']
        ? artist.image[4]['#text']
        : artist.image[3]?.['#text'] || null;

    // Extract bio
    let bio = artist.bio?.summary || artist.bio?.content || null;
    if (bio) {
      bio = bio.replace(/\s*<a[^>]*>Read more on Last\.fm<\/a>\.?/i, '').trim();
    }

    // Correct genre extraction
    const genres: string[] = artist.tags?.tag?.map((t: any) => t.name) || [];

    // Correct stats extraction - use Number() instead of parseInt
    const listeners = Number(artist.stats?.listeners || 0);
    const playcount = Number(artist.stats?.playcount || 0);
    
    // Extract yearformed
    let yearformed: number | undefined = undefined;
    if (artist.bio?.yearformed) {
      yearformed = Number(artist.bio.yearformed);
    } else if (bio) {
      yearformed = extractDebutYear(bio);
    }

    // Generate slug from official name
    const slug = artist.name.toLowerCase().replace(/\s+/g, "-");
    const id = artist.mbid || slug;

    // Fetch top tracks and albums using official name
    const [topTracks, topAlbums] = await Promise.all([
      fetchArtistTopTracks(artist.name),
      fetchArtistTopAlbums(artist.name),
    ]);

    console.log(`[fetchArtistFromAPI] ✅ Successfully fetched Last.fm data for: ${artist.name}`, {
      hasImage: !!imageUrl,
      hasBio: !!bio,
      genresCount: genres.length,
      listeners,
      playcount,
      yearformed,
      tracksCount: topTracks.length,
      albumsCount: topAlbums.length,
    });

    return {
      id: id,
      name: artist.name,
      slug: slug,
      bio: bio || undefined,
      imageUrl: imageUrl || undefined,
      genres: genres,
      topTracks: topTracks,
      topAlbums: topAlbums,
      stats: {
        monthlyListeners: listeners > 0 ? listeners : undefined,
        globalRank: undefined, // Not available from Last.fm - removed temporarily
        totalStreams: playcount > 0 ? playcount : undefined,
        debutYear: yearformed,
        buzzScore: undefined, // Set to null/undefined - hide if not computed
      },
      relatedArtists: [],
    };
  } catch (e) {
    console.error("[fetchArtistFromAPI] Error fetching artist:", e);
    return null;
  }
}

/**
 * Fetch artist top tracks from Last.fm (artist.gettoptracks)
 */
async function fetchArtistTopTracks(artistName: string): Promise<Track[]> {
  console.log(`[fetchArtistTopTracks] Fetching top tracks for: ${artistName}`);
  
  try {
    const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY;
    
    if (!LASTFM_KEY) {
      return [];
    }

    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(
      artistName
    )}&api_key=${LASTFM_KEY}&format=json&limit=10`;

    const res = await fetchWithTimeout(url, 4500);
    
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    
    if (data.error || !data.toptracks?.track) {
      return [];
    }

    const tracks = Array.isArray(data.toptracks.track) ? data.toptracks.track : [data.toptracks.track];
    
    return tracks.map((track: any, index: number) => {
      const imageUrl = track.image?.find((img: any) => img.size === 'large' || img.size === 'extralarge')?.['#text'] ||
                      track.image?.find((img: any) => img.size === 'medium')?.['#text'] ||
                      null;

      return {
        id: track.mbid || `${artistName}-track-${index}`,
        name: track.name || '',
        artist: artistName,
        artistId: artistName.toLowerCase().replace(/\s+/g, '-'),
        album: undefined,
        imageUrl: imageUrl,
        duration: undefined,
        publishedAt: undefined,
      };
    });
  } catch (e) {
    console.error("[fetchArtistTopTracks] Error:", e);
    return [];
  }
}

/**
 * Fetch artist top albums from Last.fm (artist.gettopalbums)
 */
async function fetchArtistTopAlbums(artistName: string): Promise<Album[]> {
  console.log(`[fetchArtistTopAlbums] Fetching top albums for: ${artistName}`);
  
  try {
    const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY;
    
    if (!LASTFM_KEY) {
      return [];
    }

    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${encodeURIComponent(
      artistName
    )}&api_key=${LASTFM_KEY}&format=json&limit=10`;

    const res = await fetchWithTimeout(url, 4500);
    
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    
    if (data.error || !data.topalbums?.album) {
      return [];
    }

    const albums = Array.isArray(data.topalbums.album) ? data.topalbums.album : [data.topalbums.album];
    
    return albums.map((album: any, index: number) => {
      const imageUrl = album.image?.find((img: any) => img.size === 'large' || img.size === 'extralarge')?.['#text'] ||
                      album.image?.find((img: any) => img.size === 'medium')?.['#text'] ||
                      null;

      return {
        id: album.mbid || `${artistName}-album-${index}`,
        name: album.name || '',
        artist: artistName,
        artistId: artistName.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: imageUrl,
        year: undefined,
        publishedAt: undefined,
      };
    });
  } catch (e) {
    console.error("[fetchArtistTopAlbums] Error:", e);
    return [];
  }
}

/**
 * Get curated artist data (fallback when Last.fm unavailable)
 */
function getCuratedArtistData(artistId: string): Partial<Artist & { monthlyListeners?: number; globalRank?: number; totalStreams?: number; debutYear?: number }> {
  const curated: Record<string, any> = {
    "wizkid": {
      name: "Wizkid",
      bio: "Nigerian singer and songwriter, one of the biggest names in Afrobeats. Known for hits like 'Essence' and 'Ojuelegba'.",
      genres: ["Afrobeats", "R&B", "Pop"],
      debutYear: 2011,
      monthlyListeners: 25000000,
      globalRank: 45,
      totalStreams: 850000000,
    },
    "burna-boy": {
      name: "Burna Boy",
      bio: "Grammy-winning Nigerian artist blending Afrobeats, reggae, and dancehall. Known for his powerful voice and socially conscious lyrics.",
      genres: ["Afrobeats", "Reggae", "Dancehall"],
      debutYear: 2012,
      monthlyListeners: 18000000,
      globalRank: 78,
      totalStreams: 650000000,
    },
    "drake": {
      name: "Drake",
      bio: "Canadian rapper, singer, and songwriter. One of the most successful artists of all time with multiple chart-topping albums.",
      genres: ["Hip-Hop", "R&B", "Pop"],
      debutYear: 2006,
      monthlyListeners: 75000000,
      globalRank: 2,
      totalStreams: 5000000000,
    },
    "taylor-swift": {
      name: "Taylor Swift",
      bio: "American singer-songwriter known for her narrative songwriting and genre-spanning discography. Multiple Grammy Award winner.",
      genres: ["Pop", "Country", "Indie"],
      debutYear: 2006,
      monthlyListeners: 95000000,
      globalRank: 1,
      totalStreams: 8000000000,
    },
  };

  return curated[artistId.toLowerCase()] || {};
}

/**
 * Get artist news count for buzz score
 */
async function getArtistNewsCount(artistId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('music_items')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .limit(1);
    return count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Get related artists from curated list
 */
function getRelatedArtists(artistId: string): Artist[] {
  const relatedMap: Record<string, string[]> = {
    "wizkid": ["burna-boy", "davido", "rema"],
    "burna-boy": ["wizkid", "davido", "tems"],
    "drake": ["kendrick-lamar", "j-cole", "the-weeknd"],
    "taylor-swift": ["olivia-rodrigo", "billie-eilish", "dua-lipa"],
  };

  const relatedIds = relatedMap[artistId.toLowerCase()] || [];
  
  return relatedIds.slice(0, 5).map(id => ({
    id,
    name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    slug: id,
  }));
}

/**
 * Search artists by name using Last.fm API via backend
 * Falls back to curated local list if Last.fm is unavailable
 * Includes caching, timeout, and result limiting for performance
 */
export async function searchArtists(query: string): Promise<Artist[]> {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();

  // Require at least 2 characters to avoid noise and unnecessary calls
  if (normalized.length < 2) {
    return [];
  }

  // Cache hit
  if (artistSearchCache.has(normalized)) {
    return artistSearchCache.get(normalized)!.map(a => ({
      id: a.id,
      name: a.name,
      slug: a.id,
      imageUrl: a.imageUrl || undefined,
      genres: undefined,
      topTracks: undefined,
      topAlbums: undefined,
    }));
  }

  // Helper: 3s timeout wrapper
  const withTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Last.fm search timeout"));
      }, ms);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  // 1) Try Last.fm through our backend / proxy endpoint
  try {
    // Try Supabase Edge Function first
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (SUPABASE_URL && PUBLISHABLE_KEY) {
      const endpoint = `${SUPABASE_URL}/functions/v1/search-artists`;

      const res = await withTimeout(
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PUBLISHABLE_KEY}`,
            'apikey': PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ query: trimmed }),
        })
      );

      if (res.ok) {
        const data = await res.json();

        // Expect an array of artists from the backend, otherwise map the structure here.
        let artists: MusicArtist[] = [];
        if (Array.isArray(data)) {
          artists = data as MusicArtist[];
        } else if (Array.isArray(data?.artists)) {
          artists = data.artists.map((a: any) => ({
            id: a.id || a.name.toLowerCase().replace(/\s+/g, '-'),
            name: a.name,
            imageUrl: a.imageUrl || a.image_url || null,
          }));
        } else if (Array.isArray(data?.results)) {
          artists = data.results.map((a: any) => ({
            id: a.id || a.name.toLowerCase().replace(/\s+/g, '-'),
            name: a.name,
            imageUrl: a.imageUrl || a.image_url || null,
          }));
        }

        // Limit to a safe number for performance
        artists = artists.slice(0, 10);

        if (artists.length > 0) {
          artistSearchCache.set(normalized, artists);
          console.log("[searchArtists] Using Last.fm backend results:", artists.length);
          return artists.map(a => ({
            id: a.id,
            name: a.name,
            slug: a.id,
            imageUrl: a.imageUrl || undefined,
            genres: undefined,
            topTracks: undefined,
            topAlbums: undefined,
          }));
        }
      } else {
        console.warn(
          "[searchArtists] /api/music/search-artists returned non-OK status:",
          res.status
        );
      }
    }
  } catch (err) {
    console.error("[searchArtists] Last.fm backend failed, will use fallback:", err);
  }

  // 2) Local curated fallback (used if Last.fm is unavailable or returns nothing)
  const FALLBACK_ARTISTS: MusicArtist[] = [
    // Afrobeats / African
    { id: "wizkid", name: "Wizkid" },
    { id: "burna-boy", name: "Burna Boy" },
    { id: "davido", name: "Davido" },
    { id: "asake", name: "Asake" },
    { id: "rema", name: "Rema" },
    { id: "tems", name: "Tems" },
    { id: "ayra-starr", name: "Ayra Starr" },

    // US / Global Hip-Hop & Pop
    { id: "drake", name: "Drake" },
    { id: "kendrick-lamar", name: "Kendrick Lamar" },
    { id: "j-cole", name: "J. Cole" },
    { id: "travis-scott", name: "Travis Scott" },
    { id: "nicki-minaj", name: "Nicki Minaj" },
    { id: "cardi-b", name: "Cardi B" },
    { id: "future", name: "Future" },

    { id: "taylor-swift", name: "Taylor Swift" },
    { id: "beyonce", name: "Beyoncé" },
    { id: "the-weeknd", name: "The Weeknd" },
    { id: "billie-eilish", name: "Billie Eilish" },
    { id: "dua-lipa", name: "Dua Lipa" },
    { id: "olivia-rodrigo", name: "Olivia Rodrigo" },

    // K-Pop / Latin / Misc
    { id: "bts", name: "BTS" },
    { id: "blackpink", name: "BLACKPINK" },
    { id: "bad-bunny", name: "Bad Bunny" },
    { id: "rosalia", name: "Rosalía" },
    { id: "karol-g", name: "Karol G" },
  ];

  const filtered = FALLBACK_ARTISTS.filter((artist) =>
    artist.name.toLowerCase().includes(normalized)
  ).slice(0, 10);

  artistSearchCache.set(normalized, filtered);
  console.log("[searchArtists] Using fallback results:", filtered.length, "for query:", trimmed);

  return filtered.map(a => ({
    id: a.id,
    name: a.name,
    slug: a.id,
    imageUrl: a.imageUrl || undefined,
    genres: undefined,
    topTracks: undefined,
    topAlbums: undefined,
  }));
}

/**
 * Sort artists by search relevance
 */
function sortArtistsByRelevance(artists: MusicArtist[], query: string): MusicArtist[] {
  const normalized = query.toLowerCase();
  
  return artists.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    // Exact match (case-insensitive) - HIGHEST PRIORITY
    const aExact = aName === normalized;
    const bExact = bName === normalized;
    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;
    
    // Starts with query - SECOND PRIORITY
    const aStarts = aName.startsWith(normalized);
    const bStarts = bName.startsWith(normalized);
    if (aStarts && !bStarts) return -1;
    if (bStarts && !aStarts) return 1;
    
    // Word boundary match (starts with word) - THIRD PRIORITY
    const aWordStart = new RegExp(`\\b${normalized}`, 'i').test(aName);
    const bWordStart = new RegExp(`\\b${normalized}`, 'i').test(bName);
    if (aWordStart && !bWordStart) return -1;
    if (bWordStart && !aWordStart) return 1;
    
    // Contains query - FOURTH PRIORITY
    const aContains = aName.includes(normalized);
    const bContains = bName.includes(normalized);
    if (aContains && !bContains) return -1;
    if (bContains && !aContains) return 1;
    
    // Alphabetical for same priority
    return aName.localeCompare(bName);
  });
}

/**
 * Search artists for search UI (returns MusicArtist[] format)
 * Simplified wrapper for search components
 */
/**
 * Search artists from Spotify API (for autocomplete)
 * Alias for searchArtistsSpotify for backward compatibility
 */
export async function searchArtistsFromSpotify(query: string): Promise<ArtistSearchResult[]> {
  return searchArtistsSpotify(query);
}

/**
 * Search artists from Spotify API (for autocomplete)
 */
export async function searchArtistsSpotify(query: string): Promise<ArtistSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  console.log("[Search] query:", trimmed);

  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.warn("[searchArtistsSpotify] Missing Supabase credentials");
      return [];
    }

    const url = `${SUPABASE_URL}/functions/v1/search-artists?q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "apikey": SUPABASE_PUBLISHABLE_KEY,
      },
    });

    if (!response.ok) {
      // Handle 401 - token refresh needed
      if (response.status === 401) {
        console.warn("[searchArtistsSpotify] 401 Unauthorized - token may be expired");
        // Note: search-artists doesn't require Spotify auth, so this shouldn't happen
        // But we handle it gracefully
      }
      console.error("[searchArtistsSpotify] API error:", response.status);
      return [];
    }

    const data = await response.json();
    const results = (data.artists || []) as ArtistSearchResult[];
    console.log("[Search] suggestions:", results);
    return results;
  } catch (err) {
    console.error("[searchArtistsSpotify] Error:", err);
    return [];
  }
}

/**
 * Log artist search to database
 */
export async function logArtistSearch(artistId: string, artistName: string): Promise<void> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.warn("[logArtistSearch] Missing Supabase credentials");
      return;
    }

    const url = `${SUPABASE_URL}/functions/v1/log-artist-search`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "apikey": SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        artistId,
        artistName,
      }),
    });
  } catch (err) {
    console.error("[logArtistSearch] Error:", err);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Fetch trending searches (top 10 in last 24 hours)
 */
export async function fetchTrendingSearches(): Promise<Array<{ id: string; name: string; imageUrl?: string }>> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.warn("[fetchTrendingSearches] Missing Supabase credentials");
      return [];
    }

    const url = `${SUPABASE_URL}/functions/v1/music-trending-searches`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "apikey": SUPABASE_PUBLISHABLE_KEY,
      },
    });

    if (!response.ok) {
      console.error("[fetchTrendingSearches] API error:", response.status);
      return [];
    }

    const data = await response.json();
    const results = (data.results || []) as Array<{ id: string; name: string; imageUrl?: string }>;
    console.log("[Search] trending:", results);
    return results;
  } catch (err) {
    console.error("[fetchTrendingSearches] Error:", err);
    return [];
  }
}

export async function searchArtistsForSearch(query: string): Promise<MusicArtist[]> {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();

  // Require at least 2 characters
  if (normalized.length < 2) {
    return [];
  }

  // Cache hit
  if (artistSearchCache.has(normalized)) {
    const cached = artistSearchCache.get(normalized)!;
    // Re-sort cached results to ensure exact matches are first
    return sortArtistsByRelevance([...cached], normalized);
  }

  // Helper: 3s timeout wrapper
  const withTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Last.fm search timeout"));
      }, ms);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  let allArtists: MusicArtist[] = [];

  // 1) Try Last.fm through our backend / proxy endpoint
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (SUPABASE_URL && PUBLISHABLE_KEY) {
      const endpoint = `${SUPABASE_URL}/functions/v1/search-artists`;

      const res = await withTimeout(
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PUBLISHABLE_KEY}`,
            'apikey': PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ query: trimmed }),
        })
      );

      if (res.ok) {
        const data = await res.json();

        // Expect an array of artists from the backend
        let lastfmArtists: MusicArtist[] = [];
        if (Array.isArray(data)) {
          lastfmArtists = data as MusicArtist[];
        } else if (Array.isArray(data?.artists)) {
          lastfmArtists = data.artists.map((a: any) => ({
            id: a.id || a.name.toLowerCase().replace(/\s+/g, '-'),
            name: a.name,
            imageUrl: a.imageUrl || a.image_url || null,
          }));
        } else if (Array.isArray(data?.results)) {
          lastfmArtists = data.results.map((a: any) => ({
            id: a.id || a.name.toLowerCase().replace(/\s+/g, '-'),
            name: a.name,
            imageUrl: a.imageUrl || a.image_url || null,
          }));
        }

        allArtists = [...lastfmArtists];
      }
    }
  } catch (err) {
    console.error("[searchArtistsForSearch] Last.fm backend failed, will use fallback:", err);
  }

  // 2) Always include curated fallback and merge with Last.fm results
  const FALLBACK_ARTISTS: MusicArtist[] = [
    { id: "wizkid", name: "Wizkid" },
    { id: "burna-boy", name: "Burna Boy" },
    { id: "davido", name: "Davido" },
    { id: "asake", name: "Asake" },
    { id: "rema", name: "Rema" },
    { id: "tems", name: "Tems" },
    { id: "ayra-starr", name: "Ayra Starr" },
    { id: "drake", name: "Drake" },
    { id: "kendrick-lamar", name: "Kendrick Lamar" },
    { id: "j-cole", name: "J. Cole" },
    { id: "travis-scott", name: "Travis Scott" },
    { id: "nicki-minaj", name: "Nicki Minaj" },
    { id: "cardi-b", name: "Cardi B" },
    { id: "future", name: "Future" },
    { id: "taylor-swift", name: "Taylor Swift" },
    { id: "beyonce", name: "Beyoncé" },
    { id: "the-weeknd", name: "The Weeknd" },
    { id: "billie-eilish", name: "Billie Eilish" },
    { id: "dua-lipa", name: "Dua Lipa" },
    { id: "olivia-rodrigo", name: "Olivia Rodrigo" },
    { id: "bts", name: "BTS" },
    { id: "blackpink", name: "BLACKPINK" },
    { id: "bad-bunny", name: "Bad Bunny" },
    { id: "rosalia", name: "Rosalía" },
    { id: "karol-g", name: "Karol G" },
  ];

  // Filter curated artists that match
  const filteredCurated = FALLBACK_ARTISTS.filter((artist) =>
    artist.name.toLowerCase().includes(normalized)
  );

  // Merge Last.fm and curated, removing duplicates by name (case-insensitive)
  const artistMap = new Map<string, MusicArtist>();
  
  // Add Last.fm results first
  allArtists.forEach(artist => {
    const key = artist.name.toLowerCase();
    if (!artistMap.has(key)) {
      artistMap.set(key, artist);
    }
  });
  
  // Add curated results (they take precedence if they match exactly)
  filteredCurated.forEach(artist => {
    const key = artist.name.toLowerCase();
    // If we have an exact match in curated, prefer it
    if (key === normalized) {
      artistMap.set(key, artist);
    } else if (!artistMap.has(key)) {
      artistMap.set(key, artist);
    }
  });

  // Convert back to array and sort by relevance
  let finalArtists = Array.from(artistMap.values());
  finalArtists = sortArtistsByRelevance(finalArtists, normalized);

  // Limit to 10 for performance
  finalArtists = finalArtists.slice(0, 10);

  // Cache the results
  artistSearchCache.set(normalized, finalArtists);
  console.log("[searchArtistsForSearch] Returning results:", finalArtists.length, "for query:", trimmed);

  return finalArtists;
}

/**
 * Fetch genre data with caching
 */
export async function fetchGenreData(genreName: string): Promise<{
  name: string;
  description?: string;
  topArtists: Artist[];
  topTracks: Track[];
} | null> {
  try {
    // Check cache
    const { data: cached, error: cacheError } = await supabase
      .from('genre_cache')
      .select('*')
      .eq('genre_id', genreName.toLowerCase())
      .single();

    if (!cacheError && cached && !isCacheStale(cached.last_refreshed_at)) {
      console.log('✅ Using cached genre data:', genreName);
      return {
        name: cached.name,
        description: cached.description || undefined,
        topArtists: (cached.top_artists as any) || [],
        topTracks: (cached.top_tracks as any) || [],
      };
    }

    // Fetch from API (placeholder)
    console.log('📡 Fetching genre from API:', genreName);
    const genreData = await fetchGenreFromAPI(genreName);

    if (genreData) {
      // Update cache
      await supabase
        .from('genre_cache')
        .upsert({
          genre_id: genreName.toLowerCase(),
          name: genreName,
          description: genreData.description,
          top_artists: genreData.topArtists,
          top_tracks: genreData.topTracks,
          last_refreshed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'genre_id'
        });
    }

    return genreData;
  } catch (error) {
    console.error('Error fetching genre data:', error);
    return null;
  }
}

/**
 * Fetch genre from external API (placeholder)
 */
async function fetchGenreFromAPI(genreName: string): Promise<{
  name: string;
  description?: string;
  topArtists: Artist[];
  topTracks: Track[];
} | null> {
  // TODO: Implement actual API call
  return {
    name: genreName,
    description: `${genreName} music genre`,
    topArtists: [],
    topTracks: [],
  };
}

/**
 * Call music Edge Function
 */
async function callMusicFunction(path: string): Promise<MusicItem[]> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (!SUPABASE_URL || !API_KEY) {
      console.warn("[musicService] Missing Supabase config, returning empty array");
      return [];
    }

    const endpoint = `${SUPABASE_URL}/functions/v1/${path}`;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`,
      },
    });

    if (!res.ok) {
      console.warn(`[musicService] ${path} returned status ${res.status}`);
      return [];
    }

    const json = await res.json();
    return Array.isArray(json.items) ? json.items : [];
  } catch (err) {
    console.error(`[musicService] Error calling ${path}:`, err);
    return [];
  }
}

/**
 * Fetch trending music (hybrid: Spotify/Last.fm + curated fallback)
 */
export async function fetchTrendingMusic(): Promise<MusicItem[]> {
  const items = await callMusicFunction("music-trending");
  
  // Debug log sample
  console.log("[musicService] fetchTrendingMusic received:",
    items.slice(0, 3).map(i => ({
      id: i.id,
      title: i.title,
      artist: i.artist,
      source: i.source,
      hasImage: !!i.imageUrl
    }))
  );

  console.log("[musicService] mapped artwork:",
    items.slice(0, 3).map(i => ({
      title: i.title,
      artwork: getArtworkForMusicItem(i)
    }))
  );

  return items;
}

/**
 * Fetch latest releases (hybrid: Spotify/Last.fm + curated fallback)
 */
export async function fetchLatestReleases(): Promise<MusicItem[]> {
  const items = await callMusicFunction("music-latest");
  
  // Debug log sample
  console.log("[musicService] fetchLatestReleases received:",
    items.slice(0, 3).map(i => ({
      id: i.id,
      title: i.title,
      artist: i.artist,
      source: i.source,
      hasImage: !!i.imageUrl
    }))
  );

  console.log("[musicService] mapped artwork:",
    items.slice(0, 3).map(i => ({
      title: i.title,
      artwork: getArtworkForMusicItem(i)
    }))
  );

  return items;
}

/**
 * Fetch music feed (gists filtered for music content)
 */
export async function fetchMusicFeed(limit: number = 20): Promise<MusicItem[]> {
  try {
    // Import fetchRecentGists dynamically to avoid circular dependencies
    const { fetchRecentGists } = await import("@/lib/feedData");
    const gists = await fetchRecentGists(limit);
    
    // Filter for music-related content
    const musicGists = gists.filter((gist) => {
      const topic = (gist.topic || '').toLowerCase();
      const topicCategory = (gist.topic_category || '').toLowerCase();
      const headline = (gist.headline || '').toLowerCase();
      return topic.includes('music') ||
             topicCategory.includes('music') ||
             headline.includes('music') ||
             headline.includes('artist') ||
             headline.includes('song') ||
             headline.includes('album');
    });

    return musicGists.map((gist) => ({
      id: gist.id,
      type: 'news' as const,
      title: gist.headline || '',
      summary: gist.context || '',
      imageUrl: gist.image_url || gist.ai_generated_image || undefined,
      artistId: undefined,
      artistName: undefined,
      genre: gist.topic || 'Music',
      publishedAt: gist.published_at || gist.created_at || undefined,
    }));
  } catch (error) {
    console.error('Error fetching music feed:', error);
    return [];
  }
}

/**
 * Fetch artist news/gossip
 */
export async function fetchArtistNews(artistId: string, limit: number = 10): Promise<MusicItem[]> {
  try {
    const { data: cached } = await supabase
      .from('music_items')
      .select('*')
      .eq('artist_id', artistId)
      .in('type', ['news', 'gossip'])
      .order('published_at', { ascending: false })
      .limit(limit);

    if (cached && cached.length > 0) {
      return cached.map(item => ({
        id: item.id,
        type: item.type as any,
        title: item.title,
        summary: item.summary || undefined,
        imageUrl: item.image_url || undefined,
        artistId: item.artist_id || undefined,
        artistName: item.artist_name || undefined,
        genre: item.genre || undefined,
        publishedAt: item.published_at || undefined,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching artist news:', error);
    return [];
  }
}

/**
 * Map music item to feed card props
 */
export function mapMusicItemToFeedCardProps(item: MusicItem) {
  // Extract genre from tags or use default
  const genre = item.tags && item.tags.length > 0 
    ? item.tags[0] 
    : (item.category === "trending" ? "Trending" : "Latest");

  return {
    id: item.id,
    source: 'music',
    headline: item.title,
    summary: `${item.artist}${item.tags && item.tags.length > 0 ? ` • ${item.tags.join(", ")}` : ""}`,
    imageUrl: getArtworkForMusicItem(item),
    topic: genre,
    topicCategory: item.category,
    publishedAt: item.publishedAt || new Date().toISOString(),
    author: item.artist || 'Fluxa',
  };
}

/**
 * Map music item to MusicCard props
 */
export function mapMusicItemToMusicCardProps(item: MusicItem) {
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    imageUrl: item.imageUrl ?? null,
    tags: item.tags ?? [],
    url: item.url ?? null,
  };
}

