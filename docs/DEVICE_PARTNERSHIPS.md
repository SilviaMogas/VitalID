# Estrategia de partnerships con fabricantes de dispositivos

**Objetivo:** conseguir los wearables gratis y que las marcas paguen a Vital ID por promocionarlos.

**Tesis:** Vital ID no es un influencer más pidiendo producto. Es un **canal de distribución e integración**
con un catálogo de 16 proveedores, una pantalla de conectores que cada usuario ve en el onboarding,
y acceso a un mercado (EAU / Golfo, bilingüe EN/AR, aseguradoras) donde las marcas de wearables
tienen poca presencia directa. Eso es lo que se vende.

> Estado real a fecha de hoy: solo **WHOOP** tiene integración OAuth funcionando. Oura, Circular Ring,
> Garmin, Fitbit y el resto están en el catálogo como "próximamente". Esto hay que decirlo tal cual en
> cada conversación: la integración es la moneda de cambio, no una promesa vaga.

---

## 1. Las tres palancas (y en qué orden)

| Palanca | Qué conseguimos | Qué damos | Velocidad |
|---|---|---|---|
| **A. Afiliación** | Comisión por cada dispositivo vendido desde Vital ID | Un botón "Consigue este dispositivo" en cada tarjeta de conector y en el onboarding | Días. Solicitud online, sin negociar |
| **B. Partner de integración** | Unidades gratis (dev kit / seeding), acceso a API de partner, aparecer en su directorio de apps | Integración nativa + QA real con hardware + logo en nuestra pantalla de conectores | Semanas. Hay que hablar con una persona |
| **C. Co-marketing pagado** | Fee fijo por lanzamiento, colocación destacada, campaña en Golfo | Puesto "Recomendado", contenido EN/AR, demo con aseguradoras, datos agregados de adopción (nunca datos de salud) | Meses. Requiere tracción demostrable |

El orden importa: **A primero** (es gratis, se consigue solo y da un link con tracking desde el día uno),
**B en paralelo** con las marcas prioritarias, y **C solo cuando haya números** de clics y conversiones
que enseñar.

## 2. Lo que ofrecemos (la moneda de cambio)

Esto es lo que va en cada pitch. Nada de "nos encanta vuestro producto".

1. **Colocación en producto, no en un feed.** El catálogo de conectores se ve en el onboarding de cada
   usuario nuevo. Un usuario sin wearable llega a "¿qué dispositivo tienes?" y se le puede ofrecer uno.
2. **Integración técnica real.** Ya tenemos OAuth 2.0, rotación de refresh tokens, sync diario y
   mapeo de métricas hecho para WHOOP (`lib/connectors/whoop/`). Replicar el flujo para otra marca es
   trabajo acotado. Eso les ahorra a ellos una integración y nos da una razón legítima para pedir hardware.
3. **Mercado Golfo.** UI árabe RTL nativa, envío de credenciales a nueve aseguradoras de EAU
   (Daman, GIG Gulf, Sukoon, ADNIC, Orient, Bupa, Allianz Care, Cigna, MetLife). Las marcas de
   wearables venden en EAU pero casi ninguna tiene presencia de producto localizada.
4. **Caso de uso que no compite con su app.** Vital ID no sustituye la app de la marca. Toma sus datos
   y los convierte en una credencial compartible. La marca sigue siendo la fuente y así se etiqueta
   en pantalla ("fuente: WHOOP").
5. **Contenido bilingüe** y una mascota reconocible. Útil para C, irrelevante para A y B.

Lo que **no** ofrecemos nunca: datos de salud de usuarios, listas de emails, ni acceso a métricas
individuales. La afiliación se mide por clic y compra, no por datos. Esto es coherente con el modelo de
privacidad del producto y hay que decirlo en el primer email para quitarlo de la mesa.

## 3. Marcas, programas y prioridad

Datos recogidos el 8 de octubre de 2026 a partir de directorios de afiliación y páginas de redes
(Awin, FlexOffers, CJ). **No he podido abrir las páginas oficiales de WHOOP ni Oura desde esta sesión**,
así que todo lo que está marcado con ⚠ hay que confirmarlo en el dashboard de la red o con la marca
antes de contar con ello. Los porcentajes de terceros suelen estar desactualizados.

| Marca | Estado en Vital ID | Programa de afiliación | Comisión (⚠ verificar) | Cookie | Prioridad | Por qué |
|---|---|---|---|---|---|---|
| **WHOOP** | Integrado (OAuth v2) | Sí, programa formal (tienen un puesto de Senior Specialist, Affiliate Marketing) | No encontrada | ~30 días ⚠ | **1** | Ya estamos integrados. Modelo de membresía: el hardware va con la suscripción, así que "dispositivo gratis" = membresía de cortesía para el equipo. Pitch de partner de integración directo. |
| **Oura** | Catálogo | Sí: afiliados vía Impact (invitación o solicitud) + programa separado de brand partners + Enterprise API | No publicada ⚠ | ~30 días ⚠ | **1** | Tienen un directorio con más de 800 apps partner. Aparecer ahí vale más que la comisión. Ojo: la API solo da datos de usuarios con membresía activa (Gen3 y Ring 4). |
| **Ultrahuman** | No está en el catálogo | Sí: Awin (tramos 7 % → 10 % → 15 % según volumen), FlexOffers (6 %), ClickDealer (5,6 %) ⚠ | 6–15 % ⚠ | 30–45 días ⚠ | **2** | El programa más generoso que he encontrado y compiten de frente con Oura. Añadirlos al catálogo cuesta poco y da palanca de negociación con Oura. Tienen presencia fuerte en EAU. |
| **Circular Ring** | Catálogo (con datos de muestra) | Sí: Awin (términos públicos), también listados en Impact | No publicada ⚠ | 30 días | **2** | Marca pequeña, más fácil de convencer para seeding. Ring 2 sin suscripción, buen encaje con el plan Free. |
| **Garmin** | Catálogo | Sí: FlexOffers (1,6 %), CJ (2 %), Sovrn (~2 %) ⚠ | 1,6–2 % ⚠ | 20 días | **3** | Comisión baja, ticket alto. Interesa por seeding y por credibilidad de integración, no por dinero de afiliación. |
| **Fitbit (Google)** | Catálogo | Sí: Impact, vía Google Store | ~3 % según terceros ⚠ (la página antigua de Fitbit decía 12 %, ya no aplica) | ~15 días ⚠ | **3** | Comisión baja. Existe "Fitbit Health Solutions for Startups" con acceso a API a coste reducido; vale la pena preguntar aunque la convocatoria que vi era para startups en India. |
| **Apple Health** | Catálogo | No para hardware (creo que el programa de afiliados de Apple cubre contenido digital, no dispositivos) ⚠ | — | — | — | No es un partner. Es una integración que hay que hacer por valor para el usuario. |

Fuentes: ver sección 9.

## 4. Qué pedir exactamente a cada marca

Pedir cosas concretas y pequeñas. Una marca dice que sí a tres unidades y a un código; dice que no a
"una colaboración".

**Para la palanca B (integración / seeding):**
- **2–3 unidades** por marca: una para desarrollo, una para QA y demo, una para contenido. Justificación:
  no se puede hacer QA de una integración OAuth con sync diario sin hardware que genere datos reales.
- **Acceso a la API de partner / enterprise** (Oura Enterprise API, WHOOP developer app aprobada por
  encima del límite de usuarios de prueba).
- **Listado en su directorio de apps partner** cuando la integración esté en producción.
- **Un contacto técnico** nombrado para el proceso de aprobación de la app.

**Para la palanca A (afiliación):**
- Aprobación en su red (Impact / Awin / FlexOffers / CJ).
- **Código de descuento exclusivo** para usuarios de Vital ID. Convierte mucho mejor que un link
  pelado y la marca lo puede medir aparte.
- **Comisión por encima de la pública** una vez haya volumen. Se pide en la segunda conversación, no en la primera.

**Para la palanca C (pagado):**
- Fee fijo por "featured launch": puesto Recomendado en el catálogo durante X semanas + onboarding
  destacado + contenido EN/AR.
- Campaña Golfo: la marca paga por entrar en una región donde no tiene canal propio.
- Esto solo se pide con datos: clics por semana, tasa de conexión, ventas atribuidas.

## 5. Secuencia de outreach (90 días)

**Semana 1–2: afiliación, en bloque.**
Solicitar en todas las redes a la vez. No esperar respuesta de una para pedir otra.
Mientras tanto, preparar el producto (sección 6) para que los links tengan dónde vivir.

**Semana 2–4: partner de integración, dos marcas.**
WHOOP (ya integrados, pedir reconocimiento formal + membresías de cortesía) y Oura (el directorio
de 800 apps). Email a partnerships / developer relations, no al formulario de afiliados.

**Semana 4–8: rings competidores.**
Ultrahuman y Circular. El mensaje incluye, sin mentir, que Oura está en conversación. Las marcas
pequeñas se mueven más rápido cuando saben que la grande ya está en la mesa.

**Semana 8–12: cerrar seeding y preparar C.**
Con las unidades en mano, integrar y publicar. Recoger métricas reales de clics y conexiones.
Con eso se escribe la propuesta pagada.

Regla: **no publicar ningún logo como "integrado" hasta que lo esté.** El catálogo ya distingue
`integration: "oauth"` de `"none"` y `announcedOnly`. Mantenerlo así.

## 6. Qué necesita el producto para que esto funcione

Cambios pequeños, todos en el catálogo y la UI de conectores. Propuesta para un PR separado:

| Cambio | Dónde | Por qué |
|---|---|---|
| Campo `affiliateUrl` y `partnerCode` opcionales por proveedor | `lib/connectors.ts` | Un sitio único donde viven los links de afiliado. Hoy solo hay `website`. |
| CTA "Consigue este dispositivo" en la tarjeta de conector cuando el proveedor no está conectado | `components/connectors/` | Es la colocación que se vende en el pitch. Sin esto no hay palanca A. |
| Paso en onboarding: "¿Todavía no tienes wearable?" con 2–3 opciones recomendadas | `app/onboarding/` | El usuario sin dispositivo es el que convierte. |
| Parámetros UTM + evento de clic (sin datos de salud) | `lib/connectors-state.ts` o similar | Para tener números que enseñar en la palanca C. |
| Texto de disclosure junto a cada link de afiliado, EN y AR | `lib/connectors-i18n.ts` | Obligatorio. Ver sección 7. |
| Página `/partners` con lo que ofrecemos y un contacto | `app/` | Es el destino al que se manda a una marca en el primer email. |

Nada de esto toca el modelo de privacidad: el tracking es de clic saliente, no de datos del usuario.

## 7. Riesgos y reglas

- **Disclosure.** Cualquier link con comisión se etiqueta como tal, en los dos idiomas. Es obligatorio
  en EE. UU. (FTC) y Reino Unido (ASA) y es buena práctica en EAU. No soy abogada: conviene confirmar la
  normativa de publicidad de EAU antes de lanzar en producción.
- **Conflicto de interés con el producto.** Vital ID dice "cada número lleva su fuente". Si recomendamos
  un dispositivo por comisión y no por calidad del dato, se rompe la confianza. Regla: el puesto
  "Recomendado" se da a marcas con integración real, nunca solo por pagar.
- **Dependencia de la API de la marca.** Oura restringe datos a usuarios con membresía. WHOOP rota
  tokens. Cada integración nueva es mantenimiento. No prometer más de dos integraciones nuevas por trimestre.
- **Producto gratis = obligación fiscal y de contenido.** Las unidades de seeding pueden contar como
  ingreso en especie según el país. Y una marca que regala hardware espera algo publicado. Pactar
  por escrito qué se publica y cuándo.
- **Los porcentajes de terceros no son contratos.** Todo lo marcado ⚠ se confirma en el dashboard de
  la red antes de hacer proyecciones.

## 8. Plantillas de email (en inglés, que es como se escribe a estas marcas)

### 8.1 Partner de integración (WHOOP, Oura)

> **Subject:** Vital ID × {Brand}: native integration live / in progress, Gulf market
>
> Hi {name},
>
> I'm Silvia, founder of Vital ID, a bilingual (English / Arabic) health-credential app. Users connect
> their wearables, see their recovery, sleep and HRV with the data source labelled, and share only
> selected fields with a doctor, insurer or caregiver through a temporary, revocable link.
>
> {Brand} is one of the first providers in our connector catalogue. {WHOOP: our OAuth 2.0 integration
> with API v2 is already in production with daily sync and rotating refresh tokens.} {Oura: we are
> building the integration now, following the same flow we shipped for WHOOP.}
>
> Two things I'd like to ask:
> 1. Partner-level API access so we can move past the test-user limit and complete QA.
> 2. Two or three units for the team, so the integration is tested against real data before launch.
>
> In return: {Brand} is listed and labelled as the data source across the app, surfaced in onboarding
> to every new user, and we can share aggregated adoption numbers (never individual health data).
> We also send health credentials to nine UAE insurers, which puts {Brand} in front of a market where
> you have little localised presence today.
>
> Happy to walk you through the live product in 15 minutes.
>
> Silvia Mogas
> Vital ID · {link to /partners}

### 8.2 Afiliación + seeding (Ultrahuman, Circular, Garmin, Fitbit)

> **Subject:** Affiliate + integration partnership, Vital ID (UAE / Gulf, EN/AR)
>
> Hi {name},
>
> We've applied to your affiliate programme on {network}. Beyond the standard link, I'd like to
> propose something more useful to both sides: {Brand} appears in the connector catalogue of Vital ID
> with a "Get this device" placement shown to every new user who hasn't got a wearable yet.
>
> To ship the integration and test it properly we need two to three units. In exchange you get a
> native integration, placement in onboarding, bilingual EN/AR content and an exclusive discount code
> for our users that you can track separately.
>
> {If true: We are in conversations with {other brand} for the same slot in the smart-ring category.}
>
> Silvia Mogas · Vital ID

### 8.3 Co-marketing pagado (solo con datos)

> **Subject:** Featured launch for {Brand} in Vital ID: {N} connector clicks / week, {X}% connect rate
>
> Over the last {period}, {Brand}'s connector card received {N} clicks and {X}% of users who clicked
> went on to connect a device. We can give {Brand} the Recommended slot in the catalogue and onboarding
> for {weeks} weeks, with bilingual content and a Gulf-focused campaign. Proposal attached.

## 9. KPIs

| Métrica | Objetivo a 90 días |
|---|---|
| Programas de afiliación aprobados | 4 de 6 |
| Unidades conseguidas gratis | 6 (dos marcas × 3) |
| Integraciones nuevas en producción | 1 (Oura o Ultrahuman) |
| Clics en "Consigue este dispositivo" | Medidos desde el día uno; sin cifra objetivo hasta tener base |
| Primer acuerdo pagado | Propuesta enviada, no necesariamente cerrada |

## 10. Fuentes consultadas (8 de octubre de 2026)

Todas son directorios de afiliación o páginas de redes salvo que se indique. Ninguna es la página
oficial de la marca, que no he podido abrir desde esta sesión.

- WHOOP: [UpPromote directory](https://uppromote.com/affiliate-directory/whoop/), [oferta de empleo Senior Specialist, Affiliate Marketing](https://jobs.lever.co/whoop/9f8abe00-53f5-48d2-8b9e-f56f10bdfa67)
- Oura: [Oura for Organizations, partners y resellers](https://organizations.ouraring.com/solutions/partners-resellers), [UpPromote directory](https://uppromote.com/affiliate-directory/oura/), [Oura security whitepaper, sección Enterprise API](https://ouraring.com/assets/documents/public-security-whitepaper.pdf), [Wareable sobre las 800 apps partner](https://www.wareable.com/wearable-tech/oura-expands-integrations-with-library-of-partner-apps), [Terra sobre restricciones de la API de Oura](https://tryterra.co/blog/oura-api-ai-apps-access-permissions-commercial-restrictions)
- Ultrahuman: [Awin merchant profile](https://ui.awin.com/merchant-profile/69428), [FlexOffers](https://www.flexoffers.com/affiliate-programs/ultrahuman-healthcare-affiliate-program/)
- Circular Ring: [Awin programme terms](https://ui.awin.com/merchant-profile-terms/121438), [affi.io listing](https://affi.io/m/circular)
- Garmin: [FlexOffers](https://www.flexoffers.com/affiliate-programs/garmin-affiliate-program), [Affilimate](https://affilimate.com/programs/garmin-affiliate-program/), [UpPromote](https://uppromote.com/affiliate-directory/garmin/)
- Fitbit: [UpPromote](https://uppromote.com/affiliate-directory/fitbit/), [Lasso](https://getlasso.co/affiliate/fitbit/), [página antigua de Fitbit Affiliates (archivo)](https://web-archive.nli.org.il/National_Library/mp_/https://fitbit.com/affiliates), [Fitbit Health Solutions for Startups](https://www.startupgrantsindia.com/perks/fitbit-health-solutions-for-startups)
