# Fluxa

**Your daily dose of entertainment. Facts first. No bias.**

Fluxa is an all-in-one entertainment platform covering News, Sports, Music, and Facts — built with React, TypeScript, and Supabase.

## Features

- **News Feed** — Breaking stories from multiple sources, deduplicated and ranked
- **Sports Hub** — Live scores, match stats, and team-specific content
- **Music** — Artist reviews, trending tracks, Apple Music search, and Vibe Rooms
- **Fluxa AI** — Ask questions about trending topics and get fact-checked insights
- **Personalization** — Interest-based onboarding with sub-niche selection

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres, Edge Functions, Auth, Realtime)
- **Deployment:** Vercel
- **Content Pipeline:** Hourly cron ingestion from 15+ adapters (news, sports, entertainment APIs)

## Getting Started

```sh
# Clone the repo
git clone <YOUR_GIT_URL>
cd tryfluxa

# Install dependencies
npm install

# Start the dev server
npm run dev
```

## Environment Variables

Copy `env.example` to `.env` and fill in required values (Supabase URL, anon key, API keys).

## Live

[tryfluxa.vercel.app](https://tryfluxa.vercel.app)
