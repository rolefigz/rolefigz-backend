require('dotenv').config();
const { sequelize, Producto } = require('../src/models');

function generarSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function run() {
  await sequelize.sync({ alter: true });
  const productos = await Producto.findAll();
  let actualizados = 0;

  for (const p of productos) {
    if (!p.slug) {
      let slug = generarSlug(p.nombre);
      const existe = await Producto.findOne({ where: { slug } });
      if (existe && existe.id !== p.id) slug = slug + '-' + p.id;
      await p.update({ slug });
      console.log(`✓ ${p.nombre} → ${slug}`);
      actualizados++;
    }
  }

  console.log(`\nListo. ${actualizados} producto(s) actualizados.`);
  process.exit(0);
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
