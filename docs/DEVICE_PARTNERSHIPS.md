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

## 1. Prioridad comercial actualizada (8 de octubre de 2026)

**Decisión de Silvia:** conseguir dispositivos sin coste y cobrar por su promoción. La afiliación es complementaria. No esperar a tener ventas para proponer un piloto pagado por entregables concretos.

Oferta inicial propuesta, pendiente de negociación: **piloto de 30 días por 1.500 EUR + 1–2 dispositivos en propiedad + 12 meses de suscripción cuando sea necesaria + comisión adicional por ventas**. Es un precio interno de salida, no una tarifa de mercado verificada ni un acuerdo cerrado.

Entregables: una demostración grabada del dispositivo y su caso de uso, un post de LinkedIn y un informe breve con las métricas reales de la campaña. Si la integración no existe, mostrar únicamente el dispositivo y el concepto; no prometer una integración en producción dentro del piloto. El desarrollo de integración se presupuesta aparte tras revisar API y alcance.

Negociación:
- Solicitar primero hardware, suscripción y fee fijo juntos.
- Si solo ofrecen producto, aceptar únicamente una evaluación acotada, sin campaña completa ni obligación de valoración positiva.
- Cobrar el fee completo antes de comenzar. Acordar envío, aduanas y propiedad del dispositivo por escrito.
- Uso en anuncios, reutilización del contenido y exclusividad se negocian y cobran aparte.
- La colocación pagada se etiqueta como patrocinada. El patrocinio no compra una recomendación clínica ni altera puntuaciones de salud.

### Las tres palancas

| Palanca | Qué conseguimos | Qué damos | Velocidad |
|---|---|---|---|
| **A. Afiliación** | Comisión por cada dispositivo vendido desde Vital ID | Un botón "Consigue este dispositivo" en cada tarjeta de conector y en el onboarding | Días. Solicitud online, sin negociar |
| **B. Partner de integración** | Unidades gratis (dev kit / seeding), acceso a API de partner, aparecer en su directorio de apps | Integración nativa + QA real con hardware + logo en nuestra pantalla de conectores | Semanas. Hay que hablar con una persona |
| **C. Co-marketing pagado** | Fee fijo por lanzamiento, colocación destacada, campaña en Golfo | Espacio etiquetado como patrocinado, contenido acordado y métricas de campaña sin datos de salud | Piloto desde el inicio; alcance y audiencia deben demostrarse |

El orden comercial es **B + C desde el primer contacto**: hardware para evaluación y un piloto remunerado por producción y promoción. **A en paralelo**, cuando se confirme elegibilidad y condiciones. Las métricas de conversión sirven para ampliar el acuerdo, no son un requisito para proponer contenido pagado.

## 2. Lo que ofrecemos (la moneda de cambio)

Esto es lo que va en cada pitch. Nada de "nos encanta vuestro producto".

1. **Colocación en producto, no en un feed.** El catálogo de conectores se ve en el onboarding de cada
   usuario nuevo. Un usuario sin wearable llega a "¿qué dispositivo tienes?" y se le puede ofrecer uno.
2. **Integración técnica real.** Ya tenemos OAuth 2.0, rotación de refresh tokens, sync diario y
   mapeo de métricas hecho para WHOOP (`lib/connectors/whoop/`). Replicar el flujo para otra marca es
   trabajo acotado. Eso les ahorra a ellos una integración y nos da una razón legítima para pedir hardware.
3. **Enfoque Golfo.** La interfaz EN/AR y los casos de uso previstos para EAU son capacidades de producto y una hipótesis comercial. Un listado de aseguradoras no acredita acuerdos, usuarios asegurados, distribución ni recepción efectiva de credenciales. No afirmar baja presencia local de las marcas sin investigación específica.
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
- Fee fijo por un piloto de contenido y demostraciones, más dispositivos y suscripciones.
- Colocación patrocinada en producto solo cuando exista el espacio y haya alcance verificable; no vender el puesto "Recomendado".
- Proponer el piloto desde la primera conversación. Adjuntar únicamente audiencia y resultados documentados; no garantizar ventas.

## 5. Ejecución comercial

| Plazo | Acción | Resultado buscado |
|---|---|---|
| Días 1–3 | Preparar demo, audiencia documentada y propuesta de una página | Oferta con precio, entregables y estado real de integraciones |
| Días 4–7 | Localizar y verificar responsables de partnerships/creator marketing de WHOOP, Oura, Ultrahuman y Circular | Cuatro borradores personalizados; enviar solo con autorización de Silvia |
| Día 7 tras cada envío | Primer seguimiento | Conversación sobre hardware y presupuesto de piloto |
| Día 14 tras cada envío | Segundo seguimiento | Respuesta, siguiente paso o cierre del contacto |
| Días 15–30 | Negociar un piloto; documentar alcance, derechos, envío y prepago | Objetivo interno: un piloto pagado y hardware recibido |
| Días 30–90 | Ejecutar y medir el piloto; evaluar ampliación y afiliación | Resultados reales para renovar el acuerdo |

No afirmar conversaciones con competidores hasta que existan. No publicar ningún logo como integrado hasta validar la integración. Las solicitudes y acuerdos no se consideran enviados o cerrados hasta que haya evidencia.

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

### 8.1 Primer contacto: hardware + piloto remunerado

> **Subject:** {Brand} × Vital ID: device evaluation and paid content pilot
>
> Hi {name},
>
> I'm Silvia Mogas, founder of Vital ID, a healthtech project focused on portable health credentials. I'm exploring a partnership with {Brand} combining hands-on device evaluation with a paid content and demonstration pilot.
>
> {WHOOP only: Our repository includes a WHOOP OAuth integration, which I can demonstrate.} {Other brands: Your device is a candidate for a future integration, subject to API access and technical validation.}
>
> For an initial 30-day pilot, I'd propose one or two devices with any required subscription, alongside a fixed fee covering a recorded demonstration, a LinkedIn post and a short campaign report. Affiliate commission could sit alongside the fixed fee.
>
> I can share the product demo, verified audience figures and a one-page proposal. Would you be the right person to discuss partnerships and paid creator collaborations?
>
> Silvia Mogas
> Founder, Vital ID

### 8.2 Seguimiento, siete días después

> Hi {name},
>
> Following up on my proposal for a {Brand} × Vital ID pilot combining device evaluation and paid content. I'd be happy to share a short demo and the proposed deliverables. Is this something your partnerships or creator marketing team would consider?

### 8.3 Si ofrecen únicamente afiliación o producto

> Thank you for sharing the options. Affiliate commission could complement the partnership. For the content and demonstration work, my proposal includes a fixed production fee alongside the devices and required subscription.
>
> If there is no campaign budget at this stage, we could explore a limited device evaluation with no commitment to a full promotional campaign.

## 9. KPIs

| Métrica | Objetivo a 90 días |
|---|---|
| Programas de afiliación aprobados | 4 de 6 |
| Unidades conseguidas gratis | 6 (dos marcas × 3) |
| Integraciones nuevas en producción | 1 (Oura o Ultrahuman) |
| Clics en "Consigue este dispositivo" | Medidos desde el día uno; sin cifra objetivo hasta tener base |
| Primer acuerdo pagado | Objetivo interno: un piloto firmado y prepagado; no garantizado |

## 10. Fuentes consultadas (8 de octubre de 2026)

Todas son directorios de afiliación o páginas de redes salvo que se indique. Ninguna es la página
oficial de la marca, que no he podido abrir desde esta sesión.

- WHOOP: [UpPromote directory](https://uppromote.com/affiliate-directory/whoop/), [oferta de empleo Senior Specialist, Affiliate Marketing](https://jobs.lever.co/whoop/9f8abe00-53f5-48d2-8b9e-f56f10bdfa67)
- Oura: [Oura for Organizations, partners y resellers](https://organizations.ouraring.com/solutions/partners-resellers), [UpPromote directory](https://uppromote.com/affiliate-directory/oura/), [Oura security whitepaper, sección Enterprise API](https://ouraring.com/assets/documents/public-security-whitepaper.pdf), [Wareable sobre las 800 apps partner](https://www.wareable.com/wearable-tech/oura-expands-integrations-with-library-of-partner-apps), [Terra sobre restricciones de la API de Oura](https://tryterra.co/blog/oura-api-ai-apps-access-permissions-commercial-restrictions)
- Ultrahuman: [Awin merchant profile](https://ui.awin.com/merchant-profile/69428), [FlexOffers](https://www.flexoffers.com/affiliate-programs/ultrahuman-healthcare-affiliate-program/)
- Circular Ring: [Awin programme terms](https://ui.awin.com/merchant-profile-terms/121438), [affi.io listing](https://affi.io/m/circular)
- Garmin: [FlexOffers](https://www.flexoffers.com/affiliate-programs/garmin-affiliate-program), [Affilimate](https://affilimate.com/programs/garmin-affiliate-program/), [UpPromote](https://uppromote.com/affiliate-directory/garmin/)
- Fitbit: [UpPromote](https://uppromote.com/affiliate-directory/fitbit/), [Lasso](https://getlasso.co/affiliate/fitbit/), [página antigua de Fitbit Affiliates (archivo)](https://web-archive.nli.org.il/National_Library/mp_/https://fitbit.com/affiliates), [Fitbit Health Solutions for Startups](https://www.startupgrantsindia.com/perks/fitbit-health-solutions-for-startups)
