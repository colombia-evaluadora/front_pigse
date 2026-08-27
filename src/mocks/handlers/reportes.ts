import { HttpResponse, delay, http } from "msw"

/**
 * Mock de `POST /api/reportes/{clave}` — el `reporting-service`.
 *
 * A diferencia del resto de los handlers, este NO devuelve JSON: el servicio
 * real responde el binario del reporte, y el front lo descarga leyendo
 * `Content-Disposition` y `X-Report-Rows`. Si el mock devolviera un objeto, el
 * modo mockeado ejercitaría un camino distinto del real y la descarga solo se
 * probaría contra el backend.
 *
 * Los bytes son un PDF y un XLSX mínimos pero VÁLIDOS, así que el navegador
 * los abre de verdad en vez de bajar un archivo roto.
 */

/** PDF de una página en blanco, escrito a mano. Suficiente para que un visor lo abra. */
const PDF_MINIMO = [
  "%PDF-1.4",
  "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj",
  "trailer<</Root 1 0 R>>",
  "%%EOF",
].join("\n")

const NOMBRE_POR_CLAVE: Record<string, string> = {
  funcionarios: "funcionarios",
  establecimientos: "establecimientos",
}

function fecha() {
  const hoy = new Date()
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("")
}

export const reportesHandlers = [
  http.post("*/api/reportes/:clave", async ({ params, request }) => {
    await delay(700)

    const clave = String(params["clave"])
    const base = NOMBRE_POR_CLAVE[clave]

    if (!base) {
      // Mismo 404 que da el servicio para una clave que no está en su catálogo.
      return HttpResponse.json({ message: `No existe el reporte '${clave}'.` }, { status: 404 })
    }

    const { format } = (await request.json()) as { format?: string }

    if (format !== "pdf" && format !== "excel") {
      return HttpResponse.json(
        { message: `Formato '${format}' no soportado. Usa 'pdf' o 'excel'.` },
        { status: 400 },
      )
    }

    const esPdf = format === "pdf"
    const cuerpo = esPdf
      ? new TextEncoder().encode(PDF_MINIMO)
      : // Un .xlsx es un ZIP; con la firma PK basta para que el mock sea
        // reconocible como tal sin construir un libro entero.
        new Uint8Array([0x50, 0x4b, 0x03, 0x04])

    return new HttpResponse(cuerpo, {
      status: 200,
      headers: {
        "Content-Type": esPdf
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}-${fecha()}.${esPdf ? "pdf" : "xlsx"}"`,
        "X-Report-Rows": "42",
      },
    })
  }),
]
