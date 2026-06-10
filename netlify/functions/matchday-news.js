// netlify/functions/matchday-news.js
// Live football news for the ticker on index.html.
// Source: BBC Sport football RSS (free, no API key, updates as stories break).
// No npm dependencies — the RSS is parsed with plain string matching so the
// function deploys with nothing to install.

const FEED = "https://feeds.bbci.co.uk/sport/football/rss.xml";

// Pull the text inside the first <tag>…</tag>, stripping any CDATA wrapper.
function pick(block, tag){
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
  if(!m) return "";
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

exports.handler = async () => {
  try{
    const res = await fetch(FEED, { headers: { "User-Agent": "matchday/1.0" } });
    if(!res.ok) throw new Error(`bbc ${res.status}`);
    const xml = await res.text();

    const items = [];
    const blocks = xml.split(/<item>/i).slice(1);   // each chunk holds one <item>…</item>
    for(const b of blocks){
      const title = pick(b, "title");
      const link  = pick(b, "link");
      const pub   = pick(b, "pubDate");
      if(title && link) items.push({ title, link, pubDate: pub });
      if(items.length >= 15) break;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache at the CDN so frequent polling doesn't hammer the source.
        "Netlify-CDN-Cache-Control": "public, max-age=120, stale-while-revalidate=600",
        "Cache-Control": "public, max-age=120"
      },
      body: JSON.stringify(items)
    };
  }catch(err){
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }
};

// To add more sources later: fetch additional RSS feeds (ESPN, Sky Sports,
// a regional Arabic sports feed), parse each the same way, merge, and sort by
// pubDate descending before returning.
