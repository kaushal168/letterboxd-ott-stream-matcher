# CineFind 🍿

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkaushal168%2Fcinefind)

Stop wondering where to watch your backlog. CineFind instantly checks where any movie from your Letterboxd lists, watchlist, or diary is streaming across major OTT platforms.

👉 **[Try the Live App](https://cinefind-ott.vercel.app/)** 👈

⭐ **If this tool helps you clear your watchlist, please drop a star on this repository!**

### ✨ Features
- 🔍 **Instant Import**: Paste a Letterboxd URL (watchlist, diary, or public lists) or search directly to scrape and load films.
- 🌍 **Multi-Region Support**: Real-time OTT availability for India (IN), USA (US), UK (GB), Canada (CA), Australia (AU), and France (FR).
- 🎛️ **Smart Filtering**: Filter imported lists by specific streaming platforms (Netflix, Prime, JioHotstar, MUBI, AMC+, etc.), genres, and languages.
- 🌍 **Global OTT Availability**: Enriched via TMDB & JustWatch to find streams across major platforms worldwide including **Netflix, Amazon Prime Video, Apple TV+, Max (HBO), Hulu, Disney+ / JioHotstar, Paramount+, Peacock, Sony LIV, MUBI, Crunchyroll, and Shudder**.
- ⚡ **High Performance**: Built with parallelized TMDB fetching, Upstash Redis rate-limiting, and Turso SQLite for lightning-fast caching.

### 🛠️ Tech Stack
- **Framework**: Next.js (App Router)
- **Styling & UI**: Tailwind CSS, Framer Motion
- **Scraping**: Cheerio
- **Database/Cache**: Turso SQLite & Upstash Redis
- **APIs**: TMDB API (with JustWatch provider data)

### 🚀 Run Locally

1. Clone the repository:
   ```bash
   git clone [https://github.com/kaushal168/cinefind.git](https://github.com/kaushal168/cinefind.git)
   cd cinefind
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables. Create a `.env` file and add your keys:
   ```env
   TMDB_API_KEY=your_tmdb_key_here
   TURSO_DATABASE_URL=your_turso_db_url
   TURSO_AUTH_TOKEN=your_turso_auth_token
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
---

### 🎥 Let's Connect

🎬 Plot twist: We're about to become mutuals. If you’re a cinephile who loves trading recommendations as much as I do, let’s connect on **[Letterboxd](https://letterboxd.com/kaushal16)**! I happily follow back, so, no spoilers, but we’ll get along great.