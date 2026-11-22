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
22/11: al recargarse sola guarda y devuelve pantalla, scroll, historiales abiertos y lo escrito (sessionStorage `fisico_ui_v1`);
se puede recargar también en el descanso (el reloj vive en el teléfono). Si abre la app con un entreno en curso, arranca en Entreno.

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
  - `entrenos/{id}`: `{f, rutina: id de la rutina, rutinaN: nombre, estado:'en curso'|'hecho', ej:[{n:'Press banca', plan:'4×8', grupo, series:[{r:8, kg:60, t: hora, desc: segundos desde la serie anterior}]}], t,
    inicio, fin, dur (min), descPlan (descanso elegido, s), pc (peso del cuerpo ese día), ns (series), vol (kg totales), recs (ejercicios con récord histórico),
    energia (1 sin pilas, 2 normal, 3 con todo), nota}`. 22/11: el récord histórico = la serie que más kilos movió (peso × reps; él: "10 reps con 10 kg es más que 6 reps con 12 kg"; empate → más peso; sin peso → más reps) se muestra en cada ejercicio;
    tocando el nombre se abre su historial. Un entreno "en curso" de otro día se cierra solo (con series) o se borra (vacío).
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
    `pesoMeta` (76 kg desde 22/11) y `ritmo` (kg por semana, 0,4): la línea dorada del gráfico de Peso.
    También `desafio:{inicio:'2026-11-05',dias:66}` y `diasEntreno:[0,6]` (domingo y sábado, desde 22/11) para la pantalla Nivel.
    Metas viejas por fecha: `metasHist:[{hasta:'2026-11-21',kcal:1600,p:145,c:140,g:50}]` y `diasHist:[{hasta:'2026-11-21',dias:[2,4,6]}]`:
    hasta esa fecha la app mide con esas (cuando se cambien las metas o los días, agregar ahí las anteriores con su `hasta`).
  - `fotos/{id}`: `{f, mini: foto chiquita en texto (data:image/jpeg), nota, t}` y `fotosFull/{id}`: la foto grande (se baja sólo al abrirla).
    Las fotos van a la base, NUNCA al repositorio (es público).
- Sin internet: la app muestra lo último que vio (guardado en el teléfono) y lo que se carga queda en una cola en el teléfono que se
  manda sola cuando vuelve la señal, aunque se cierre la app.

## Notificación del descanso (22/11/2026, él la pidió: "quiero que llegue una notificación")
- Una página web no puede programar avisos y el iPhone congela la app en segundo plano, así que hay un servicio aparte:
  `worker/` (Cloudflare Worker + Durable Object, cuenta de Cloudflare de Matías, se publica solo desde este repositorio,
  carpeta `worker`, nombre `fisico-avisos`). Al anotar una serie la app hace POST `/programar` {dev, sub, en: segundos};
  el servicio pone una alarma y manda un Web Push cifrado (RFC 8291 + VAPID). `/cancelar` si toca Listo o si la app está
  abierta cuando termina. `/probar` manda uno ya. `/vapid` da la llave pública.
- 22/11: la app NO hace ningún sonido ("no quiero que se salga por nada la música": cualquier audio de la página le corta
  la música en el iPhone). `SIN_SONIDO=true` en index.html. El aviso es sólo la notificación + la pantalla que parpadea.
- SIN claves en el repositorio: las llaves VAPID se crean solas la primera vez adentro del servicio (Durable Object "llaves").
- La dirección del servicio va en `config.avisosUrl` (no es secreta). En el teléfono: Ajustes → 🔔 Aviso del descanso →
  Activar notificaciones (en iPhone, sólo con la app agregada a la pantalla de inicio y abierta desde ahí).
- Probar el servicio en la nube: `cd worker && npx wrangler dev --var PERMITIR_LOCAL:1` (deja mandar a un servicio falso en localhost).

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
  `python3 tools/fisico.py cargar /tmp/carga.json`. Después releer con `leer` para confirmar. Borrar /tmp/carga.json después de cargar
  (01/11 un armado que falló dejó el archivo viejo y se cargó repetido).
- Foto que manda por el chat, si queda como archivo: `python3 tools/fisico.py foto /tmp/foto.jpg --fecha 2026-10-31 --nota "de frente"`
  (necesita Pillow: `pip install pillow`). Si la foto no queda como archivo, decirle que la suba él desde la pantalla Fotos.
- Si falla por red: el entorno de la nube tiene que dejar salir a `fisico-e6489-default-rtdb.firebaseio.com`.
- Si dice que la base no deja pasar: pedirle a Matías que revise el secreto del entorno de la nube (no se pasa por el chat).

## Reglas de Matías (una por renglón, con fecha; si una cambia, se reemplaza el renglón)
- 31/10/2026: las rutinas van cambiando: se arman por el chat, no hay una fija por día.
- 31/10/2026: se guarda TODO (ejercicios, pesos, series, comidas, medidas, fotos) y se tiene que poder ver después.
- 01/11/2026: la Dieta se parece a la app que usaba antes (MyFitnessPal): semana con círculos, racha, calorías que restan, carbos/grasas/proteínas lado a lado y comidas por Desayuno/Almuerzo/Merienda/Cena/Colaciones.
- 01/11/2026: no hay pantalla Inicio (era lo mismo que Dieta): la app arranca en Dieta, con el peso arriba. Botones: Dieta, Peso, Entreno, Fotos, Ajustes. Nada repetido.
- 01/11/2026: las metas (calorías, proteína, carbohidratos, grasas) las pone Claude con criterio; él corrige si quiere. Objetivo: hipertrofia y definición, bajar 0,5-0,7 kg por semana. 03/11: él eligió 1600 kcal entrenando pesado. 09/11: proteína 145 g (1,8 g/kg), metas P 145, C 140, G 50; si 2 semanas seguidas pierde fuerza o energía, volver a 1700 los días de gimnasio. 22/11 (eligió él): bajar LENTO y recuperar músculo: 1800 kcal, P 150, C 175, G 55, pesoMeta 76, ritmo 0,4 kg/semana.
- 31/10/2026: peso en kilos con un decimal.
- 31/10/2026: al anotar una serie, la app avisa si superó la última vez (más peso, o el mismo peso con más repeticiones).
- 31/10/2026: lo que come lo pasa por el chat y lo carga Claude.
- 01/11/2026: come 4 veces, a las 11 (desayuno), 16 (almuerzo), 20 (merienda) y 24 h (cena). No más, no menos. La cena de las 24 h
  es del día que termina: al cargarla (aunque sea entre las 0 y las 4 h) va con la fecha del día anterior. La app hace lo mismo sola.
  05/11: la comida va por ORDEN, no por la hora: 1.ª desayuno, 2.ª almuerzo, 3.ª merienda, 4.ª cena (aunque se atrase).
  Al cargar, usar el primer momento del día que todavía está vacío.
- 01/11/2026: SIEMPRE hora de Argentina (UTC−3) y el día cambia normal a las 00:00 (la app usa la hora argentina aunque el aparato tenga otra).
- 15/11/2026: EL DÍA SE CARGA ENTERO CON EL PLAN, como si lo hubiera comido (pidió: "pone el día siempre anotado como si hubiera
  comido eso; si como otra cosa te aviso"). En el primer mensaje del día, cargar todas las comidas del plan que falten como reales.
  Cuando avisa otra cosa, REEMPLAZAR lo de esa comida (borrar lo del plan de esa comida y cargar lo real) y decirle cuánto le queda.
  Plan (22/11, ≈1804 kcal, P 175): desayuno lo de siempre; almuerzo milanesa de pollo al horno 180 g + ensalada + pan francés 70 g; merienda cuadril
  180 g + 4 claras; cena 2 barras + té; postre 4 cuadraditos de Milka.
- 15/11/2026: "LO DE SIEMPRE" (desayuno) = café instantáneo intenso 6 g (350 ml, sin leche) + 2 barras Integra + creatina + multivitamínico. El té es a la noche, con la cena.
- 01/11/2026: no le gustan: banana con el café (con el café quiere algo para masticar: barra o galletitas), aceite de oliva, atún al natural, yogur.
- 01/11/2026: café, té, mate y demás bebidas sin alcohol cuentan como agua: al cargarlos, Claude suma su volumen al agua del día. Medidas de Matías: un café = 350 ml, un té = 350 ml, un vaso de agua = 250 ml (02/11).
- 01/11/2026: lo que come seguido (datos de etiqueta): barra Integra Proteica = 150 kcal, P 15, C 13, G 4,5, fibra 8 g, sodio 110 mg
  (la de maní y chocolate 45 g: 154 kcal, P 15, C 12, G 5,1, fibra 8, sodio 121, sat 1,7). Leche La Serenísima entera 3 %.
  Tostaditas de salvado con sésamo: 4 u = 30 g = 110 kcal, P 3,6, C 20, G 1,7, fibra 2,6, sodio 85.
  Mayonesa Hellmann's 50 % menos aceite: 12 g (1 cucharada) = 22 kcal, C 1,2, G 1,9, sodio 89 mg.
  Pan semillado lactal: 53 g = 131 kcal, C 21, P 5,9, G 2,6, fibra 3,3, sodio 124 mg.
  Chocolate Milka (con leche): 4 cuadraditos = 25 g = 131 kcal, C 14 (azúcar agregada 11), P 1,7, G 7,6 (sat 4,4), fibra 0,6, sodio 25.
  Tiene en casa (10/11): claras de huevo (1 clara ≈ 33 g = 17 kcal, P 3,6, G 0). Sugerirlas para completar proteína con pocas calorías.
- 02/11/2026: trabaja de 12:30 a 20:30 y sale muerto; a la mañana no puede: 02/11: decidió ir a SU gimnasio (en casa sin peso "no sirve" para él). Va 3 veces por semana, 1 hora: martes, jueves y sábados. 22/11: rutina "Full body corto" (con la energía que tiene, sólo esto), en este orden: PRIMERO sentadilla con barra 3×8-12 + elevaciones laterales 3×12-20 JUNTAS (si no, al final no llega), después press PLANO CON BARRA 3×6-10 (22/11: no hace inclinado con mancuernas; se renombró también en los entrenos viejos) y dominadas 3×6-10 (biserie: `grupo:"B"` en la rutina; en Entreno van en una tarjeta y "+ Serie (los dos)" anota las dos y arranca un solo descanso). Doble progresión (la app lo calcula), descanso 3 min. 22/11: objetivo 10 % de grasa (foto 22/11 ≈ 14 %, 77,9 kg). Eligió bajar lento (1800 kcal) entrenando para recuperar el músculo que perdió (memoria muscular): fuerza que sube + cintura que baja = va bien. Entrena sábado y domingo (config.diasEntreno [0,6]) y un tercer día si tiene pilas. Trabaja todos los días (L-V 12:30-20:30, sáb 12:30-16:30, dom 16:30-20:30): mejores días para entrenar sábado a la tarde y domingo a la mañana. 19/11: se muda a una quinta el fin de semana del 21-22/11 (el gimnasio le queda a 15 min). Prioridad estética: pecho de arriba y hombro de costado (cintura ya angosta).
  Tiene: un fierro a la altura de una silla (remo invertido), sillas, el piso. Las sentadillas sin peso lo cansan mucho (3×12 y queda sin fuerza).
  Lleva años entrenando pesado. Sus marcas en el gimnasio: dominadas con 20 kg de lastre, press plano 87 kg (80 + barra de 7), sentadilla 70 kg.
- 10/11/2026: prefiere suplementos a fruta y gastar las calorías extra en un postre que le guste (chocolate, Danette, helado).
  Plan con "Postre a elección ≈200 cal" fijo. Multivitamínico Universal Daily Formula (le llegó 13/11; 1 por día, con una comida). Cargarlo cada día que lo toma (está en el plan con sus valores).
  NO toma D3 (1 h de sol por día) ni omega 3 (caro): sugerir caballa/sardinas en lata 1-2 veces por semana. Verdura barata en calorías
  (ensalada/tomate ~30 kcal) para potasio y vitamina K.
- 05/11/2026: pantalla Nivel (estilo juego, original, sin copiar otra app): misiones del día que se tachan solas con los datos,
  puntos, nivel, racha, logros, antes y después, desafío de 66 días desde el 05/11. Cuadro chico arriba en Dieta; tocándolo abre Nivel.
  La racha la cortan sólo las 3 principales: proteína ≥ meta, calorías entre 70 % y 103 % de la meta, entrenar los días que toca.
- 31/10/2026: la app la usa SÓLO él. Nadie puede crearse una cuenta solo (Firebase → Authentication → Configuración → Acciones del
  usuario: "Habilitar la creación" y "Habilitar la eliminación" apagados). Un usuario nuevo se agrega sólo desde la consola de Firebase
  y sólo con su permiso; además las reglas de la base dejan entrar únicamente a su UID (yGnUEddKRxWUZCJKrkmpbxrzrXG2).
