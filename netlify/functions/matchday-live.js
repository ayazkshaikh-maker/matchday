// netlify/functions/matchday-live.js
// Live detail for in-progress matches: ONE call to /fixtures?live=all returns
// every live match worldwide with current score, elapsed minute, and the goal
// and card events. The page merges this onto the live matches by fixture id.
//
// Quota note: the free plan is 100 requests/day. The page polls this once a
// minute, only while a match is live AND the tab is visible, and the response
// is CDN-cached ~30s so many viewers share one upstream call. Even so, a long
// day of live-watching can approach the daily cap — upgrading the API plan
// removes that ceiling.

const KEY = process.env.APIFOOTBALL_KEY;
const BASE = "https://v3.football.api-sports.io";

exports.handler = async () => {
  if (!KEY) return { statusCode:500, body: JSON.stringify({ error:"Missing APIFOOTBALL_KEY" }) };
  try {
    const res = await fetch(`${BASE}/fixtures?live=all`, { headers: { "x-apisports-key": KEY } });
    if (!res.ok) throw new Error(`api-football ${res.status}`);
    const json = await res.json();

    const out = {};
    for (const f of json.response || []) {
      const homeId = f.teams.home.id;
      const events = [];
      for (const e of f.events || []) {
        let type = null;
        if (e.type === "Goal") type = "goal";
        else if (e.type === "Card") type = /red/i.test(e.detail || "") ? "red" : "yellow";
        else continue;                                   // ignore subs, VAR, etc.
        const extra = e.time && e.time.extra ? `+${e.time.extra}` : "";
        events.push({
          side:   e.team && e.team.id === homeId ? "home" : "away",
          type,
          player: (e.player && e.player.name) || "",
          minute: `${(e.time && e.time.elapsed) ?? ""}${extra}`
        });
      }
      out[f.fixture.id] = {
        elapsed: f.fixture.status.elapsed,
        goals:   { h: f.goals.home, a: f.goals.away },
        events
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Netlify-CDN-Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        "Cache-Control": "public, max-age=30"
      },
      body: JSON.stringify(out)
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }
};
