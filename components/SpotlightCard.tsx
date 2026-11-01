"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { MovieItem } from "@/types";
import { normalizeProvider, getLanguageName } from "@/lib/utils";

interface SpotlightCardProps {
  movie: MovieItem;
  isDarkMode: boolean;
  activeRegionLabel: string;
}

export default function SpotlightCard({ movie, isDarkMode, activeRegionLabel }: SpotlightCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Deduplicate logos for cached movies that might have overlapping channel variants
  const uniqueProviders = (movie.providers?.flatrate || []).filter((v, i, a) => 
    a.findIndex(t => normalizeProvider(t.name) === normalizeProvider(v.name)) === i
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group rounded-lg overflow-hidden border flex flex-col h-full relative transition-shadow duration-300 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-gray-500 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none"
    >
      <div
        className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 rounded-lg"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px at ${position.x}px ${position.y}px, ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'}, transparent 40%)`,
        }}
      />

      <div className="aspect-[2/3] bg-gray-100 dark:bg-gray-800 relative overflow-hidden border-b border-gray-200 dark:border-gray-800 shrink-0">
        {movie.language && movie.language !== "en" && (
          <div className="absolute top-2 right-2 z-30 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider shadow-sm">
            {getLanguageName(movie.language)}
          </div>
        )}

        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-slate-400 dark:text-gray-500 text-xs text-center p-2">
            No Poster
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 dark:from-gray-950 via-gray-900/60 dark:via-gray-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
          {movie.rating ? (
            <div className="flex items-center gap-1.5 text-yellow-400 font-semibold text-sm mb-2 drop-shadow-md">
              <span>★</span>
              <span>{movie.rating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>
      </div>
      
      <div className="p-3 flex flex-col flex-grow relative z-10 bg-white dark:bg-gray-900">
        <h2 className="font-bold text-sm line-clamp-2 mb-1 text-slate-900 dark:text-gray-100">
          {movie.title}
          {movie.year && (
            <span className="text-slate-500 dark:text-gray-500 font-normal ml-1">
              ({movie.year})
            </span>
          )}
        </h2>
        
        {movie.genres && movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 mt-1">
            {movie.genres.slice(0, 2).map((genre) => (
              <span key={genre} className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700">
                {genre}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-gray-800/60">
          {uniqueProviders.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {uniqueProviders.map((p: any) => (
                <img
                  key={p.id}
                  src={p.logoUrl}
                  alt={normalizeProvider(p.name)}
                  title={normalizeProvider(p.name)}
                  className="w-6 h-6 rounded-md object-cover shadow-sm bg-white"
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-gray-500 italic pt-1">Not streaming in {activeRegionLabel}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}