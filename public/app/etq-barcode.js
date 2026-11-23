// Códigos de barras 1D: réplica en JavaScript de python-barcode 0.16.1, la librería que usa P21 Studio de RoleMaker,
// para que el mismo diseño dé exactamente las mismas barras en el PC y en el teléfono. Tablas en etq-barcode-tablas.js.
const EtqBarcode = (() => {
  const T = ETQ_TABLAS_BARRAS;
  const esDigito = c => c >= '0' && c <= '9';
  const soloDigitos = s => /^\d+$/.test(s);

  function code128(code, gs1 = false) {
    const FNC1 = '\xf1';
    if (gs1) code = FNC1 + code;   // como python-barcode: los paréntesis se codifican tal cual
    for (const ch of code) if (!(ch in T.c128.A) && !(ch in T.c128.B) && !esDigito(ch)) throw new Error(`Carácter no admitido en Code 128: «${ch}»`);
    let charset = 'C', buffer = '';
    const conv = ch => {
      if (charset === 'A') return T.c128.A[ch];
      if (charset === 'B') return T.c128.B[ch];
      if (ch in T.c128.C) return T.c128.C[ch];
      if (esDigito(ch)) { buffer += ch; if (buffer.length === 2) { const v = +buffer; buffer = ''; return v; } return null; }
      throw new Error(`Carácter ${ch} imposible en el juego ${charset}`);
    };
    const nuevo = w => { const c = conv('TO_' + w); charset = w; return [c]; };
    const cambio = pos => {
      const ch = code[pos], sig = code.slice(pos, pos + 10);
      const masDe3 = () => { let n = 0; for (const c of sig) { if (esDigito(c)) n++; else break; } return n > 3; };
      let out = [];
      if (charset === 'C' && !esDigito(ch)) {
        if (gs1 && ch === FNC1 && !buffer) return out;
        if (ch in T.c128.B) out = nuevo('B'); else if (ch in T.c128.A) out = nuevo('A');
        if (buffer.length === 1) { out.push(conv(buffer[0])); buffer = ''; }
      } else if (charset === 'B') {
        if (masDe3()) out = nuevo('C'); else if (!(ch in T.c128.B) && ch in T.c128.A) out = nuevo('A');
      } else if (charset === 'A') {
        if (masDe3()) out = nuevo('C'); else if (!(ch in T.c128.A) && ch in T.c128.B) out = nuevo('B');
      }
      return out;
    };
    let enc = [T.c128.START.C];
    [...code].forEach((ch, i) => { enc.push(...cambio(i)); const v = conv(ch); if (v != null) enc.push(v); });
    if (buffer.length === 1) { enc.push(...nuevo('B')); enc.push(conv(buffer[0])); buffer = ''; }
    if (String(enc[1]) in T.c128.TO) enc = [T.c128.TO[String(enc[1])], ...enc.slice(2)];
    const suma = enc.reduce((s, v, i) => s + (i === 0 ? v : i * v), 0) % 103;
    enc.push(suma);
    return { modulos: enc.map(v => T.c128.CODES[v]).join('') + T.c128.STOP + '11', texto: gs1 ? code.slice(1) : code };
  }

  function sumaEan(base) {
    const ds = [...base].map(Number);
    let par = 0, impar = 0;
    for (let k = ds.length - 2; k >= 0; k -= 2) par += ds[k];
    for (let k = ds.length - 1; k >= 0; k -= 2) impar += ds[k];
    return (10 - ((par + impar * 3) % 10)) % 10;
  }
  function ean13(code, n = 12) {
    if (!soloDigitos(code.slice(0, n)) || code.length < n) throw new Error(`EAN-13 necesita ${n} dígitos (o ${n + 1} con el de control)`);
    const ean = code.slice(0, n) + sumaEan(code.slice(0, n));
    let m = T.ean.EDGE;
    const pat = T.ean.LEFT[+ean[0]];
    [...ean.slice(1, 7)].forEach((d, i) => { m += T.ean.CODES[pat[i]][+d]; });
    m += T.ean.MIDDLE;
    for (const d of ean.slice(7)) m += T.ean.CODES.C[+d];
    return { modulos: m + T.ean.EDGE, texto: ean };
  }
  function ean8(code) {
    if (!soloDigitos(code.slice(0, 7)) || code.length < 7) throw new Error('EAN-8 necesita 7 dígitos (u 8 con el de control)');
    const ean = code.slice(0, 7) + sumaEan(code.slice(0, 7));
    let m = T.ean.EDGE;
    for (const d of ean.slice(0, 4)) m += T.ean.CODES.A[+d];
    m += T.ean.MIDDLE;
    for (const d of ean.slice(4)) m += T.ean.CODES.C[+d];
    return { modulos: m + T.ean.EDGE, texto: ean };
  }
  function upca(code) {
    const u = code.slice(0, 11);
    if (!soloDigitos(u) || u.length !== 11) throw new Error('UPC-A necesita 11 dígitos (o 12 con el de control)');
    const ds = [...u].map(Number);
    const s = ds.reduce((t, d, i) => t + (i % 2 === 0 ? d * 3 : d), 0) % 10;
    const upc = u + (s === 0 ? 0 : 10 - s);
    let m = T.upc.EDGE;
    for (const d of upc.slice(0, 6)) m += T.upc.CODES.L[+d];
    m += T.upc.MIDDLE;
    for (const d of upc.slice(6)) m += T.upc.CODES.R[+d];
    return { modulos: m + T.upc.EDGE, texto: upc };
  }
  function code39(code) {
    code = code.toUpperCase();
    for (const c of code) if (!(c in T.c39.MAP)) throw new Error(`Carácter no admitido en Code 39: «${c}»`);
    const suma = [...code].reduce((s, c) => s + T.c39.MAP[c][0], 0) % 43;
    code += Object.keys(T.c39.MAP).find(k => T.c39.MAP[k][0] === suma);
    return { modulos: [T.c39.EDGE, ...[...code].map(c => T.c39.MAP[c][1]), T.c39.EDGE].join(T.c39.MIDDLE), texto: code };
  }
  const anchos = (data, n = 2, w = 5) => [...data].map(e => ({ W: '1'.repeat(w), w: '0'.repeat(w), N: '1'.repeat(n), n: '0'.repeat(n) }[e] || '')).join('');
  function itf(code) {
    if (!soloDigitos(code)) throw new Error('ITF solo admite números');
    if (code.length % 2) code = '0' + code;
    let d = T.itf.START;
    for (let i = 0; i < code.length; i += 2)
      for (let j = 0; j < 5; j++) { d += T.itf.CODES[+code[i]][j].toUpperCase(); d += T.itf.CODES[+code[i + 1]][j].toLowerCase(); }
    return { modulos: anchos(d + T.itf.STOP), texto: code };
  }
  function codabar(code) {
    const ini = T.codabar.STARTSTOP[code[0]], fin = T.codabar.STARTSTOP[code[code.length - 1]];
    if (!ini || !fin || code.length < 2) throw new Error('Codabar empieza y termina con A, B, C o D (p. ej. A1234B)');
    const medio = [...code.slice(1, -1)].map(c => { if (!T.codabar.CODES[c]) throw new Error('Codabar solo admite números y $:/.+-'); return T.codabar.CODES[c]; });
    return { modulos: anchos(ini + 'n' + medio.join('n') + 'n' + fin), texto: code };
  }

  const ALIAS = { jan13: 'jan', ean: 'ean13', upc: 'upca', isbn: 'isbn13', nw7: 'codabar', gs1128: 'gs1_128' };
  function codificar(simb, data) {
    let s = String(simb || 'code128').trim().toLowerCase();
    s = ALIAS[s.replace(/[-_]/g, '')] || s;
    data = String(data);
    let r;
    switch (s) {
      case 'code128': r = code128(data); break;
      case 'gs1_128': r = code128(data, true); break;
      case 'ean13': r = ean13(data); break;
      case 'jan':
        if (!/^4[59]/.test(data)) throw new Error('JAN empieza por 45 o 49');
        r = ean13(data); break;
      case 'isbn13': {
        const d = data.replace(/-/g, '');
        if (!/^97[89]/.test(d)) throw new Error('ISBN empieza por 978 o 979');
        r = ean13(d); break;
      }
      case 'ean8': r = ean8(data); break;
      case 'upca': r = upca(data); break;
      case 'code39': r = code39(data); break;
      case 'itf': r = itf(data); break;
      case 'codabar': r = codabar(data); break;
      default: throw new Error(`Tipo no admitido: ${simb}`);
    }
    const dig = v => String(v).replace(/[^0-9A-Za-z]/g, '');
    if (!dig(r.texto).startsWith(dig(data.trim())))
      r.aviso = `${data} se imprimirá como ${r.texto} (revisa el dígito de control y el número de dígitos)`;
    return r;
  }

  const TIPOS = ['code128', 'ean13', 'ean8', 'upca', 'code39', 'itf', 'codabar', 'isbn13', 'jan', 'gs1_128'];
  return { codificar, TIPOS };
})();
