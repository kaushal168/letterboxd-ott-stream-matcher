import { NextResponse } from "next/server";
import { getOrFetchMovie } from "@/lib/tmdb";
import { DEFAULT_REGION } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const region = searchParams.get("region") || DEFAULT_REGION;

    if (!query) {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 });
    }

    const yearMatch = query.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;
    
    const title = yearMatch ? query.replace(/\b(19|20)\d{2}\b/, "").trim() : query.trim();

    const movie = await getOrFetchMovie(title, year, region);

    if (!movie) {
      return NextResponse.json({ movies: [] });
    }

    return NextResponse.json({ movies: [movie] });
    
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Failed to search for movie" }, { status: 500 });
  }
}