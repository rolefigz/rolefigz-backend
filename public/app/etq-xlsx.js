// Lector de Excel (.xlsx) en el navegador, sin librerías: descomprime el zip con DecompressionStream y lee la
// primera hoja. Mismo resultado que leer_xlsx de P21 Studio: primera fila con datos = nombres de columna,
// fechas en dd/mm/aaaa y números enteros sin «.0».
const EtqXlsx = (() => {
  async function inflar(datos) {
    const s = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function zip(buf) {
    const v = new DataView(buf), u8 = new Uint8Array(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('No es un archivo .xlsx');
    const n = v.getUint16(eocd + 10, true);
    let p = v.getUint32(eocd + 16, true);
    const archivos = {};
    const dec = new TextDecoder();
    for (let k = 0; k < n; k++) {
      if (v.getUint32(p, true) !== 0x02014b50) break;
      const metodo = v.getUint16(p + 10, true), tam = v.getUint32(p + 20, true);
      const ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true);
      const local = v.getUint32(p + 42, true);
      const nombre = dec.decode(u8.subarray(p + 46, p + 46 + ln));
      archivos[nombre] = async () => {
        const inicio = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
        const d = u8.subarray(inicio, inicio + tam);
        return dec.decode(metodo === 8 ? await inflar(d) : d);
      };
      p += 46 + ln + le + lc;
    }
    return archivos;
  }
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const hijos = (n, tag) => [...n.getElementsByTagNameNS('*', tag)];
  const FECHAS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

  async function leer(buf) {
    const z = await zip(buf);
    const libro = xml(await z['xl/workbook.xml']());
    const hoja = hijos(libro, 'sheet')[0];
    if (!hoja) throw new Error('El Excel no tiene hojas');
    const rid = hoja.getAttribute('r:id') || hoja.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rels = xml(await z['xl/_rels/workbook.xml.rels']());
    let destino = hijos(rels, 'Relationship').find(r => r.getAttribute('Id') === rid)?.getAttribute('Target') || 'worksheets/sheet1.xml';
    destino = destino.replace(/^\/?xl\//, '').replace(/^\//, '');
    const compartidas = z['xl/sharedStrings.xml'] ? hijos(xml(await z['xl/sharedStrings.xml']()), 'si').map(si => hijos(si, 't').map(t => t.textContent).join('')) : [];
    // estilos de fecha
    const esFecha = [];
    if (z['xl/styles.xml']) {
      const st = xml(await z['xl/styles.xml']());
      const propios = Object.fromEntries(hijos(st, 'numFmt').map(f => [+f.getAttribute('numFmtId'), f.getAttribute('formatCode') || '']));
      const xfs = hijos(st, 'cellXfs')[0];
      if (xfs) hijos(xfs, 'xf').forEach((xf, i) => {
        const id = +xf.getAttribute('numFmtId');
        esFecha[i] = FECHAS.has(id) || (propios[id] && /[dmy]/i.test(propios[id].replace(/"[^"]*"|\[[^\]]*\]/g, '')));
      });
    }
    const p2 = n => String(n).padStart(2, '0');
    const fecha = serial => {
      const d = new Date(Math.round((serial - 25569) * 864e5));
      const s = `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
      return d.getUTCHours() || d.getUTCMinutes() ? `${s} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}` : s;
    };
    const col = ref => { let n = 0; for (const c of ref.replace(/\d+/g, '')) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };
    const sh = xml(await z['xl/' + destino]());
    let cabecera = null; const filas = [];
    for (const fila of hijos(sh, 'row')) {
      const vals = [];
      for (const c of hijos(fila, 'c')) {
        const t = c.getAttribute('t'), vEl = hijos(c, 'v')[0], raw = vEl ? vEl.textContent : '';
        let val = '';
        if (t === 's') val = compartidas[+raw] ?? '';
        else if (t === 'inlineStr') val = hijos(c, 't').map(x => x.textContent).join('');
        else if (t === 'b') val = raw === '1' ? 'True' : 'False';
        else if (t === 'str' || t === 'e') val = raw;
        else if (raw !== '') {
          const num = +raw;
          val = esFecha[+(c.getAttribute('s') || 0)] ? fecha(num) : Number.isInteger(num) ? String(num) : String(num);
        }
        vals[col(c.getAttribute('r') || 'A1')] = String(val).trim();
      }
      for (let i = 0; i < vals.length; i++) vals[i] = vals[i] ?? '';
      if (!vals.some(Boolean)) continue;
      if (!cabecera) { cabecera = vals.map((c, i) => c || `col${i + 1}`); continue; }
      filas.push(Object.fromEntries(cabecera.map((c, i) => [c, vals[i] ?? ''])));
      if (filas.length > 1000) throw new Error('El Excel tiene más de 1000 filas');
    }
    return { hoja: hoja.getAttribute('name'), filas };
  }

  function csv(texto) {
    const rows = []; let row = [], cur = '', q = false;
    texto = texto.replace(/^﻿/, '');
    const primera = texto.split(/\r?\n/, 1)[0];
    const sep = [';', '\t', ','].reduce((a, b) => (primera.split(b).length > primera.split(a).length ? b : a), ',');
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (q) { if (c === '"' && texto[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(v => v !== '')) rows.push(row); row = []; }
      else cur += c;
    }
    row.push(cur); if (row.some(v => v !== '')) rows.push(row);
    const cab = rows.shift() || [];
    return rows.map(r => Object.fromEntries(cab.map((h, i) => [h.trim(), r[i] ?? ''])));
  }

  return { leer, csv };
})();
