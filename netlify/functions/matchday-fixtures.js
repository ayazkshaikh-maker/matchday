// netlify/functions/matchday-fixtures.js
// Full-coverage fixtures feed for index.html, powered by API-Football (api-sports.io).
// Returns every match scheduled today, grouped by competition, in the shape the page expects.
//
// SETUP
//   1. Get a free key at https://www.api-football.com/  (dashboard -> API key)
//   2. In Netlify: Site settings -> Environment variables -> add  APIFOOTBALL_KEY
//   3. Deploy. The page calls /.netlify/functions/matchday-fixtures automatically.
//
// WHY A FUNCTION: the key must stay server-side, and the API doesn't send CORS
// headers for browser requests. This wraps it and returns clean JSON.

const KEY = process.env.APIFOOTBALL_KEY;
const BASE = "https://v3.football.api-sports.io";

/* ---- Arabic names -------------------------------------------------------
   No football API serves Arabic team names, so we translate the teams,
   competitions and countries your circle actually watches. Anything not in
   the table falls back to the English/Latin name. Grow this over time.     */
const AR = {
  teams: {
    "Real Madrid":"ريال مدريد","Barcelona":"برشلونة","Atletico Madrid":"أتلتيكو مدريد",
    "Manchester City":"مانشستر سيتي","Manchester United":"مانشستر يونايتد","Liverpool":"ليفربول",
    "Arsenal":"آرسنال","Chelsea":"تشيلسي","Tottenham":"توتنهام",
    "Bayern Munich":"بايرن ميونخ","Borussia Dortmund":"بوروسيا دورتموند","Bayer Leverkusen":"باير ليفركوزن",
    "Juventus":"يوفنتوس","Inter":"إنتر","AC Milan":"ميلان","Napoli":"نابولي","AS Roma":"روما",
    "Paris Saint Germain":"باريس سان جيرمان","Marseille":"مارسيليا","Lyon":"ليون","Monaco":"موناكو",
    "Al-Hilal":"الهلال","Al-Nassr":"النصر","Al-Ittihad":"الاتحاد","Al-Ahli":"الأهلي",
    "Portugal":"البرتغال","Nigeria":"نيجيريا","England":"إنجلترا","Costa Rica":"كوستاريكا",
    "Bolivia":"بوليفيا","Algeria":"الجزائر","Colombia":"كولومبيا","Tunisia":"تونس",
    "Brazil":"البرازيل","Argentina":"الأرجنتين","France":"فرنسا","Spain":"إسبانيا",
    "Germany":"ألمانيا","Saudi Arabia":"السعودية","Morocco":"المغرب","Egypt":"مصر",
    "Qatar":"قطر","Iraq":"العراق","Jordan":"الأردن","Oman":"عُمان"
  },
  comps: {
    "UEFA Champions League":"دوري أبطال أوروبا","UEFA Europa League":"الدوري الأوروبي",
    "Premier League":"الدوري الإنجليزي الممتاز","La Liga":"الدوري الإسباني","Serie A":"الدوري الإيطالي",
    "Bundesliga":"الدوري الألماني","Ligue 1":"الدوري الفرنسي","World Cup":"كأس العالم",
    "Pro League":"دوري روشن السعودي","Friendlies":"المباريات الودية"
  },
  countries: {
    "World":"دولي","Brazil":"البرازيل","USA":"الولايات المتحدة","Spain":"إسبانيا",
    "England":"إنجلترا","Italy":"إيطاليا","Germany":"ألمانيا","France":"فرنسا",
    "Saudi-Arabia":"السعودية","Egypt":"مصر","Sweden":"السويد","Finland":"فنلندا",
    "Iran":"إيران","Netherlands":"هولندا","Canada":"كندا","Iceland":"آيسلندا"
  }
};
const ar = (table, en) => (en && AR[table][en]) || en;

/* ---- Broadcasters: official rights-holders for YOUR region (GCC) by league id.
   Only ever list licensed broadcasters here. Add league ids as you expand.  */
const BROADCASTERS = {
  2:   [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],   // Champions League
  3:   [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],   // Europa League
  39:  [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],   // Premier League
  140: [{ n:"TOD TV",           u:"https://www.tod.tv/ar/sports" }], // La Liga
  135: [{ n:"TOD TV",           u:"https://www.tod.tv/ar/sports" }], // Serie A
  78:  [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],   // Bundesliga
  61:  [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],   // Ligue 1
  307: [{ n:"Saudi Sports",     u:"https://www.sssport.com/" }],    // Saudi Pro League
  1:   [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }]    // World Cup
};

const roundLabel = (r) => {
  if (!r) return null;
  const m = /(\d+)/.exec(r);
  return m ? { key:"round", n:Number(m[1]) } : null;
};

exports.handler = async (event) => {
  if (!KEY) return { statusCode:500, body: JSON.stringify({ error:"Missing APIFOOTBALL_KEY" }) };
  try {
    // Date comes from the page (?date=YYYY-MM-DD); default to today; never the future.
    const today = new Date().toISOString().slice(0,10);
    let date = (event.queryStringParameters && event.queryStringParameters.date) || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today;
    if (date > today) date = today;

    const res = await fetch(`${BASE}/fixtures?date=${date}`, { headers: { "x-apisports-key": KEY } });
    if (!res.ok) throw new Error(`api-football ${res.status}`);
    const json = await res.json();

    const groups = {};
    for (const f of json.response || []) {
      const id = f.league.id;
      if (!groups[id]) {
        groups[id] = {
          name:    { en: f.league.name,    ar: ar("comps", f.league.name) },
          country: { en: f.league.country, ar: ar("countries", f.league.country) },
          flag:    "🌍",
          stage:   roundLabel(f.league.round),
          matches: []
        };
      }
      const s = f.fixture.status.short;
      const status =
        ["1H","2H","HT","ET","P","LIVE","BT"].includes(s) ? "live" :
        ["FT","AET","PEN"].includes(s) ? "ft" : "upcoming";

      groups[id].matches.push({
        home: { en: f.teams.home.name, ar: ar("teams", f.teams.home.name) },
        away: { en: f.teams.away.name, ar: ar("teams", f.teams.away.name) },
        ko:   f.fixture.date,                 // UTC ISO — page converts to each viewer's local tz
        status,
        score: { h: f.goals.home, a: f.goals.away },   // null until kickoff
        tv:   BROADCASTERS[id] || []
      });
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache at the CDN so many viewers don't burn your daily API quota.
        "Netlify-CDN-Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "Cache-Control": "public, max-age=60"
      },
      body: JSON.stringify(Object.values(groups))
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }
};
