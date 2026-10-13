# Vital ID — Brandbook

Versión viva (logos, tokens, componentes): Design System *Vital ID* en Claude. Recursos en esta carpeta: `logos/`, `crew/`, `social/` (serie de lanzamiento de Instagram, MP4 + portada PNG).

Vital ID es una **identidad de salud portátil**: convierte las señales de wearables en una credencial que se entiende de un vistazo y se comparte con tus condiciones, solo los campos que eliges, con un enlace o QR temporal y revocable. Producto bilingüe (inglés / árabe, RTL nativo), en fase de validación.

**Idea de marca:** *Your health. In your hands.* El control lo tiene la persona, no la app.

## Logo

El símbolo es un **corazón con una hoja**: salud (corazón) y bienestar natural (hoja), dentro de un solo trazo. Es la "credencial" de la marca: aparece en la app, el favicon y la tarjeta Vital ID.

- Usa `logo-mark-green.svg` sobre `canvas` o `surface`. Corazón en `brand`, hoja en blanco.
- Usa `logo-mark-white.svg` sobre `brand`, `hero-top` o `hero-bottom`. Corazón blanco, hoja en `mint`.
- Usa `logo-mark-ink.svg` solo en impresión monocroma.
- Usa `app-icon.svg` (cuadrado `brand`, radio 11/48) para avatar de redes, favicon e icono de app.
- El lockup horizontal (`logo-horizontal-green.svg` / `-white.svg`) pone **Vital ID** en peso 700 a la derecha del símbolo, con *Your portable health identity* debajo en `muted`.
- Área de respeto: la mitad del alto del símbolo por cada lado. Tamaño mínimo: 20px de alto en pantalla.
- Escribe siempre **Vital ID**: dos palabras, "ID" en mayúsculas. Nunca "VitalID", "Vital Id" ni "VID". En árabe la app usa la misma marca latina.
- No recolorees el símbolo fuera de las tres versiones, no lo gires, no le pongas sombra, no cambies la hoja por otro elemento.

## Color

Una marca **verde y calmada** sobre un lienzo gris muy claro, al estilo de los sistemas de salud de iOS (inspiración, sin afiliación con Apple).

- `canvas` es el fondo. `surface` (blanco) para tarjetas. `ink` para texto.
- `brand` es **el** color de Vital ID: logo, botón primario, enlaces y estado activo. Máximo una acción primaria verde por pantalla.
- Los momentos de identidad (la credencial, portadas, posts oscuros, vídeo) usan el degradado **hero-green**: `hero-top` → `hero-bottom` a 140°, con un brillo radial `mint` al 16% arriba a la derecha y olas en `brand-deep`. Texto en `on-brand`, IDs en `mint`.
- `mint` y `sage` son las tintas de relieve. `coral`, `peach` y `sky` son acentos afectivos del mundo de las mascotas, nunca colores de estado.
- Estados de datos: `good` / `warn` / `bad` siempre sobre su `-soft` y **siempre con palabra** (Stable, Improving, Declining, Unusual). Nunca comuniques un estado solo con color.
- Contraste: `brand` sobre `surface` ≈ 5,3:1; `muted` sobre `canvas` cumple 4,5:1. `mint` nunca como texto sobre blanco.

## Tipografía

Una sola familia: la **fuente del sistema** (`sans`: SF Pro en Apple, Segoe UI en Windows, Noto Sans Arabic para árabe). No hay fuentes propietarias empaquetadas.

- Títulos apretados: `h1` a 40px, peso 650, tracking −0.04em. En piezas de marketing usa `display-xl` (64px, 700) con la segunda línea en `brand`: "Your health. / **In your hands.**"
- Texto corrido en `body` (16px, −0.012em). Metadatos y fuentes de datos en `small` y `muted`.
- Etiquetas de la credencial en `eyebrow` (mayúsculas, +0.12em). El número de credencial en `credential-id` (mono, +0.2em, `mint`).
- Números siempre tabulares (`font-variant-numeric: tabular-nums`).
- En herramientas de diseño sin SF Pro (Canva, Figma web) usa **Inter** como sustituto más cercano y **Noto Sans Arabic** para árabe.

## Forma, espacio y profundidad

- Esquinas generosas: `radius-lg` (24px) en tarjetas, `radius-xl` (28px) en la credencial, `radius-pill` en botones, chips e insignias.
- Sombras casi invisibles: `shadow-card` en reposo, `shadow-lift` al pasar el ratón, `shadow-hero` verde solo bajo bloques hero-green.
- Gutter mínimo `space-4`; tarjetas con padding `space-6`; secciones separadas por `space-8`.
- Bordes de 1px en negro al 4,5% en lugar de líneas duras.

## La crew (mascotas)

Vital ID explica la salud con personajes amables. Son parte de la identidad: aparecen en la app, el onboarding y redes.

| Personaje | Archivo | Representa |
|---|---|---|
| Corazón | `heart.png` | Health / salud general |
| Brócoli | `wellness-nutrition.svg` | Nutrition |
| Mancuerna | `dumbbell.png` | Movement |
| Luna con gorro | `moon.png` | Rest / sueño |
| Loto | `wellness-mindfulness.svg` | Mindfulness |
| Gota | `wellness-hydration.svg` | Hydration |
| Escudo con candado | `shield.png` | Privacidad y compartir seguro |
| Músculo | `muscle.png` | Fuerza / entrenamiento |
| Coach | `doctor.png` | Coach (reglas, no IA, no un médico) |

- Corazón, mancuerna, luna, escudo y músculo son **3D** (PNG). Brócoli, loto y gota son **planos** (SVG). No mezcles los dos estilos en el mismo plano de tamaño; si conviven, pon los 3D más grandes y los planos dentro de tiles.
- En la fila de bienestar cada personaje va en su tile tintado: rosa (Health), naranja (Nutrition), esmeralda (Movement), índigo (Rest), fucsia (Mindfulness), cielo (Hydration).
- Movimiento: flotar (4s), respirar (5s), rebotar (1,4s). Siempre suave; respeta `prefers-reduced-motion`.
- No inventes personajes nuevos con otro estilo, no los pongas tristes o enfermos, no los uses para mensajes clínicos.

## Voz y contenido

Clara, cálida y precisa. Habla como alguien que sabe de salud y respeta tu privacidad.

- Frases cortas. Segunda persona ("your health", "you choose"). Sentence case en títulos y botones.
- Frases canónicas: *Your health. In your hands.* · *Your portable health identity* · *Health has a new identity* · *Share only what you choose, for as long as you choose.* · *A clearer view of your wellbeing. One personal identity.*
- Árabe: *صحتك. بين يديك.* · *هويتك الصحية المحمولة*. Toda pieza bilingüe se compone también en RTL.
- Sin emojis en la interfaz. En redes, como máximo uno por pieza.

### Lo que la marca nunca afirma

Estas reglas salen del producto y protegen a la marca:

- Vital ID **no es un dispositivo médico** ni da consejo médico. Los insights comparan tus señales con tu propia base.
- El Coach es **por reglas**, no IA y no un médico.
- **WHOOP** es la única integración activa hoy. Oura, Strava y el resto se presentan como "coming soon".
- No prometas verificación de identidad ni integraciones con aseguradoras.
- Revocar impide nuevas lecturas; no borra copias ya descargadas. Di "revocable", no "se borra de todas partes".
- Es una experiencia **web**; no hables de app nativa ni de modo offline.
- Datos de ejemplo siempre marcados como **DEMO** o *Sample data*. La persona demo es Fátima (sintética).

## Componentes

- **Button**: pill. Primario en `brand` con texto `on-brand`; secundario en `surface` con borde `line`. Verbo primero: "Share link", "Revoke access".
- **StatusBadge**: pill de 11px con palabra de estado sobre su `-soft`.
- **CredentialCard**: la tarjeta Vital ID en hero-green. Es el objeto más reconocible de la marca; úsala como pieza central en comunicación.
- **WellnessTile**: personaje + etiqueta en tile tintado.
- **MetricCard**: métrica, valor tabular, insignia de estado y fuente de datos.

## Redes sociales

- Formato principal 4:5 (1080×1350). Alterna posts claros (`canvas`) y oscuros (hero-green) para que el grid respire.
- Cada post lleva el símbolo arriba a la izquierda y `vitalid.site` abajo.
- Un mensaje por post. Titular en `display-xl`, segunda idea en `brand` (o `mint` sobre oscuro).
- Motion: entradas que suben 24px y aparecen (ease-out, 0,3–0,6s), personajes que flotan, la credencial que se ensambla. Loops de 6–8s, sin cortes bruscos.
