// Nelko P21 por Bluetooth LE desde el navegador (Web Bluetooth: Chrome de Android y de escritorio).
// Mismo protocolo que P21 Studio de RoleMaker (app/etiquetas/p21studio/protocol.py): comandos TSPL-like y un
// bitmap de 96 puntos de ancho (14 mm), bit 0 = negro.
const P21 = (() => {
  const SERVICIO = '0000ff00-0000-1000-8000-00805f9b34fb';
  const ESCRIBIR = '0000ff02-0000-1000-8000-00805f9b34fb';
  const AVISAR = '0000ff01-0000-1000-8000-00805f9b34fb';
  const ANCHO = 96, BYTES_FILA = 12;
  const PUNTOS_MM = 8, CORTO = 8, BORDE = 4, INICIO = 19, ANTES = INICIO + BORDE;
  const TROZO = 20, PAUSA = 12;   // 20 bytes caben siempre (MTU mínimo); la pausa evita saturar la impresora
  const CRLF = '\r\n';
  const enc = new TextEncoder();
  const LISTA = { 0: 'Lista', 1: 'La tapa está abierta', 4: 'No hay etiquetas', 32: 'Imprimiendo' };

  let disp = null, car = null, buffer = [], esperas = [];
  const soporta = !!navigator.bluetooth;

  // puntos de diseño a lo largo de la etiqueta (la etiqueta real mide ~1 mm menos y se deja 0,5 mm por lado)
  const largoPuntos = mm => Math.max(8, Math.floor(mm * PUNTOS_MM + 0.5) - CORTO - 2 * BORDE);
  const hueco = mm => (Math.round(mm) === 50 ? 7.5 : 5.0);

  function alAvisar(e) {
    const v = new Uint8Array(e.target.value.buffer);
    buffer.push(...v);
    esperas.splice(0).forEach(f => f());
  }
  async function leer(n, ms) {
    const fin = Date.now() + ms;
    while (buffer.length < n && Date.now() < fin) await new Promise(r => { esperas.push(r); setTimeout(r, 100); });
    return buffer.splice(0, n);
  }

  async function conectar() {
    if (!soporta) throw new Error('Este navegador no tiene Bluetooth: usa Chrome en Android.');
    if (!disp) {
      disp = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'P21' }, { namePrefix: 'Nelko' }, { namePrefix: 'P22' }, { services: [SERVICIO] }],
        optionalServices: [SERVICIO],
      });
      disp.addEventListener('gattserverdisconnected', () => { car = null; });
    }
    if (!car) {
      const srv = await disp.gatt.connect();
      const s = await srv.getPrimaryService(SERVICIO);
      car = await s.getCharacteristic(ESCRIBIR);
      const av = await s.getCharacteristic(AVISAR);
      await av.startNotifications();
      av.addEventListener('characteristicvaluechanged', alAvisar);
    }
    return disp.name || 'P21';
  }
  const conectada = () => !!car;
  function desconectar() { try { disp && disp.gatt.disconnect(); } catch {} car = null; disp = null; }

  async function enviar(bytes) {
    for (let i = 0; i < bytes.length; i += TROZO) {
      const t = bytes.subarray(i, i + TROZO);
      if (car.writeValueWithoutResponse) await car.writeValueWithoutResponse(t); else await car.writeValue(t);
      await new Promise(r => setTimeout(r, PAUSA));
    }
  }

  async function estado() {
    buffer = [];
    await enviar(enc.encode('\x1b!?' + CRLF));
    const r = await leer(1, 3000);
    if (!r.length) throw new Error('La impresora no responde: ¿está encendida?');
    return r[0];
  }

  // lienzo apaisado (largoPuntos × 96) → bitmap vertical 96 × N girado 90° a la derecha, con las filas en blanco
  // que la P21 necesita antes del diseño
  // vertical = el diseño ya está en la orientación de la impresora (96 de ancho), como «Vert.» en P21 Studio
  function bitmap(lienzo, vertical = false) {
    const W = lienzo.width, H = lienzo.height;
    if (vertical ? W !== ANCHO : H !== ANCHO) throw new Error('El diseño tiene que medir 96 puntos en el lado corto.');
    const d = lienzo.getContext('2d').getImageData(0, 0, W, H).data;
    const largo = vertical ? H : W;
    const filas = ANTES + largo, out = new Uint8Array(filas * BYTES_FILA).fill(0xff);
    for (let yP = 0; yP < largo; yP++) {      // fila del retrato = columna del apaisado
      for (let xP = 0; xP < ANCHO; xP++) {    // columna del retrato = fila del apaisado, de abajo arriba
        const x = vertical ? xP : yP, y = vertical ? yP : H - 1 - xP, i = (y * W + x) * 4;
        const negro = d[i + 3] > 127 && (d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114) < 128;
        if (negro) out[(ANTES + yP) * BYTES_FILA + (xP >> 3)] &= ~(0x80 >> (xP & 7));
      }
    }
    return { datos: out, alto: filas };
  }

  async function imprimir(lienzo, { largo = 40, ancho = 14, separacion = null, densidad = 15, copias = 1, vertical = false } = {}) {
    await conectar();
    let cod = await estado();
    for (let t = 0; cod === 32 && t < 30; t++) { await new Promise(r => setTimeout(r, 600)); cod = await estado(); }
    if (cod !== 0) throw new Error(`La impresora no está lista: ${LISTA[cod] || 'estado ' + cod}`);
    const { datos, alto } = bitmap(lienzo, vertical);
    const gap = separacion == null ? hueco(largo) : +separacion;
    const cab = enc.encode('\x1b!o' + CRLF + `SIZE ${(+ancho).toFixed(1)} mm,${(+largo).toFixed(1)} mm` + CRLF + `GAP ${gap.toFixed(1)} mm,0 mm` + CRLF +
      'DIRECTION 1,1' + CRLF + `DENSITY ${Math.max(1, Math.min(15, densidad | 0))}` + CRLF + 'CLS' + CRLF + `BITMAP 0,0,${BYTES_FILA},${alto},1,`);
    const pie = enc.encode(CRLF + `PRINT ${Math.max(1, copias | 0)}` + CRLF);
    const trabajo = new Uint8Array(cab.length + datos.length + pie.length);
    trabajo.set(cab, 0); trabajo.set(datos, cab.length); trabajo.set(pie, cab.length + datos.length);
    buffer = [];
    await enviar(trabajo);          // a partir de aquí no se reenvía nunca (evita etiquetas dobles)
    await leer(16, 8000);           // respuesta de estado de la impresora
  }

  return { soporta, conectar, conectada, desconectar, imprimir, largoPuntos, ALTO: ANCHO, nombre: () => disp?.name || '' };
})();
