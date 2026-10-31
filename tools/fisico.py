#!/usr/bin/env python3
"""Leer y cargar los datos de Físico en Firebase sin pasar por la app (lo usa el chat de Claude en la nube).

Necesita la llave de la base en la variable FIREBASE_SECRET (está en la configuración del entorno de la nube,
NUNCA en el repositorio). Los datos que se cargan tampoco van al repositorio: se escriben en /tmp.

  python3 tools/fisico.py leer comidas --desde 2026-10-01     # también: peso, entrenos, rutinas, config, fotos
  python3 tools/fisico.py cargar /tmp/carga.json              # mismo formato que Ajustes → Cargar datos de la app
  python3 tools/fisico.py foto /tmp/foto.jpg --fecha 2026-10-31 --nota "de frente"   # necesita Pillow

Formato de carga: {"peso":[...],"comidas":[...],"entrenos":[...],"rutinas":[...],"config":{...},"borrar":["comidas/ID"]}
Con "id" pisa ese registro; sin "id" agrega uno nuevo. "config" se mezcla con lo que hay.
"""
import base64, io, json, os, re, sys, time, urllib.parse, urllib.request

BASE = "https://fisico-e6489-default-rtdb.firebaseio.com/fisico"
RAMAS = ("peso", "comidas", "entrenos", "rutinas")
FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _llave():
    s = os.environ.get("FIREBASE_SECRET", "").strip()
    if not s:
        sys.exit("❌ Falta FIREBASE_SECRET en el entorno (se configura en el entorno de la nube, no en el repo).")
    return s


def pedir(metodo, ruta, datos=None, extra=None):
    q = {"auth": _llave()}
    q.update(extra or {})
    url = BASE + "/" + ruta + ".json?" + urllib.parse.urlencode(q)
    cuerpo = None if datos is None else json.dumps(datos).encode()
    req = urllib.request.Request(url, data=cuerpo, method=metodo, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or b"null")


def nuevo_id(rama):
    # Id que ordena por fecha de carga (como los de la app). La app ordena por "f" y "t", no por el id.
    return "c%011x%s" % (int(time.time() * 1000), base64.b32encode(os.urandom(5)).decode().lower())


def leer(rama, desde=None):
    if rama == "fotos":
        datos = pedir("GET", "fotos", extra={"shallow": "true"}) or {}
        return {k: "(foto)" for k in datos}
    datos = pedir("GET", rama) or {}
    if desde and isinstance(datos, dict) and rama in RAMAS and rama != "rutinas":
        datos = {k: v for k, v in datos.items() if isinstance(v, dict) and str(v.get("f", "")) >= desde}
    return datos


def cargar(d):
    n, malos = 0, []
    for rama in RAMAS:
        for it in d.get(rama) or []:
            if not isinstance(it, dict):
                malos.append(rama + ": renglón vacío"); continue
            if rama != "rutinas" and not FECHA.match(str(it.get("f", ""))):
                malos.append(rama + ": falta la fecha (f) en " + json.dumps(it, ensure_ascii=False)[:60]); continue
            if rama == "rutinas" and not it.get("n"):
                malos.append("rutinas: falta el nombre (n)"); continue
            o = dict(it)
            i = o.pop("id", None) or nuevo_id(rama)
            if rama != "rutinas" and o.get("t") is None:
                o["t"] = int(time.time() * 1000) + n
            pedir("PUT", rama + "/" + i, o)
            n += 1
    if isinstance(d.get("config"), dict):
        pedir("PATCH", "config", d["config"]); n += 1
    for r in d.get("borrar") or []:
        if re.match(r"^(peso|comidas|entrenos|rutinas)/[^/]+$", r):
            pedir("DELETE", r); n += 1
        else:
            malos.append("no se puede borrar " + r)
    print(("✓ %d cargado%s" % (n, "" if n == 1 else "s")) + (" · ❌ " + " · ".join(malos) if malos else ""))
    return not malos


def foto(ruta, fecha, nota):
    try:
        from PIL import Image
    except ImportError:
        sys.exit("❌ Falta Pillow (pip install pillow).")

    def achicar(lado, calidad):
        im = Image.open(ruta).convert("RGB")
        im.thumbnail((lado, lado))
        b = io.BytesIO(); im.save(b, "JPEG", quality=calidad)
        return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()

    i = nuevo_id("fotos")
    pedir("PUT", "fotosFull/" + i, achicar(1600, 82))
    pedir("PUT", "fotos/" + i, {"f": fecha, "t": int(time.time() * 1000), "mini": achicar(320, 70), "nota": nota or ""})
    print("✓ foto guardada", i)


if __name__ == "__main__":
    a = sys.argv[1:]
    def opc(nombre, defecto=None):
        return a[a.index(nombre) + 1] if nombre in a and a.index(nombre) + 1 < len(a) else defecto
    if len(a) >= 2 and a[0] == "leer":
        print(json.dumps(leer(a[1], opc("--desde")), ensure_ascii=False, indent=1))
    elif len(a) >= 2 and a[0] == "cargar":
        with open(a[1], encoding="utf-8") as f:
            sys.exit(0 if cargar(json.load(f)) else 1)
    elif len(a) >= 2 and a[0] == "foto":
        f = opc("--fecha", time.strftime("%Y-%m-%d"))
        if not FECHA.match(f):
            sys.exit("❌ La fecha va así: 2026-10-31")
        foto(a[1], f, opc("--nota", ""))
    else:
        print(__doc__)
