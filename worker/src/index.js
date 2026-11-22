// Servicio de avisos de Físico (Cloudflare Worker). Manda la notificación de "terminó el descanso" al teléfono
// a la hora justa, aunque la app esté cerrada o él esté en otra app.
//
// Cómo funciona: la app, al anotar una serie, le dice "avisame en 180 segundos" (POST /programar). Un Durable Object
// por teléfono guarda el pedido y pone una alarma; cuando suena, manda un Web Push (cifrado, como pide el estándar)
// al servicio de notificaciones del teléfono (Apple, Google o Mozilla).
//
// No hay ninguna clave en el repositorio: las llaves VAPID (las que identifican al que manda los avisos) se crean
// solas la primera vez y quedan guardadas adentro del servicio.

import { DurableObject } from "cloudflare:workers";

const ORIGENES = ["https://maticaldas-del.github.io", "http://localhost:8765"];
// Sólo se mandan avisos a los servicios de notificaciones conocidos (para que nadie lo use para otra cosa).
const SERVICIOS = [/\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];

const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const txt = (s) => new TextEncoder().encode(s);
const unir = (...ps) => { const n = ps.reduce((t, p) => t + p.length, 0), o = new Uint8Array(n); let i = 0; for (const p of ps) { o.set(p, i); i += p.length; } return o; };
async function hmac(clave, datos) { const k = await crypto.subtle.importKey("raw", clave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return new Uint8Array(await crypto.subtle.sign("HMAC", k, datos)); }

// Cifrado del mensaje para el teléfono (RFC 8291, "aes128gcm").
export async function cifrar(sub, mensaje) {
  const uaPub = deb64u(sub.keys.p256dh), auth = deb64u(sub.keys.auth);
  const par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secreto = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, par.privateKey, 256));
  const prkKey = await hmac(auth, secreto);
  const ikm = await hmac(prkKey, unir(txt("WebPush: info\0"), uaPub, asPub, new Uint8Array([1])));
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(sal, ikm);
  const cek = (await hmac(prk, unir(txt("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, unir(txt("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, unir(txt(mensaje), new Uint8Array([2]))));
  const cab = new Uint8Array(21); cab.set(sal, 0); new DataView(cab.buffer).setUint32(16, 4096); cab[20] = asPub.length;
  return unir(cab, asPub, cifrado);
}

// Firma VAPID (un JWT ES256) para el servicio de notificaciones.
export async function vapid(endpoint, llaves) {
  const aud = new URL(endpoint).origin;
  const cab = b64u(txt(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const cuerpo = b64u(txt(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://maticaldas-del.github.io/fisico/" })));
  const priv = await crypto.subtle.importKey("jwk", llaves.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, txt(cab + "." + cuerpo));
  return `vapid t=${cab}.${cuerpo}.${b64u(firma)}, k=${llaves.pub}`;
}

export async function mandarPush(sub, mensaje, llaves) {
  const cuerpo = await cifrar(sub, mensaje);
  return fetch(sub.endpoint, {
    method: "POST",
    headers: { Authorization: await vapid(sub.endpoint, llaves), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "120", Urgency: "high" },
    body: cuerpo,
  });
}

// Un objeto por teléfono (guarda el aviso pendiente y su alarma) y uno llamado "llaves" que guarda las llaves VAPID.
export class Avisos extends DurableObject {
  async llaves() {
    let l = await this.ctx.storage.get("llaves");
    if (!l) {
      const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      l = { pub: b64u(await crypto.subtle.exportKey("raw", par.publicKey)), priv: await crypto.subtle.exportKey("jwk", par.privateKey) };
      await this.ctx.storage.put("llaves", l);
    }
    return l;
  }
  async programar(aviso) { await this.ctx.storage.put("aviso", aviso); await this.ctx.storage.setAlarm(aviso.at); return true; }
  async cancelar() { await this.ctx.storage.delete("aviso"); await this.ctx.storage.deleteAlarm(); return true; }
  async alarm() {
    const a = await this.ctx.storage.get("aviso");
    if (!a) return;
    if (a.at > Date.now() + 500) { await this.ctx.storage.setAlarm(a.at); return; }
    await this.ctx.storage.delete("aviso");
    const r = await mandarPush(a.sub, JSON.stringify({ t: a.titulo, b: a.cuerpo, tag: "descanso" }), a.llaves);
    await this.ctx.storage.put("ultimo", { at: Date.now(), estado: r.status });
  }
  async ultimo() { return (await this.ctx.storage.get("ultimo")) || null; }
}

function cors(origen) {
  const o = ORIGENES.includes(origen) ? origen : ORIGENES[0];
  return { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
}
const json = (o, st, h) => new Response(JSON.stringify(o), { status: st || 200, headers: { "Content-Type": "application/json", ...h } });

function subValida(sub, env) {
  try {
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return false;
    const u = new URL(sub.endpoint);
    if (env.PERMITIR_LOCAL === "1" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
    return u.protocol === "https:" && SERVICIOS.some((re) => re.test(u.hostname));
  } catch (_) { return false; }
}

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url), ruta = url.pathname.replace(/\/+$/, "") || "/";
    const llavesObj = env.AVISOS.get(env.AVISOS.idFromName("llaves"));
    try {
      if (ruta === "/" || ruta === "/estado") return json({ ok: true, servicio: "avisos de Físico" }, 200, h);
      if (ruta === "/vapid") return json({ key: (await llavesObj.llaves()).pub }, 200, h);
      if (req.method !== "POST") return json({ error: "método" }, 405, h);
      const d = await req.json();
      const dev = String(d.dev || "").slice(0, 64);
      if (!/^[a-z0-9-]{8,64}$/i.test(dev)) return json({ error: "dev" }, 400, h);
      const obj = env.AVISOS.get(env.AVISOS.idFromName("dev:" + dev));
      if (ruta === "/cancelar") { await obj.cancelar(); return json({ ok: true }, 200, h); }
      if (ruta === "/ultimo") return json({ ultimo: await obj.ultimo() }, 200, h);
      if (!subValida(d.sub, env)) return json({ error: "sub" }, 400, h);
      const llaves = await llavesObj.llaves();
      const titulo = String(d.titulo || "💪 ¡A la próxima serie!").slice(0, 80), cuerpo = String(d.cuerpo || "Terminó el descanso.").slice(0, 160);
      if (ruta === "/probar") {
        const r = await mandarPush(d.sub, JSON.stringify({ t: titulo, b: cuerpo, tag: "prueba" }), llaves);
        return json({ ok: r.status < 300, estado: r.status, detalle: r.status < 300 ? "" : (await r.text()).slice(0, 300) }, 200, h);
      }
      if (ruta === "/programar") {
        const en = Number(d.en);
        if (!(en >= 1 && en <= 3600)) return json({ error: "en" }, 400, h);
        await obj.programar({ at: Date.now() + en * 1000, sub: d.sub, titulo, cuerpo, llaves });
        return json({ ok: true }, 200, h);
      }
      return json({ error: "ruta" }, 404, h);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500, h);
    }
  },
};
