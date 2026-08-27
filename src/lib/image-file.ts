import { z } from "zod"

/**
 * Validación de las imágenes que suben los formularios (escudo del
 * establecimiento, foto de funcionario) — una sola fuente para las tres
 * capas que hoy tenían que coincidir a mano:
 *
 *   1. el `accept` y el `maxSize` del dropzone,
 *   2. el texto de ayuda que se le muestra al usuario,
 *   3. la validación de submit, que es la que de verdad frena el envío.
 *
 * Antes solo existía (1): el dropzone descartaba el archivo grande en
 * silencio —un borde rojo de dos segundos, sin mensaje— y nada más abajo
 * volvía a mirarlo. Cualquier `File` que llegara al estado por otro camino
 * (edición, arrastre múltiple, un cambio futuro del componente) viajaba
 * entero al multipart y el fallo aparecía recién en el gateway.
 */

/** Tope de peso. `file-service` corta bastante más arriba; este es el de negocio. */
export const IMAGE_MAX_SIZE = 2 * 1024 * 1024

/** MIME types aceptados, en el orden en que se listan en el `hint`. */
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/svg+xml"] as const

/** Valor listo para el atributo `accept` de un `<input type="file">`. */
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(",")

/**
 * Tope por lado, en píxeles. Es un límite distinto del peso y no redundante
 * con él: un PNG de plano —pocos colores, mucha superficie— entra en 1,5 MB
 * comprimido y ocupa `ancho × alto × 4` bytes al descomprimirse. 10000×10000
 * son 400 MB de RAM en la pestaña; ahí no falla el envío, se muere el
 * navegador al pintar la vista previa.
 *
 * 4000 px de lado (64 MB descomprimidos en el peor caso) es de sobra para un
 * escudo o una foto de perfil, que se muestran a menos de 300 px.
 */
export const IMAGE_MAX_DIMENSION = 4000

/** Texto de ayuda: tiene que decir lo mismo que validan las reglas de acá. */
export const IMAGE_HINT = "JPG, PNG o SVG · Máximo 2 MB y 4000 × 4000 px"

/** Solo para los mensajes de error: 2 MB, 1,5 MB, 800 KB. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const megabytes = bytes / (1024 * 1024)
    return `${megabytes.toFixed(megabytes < 10 && megabytes % 1 !== 0 ? 1 : 0).replace(".", ",")} MB`
  }
  return `${Math.round(bytes / 1024)} KB`
}

/** Etiqueta corta por MIME type, para no mostrarle "image/svg+xml" al usuario. */
const TYPE_LABELS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/svg+xml": "SVG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
}

function typeLabel(mime: string): string {
  return TYPE_LABELS[mime] ?? mime.replace(/^image\//, "").toUpperCase()
}

export interface ImageFileRules {
  /** Tamaño máximo en bytes. Por defecto `IMAGE_MAX_SIZE`. */
  maxSize?: number
  /** MIME types permitidos. Por defecto `IMAGE_MIME_TYPES`. */
  types?: readonly string[]
  /** Máximo de píxeles por lado. Por defecto `IMAGE_MAX_DIMENSION`. */
  maxDimension?: number
}

export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Dimensiones ya medidas, por archivo. Sirve para que la validación de
 * submit —que es síncrona— pueda mirar el tamaño en píxeles sin volver a
 * leer el binario: para cuando se guarda, el dropzone ya midió.
 *
 * `WeakMap` y no `Map` porque la clave es el `File`: cuando el formulario lo
 * suelta, la entrada se va sola.
 */
const measuredDimensions = new WeakMap<File, ImageDimensions>()

/** Lo que ya se sabe del archivo, o `undefined` si nunca se midió. */
export function getMeasuredDimensions(file: File): ImageDimensions | undefined {
  return measuredDimensions.get(file)
}

/**
 * Esquema **síncrono** de una imagen ya elegida: MIME type declarado y peso
 * del archivo. No se abre el binario, así que un archivo renombrado pasa el
 * filtro del front — quien decide de verdad es `file-service`, que sí mira
 * el contenido.
 *
 * Ojo con el orden de los `refine`: primero el tipo y después el peso, para
 * que un PDF de 40 MB se reporte como "formato no permitido" (que es lo que
 * el usuario tiene que corregir) y no como "pesa demasiado".
 *
 * Las dimensiones se validan al final, pero **solo si alguien ya las midió**
 * (ver `measuredDimensions`): medirlas exige leer el archivo, que es
 * asíncrono, y este esquema tiene que servir dentro de un `safeParse` de
 * submit. En la práctica siempre están: el dropzone mide antes de aceptar.
 * Cuando no están, este esquema deja pasar y la única red es `readImageDimensions`.
 */
export function imageFileSchema({
  maxSize = IMAGE_MAX_SIZE,
  types = IMAGE_MIME_TYPES,
  maxDimension = IMAGE_MAX_DIMENSION,
}: ImageFileRules = {}) {
  const allowed = types.map(typeLabel).join(", ")

  return z
    .instanceof(File, { message: "Selecciona un archivo de imagen." })
    .refine((file) => file.size > 0, {
      message: "El archivo está vacío.",
    })
    .refine((file) => types.includes(file.type), {
      message: `Formato no permitido. Usa ${allowed}.`,
    })
    .refine((file) => file.size <= maxSize, {
      message: `La imagen supera el máximo de ${formatBytes(maxSize)}.`,
    })
    .superRefine((file, ctx) => {
      const dimensions = measuredDimensions.get(file)
      if (!dimensions) return

      const issue = dimensionsIssue(dimensions, maxDimension)
      if (issue) {
        ctx.addIssue({ code: "custom", message: issue })
      }
    })
}

/** El mensaje de "demasiados píxeles", o `null` si las dimensiones sirven. */
function dimensionsIssue(dimensions: ImageDimensions, maxDimension: number): string | null {
  if (dimensions.width <= maxDimension && dimensions.height <= maxDimension) {
    return null
  }

  return `La imagen mide ${dimensions.width} × ${dimensions.height} px y el máximo es ${maxDimension} × ${maxDimension} px.`
}

/** El de siempre: el que usan escudo y foto. */
export const imageFile = imageFileSchema()

/**
 * Campo de imagen opcional: `null`/`undefined` es válido y significa "sin
 * imagen" (al crear) o "conservá la que ya tiene" (al editar).
 */
export const optionalImageFile = imageFile.nullish()

/**
 * El mismo esquema en la forma que espera un dropzone: el primer mensaje de
 * error, o `null` si el archivo sirve. Es lo que se le pasa a `onFileValidate`.
 */
export function validateImageFile(file: File, rules?: ImageFileRules): string | null {
  const result = imageFileSchema(rules).safeParse(file)
  return result.success ? null : (result.error.issues[0]?.message ?? "Archivo no válido.")
}

/**
 * Cuánto se lee para medir. Las dimensiones de un PNG están en los primeros
 * 24 bytes; en un JPEG están en el SOF, que va después de los metadatos
 * (EXIF con miniatura incluida), de ahí el margen.
 */
const HEADER_BYTES = 256 * 1024

/**
 * Se leen los bytes de la cabecera a mano en vez de usar `new Image()` o
 * `createImageBitmap()`, que serían dos líneas. El motivo es que los dos
 * **descomprimen la imagen entera** para poder responder: usarlos acá
 * provocaría exactamente el cuelgue que esta validación existe para evitar
 * —para saber si un PNG de 10000×10000 es demasiado grande habría que
 * reservarle antes los 400 MB—. Leer la cabecera cuesta un `slice` y no
 * decodifica nada.
 */
function parsePngDimensions(view: DataView): ImageDimensions | null {
  if (view.byteLength < 24) return null
  // Firma PNG, y el IHDR, que el formato obliga a que sea el primer chunk.
  if (view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) return null
  if (view.getUint32(12) !== 0x49484452) return null

  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function parseJpegDimensions(view: DataView): ImageDimensions | null {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null

  let offset = 2
  // El alto y el ancho viven en el SOF (Start Of Frame), que puede estar
  // detrás de cualquier cantidad de segmentos de metadatos.
  while (offset + 9 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1
      continue
    }

    const marker = view.getUint8(offset + 1)
    // Relleno (0xFF repetido) y marcadores que no llevan payload: se saltan
    // sin leer longitud, porque no tienen.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2
      continue
    }

    // SOF0..SOF15, menos los tres que comparten rango sin ser SOF: DHT
    // (0xC4), JPG extendido (0xC8) y DAC (0xCC).
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc

    if (isStartOfFrame) {
      // En el SOF va primero el alto y después el ancho, no al revés.
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) }
    }

    offset += 2 + view.getUint16(offset + 2)
  }

  return null
}

/**
 * Mide la imagen sin descomprimirla y cachea el resultado para que la
 * validación de submit lo encuentre ya hecho.
 *
 * Devuelve `null` cuando no se pudo medir —un SVG, que no tiene tamaño en
 * píxeles, o un archivo con la cabecera cortada—. Eso NO es un error: el
 * archivo ya pasó el tope de peso, y el único que puede opinar de verdad
 * sobre el contenido es `file-service`.
 */
export async function readImageDimensions(file: File): Promise<ImageDimensions | null> {
  const cached = measuredDimensions.get(file)
  if (cached) return cached

  try {
    const view = new DataView(await file.slice(0, HEADER_BYTES).arrayBuffer())
    const dimensions = parsePngDimensions(view) ?? parseJpegDimensions(view)

    if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
      measuredDimensions.set(file, dimensions)
      return dimensions
    }
  } catch {
    // Archivo ilegible: no se bloquea por esto, se deja pasar al backend.
  }

  return null
}

/**
 * La validación completa —tipo, peso y píxeles—, que es asíncrona porque
 * medir exige leer el archivo. Es la que usa el dropzone antes de aceptar
 * la imagen; después de esto, las dimensiones quedan cacheadas y el
 * `safeParse` del submit las ve sin volver a leer nada.
 */
export async function validateImageFileAsync(
  file: File,
  rules?: ImageFileRules,
): Promise<string | null> {
  const sync = validateImageFile(file, rules)
  if (sync) return sync

  const dimensions = await readImageDimensions(file)
  if (!dimensions) return null

  return dimensionsIssue(dimensions, rules?.maxDimension ?? IMAGE_MAX_DIMENSION)
}
