// netlify/functions/matchday-fixtures.js
const KEY = process.env.APIFOOTBALL_KEY;
const BASE = "https://v3.football.api-sports.io";

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

const BROADCASTERS = {
  2:   [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],
  3:   [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],
  39:  [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],
  140: [{ n:"TOD TV",           u:"https://www.tod.tv/ar/sports" }],
  135: [{ n:"TOD TV",           u:"https://www.tod.tv/ar/sports" }],
  78:  [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],
  61:  [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }],
  307: [{ n:"Saudi Sports",     u:"https://www.sssport.com/" }],
  1:   [{ n:"beIN Sports MENA", u:"https://connect.bein.com/" }]
};

const roundLabel = (r) => {
  if (!r) return null;
  const m = /(\d+)/.exec(r);
  return m ? { key:"round", n:Number(m[1]) } : null;
};

exports.handler = async () => {
  if (!KEY) return { statusCode:500, body: JSON.stringify({ error:"Missing APIFOOTBALL_KEY" }) };
  try {
    const date = new Date().toISOString().slice(0,10);
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
          flag:    f.league.flag || f.league.logo || "🌍",
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
        ko:   f.fixture.date,
        status,
        tv:   BROADCASTERS[id] || []
      });
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Netlify-CDN-Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "Cache-Control": "public, max-age=60"
      },
      body: JSON.stringify(Object.values(groups))
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }
};
