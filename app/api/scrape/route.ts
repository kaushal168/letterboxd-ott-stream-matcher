import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { DEFAULT_REGION } from "@/lib/constants";
import { getOrFetchMovieBatch } from "@/lib/tmdb";

function normalizeLetterboxdUrl(input: string): string {
  let cleaned = input.trim();

  if (!cleaned.includes("letterboxd.com") && !cleaned.includes("/")) {
    cleaned = cleaned.replace(/^@/, "");
    return `https://letterboxd.com/${cleaned}/watchlist/`;
  }

  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = `https://${cleaned}`;
  }

  cleaned = cleaned.split("?")[0].split("#")[0];

  cleaned = cleaned.split("/page/")[0];

  if (!cleaned.endsWith("/")) {
    cleaned += "/";
  }

  return cleaned;
}

export async function POST(request: Request) {
  try {
    const { url, page = 1, sessionCookie = "", region = DEFAULT_REGION } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Please enter a valid Letterboxd username or URL" }, { status: 400 });
    }

    const baseUrl = normalizeLetterboxdUrl(url);

    if (!baseUrl.includes("letterboxd.com/")) {
      return NextResponse.json({ error: "Invalid Letterboxd URL" }, { status: 400 });
    }

    const isValidPath = /\/(watchlist|list|film|films)\//.test(baseUrl);
    const isDiaryPath = /\/films\//.test(baseUrl);
    
    // Allow Page 1 for recent films, but cleanly exit for pagination to prevent massive load
    if (isDiaryPath && page > 1) {
      return NextResponse.json({ movies: [], hasNextPage: false });
    }

    if (!isValidPath) {
      return NextResponse.json({ 
        error: "Please enter a valid Letterboxd list, watchlist, diary (/films/), or movie URL." 
      }, { status: 400 });
    }

    if (baseUrl.includes("/film/")) {
      const slugMatch = baseUrl.match(/\/film\/([^/]+)/);
      if (slugMatch && slugMatch[1]) {
        const rawSlug = slugMatch[1];
        let year: number | undefined = undefined;
        const yearMatch = rawSlug.match(/-([12]\d{3})$/);
        if (yearMatch) {
          year = parseInt(yearMatch[1], 10);
        }
        const title = rawSlug.replace(/-([12]\d{3})$/, '').replace(/-/g, ' ').trim();
        const enrichedMovies = await getOrFetchMovieBatch([{ title, year }], DEFAULT_REGION);
        return NextResponse.json({ movies: enrichedMovies, hasNextPage: false });
      }
    }

    const targetUrl = page === 1 ? baseUrl : `${baseUrl}page/${page}/`;
    
    const scrapeHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": page === 1 ? "https://letterboxd.com/" : (page === 2 ? baseUrl : `${baseUrl}page/${page - 1}/`),
      "Sec-GPC": "1",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": page === 1 ? "cross-site" : "same-origin",
      "Sec-Fetch-User": "?1",
      "Priority": "u=0, i"
    };

    if (sessionCookie) {
      scrapeHeaders["Cookie"] = sessionCookie;
    }

    const response = await fetch(targetUrl, { headers: scrapeHeaders });

    const newCookie = response.headers.get("set-cookie") || sessionCookie;

    if (!response.ok) {
      if (response.status === 404) return NextResponse.json({ movies: [], hasNextPage: false });
      if (response.status === 403) throw new Error("Letterboxd blocked the request (Cloudflare 403).");
      if (response.status === 429) throw new Error("Letterboxd rate limit reached (429).");
      throw new Error(`Failed to fetch page ${page}. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const posters = $(".react-component[data-component-class='LazyPoster']");
    
    if (posters.length === 0) {
      return NextResponse.json({ movies: [], hasNextPage: false });
    }

    const movies: Array<{ title: string; year?: number }> = [];
    
    posters.each((_, el) => {
      const wrapper = $(el);
      const poster = wrapper.find(".poster");
      const img = poster.find("img");
      
      let title = poster.attr("data-film-name") || img.attr("alt") || "";
      let year: number | undefined = undefined;

      const itemName = wrapper.attr("data-item-name");
      if (itemName) {
          const yearMatch = itemName.match(/\((\d{4})\)$/);
          if (yearMatch) {
              year = parseInt(yearMatch[1], 10);
              title = itemName.replace(/\s*\(\d{4}\)$/, "").trim();
          } else if (!title) {
              title = itemName.trim();
          }
      }

      if (!year) {
          const yearAttr = poster.attr("data-film-release-year") || wrapper.attr("data-film-release-year");
          if (yearAttr) year = parseInt(yearAttr, 10);
      }

      const slug = poster.attr("data-film-slug") || wrapper.attr("data-item-slug") || wrapper.attr("data-target-link") || "";
      if (!year && slug) {
          const slugYearMatch = slug.match(/-([12]\d{3})\/?$/);
          if (slugYearMatch) year = parseInt(slugYearMatch[1], 10);
      }

      if (!title && slug) {
          title = slug.replace(/\/film\//g, '').replace(/-([12]\d{3})\/?$/, '').replace(/-/g, ' ').trim();
      }

      if (title) {
        movies.push({ title, year });
      }
    });

    const hasNextPage = 
      $(".paginate-nextprev a.next").length > 0 || 
      $(".paginate-nextprev a:contains('Older')").length > 0 ||
      $(".pagination .next").length > 0;

    const enrichedMovies = await getOrFetchMovieBatch(movies, region);

    return NextResponse.json({ 
      movies: enrichedMovies, 
      hasNextPage,
      cookie: newCookie
    });
    
  } catch (error: any) {
    console.error("Scraping error:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to scrape watchlist" }, { status: 500 });
  }
}