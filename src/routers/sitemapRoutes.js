const express   = require("express");
const router    = express.Router();
const { Prodotto, Articolo } = require("../models");

router.get("/sitemap.xml", async (req, res) => {
  try {
    const base = "https://www.rolefigz.com";
    const oggi = new Date().toISOString().split("T")[0];

    const prodotti = await Prodotto.findAll({ where: { stock: { [require("sequelize").Op.gt]: 0 } }, attributes: ["slug","updatedAt"] });
    const articoli = await Articolo.findAll({ where: { pubblicato: true }, attributes: ["slug","updatedAt"] });

    const staticPages = [
      { loc: base, priority: "1.0", changefreq: "weekly" },
      { loc: `${base}/blog`,    priority: "0.7", changefreq: "weekly" },
    ];

    const urls = [
      ...staticPages.map(p => `
    <url>
      <loc>${p.loc}</loc>
      <lastmod>${oggi}</lastmod>
      <changefreq>${p.changefreq}</changefreq>
      <priority>${p.priority}</priority>
    </url>`),
      ...prodotti.map(p => `
    <url>
      <loc>${base}/producto/${p.slug || p.id}</loc>
      <lastmod>${new Date(p.updatedAt).toISOString().split("T")[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`),
      ...articoli.map(a => `
    <url>
      <loc>${base}/blog/${a.slug}</loc>
      <lastmod>${new Date(a.updatedAt).toISOString().split("T")[0]}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.6</priority>
    </url>`),
    ];

    res.setHeader("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>`);
  } catch (err) {
    res.status(500).send("Errore generazione sitemap");
  }
});

module.exports = router;
