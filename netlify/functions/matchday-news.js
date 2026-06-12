// netlify/functions/matchday-news.js
// Live football news for the ticker on index.html, in the page's language.
//   ?lang=en  -> BBC Sport football (English)
//   ?lang=ar  -> Sky News Arabia sport (Arabic), with fallbacks
// Free, no API key, no npm dependencies (RSS parsed with plain string matching).

const FEEDS = {
  en: [
    "https://feeds.bbci.co.uk/sport/football/rss.xml"
  ],
  ar: [
    "https://www.skynewsarabia.com/web/rss/sport.xml",
    "https://www.skynewsarabia.com/web/rss/sports.xml",
    "https://feeds.bbci.co.uk/sport/football/rss.xml"   // last resort so the ticker is never empty
  ]
};

// Text inside the first <tag>…</tag>, stripping any CDATA wrapper.
function pick(block, tag){
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
  if(!m) return "";
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

async function fetchFeed(url){
  const res = await fetch(url, { headers: { "User-Agent": "matchday/1.0" } });
  if(!res.ok) throw new Error(`${res.status}`);
  const xml = await res.text();
  const items = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for(const b of blocks){
    const title = pick(b, "title");
    const link  = pick(b, "link");
    const pub   = pick(b, "pubDate");
    if(title && link) items.push({ title, link, pubDate: pub });
    if(items.length >= 15) break;
  }
  return items;
}

exports.handler = async (event) => {
  const lang = (event.queryStringParameters && event.queryStringParameters.lang) === "ar" ? "ar" : "en";
  let items = [];
  for(const url of FEEDS[lang]){
    try { items = await fetchFeed(url); if(items.length) break; }
    catch(e){ /* feed down or moved — try the next one */ }
  }
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Netlify-CDN-Cache-Control": "public, max-age=120, stale-while-revalidate=600",
      "Cache-Control": "public, max-age=120"
    },
    body: JSON.stringify(items)
  };
};
