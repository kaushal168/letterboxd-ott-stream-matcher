# CineFind 🍿

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkaushal168%2Fcinefind)

Find where your Letterboxd watchlist or any Letterboxd list is streaming on Netflix, Prime, Hotstar, and more OTT platforms.

👉 **[Try the Live App](https://cinefind-ott.vercel.app/)** 👈

### Features
- 🔍 **Instant Search & Import**: Scrape Letterboxd watchlists, public lists, and diary pages directly just by pasting a URL.
- 🌍 **Global OTT Availability**: Enriched via TMDB & JustWatch to find streams across major platforms (Netflix, Prime Video, JioHotstar, Hulu, Max, MUBI, etc.).
- ⚡ **Optimized Stack**: Built for speed and caching to handle large movie lists instantly.

### Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Scraping**: Cheerio
- **Database/Cache**: Turso SQLite & Upstash Redis
- **APIs**: TMDB API

### Run Locally
1. Clone the repository:
  ```bash
  git clone [https://github.com/kaushal168/cinefind.git](https://github.com/kaushal168/cinefind.git)
  ```

2. Install dependencies:
  ```bash
  npm install
  ```

3. Set up your `.env` file with your TMDB API keys and Turso/Upstash credentials.
4. Start the development server:
  ```bash
  npm run dev
  ```
