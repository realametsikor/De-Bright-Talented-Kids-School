export default async function handler(req, res) {
  
  // Fetch all published articles from Supabase
  const supabaseUrl = 'https://ilxzzmsqtzvjvkkdqhbe.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseHp6bXNxdHp2anZra2RxaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDgwMjYsImV4cCI6MjA5MjE4NDAyNn0.l4zkNBGopLdE8Wt3KMHnfxySHwFHyEoto8txBgh4wMY';

  const response = await fetch(
    `${supabaseUrl}/rest/v1/articles?status=eq.published&select=title,created_at,cover_image`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    }
  );

  const articles = await response.json();

  // Same slug function used in articles.html
  const createSlug = (title) =>
    title.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const staticPages = `
  <url>
    <loc>https://debrighttalentedkidsschool.online/</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.00</priority>
  </url>
  <url>
    <loc>https://debrighttalentedkidsschool.online/about</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://debrighttalentedkidsschool.online/apply</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://debrighttalentedkidsschool.online/contact</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://debrighttalentedkidsschool.online/articles</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
  </url>
  <url>
    <loc>https://debrighttalentedkidsschool.online/gallery</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>
  <url>
    <loc>https://debrighttalentedkidsschool.online/De-Bright-LMS-Portal/</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.65</priority>
  </url>`;

  const articlePages = articles.map(article => {
    const slug = createSlug(article.title);
    const lastmod = article.created_at
      ? article.created_at.split('T')[0]
      : '2026-06-06';
    const imageTag = article.cover_image
      ? `
    <image:image>
      <image:loc>${article.cover_image}</image:loc>
      <image:title>${article.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</image:title>
    </image:image>`
      : '';

    return `
  <url>
    <loc>https://debrighttalentedkidsschool.online/articles?post=${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>${imageTag}
  </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticPages}
${articlePages}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(xml);
}
