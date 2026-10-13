# VitalID demo: hoja de rodaje (10 min de preparación, ~3 min de toma)

Solo datos sintéticos (Fátima) · Solana devnet · sin pagos · CUDIS/Muse NO conectados.

## Preparación (3 min, fuera de la toma)
1. OBS (o grabador de pantalla) a 1920×1080, con micrófono. Cierra notificaciones.
2. Perfil A (Holder): https://4318--909906b9dabb453194a2f113c670ab76.preview.devinapps.com/ → **Start isolated session**.
3. Perfil B (Recipient, ventana privada o perfil distinto, cookies independientes): .../receiver → **Start recipient session** → copia el **recipient ID**.
4. NO recargues ninguna de las dos páginas. Usa **Refresh permissions**.

## Toma (dale a grabar solo cuando estés listo)
| Tiempo | Acción en pantalla | Narración (ver .srt) |
|---|---|---|
| 0:00 | Holder: muestra "SYNTHETIC DATA · DEVNET ONLY" | Intro |
| 0:15 | Muestra Recipient 3 s. Holder: pega recipient ID, elige **Minimal proof only**, marca "I authorize only this recipient and this selection, for 15 minutes." | Consentimiento |
| 0:40 | **Create & sign devnet permission** (UNA vez). Espera "Creation confirmed". Muestra **Creation receipt** | Permiso en devnet |
| 1:05 | Recipient: **Refresh permissions** → **1. Create one-time challenge**. Copia el ID al campo "Recipient's challenge ID" del Holder | Reto |
| 1:25 | Holder: **Receive credential & preview BBS proof** (muestra que aún no se envía) → **Authorize & send this presentation only** | Prueba BBS |
| 1:45 | Recipient: **2. Verify new presentation** → muestra `verified: true` | Verificación |
| 2:05 | Holder: **Revoke — block access now**. Espera "chain revoke confirmed", muestra el recibo | Revocación |
| 2:25 | Recipient: Refresh permissions → **1. Create one-time challenge** → muestra la denegación | Denegación |
| 2:40 | Pantalla con el nombre VitalID y el lema | Cierre |

Si algo falla: para, anota botón, mensaje y hora, y repite. No edites para ocultar fallos.
Las esperas de confirmación pueden recortarse, con el rótulo "Waiting for devnet confirmation — wait shortened".

## Entrega
Revisa tú el vídeo antes de publicarlo. Copia los enlaces de las transacciones (creación y revocación) que se vean en TU grabación.
