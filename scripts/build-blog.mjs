// Builds the blog from content/blog/*.md into blog/<slug>/index.html, blog/index.html,
// blog/feed.xml and sitemap.xml. Run by .github/workflows/blog.yml; output is committed
// so GitHub Pages (branch deploy) serves it as plain files.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { marked } from 'marked'

const SITE = 'https://doshi-harsh.github.io'
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SRC = join(ROOT, 'content', 'blog')
const OUT = join(ROOT, 'blog')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function parse(file) {
  const raw = readFileSync(join(SRC, file), 'utf8').replace(/\r\n/g, '\n')
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) throw new Error(`${file}: missing front matter`)
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    v = v.startsWith('[') ? v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean) : v.replace(/^["']|["']$/g, '').replace(/\\"/g, '"')
    meta[kv[1]] = v
  }
  for (const k of ['title', 'slug', 'date', 'summary']) if (!meta[k]) throw new Error(`${file}: front matter missing ${k}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${file}: date must be YYYY-MM-DD`)
  let html = marked.parse(m[2], { gfm: true })
  html = html.replace(/<h([23])>(.*?)<\/h\1>/g, (_, l, t) => `<h${l} id="${slugify(t)}">${t}</h${l}>`)
  const words = m[2].replace(/<!--[\s\S]*?-->/g, '').split(/\s+/).filter(Boolean).length
  return { ...meta, html, minutes: Math.max(1, Math.round(words / 220)), url: `${SITE}/blog/${meta.slug}/` }
}

const fmt = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

const CSS = `
:root{--bg:#0b0f14;--panel:#111821;--fg:#d9e2ee;--muted:#8093a8;--line:#1e2a38;--accent:#4fd1c5;--mono:ui-monospace,"Cascadia Code","SF Mono",Consolas,monospace}
@media (prefers-color-scheme:light){:root{--bg:#f4f6f9;--panel:#fff;--fg:#17212e;--muted:#5a6b80;--line:#d8e0ea;--accent:#0b7a75}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.75 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}
.wrap{max-width:720px;margin:0 auto;padding:0 16px}
.top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:20px 0;border-bottom:1px solid var(--line);font:13px var(--mono)}
.top a{color:var(--muted);text-decoration:none;margin-left:16px}.top a:first-child{margin-left:0;color:var(--fg)}.top a:hover{color:var(--accent)}
main{padding:40px 0 56px}
h1{font-size:2.1rem;line-height:1.2;margin:0 0 10px}
h2{font-size:1.4rem;line-height:1.3;margin:2.2em 0 .5em}
.meta{color:var(--muted);font:13px var(--mono)}
.lede{color:var(--muted);font-size:1.1rem;margin:0 0 8px}
table{width:100%;border-collapse:collapse;font-size:.92rem;margin:1.2em 0;display:block;overflow-x:auto}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font:12px var(--mono);text-transform:uppercase;letter-spacing:.06em}
code{font:.9em var(--mono);background:var(--panel);padding:.1em .35em;border-radius:4px}
pre{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:14px;overflow-x:auto;line-height:1.5}pre code{background:none;padding:0}
blockquote{margin:1.2em 0;padding:.2em 1em;border-left:3px solid var(--accent);color:var(--muted)}
hr{border:0;border-top:1px solid var(--line);margin:2.5em 0}
img{max-width:100%;height:auto}
.list{list-style:none;padding:0;margin:24px 0 0}.list li{padding:18px 0;border-bottom:1px solid var(--line)}
.list a.t{font-size:1.25rem;font-weight:600;text-decoration:none}.list a.t:hover{text-decoration:underline}.list p{margin:6px 0 0;color:var(--muted);font-size:1rem}
footer{border-top:1px solid var(--line);padding:20px 0 40px;font:12px/1.6 var(--mono);color:var(--muted);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.cc-link{background:none;border:0;padding:0;font:inherit;color:var(--accent);text-decoration:underline;cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

function page({ title, description, path, type, head = '', body }) {
  const url = `${SITE}${path}`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="Harsh Doshi">
<meta name="color-scheme" content="dark light">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Harsh Doshi" href="/blog/feed.xml">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Harsh Doshi">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/og-image.png">
${head}
<style>${CSS}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><a href="/">Harsh Doshi</a><span><a href="/blog/">Writing</a><a href="/blog/feed.xml">RSS</a><a href="https://github.com/doshi-harsh">GitHub</a></span></div>
  <main>
${body}
  </main>
  <footer>
    <span>© Harsh Doshi · Ottawa, Ontario</span>
    <span><a href="/privacy.html">Privacy</a> · <button type="button" id="cc-open" class="cc-link">Cookie settings</button></span>
  </footer>
</div>
<script src="/consent.js" defer></script>
</body>
</html>
`
}

const posts = existsSync(SRC)
  ? readdirSync(SRC).filter((f) => f.endsWith('.md')).map(parse).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
  : []

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

for (const p of posts) {
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.summary,
    datePublished: p.date, dateModified: p.date, mainEntityOfPage: p.url, url: p.url, image: `${SITE}/og-image.png`,
    keywords: (p.tags || []).join(', '), author: { '@id': `${SITE}/#person`, '@type': 'Person', name: 'Harsh Doshi', url: SITE },
    publisher: { '@type': 'Person', name: 'Harsh Doshi' } }
  const head = `<meta property="article:published_time" content="${p.date}">\n<meta property="article:author" content="Harsh Doshi">\n` +
    (p.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('\n') +
    `\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`
  const body = `    <p class="meta"><a href="/blog/">&larr; All writing</a></p>
    <article>
      <h1>${esc(p.title)}</h1>
      <p class="meta">${fmt(p.date)} · ${p.minutes} min read${(p.tags || []).length ? ' · ' + p.tags.map(esc).join(', ') : ''}</p>
${p.html}
    </article>`
  mkdirSync(join(OUT, p.slug), { recursive: true })
  writeFileSync(join(OUT, p.slug, 'index.html'), page({ title: `${p.title} | Harsh Doshi`, description: p.summary, path: `/blog/${p.slug}/`, type: 'article', head, body }))
}

const list = posts.length
  ? `    <ul class="list">\n${posts.map((p) => `      <li><a class="t" href="/blog/${p.slug}/">${esc(p.title)}</a><div class="meta">${fmt(p.date)} · ${p.minutes} min read</div><p>${esc(p.summary)}</p></li>`).join('\n')}\n    </ul>`
  : '    <p>The first post is on its way. Subscribe by <a href="/blog/feed.xml">RSS</a>.</p>'
writeFileSync(join(OUT, 'index.html'), page({
  title: 'Writing | Harsh Doshi', path: '/blog/', type: 'website',
  description: 'Notes on delivery, DevOps, leading engineering teams and building with Claude, from Harsh Doshi in Ottawa.',
  head: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Blog', name: 'Harsh Doshi: Writing', url: `${SITE}/blog/`, author: { '@id': `${SITE}/#person` } })}</script>`,
  body: `    <h1>Writing</h1>\n    <p class="lede">Notes on delivery, DevOps, leading engineering teams and building with Claude.</p>\n${list}`,
}))

const cdata = (s) => `<![CDATA[${s.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`
const rfc = (d) => new Date(d + 'T12:00:00Z').toUTCString()
writeFileSync(join(OUT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>Harsh Doshi: Writing</title>
<link>${SITE}/blog/</link>
<description>Notes on delivery, DevOps, leading engineering teams and building with Claude.</description>
<language>en-ca</language>
<atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${posts.length ? `<lastBuildDate>${rfc(posts[0].date)}</lastBuildDate>\n` : ''}${posts.map((p) => `<item>
<title>${cdata(p.title)}</title>
<link>${p.url}</link>
<guid isPermaLink="true">${p.url}</guid>
<pubDate>${rfc(p.date)}</pubDate>
<description>${cdata(p.summary)}</description>
<content:encoded>${cdata(p.html)}</content:encoded>
</item>`).join('\n')}
</channel>
</rss>
`)

const today = posts[0]?.date || new Date().toISOString().slice(0, 10)
const urls = [
  { loc: `${SITE}/`, lastmod: today, freq: 'monthly', pri: '1.0' },
  { loc: `${SITE}/blog/`, lastmod: today, freq: 'weekly', pri: '0.8' },
  ...posts.map((p) => ({ loc: p.url, lastmod: p.date, freq: 'yearly', pri: '0.7' })),
]
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`).join('\n')}
</urlset>
`)
console.log(`built ${posts.length} post(s)`)
