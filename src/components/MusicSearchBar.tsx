import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { searchArtistsSpotify, logArtistSearch, fetchTrendingSearches, type ArtistSearchResult } from "@/lib/musicService";
import MusicSearchSuggestions from "./MusicSearchSuggestions";

interface MusicSearchBarProps {
  placeholder?: string;
}

const RECENT_SEARCHES_KEY = "fluxa_recent_artists";
const MAX_RECENT_SEARCHES = 8;

type RecentArtist = {
  id: string;
  name: string;
  imageUrl?: string;
};

export default function MusicSearchBar({
  placeholder = "Search artists…",
}: MusicSearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<ArtistSearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentArtist[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<RecentArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentArtist[];
        setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_SEARCHES) : []);
      }
    } catch (err) {
      console.error("[MusicSearchBar] Error loading recent searches:", err);
    }
  }, []);

  // Load trending searches on mount
  useEffect(() => {
    fetchTrendingSearches().then(setTrendingSearches).catch(console.error);
  }, []);

  // Save recent search
  const addToRecentSearches = useCallback((artist: ArtistSearchResult | RecentArtist) => {
    try {
      const artistData: RecentArtist = {
        id: artist.id,
        name: artist.name,
        imageUrl: artist.imageUrl || undefined,
      };
      
      const recent: RecentArtist[] = [
        artistData,
        // Remove duplicates and limit to MAX_RECENT_SEARCHES
        ...recentSearches.filter((r) => r.id !== artist.id),
      ].slice(0, MAX_RECENT_SEARCHES);

      setRecentSearches(recent);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
    } catch (err) {
      console.error("[MusicSearchBar] Error saving recent search:", err);
    }
  }, [recentSearches]);

  // Fetch suggestions with 220ms debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length >= 2) {
      setLoading(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          // Use new searchArtistsSpotify function
          const spotifyResults = await searchArtistsSpotify(query);
          setSuggestions(spotifyResults);
        } catch (err) {
          console.error("[MusicSearchBar] Search error:", err);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 220); // 220ms debounce
    } else {
      setSuggestions([]);
      setLoading(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Show dropdown when focused or has suggestions/recent/trending
  useEffect(() => {
    const hasContent = suggestions.length > 0 || 
                      (query.trim().length === 0 && (recentSearches.length > 0 || trendingSearches.length > 0));
    setShowDropdown(isFocused && hasContent);
  }, [isFocused, suggestions.length, query, recentSearches.length, trendingSearches.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setShowDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFocused(false);
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleArtistClick = useCallback(async (artist: ArtistSearchResult | RecentArtist) => {
    console.log("[Search] Click:", artist);
    
    // Log search
    try {
      await logArtistSearch(artist.id, artist.name);
    } catch (err) {
      console.error("[MusicSearchBar] Error logging search:", err);
    }
    
    // Add to recent searches
    const artistData: ArtistSearchResult = 'source' in artist 
      ? artist 
      : {
          id: artist.id,
          name: artist.name,
          imageUrl: artist.imageUrl || null,
          source: "local",
        };
    
    addToRecentSearches(artistData);

    // Navigate to artist page using artist.id
    navigate(`/music/artist/${artist.id}?origin=music`);
    
    // Close dropdown and clear query
    setIsFocused(false);
    setShowDropdown(false);
    setQuery("");
    inputRef.current?.blur();
  }, [navigate, addToRecentSearches]);

  const handleClearRecent = useCallback((artistId: string) => {
    console.log("[Search] removed recent:", artistId);
    const updated = recentSearches.filter(r => r.id !== artistId);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    // Prevent text scattering by ensuring state update is immediate
  }, []);

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={cn(
            "w-full h-12 pl-4 pr-12 rounded-full",
            "bg-black/5 dark:bg-white/5",
            "border border-black/10 dark:border-white/10",
            "text-black dark:text-white",
            "placeholder:text-black/40 dark:placeholder:text-white/40",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            "transition-all duration-200",
            "px-4 py-3 text-base"
          )}
        />
        {loading ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        )}
      </div>

      {/* Dropdown with Suggestions */}
      {showDropdown && (
        <MusicSearchSuggestions
          query={query}
          suggestions={suggestions}
          recentSearches={recentSearches}
          trendingSearches={trendingSearches}
          loading={loading}
          onArtistClick={handleArtistClick}
          onClearRecent={handleClearRecent}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
