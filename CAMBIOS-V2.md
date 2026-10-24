# RoleFigz v2 — qué cambió y cómo probarlo

Copia completa del backend con la interfaz rehecha. **El repo original no se tocó y no hay ningún commit.**
La base de datos no cambió: ni modelos, ni migraciones, ni escrituras. Las APIs y la lógica de JS siguen iguales (mismos IDs y funciones).

## Cómo verlo en tu PC
1. Copia esta carpeta junto a tu backend actual (o sustituye `public/`, `server.js` y `src/` en una rama aparte).
2. Usa tu `.env` de siempre y ejecuta `npm install` y luego `npm start`.
3. Abre `http://localhost:3000`. Las capturas están en `preview/`.

## Qué hay de nuevo

### Diseño (toda la web)
- Nueva paleta: naranja filamento `#F26A1B` sobre grafito y blanco cálido. Tipografía Barlow Condensed (títulos) + DM Sans (texto).
- Los tokens de color están en `public/css/v2-tokens.css`: cambias un color ahí y cambia en todas las páginas.
- `public/css/v2.css`: tienda, ficha de producto, carrito, login, checkout, perfil, blog y chat.
- `public/css/v2-pages.css`: kit, segnaposti, gadget 3D, páginas legales y 404.
- `public/css/admin-v2.css`: panel admin rediseñado (barra lateral oscura, tarjetas, tablas y formularios). **La lógica del admin es la misma.**
- Landing NFC (`/nfc`) y cuenta NFC: misma paleta y tipografías que el resto.

### Home
- **Hero 3D interactivo** (`public/js/hero3d.js`, Three.js): tu logo se imprime capa por capa en una cama de impresora, con boquilla y filamento fundido. Al terminar se puede girar con el ratón o el dedo, sigue al puntero y rota al hacer scroll. Si el dispositivo no tiene WebGL, muestra el logo estático.
- **Animaciones** (`public/js/v2-motion.js`, GSAP + Lenis): scroll suave, títulos que aparecen palabra a palabra, tarjetas en cascada, botones magnéticos, inclinación 3D al pasar el ratón por las tarjetas, parallax en las imágenes, barra de progreso, contadores y transiciones entre vistas.
- Con "reducir movimiento" activado en el sistema, todo se muestra estático.
- Secciones nuevas: cinta de servicios, bento de servicios (tienda, merch, segnaposti, gadget, NFC), **figuras personalizadas** (la línea de Funko Pop que el vault marca como objetivo SEO), **circuitos F1**, FAQ en dos columnas y un CTA final por WhatsApp.

### Privados (B2C) y empresas (B2B) separados
- La home ahora habla a **particulares**: figuras desde tu foto, regalos, catálogo y circuitos F1.
- Nueva página **`/aziende`** (`public/aziende.html` + `css/v2-aziende.css`) para negocios: kit merch con logo, segnaposti QR/NFC, RoleFigz NFC, gadgets para eventos, producción en volumen y 4ByteMenu, más los 4 pasos, los sectores, una FAQ y el presupuesto por WhatsApp.
- Selector **Privati / Aziende** en la cabecera, una tarjeta y una franja en la home que llevan a `/aziende`, y footer con columnas separadas.
- Kit, segnaposti y gadget 3D enlazan de vuelta a `/aziende`.
- La marca B2B aparece como "RoleFigz per le aziende" hasta que decidas el nombre nuevo; se cambia en `aziende.html`.

### Entrada: elección Privati / Aziende
- Al entrar en la home aparece una pantalla partida: **Privati** (figuras, regalos, circuitos) y **Aziende** (merch NFC, segnaposti, eventos). El logo 3D se imprime en la línea que las separa.
- **Privati:** la pantalla se abre hacia arriba y el logo pasa al hero de la tienda. **Aziende:** esa mitad llena la pantalla y lleva a `/aziende`.
- Sale una vez por sesión (`sessionStorage`). No sale en fichas de producto, blog ni checkout, ni con un `#` en la URL; el selector de arriba sirve para cambiar.
- Archivos: `js/v2-gate.js`, el bloque "INGRESSO" de `css/v2.css` y el script corto al principio de `index.html`. Sin JS, la tienda se ve directamente.
- Solo fotos con fondo negro en toda la web.

### Circuitos F1 conectados
- La landing de `rolefigz-circuitos` ahora vive dentro de la web en **`/f1/`**, con su identidad NRG en rojo. Está enlazada desde el menú, la home, el footer y el sitemap, y tiene un botón para volver a rolefigz.com.
- Sus pedidos siguen funcionando igual (FormSubmit).

### SEO (prioridad del vault)
- `/producto/:slug` ahora sirve título, descripción, Open Graph y **datos estructurados de Producto + breadcrumb** en el primer HTML (`src/utils/seoProdotto.js`). Google, WhatsApp y las IA ven cada producto sin ejecutar JS. Solo **lee** de la DB; si algo falla, sirve la página normal.
- Nueva pregunta frecuente "figuras estilo Funko Pop", visible y en JSON-LD.
- Sitemap: se añaden `/f1/`, `/nfc` y `/gadget3d.html`.

### Ficha de producto
- Sellos de confianza (hecho en Piacenza, envío, pago seguro), botón "pídelo a medida" por WhatsApp con el nombre del producto y botón de compra fijo en el móvil.

### Productos
- `docs/prodotti-testi-migliorati.md`: nombres, slugs y descripciones nuevos en italiano para cada producto de tu calculadora, listos para pegar desde el admin.

### Librerías locales
Three.js, GSAP, Lenis y Lucide se sirven desde `public/vendor/` (versiones fijas): no dependen de CDN externos.

## Para revisar antes de publicar
- **Número de WhatsApp:** corregido a +39 392 822 5406 en todos los textos (los enlaces `wa.me` ya apuntaban ahí). En la plantilla de presupuestos del Excel sigue +39 351 524 2495: cámbialo allí si ya no es el bueno.
- El banner "Sito in costruzione" sigue ahí: quítalo cuando lances.
- Las cifras del hero ("6 stampanti", "0,1 mm") son fijas; el número de productos sale de la API.
- Pruébalo con tu DB real en local antes del deploy: desde aquí solo pude probar con datos simulados.
