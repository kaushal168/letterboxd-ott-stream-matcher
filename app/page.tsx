"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MovieItem } from "@/types";
import SpotlightCard from "@/components/SpotlightCard";
import { normalizeProvider, getLanguageName } from "@/lib/utils";
import { REGIONS } from "@/lib/constants";

export default function Home() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [listInput, setListInput] = useState("");
  const [loadingProgress, setLoadingProgress] = useState("");

  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("default");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");

  const [selectedRegion, setSelectedRegion] = useState("IN");
  const [activeRegion, setActiveRegion] = useState("IN");
  
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [viewCount, setViewCount] = useState<number | null>(null);
  const hasIncremented = useRef(false);

  useEffect(() => {
    if (hasIncremented.current) return;
    hasIncremented.current = true;

    fetch("/api/views", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.views === "number") {
          setViewCount(data.views);
        }
      })
      .catch((err) => console.error("Error updating view count:", err));
  }, []);

  const syncChannel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    
    syncChannel.current = new BroadcastChannel("cinefind_sync");
    
    syncChannel.current.onmessage = (event) => {
      if (event.data?.type === "START_LOADING") {
        setIsLoading(true);
        setLoadingProgress("Fetching in another tab...");
      } else if (event.data?.type === "STOP_LOADING") {
        setIsLoading(false);
        setLoadingProgress("");
      }
    };

    return () => {
      syncChannel.current?.close();
    };
  }, []);

  const broadcastStatus = (type: "START_LOADING" | "STOP_LOADING") => {
    try {
      syncChannel.current?.postMessage({ type });
    } catch (e) {
      console.error("BroadcastChannel post error:", e);
    }
  };

  const handleSearch = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError("");
    setMovies([]);
    
    setSortBy("default");
    setSelectedProviders([]);
    setSelectedGenre("all");
    setSelectedLanguage("all");

    broadcastStatus("START_LOADING");

    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&region=${selectedRegion}`);
      if (!res.ok) {
        if (res.status === 429) throw new Error("Rate limit reached. Try again in a minute.");
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }
      const data = await res.json();
      if (data.movies.length === 0) {
        setError("Movie not found.");
      } else {
        setActiveRegion(selectedRegion); // <-- Sync UI only on success
        setMovies(data.movies);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      broadcastStatus("STOP_LOADING");
    }
  };

  const handleListSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const input = listInput.trim();
    if (!input) return;

    let targetUrl = input;

    if (!input.includes("/") && !input.includes("letterboxd.com")) {
      targetUrl = `https://letterboxd.com/${input}/watchlist/`;
    } 
    else if (
      input.includes("letterboxd.com") && 
      !input.includes("/list/") && 
      !input.includes("/watchlist") && 
      !input.includes("/films")
    ) {
      targetUrl = input.endsWith("/") ? `${input}watchlist/` : `${input}/watchlist/`;
    }

    if (!targetUrl.includes("letterboxd.com") && targetUrl.includes("/")) {
      targetUrl = targetUrl.startsWith("http") 
        ? targetUrl 
        : `https://letterboxd.com/${targetUrl.replace(/^\//, '')}`;
    }

    setListInput(targetUrl);
    handleFetch(targetUrl);
  };

  const handleFetch = async (urlToScrape: string) => {
    const fetchRegion = selectedRegion;

    setIsLoading(true);
    setError("");
    setMovies([]);
    
    setSortBy("default");
    setSelectedProviders([]);
    setSelectedGenre("all");
    setSelectedLanguage("all");
    
    setLoadingProgress("Starting import...");
    broadcastStatus("START_LOADING");

    let currentPage = 1;
    let morePages = true;
    let accumulatedMovies: MovieItem[] = [];
    let currentCookie = "";

    try {
      while (morePages) {
        setLoadingProgress(`Importing Page ${currentPage}...`);
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlToScrape, page: currentPage, sessionCookie: currentCookie, region: fetchRegion }),
        });

        if (!res.ok) {
          if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment.");
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch from server");
        }

        const data = await res.json();

        if (data.cookie) {
          currentCookie = data.cookie;
        }

        if (data.movies.length === 0 && currentPage === 1) {
          throw new Error("No films found on this list. Make sure the profile/list is public.");
        }
        if (currentPage === 1) setActiveRegion(fetchRegion);
        
        accumulatedMovies = [...accumulatedMovies, ...data.movies];
        setMovies([...accumulatedMovies]);

        morePages = data.hasNextPage;
        currentPage++;

        if (morePages) {
          await new Promise((resolve) => setTimeout(resolve, 3500));
        }
      }
      setLoadingProgress("");
    } catch (err: any) {
      setError(err.message);
      setLoadingProgress("");
    } finally {
      setIsLoading(false);
      broadcastStatus("STOP_LOADING");
    }
  };

  const providerCounts = movies.reduce((acc, movie) => {
    const platforms = movie.providers?.flatrate || [];
    const seen = new Set<string>();
    platforms.forEach((p: any) => {
      const canonical = normalizeProvider(p.name);
      if (!seen.has(canonical)) {
        seen.add(canonical);
        acc[canonical] = (acc[canonical] || 0) + 1;
      }
    });
    return acc;
  }, {} as Record<string, number>);

  const availableProviders = Object.keys(providerCounts).sort(
    (a, b) => providerCounts[b] - providerCounts[a]
  );

  const availableGenres = Array.from(new Set(movies.flatMap(m => m.genres || []))).sort();
  const availableLanguages = Array.from(new Set(movies.map(m => m.language).filter(Boolean)))
    .sort((a, b) => getLanguageName(String(a)).localeCompare(getLanguageName(String(b))));

  const toggleProvider = (providerName: string) => {
    setSelectedProviders((prev) =>
      prev.includes(providerName)
        ? prev.filter((p) => p !== providerName)
        : [...prev, providerName]
    );
  };

  const filteredMovies = movies
    .filter((m) => {
      if (selectedProviders.length > 0) {
        const movieProviders = m.providers?.flatrate?.map((p: any) => normalizeProvider(p.name)) || [];
        if (!selectedProviders.some((sp) => movieProviders.includes(sp))) return false;
      }
      
      if (selectedGenre !== "all") {
        if (!m.genres || !m.genres.includes(selectedGenre)) return false;
      }

      if (selectedLanguage !== "all") {
        if (m.language !== selectedLanguage) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "popularity") return (b.popularity || 0) - (a.popularity || 0);
      if (sortBy === "newest") return (b.year || 0) - (a.year || 0);
      if (sortBy === "oldest") return (a.year || 9999) - (b.year || 9999);
      if (sortBy === "az") return a.title.localeCompare(b.title);
      return 0; 
    });

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div 
        className="font-sans flex flex-col relative transition-colors duration-500 bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100"
        style={{ zoom: 0.9, minHeight: "111.2vh" } as React.CSSProperties} 
      >
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div 
            className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] min-w-[500px] min-h-[500px] blur-[100px] rounded-full animate-pulse transition-colors duration-700 bg-blue-300/40 dark:bg-blue-600/20" 
            style={{ animationDuration: '8s' }} 
          />
          <div 
            className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] min-w-[500px] min-h-[500px] blur-[100px] rounded-full animate-pulse transition-colors duration-700 bg-purple-300/40 dark:bg-purple-600/20" 
            style={{ animationDuration: '12s' }} 
          />
        </div>

        <header className="relative z-20 backdrop-blur-md border-b p-6 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 transition-colors duration-300 bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="CineFind Logo" 
                className="w-10 h-10 rounded-xl object-cover shadow-md border border-slate-200 dark:border-gray-800 shrink-0" 
              />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  CineFind
                </h1>
                <p className="text-xs mt-0.5 text-slate-500 dark:text-gray-400">
                  Instant OTT availability for your Letterboxd lists, watchlist, and searches.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="lg:hidden p-2.5 rounded-full transition-colors bg-slate-200 dark:bg-gray-800 text-slate-800 dark:text-yellow-400"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <form onSubmit={handleListSubmit} className="flex w-full sm:w-auto">
              <input
                type="text"
                placeholder="Paste Letterboxd URL or username"
                value={listInput}
                onChange={(e) => setListInput(e.target.value)}
                className="border px-4 py-2.5 rounded-l-md focus:outline-none w-full sm:w-80 text-sm transition-colors bg-white dark:bg-gray-800/80 border-gray-300 dark:border-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 shadow-sm dark:shadow-none"
              />
              <button
                type="submit"
                disabled={isLoading || !listInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-r-md font-medium transition-colors disabled:opacity-50 whitespace-nowrap text-sm shadow-sm"
              >
                {isLoading && loadingProgress ? loadingProgress : "Fetch List"}
              </button>
            </form>

            <span className="hidden sm:inline text-slate-500 dark:text-gray-400">or</span>

            <form onSubmit={handleSearch} className="flex w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search a title, can add year too!"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border px-4 py-2.5 rounded-l-md focus:outline-none w-full sm:w-60 text-sm transition-colors bg-white dark:bg-gray-800/80 border-gray-300 dark:border-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 shadow-sm dark:shadow-none"
              />
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="border border-l-0 px-4 py-2.5 rounded-r-md transition-colors disabled:opacity-50 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-700 text-slate-800 dark:text-white"
              >
                🔍
              </button>
            </form>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="hidden sm:block border px-2 py-2.5 rounded-md text-sm transition-colors cursor-pointer outline-none bg-white dark:bg-gray-800/80 border-gray-300 dark:border-gray-700 text-slate-900 dark:text-white shadow-sm dark:shadow-none ml-2"
            >
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}{"\u00A0\u00A0"}{r.emoji}
                </option>
              ))}
            </select>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="hidden lg:flex p-2.5 rounded-full transition-colors ml-2 bg-slate-200 dark:bg-gray-800 hover:bg-slate-300 dark:hover:bg-gray-700 text-slate-800 dark:text-yellow-400"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-[1800px] mx-auto w-full px-6 flex flex-col">
          {error && (
            <div className="p-4 rounded-md mt-6 shadow-md border bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 transition-colors">
              {error}
            </div>
          )}

          {loadingProgress && !error && (
            <div className="p-4 rounded-md mt-6 flex items-center justify-between shadow-md border bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 transition-colors">
              <span className="font-medium">{loadingProgress}</span>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent dark:border-t-transparent"></div>
            </div>
          )}

          {movies.length > 0 && (
            <div className="sticky top-0 z-50 backdrop-blur-2xl border-b py-3 mb-6 transition-all duration-300 bg-white/90 dark:bg-gray-950/80 border-gray-200 dark:border-gray-800/80 shadow-sm shadow-slate-200/50 dark:shadow-gray-950/50">
              {availableProviders.length > 0 && (
                <div className="mb-3 px-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider">
                        Available On ({REGIONS.find(r => r.code === activeRegion)?.label || activeRegion})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                        className="text-xs font-medium px-2 py-0.5 rounded transition-colors text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800/50"
                      >
                        {isFilterExpanded ? "▲ Collapse" : `▼ Show Platforms (${availableProviders.length})`}
                      </button>
                    </div>

                    {selectedProviders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedProviders([])}
                        className="text-xs px-2 py-0.5 rounded-full transition-colors bg-red-100 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900/80 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/60"
                      >
                        Clear filters ({selectedProviders.length} active) ✕
                      </button>
                    )}
                  </div>

                  {!isFilterExpanded && selectedProviders.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs mr-1 text-slate-500 dark:text-gray-400">Active:</span>
                      {selectedProviders.map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => toggleProvider(provider)}
                          className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors bg-blue-600 text-white border-transparent shadow-md shadow-blue-500/20 dark:shadow-blue-900/20"
                        >
                          {provider}
                          <span className="opacity-75">✕</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <AnimatePresence>
                    {isFilterExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex flex-wrap gap-1.5 mt-2.5 max-h-56 overflow-y-auto pr-1 overflow-x-hidden"
                      >
                        {availableProviders.map((provider) => (
                          <button
                            key={provider}
                            type="button"
                            onClick={() => toggleProvider(provider)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              selectedProviders.includes(provider) 
                                ? "bg-blue-600 text-white border-transparent shadow-md shadow-blue-500/20 dark:shadow-blue-900/20" 
                                : "bg-white dark:bg-gray-800/60 text-slate-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 hover:border-slate-400 dark:hover:border-gray-500 shadow-sm dark:shadow-none"
                            }`}
                          >
                            {provider}{" "}
                            <span className="opacity-60 ml-0.5 text-[11px]">
                              ({providerCounts[provider]})
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="flex flex-col xl:flex-row xl:justify-between items-start xl:items-center border px-3 py-2 rounded-lg gap-4 transition-colors bg-slate-100/80 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800/50">
                <div className="text-xs text-slate-500 dark:text-gray-400">
                  Showing <strong className="text-slate-900 dark:text-white">{filteredMovies.length}</strong> of{" "}
                  <strong className="text-slate-900 dark:text-white">{movies.length}</strong> movies
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 w-full xl:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {availableGenres.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
                        <label htmlFor="genre" className="text-xs text-slate-500 dark:text-gray-400 shrink-0">
                          Genre:
                        </label>
                        <select
                          id="genre"
                          value={selectedGenre}
                          onChange={(e) => setSelectedGenre(e.target.value)}
                          className="font-sans border text-xs rounded-md py-1.5 px-2 outline-none cursor-pointer transition-colors focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800/80 border-gray-300 dark:border-gray-700 text-slate-900 dark:text-white shadow-sm dark:shadow-none w-full sm:w-auto truncate"
                        >
                          <option value="all">All</option>
                          {availableGenres.map(genre => (
                            <option key={String(genre)} value={String(genre)}>
                              {String(genre)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {availableLanguages.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
                        <label htmlFor="language" className="text-xs text-slate-500 dark:text-gray-400 shrink-0">
                          <span className="sm:hidden">Lang:</span>
                          <span className="hidden sm:inline">Language:</span>
                        </label>
                        <select
                          id="language"
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="font-sans border text-xs rounded-md py-1.5 px-2 outline-none cursor-pointer transition-colors focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800/80 border-gray-300 dark:border-gray-700 text-slate-900 dark:text-white shadow-sm dark:shadow-none w-full sm:w-auto truncate"
                        >
                          <option value="all">All</option>
                          {availableLanguages.map(lang => (
                            <option key={String(lang)} value={String(lang)}>
                              {getLanguageName(String(lang))}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto xl:border-l xl:pl-4 border-gray-300 dark:border-gray-700">
                    <label htmlFor="sort" className="text-xs text-slate-500 dark:text-gray-400 shrink-0">
                      Sort:
                    </label>
                    <select
                      id="sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="font-sans border text-xs rounded-md py-1.5 px-2 outline-none cursor-pointer transition-colors focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800/80 border-gray-300 dark:border-gray-700 text-slate-900 dark:text-white shadow-sm dark:shadow-none w-full sm:w-auto truncate"
                    >
                      <option value="default">List Order</option>
                      <option value="rating">Highest Rated (TMDB)</option>
                      <option value="popularity">Most Popular</option>
                      <option value="newest">Release Year (Newest)</option>
                      <option value="oldest">Release Year (Oldest)</option>
                      <option value="az">Alphabetical (A-Z)</option>
                    </select>
                  </div>
                  
                </div>
              </div>
            </div>
          )}

          {movies.length === 0 && !isLoading && !error && (
            <div className="text-center mt-32 flex flex-col items-center text-slate-500 dark:text-gray-400 transition-colors">
              <span className="text-4xl mb-4 opacity-50 drop-shadow-lg">🍿</span>
              <p className="text-lg font-medium mb-2 text-slate-800 dark:text-gray-300">Ready to watch something?</p>
              <p className="text-sm">Drop a Letterboxd list URL or search a movie above to check where it's streaming.</p>
            </div>
          )}

          {movies.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6 pb-12">
              <AnimatePresence>
                {filteredMovies.map((movie, idx) => (
                  <SpotlightCard 
                    key={`${movie.tmdbId}-${idx}`} 
                    movie={movie} 
                    isDarkMode={isDarkMode}
                    activeRegionLabel={REGIONS.find(r => r.code === activeRegion)?.label || activeRegion}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>

        <footer className="relative z-20 border-t p-6 backdrop-blur-md mt-auto shrink-0 transition-colors duration-300 bg-white/80 dark:bg-gray-950/80 border-gray-200 dark:border-gray-800">
          <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-gray-500">
            
            <div className="flex items-center gap-3">
              <p>© 2026 CineFind.</p>
              {viewCount !== null && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700/60 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                  {viewCount.toLocaleString("en-IN")} views
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span>Streaming data provided by</span>
              <a href="https://www.justwatch.com" target="_blank" rel="noreferrer">
                <img 
                  src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" 
                  alt="TMDB Logo" 
                  className="h-3 inline-block ml-1 opacity-70 hover:opacity-100 transition-opacity" 
                />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}