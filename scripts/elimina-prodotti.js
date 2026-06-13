/**
 * Elimina tutti i prodotti lasciando intatte le categorie.
 *
 * Ordine di esecuzione:
 *   1. NULL   → detalles_orden.producto_id   (preserva storico ordini)
 *   2. NULL   → visitas.producto_id           (preserva analytics)
 *   3. DELETE → variantes_producto
 *   4. DELETE → imagenes_producto
 *   5. DELETE → resenas
 *   6. DELETE → productos
 */

require("dotenv").config();
const sequelize = require("../src/config/db");

async function main() {
  await sequelize.authenticate();
  console.log("DB connesso.\n");

  const [totale] = await sequelize.query("SELECT COUNT(*) AS n FROM productos");
  const n = totale[0].n;
  console.log(`Prodotti trovati: ${n}`);
  if (n == 0) {
    console.log("Nessun prodotto da eliminare.");
    process.exit(0);
  }

  console.log("\nATTENZIONE: questa operazione è irreversibile.");
  console.log("Premi CTRL+C nei prossimi 5 secondi per annullare...\n");
  await new Promise(r => setTimeout(r, 5000));

  const t = await sequelize.transaction();
  try {
    let r;

    r = await sequelize.query(
      "UPDATE detalles_orden SET producto_id = NULL WHERE producto_id IS NOT NULL",
      { transaction: t }
    );
    console.log(`detalles_orden → producto_id nullato (${r[1]} righe)`);

    r = await sequelize.query(
      "UPDATE visitas SET producto_id = NULL WHERE producto_id IS NOT NULL",
      { transaction: t }
    );
    console.log(`visitas → producto_id nullato (${r[1]} righe)`);

    r = await sequelize.query("DELETE FROM variantes_producto", { transaction: t });
    console.log(`variantes_producto eliminato (${r[1]} righe)`);

    r = await sequelize.query("DELETE FROM imagenes_producto", { transaction: t });
    console.log(`imagenes_producto eliminato (${r[1]} righe)`);

    r = await sequelize.query("DELETE FROM resenas", { transaction: t });
    console.log(`resenas eliminato (${r[1]} righe)`);

    r = await sequelize.query("DELETE FROM productos", { transaction: t });
    console.log(`productos eliminato (${r[1]} righe)`);

    await t.commit();
    console.log("\n✅ Tutti i prodotti eliminati. Categorie intatte.");
  } catch (err) {
    await t.rollback();
    console.error("\n❌ Errore — rollback eseguito:", err.message);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
