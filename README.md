# Matchday · يوم المباراة

A bilingual (English / Arabic) football matchday platform: today's fixtures from
around the world, official broadcaster links, and shareable watch-together rooms
with live chat, reactions and a friendly prediction game.

```
.
├── index.html                          ← fixtures orchestrator (home page)
├── room.html                           ← watch-together room
├── netlify.toml                        ← Netlify config
└── netlify/functions/
    └── matchday-fixtures.js            ← live fixtures feed (API-Football)
```

## Deploy once (about 10 minutes)

### 1. Get the two API keys

**Fixtures — API-Football (free tier):**
1. Sign up at https://www.api-football.com/
2. Copy your API key from the dashboard.

**Rooms — Supabase (free tier):**
1. Create a project at https://supabase.com
2. Go to **Project Settings → API**.
3. Copy the **Project URL** and the **anon public** key.
   (The anon key is meant to be used in the browser — it's safe to ship.)
   Realtime is enabled by default and the rooms need **no database tables**.

### 2. Add the keys

- Paste the Supabase **URL** and **anon key** into the `CONFIG` block at the top
  of `room.html`.
- The API-Football key goes into Netlify as an **environment variable** (next step),
  not into a file — it must stay server-side.

### 3. Deploy to Netlify

Easiest: drag this whole folder into https://app.netlify.com/drop
Better (auto-rebuilds): push to your GitHub repo and "Add new site → Import".

Then in **Site settings → Environment variables**, add:

| Key                | Value                  |
|--------------------|------------------------|
| `APIFOOTBALL_KEY`  | your API-Football key  |

Trigger a redeploy after adding the variable.

### 4. Verify

- Open `https://YOURSITE/.netlify/functions/matchday-fixtures` — you should get JSON.
- Open the site, switch EN ⇄ ع, confirm fixtures show in your local time.
- Click **Watch together** on any match, open the link in two browser windows,
  and check that chat, reactions, the GOAL button and predictions sync.

## Good to know

- **Until the keys are set**, the home page falls back to sample fixtures and the
  room shows a short setup screen — nothing crashes.
- **API-Football free tier = 100 requests/day.** The function sets a 60-second CDN
  cache so many viewers share one upstream call. Fine for friends-and-family scale;
  upgrade the plan if you go bigger.
- **Arabic team names** come from a lookup table in the function (no football API
  serves them). Add the teams your circle watches to the `AR` object as needed.
- **Broadcaster links** in the function are set to GCC rights-holders (beIN, TOD,
  Saudi Sports). They point only to official, licensed streams — never pirate feeds.
- **Voice chat** (talking/cheering aloud together) isn't included: reliable group
  voice needs a media service. The clean add-on is LiveKit or Daily — drop their
  browser SDK into `room.html` and join a room named after `MATCH.id`. Everything
  else (text, reactions, predictions) already works without it.
- **Real-money betting is intentionally absent.** Predictions are points-only and
  reset per room — friendly, and legal in Oman/GCC where cash betting is not.
