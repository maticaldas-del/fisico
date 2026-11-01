# Físico — cómo trabajar en este repositorio

Web-app personal de Matías: entrenamiento, dieta, peso, medidas y fotos de su físico.
Publicada en https://maticaldas-del.github.io/fisico/ (GitHub Pages, rama `main`, carpeta raíz).
No tiene nada que ver con CYC (su negocio), pero está armada igual que su panel (`maticaldas-del/web-cyc`).

## Cómo hablarle a Matías
- No es programador. Castellano llano, sin términos técnicos (si hace falta uno, se explica en una frase).
- Darle la conclusión, no el camino.
- Cuando haya que decidir algo: TODAS las decisiones juntas, numeradas, cada una con (a) sugerida y (b), para que conteste "1a 2b".
  Lo chico y reversible lo elige Claude y se lo cuenta.
- Toda tarea completa, nunca a medias. Si algo no anda, decírselo derecho y proponer qué hacer.

## Cómo está hecha
- `index.html`: TODO (HTML, estilo y JavaScript) en un solo archivo. Sin frameworks ni compilar.
- `sw.js`: la hace instalable y la actualiza. `manifest.webmanifest`: nombre, colores, ícono. `icon.svg`: el ícono (una pesa verde).
- Tema oscuro, letra grande, botones de 44 px o más. Tiene que verse bien en 360 px de ancho y en la PC.

## Cada vez que se toca index.html (para que nunca quede una versión vieja)
1. Subir `APP_VERSION` (1.00 → 1.01…).
2. Agregar un renglón ARRIBA de todo en `APP_CAMBIOS`: `{v, f:'dd/mm', h:'hh:mm' (hora de Argentina), c:[{n:1 leve|2 mediano|3 importante, t:'qué cambió en criollo'}]}`.
3. Subir el número de `CACHE` en `sw.js` (fisico-v1 → fisico-v2…).
La app mira `sw.js` cada 2 minutos y al volver a la pantalla: si cambió, se recarga sola (no mientras escribe; a los 3 minutos tapa
la pantalla con un botón "Actualizar"). Normalmente NO hace falta decirle "actualizá la app".

## Antes de decir que algo anda
Abrirla en el navegador, mirarla en 360 px y en 1200 px, revisar que no haya errores en la consola.
NUNCA subir sin antes comprobar que el JavaScript no tiene errores de escritura (01/11/2026 quedó en "Cargando…" por eso).
Si igual pasa: a los 8 s la app muestra un botón "Recargar la app" que borra lo guardado y la baja de nuevo. Si escribe en la base, releer lo escrito.
Subir cada cambio a `main` con un mensaje claro.

## La base de datos (Firebase)
- Proyecto Firebase `fisico-e6489` (cuenta de Google de Matías). Realtime Database en Estados Unidos + Authentication con mail y contraseña.
- La configuración (apiKey, etc.) está en index.html: NO es secreta. Las contraseñas y claves privadas NUNCA van al repositorio.
- Reglas: sólo la cuenta (UID) de Matías puede leer y escribir debajo de `fisico/`. Nadie más, ni sin iniciar sesión.
- Todo vive debajo de `fisico/`:
  - `peso/{id}`: `{f:'AAAA-MM-DD', kg, cintura, pecho, brazo, pierna, grasa, t}` (todo menos `f` es opcional; medidas en cm, grasa en %).
  - `entrenos/{id}`: `{f, rutina: id de la rutina, rutinaN: nombre, estado:'en curso'|'hecho', ej:[{n:'Press banca', plan:'4×8', series:[{r:8, kg:60}]}], t}`.
  - `rutinas/{id}`: `{n:'Pecho y tríceps', orden:1, ejercicios:[{n, series, reps, kg}]}`. La rutina que "toca" es la que sigue (por `orden`) a la última hecha.
  - `comidas/{id}`: `{f, m:'desayuno'|'almuerzo'|'merienda'|'cena'|'colacion', n:'Pollo con arroz', kcal, p, c, g, t}`.
    `mi`: vitaminas, minerales y demás de ESA comida, estimados por Claude. SIEMPRE se cargan con cada comida (la Dieta los suma
    y los tacha cuando llega a lo del día). Claves y unidades: vA µg, vC mg, vD µg, vE mg, vK µg, b1 mg, b2 mg, b3 mg, b5 mg, b6 mg,
    b7 µg, b9 µg, b12 µg, col (colina) mg, ca mg, fe mg, mg (magnesio) mg, fos (fósforo) mg, k (potasio) mg, zn mg, cu mg, mn mg,
    se µg, i (yodo) µg, cr µg, mo µg, fib (fibra) g, o3 (omega 3 EPA+DHA) mg, na (sodio) mg, az (azúcar agregada) g, sat (grasa saturada) g.
    Las metas por día están en `NUTRI` en index.html.
    `m` es en qué comida del día va (la pantalla Dieta las agrupa así); el nombre va sin "Desayuno:" adelante. Las "comidas frecuentes" salen solas de lo cargado (no se guardan aparte).
  - `agua/{AAAA-MM-DD}`: mililitros tomados ese día (un número). En la carga: `"agua":{"2026-10-31":1500}` pone el total del día.
  - `config`: `{kcal, p, c, g, agua (ml, si no 3000), pesoMeta, descanso (segundos, si no 180)}` (metas por día).
  - `fotos/{id}`: `{f, mini: foto chiquita en texto (data:image/jpeg), nota, t}` y `fotosFull/{id}`: la foto grande (se baja sólo al abrirla).
    Las fotos van a la base, NUNCA al repositorio (es público).
- Sin internet: la app muestra lo último que vio (guardado en el teléfono) y lo que se carga queda en una cola en el teléfono que se
  manda sola cuando vuelve la señal, aunque se cierre la app.

## Cómo carga Claude los datos (Matías le pasa por el chat lo que comió, entrenó, pesó y sus fotos)
Matías quiere que Claude cargue todo (31/10/2026: "quiero que tengas acceso total. porque vos vas a cargar todos los datos").
Se hace desde su Chrome, con la app abierta y su sesión iniciada: Ajustes → "📥 Cargar datos (lo usa Claude)" → pegar un bloque así → Cargar:
```
{"comidas":[{"f":"2026-10-31","m":"desayuno","n":"Avena con banana","kcal":420,"p":14,"c":70,"g":9}],
 "peso":[{"f":"2026-10-31","kg":82.4,"cintura":88}],
 "entrenos":[{"f":"2026-10-31","rutinaN":"Pecho","estado":"hecho","ej":[{"n":"Press banca","series":[{"r":8,"kg":60}]}]}],
 "rutinas":[{"n":"Pecho y tríceps","orden":1,"ejercicios":[{"n":"Press banca","series":4,"reps":8,"kg":60}]}],
 "config":{"kcal":2300,"p":170},
 "borrar":["comidas/-Nabc123"]}
```
Con `"id"` pisa ese registro; sin `"id"` agrega uno nuevo. Las calorías y macros de lo que come las calcula Claude con criterio.
Fotos: en la pantalla Fotos, elegir la fecha y subir el archivo (en Chrome se puede subir un archivo al botón "📸 Elegir fotos").
Releer después de cargar (que aparezca en la pantalla que corresponde).

### Desde el chat en la nube (31/10/2026, él eligió que la nube también cargue datos)
En la nube no hay Chrome: se usa `tools/fisico.py`, que habla directo con la base. La llave es un secreto del entorno de la nube
(tipo "GCP access token (with Service Account Key)", con la clave de la cuenta de servicio de Firebase Admin, para el sitio
`fisico-e6489-default-rtdb.firebaseio.com`): la nube la agrega sola a cada pedido y Claude nunca la ve. Nunca en el repo ni en un mensaje.
(Si algún día se usa la variable `FIREBASE_SECRET`, el script también la toma.)
- Leer: `python3 tools/fisico.py leer comidas --desde 2026-10-01` (también `peso`, `entrenos`, `rutinas`, `config`, `fotos`, `agua`).
- Cargar: escribir el bloque (mismo formato de arriba) en `/tmp/carga.json` —nunca dentro del repo, que es público— y
  `python3 tools/fisico.py cargar /tmp/carga.json`. Después releer con `leer` para confirmar.
- Foto que manda por el chat, si queda como archivo: `python3 tools/fisico.py foto /tmp/foto.jpg --fecha 2026-10-31 --nota "de frente"`
  (necesita Pillow: `pip install pillow`). Si la foto no queda como archivo, decirle que la suba él desde la pantalla Fotos.
- Si falla por red: el entorno de la nube tiene que dejar salir a `fisico-e6489-default-rtdb.firebaseio.com`.
- Si dice que la base no deja pasar: pedirle a Matías que revise el secreto del entorno de la nube (no se pasa por el chat).

## Reglas de Matías (una por renglón, con fecha; si una cambia, se reemplaza el renglón)
- 31/10/2026: las rutinas van cambiando: se arman por el chat, no hay una fija por día.
- 31/10/2026: se guarda TODO (ejercicios, pesos, series, comidas, medidas, fotos) y se tiene que poder ver después.
- 01/11/2026: la Dieta se parece a la app que usaba antes (MyFitnessPal): semana con círculos, racha, calorías que restan, carbos/grasas/proteínas lado a lado y comidas por Desayuno/Almuerzo/Merienda/Cena/Colaciones. El inicio muestra lo mismo.
- 01/11/2026: las metas (calorías, proteína, carbohidratos, grasas) las pone Claude con criterio; él corrige si quiere. Objetivo: hipertrofia y definición, 1700 kcal, bajar 0,5-0,7 kg por semana.
- 31/10/2026: peso en kilos con un decimal.
- 31/10/2026: al anotar una serie, la app avisa si superó la última vez (más peso, o el mismo peso con más repeticiones).
- 31/10/2026: lo que come lo pasa por el chat y lo carga Claude.
- 01/11/2026: come 4 veces, a las 11 (desayuno), 16 (almuerzo), 20 (merienda) y 24 h (cena). No más, no menos. La cena de las 24 h
  es del día que termina (en la app el día cambia a las 4 de la mañana; al cargar, usar esa misma fecha).
- 01/11/2026: no le gustan: banana con el café (con el café quiere algo para masticar: barra o galletitas), aceite de oliva, atún al natural.
- 01/11/2026: café, té, mate y demás bebidas sin alcohol cuentan como agua: al cargarlos, Claude suma su volumen al agua del día. Medidas de Matías: un café = 350 ml, un té = 350 ml, un vaso = 350 ml.
- 31/10/2026: la app la usa SÓLO él. Nadie puede crearse una cuenta solo (Firebase → Authentication → Configuración → Acciones del
  usuario: "Habilitar la creación" y "Habilitar la eliminación" apagados). Un usuario nuevo se agrega sólo desde la consola de Firebase
  y sólo con su permiso; además las reglas de la base dejan entrar únicamente a su UID (yGnUEddKRxWUZCJKrkmpbxrzrXG2).
