/**
 * Lightweight HTML SSR for public clinic pages (SEO-indexable).
 *
 * Why: a Vite React SPA is client-rendered only — crawlers often see an empty shell.
 * Options later: Vike/vite-plugin-ssr, Next.js, or Astro for public marketing pages.
 * This Express HTML layer is the MVP approach for directory + clinic profiles.
 */
const { Router } = require('express');
const bookingBrowse = require('../services/bookingBrowse.service');
const env = require('../config/env');

const router = Router();

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout({ title, description, canonical, body, jsonLd }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta name="robots" content="index,follow" />
  ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
  <style>
    body{font-family:system-ui,sans-serif;margin:0;background:#f3f0e8;color:#1c2a24}
    main{max-width:880px;margin:0 auto;padding:1.5rem}
    a{color:#0a4f44}
    .card{background:#fffdf8;border:1px solid #d9d2c4;border-radius:14px;padding:1rem;margin:.75rem 0}
    .btn{display:inline-block;background:#0f6b5c;color:#fff;text-decoration:none;padding:.6rem 1rem;border-radius:999px}
    .muted{color:#5c6b63}
    h1{font-size:1.8rem}
  </style>
</head>
<body>
  <main>
    <p><a href="${env.apiPublicUrl}/public/clinics">← All clinics</a> · <a href="${env.publicSiteUrl}">Book online</a></p>
    ${body}
  </main>
</body>
</html>`;
}

router.get('/clinics', async (req, res, next) => {
  try {
    const clinics = await bookingBrowse.listActiveClinics();
    const canonical = `${env.apiPublicUrl}/public/clinics`;
    const items = clinics
      .map(
        (c) => `<article class="card">
      <h2><a href="${env.apiPublicUrl}/public/clinics/${escapeHtml(c.slug)}">${escapeHtml(c.name)}</a></h2>
      <p class="muted">${escapeHtml([c.city, c.region].filter(Boolean).join(', '))}</p>
      <p>${escapeHtml((c.specialties || []).join(' · ') || 'General clinic')}</p>
      <p><a class="btn" href="${env.publicSiteUrl}/clinics/${escapeHtml(c.slug)}/book">Book appointment</a></p>
    </article>`
      )
      .join('\n');

    res
      .type('html')
      .send(
        layout({
          title: 'Clinics in Kashmir — Clinicy',
          description:
            'Find private clinics in Kashmir and book doctor appointments online with Clinicy.',
          canonical,
          body: `<h1>Clinic directory</h1><p class="muted">Private clinics on Clinicy</p>${items || '<p>No clinics listed yet.</p>'}`,
          jsonLd: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: clinics.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${env.apiPublicUrl}/public/clinics/${c.slug}`,
              name: c.name,
            })),
          }),
        })
      );
  } catch (err) {
    next(err);
  }
});

router.get('/clinics/:slug', async (req, res, next) => {
  try {
    const { clinic, doctors } = await bookingBrowse.getClinicProfile(req.params.slug);
    const canonical = `${env.apiPublicUrl}/public/clinics/${clinic.slug}`;
    const doctorHtml = doctors
      .map(
        (d) => `<li><strong>Dr ${escapeHtml(d.firstName)} ${escapeHtml(d.lastName)}</strong> — ${escapeHtml(d.specialization)}</li>`
      )
      .join('');

    res.type('html').send(
      layout({
        title: `${clinic.name} — Book doctors | Clinicy`,
        description: `Book appointments at ${clinic.name}${clinic.city ? ` in ${clinic.city}` : ''}. Specialties: ${(clinic.specialties || []).join(', ') || 'general care'}.`,
        canonical,
        body: `
          <h1>${escapeHtml(clinic.name)}</h1>
          <p class="muted">${escapeHtml([clinic.address, clinic.city, clinic.region].filter(Boolean).join(', '))}</p>
          <p>Phone: ${escapeHtml(clinic.phone || '—')}</p>
          <div class="card">
            <h2>Doctors & specialties</h2>
            <ul>${doctorHtml || '<li>No doctors listed</li>'}</ul>
          </div>
          <p><a class="btn" href="${env.publicSiteUrl}/clinics/${escapeHtml(clinic.slug)}/book">Book an appointment</a></p>
          <iframe title="Map" width="100%" height="280" style="border:0;border-radius:12px;margin-top:1rem"
            loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            src="${escapeHtml(clinic.mapEmbedUrl)}"></iframe>
        `,
        jsonLd: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'MedicalClinic',
          name: clinic.name,
          url: canonical,
          telephone: clinic.phone,
          address: {
            '@type': 'PostalAddress',
            streetAddress: clinic.address,
            addressLocality: clinic.city,
            addressRegion: clinic.region,
          },
        }),
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const clinics = await bookingBrowse.listActiveClinics();
    const urls = [
      `${env.apiPublicUrl}/public/clinics`,
      ...clinics.map((c) => `${env.apiPublicUrl}/public/clinics/${c.slug}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  } catch (err) {
    next(err);
  }
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /public/

Sitemap: ${env.apiPublicUrl}/public/sitemap.xml
`);
});

module.exports = router;
