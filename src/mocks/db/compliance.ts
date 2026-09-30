import type {
  ComplianceMetrics,
  ComplianceRow,
  DocumentType,
} from "@/features/monitoring/api/types/compliance"

/**
 * Estado de cumplimiento POR documento POR establecimiento educativo.
 *
 * El backend real agregaría esto con un `fn_cumplimiento_listar_paginado`
 * que joinea `TARCHIVO` con `TESTABLECIMIENTO`. En el mock las filas se
 * siembran a mano siguiendo la regla de `ETNIAS` (V521, mismo criterio que
 * `features/document-management`):
 *
 *  - PEI/PMI y PEC/PFI son mutuamente excluyentes por `ETNIAS` del EE:
 *      · `ETNIAS='N'` → PEI y PMI aplican, PEC y PFI quedan en NO_APLICA.
 *      · `ETNIAS='S'` (etnoeducativo) → PEC y PFI aplican, PEI y PMI quedan
 *        en NO_APLICA.
 *
 * El progreso global del EE y los KPIs por documento del tablero se calculan
 * sobre los documentos APLICABLES: un `NO_APLICA` no entra ni en el numerador
 * ni en el denominador, para no castigar con 0% a un EE que por `ETNIAS`
 * no tiene que entregar ese documento.
 */

const ESTABLISHMENT_NAMES = [
  "Institución Educativa Denzil Escolar",
  "Institución Educativa Livio Reginaldo Fishione",
  "Institución Educativa Isabel María Cuesta",
  "Institución Educativa José Antonio Galán",
  "Centro Educativo No 27 Sanbenitino",
  "Institución Educativa Técnica Agropecuaria La Esperanza",
  "Colegio Mayor de San Bartolomé",
  "Institución Educativa Rural El Carmen",
  "Institución Educativa San José de Calasanz",
  "Institución Educativa Distrital Villas de San Pablo",
]

/**
 * `ETNIAS` del EE, inferida del nombre. La detección es best-effort para
 * sembrar el mock — en el backend real sale de la columna `ETNIAS` de
 * `TESTABLECIMIENTO` (V520).
 *
 *  - `"N"` → aplica PEI/PMI, PEC/PFI en NO_APLICA.
 *  - `"S"` → aplica PEC/PFI, PEI/PMI en NO_APLICA (incluye "Centro
 *    Educativo", "Centro Etnoeducativo" e "Institución Etnoeducativa").
 */
type Etnias = "S" | "N"

function detectEtnias(name: string): Etnias {
  if (/centro\s+(educativo|etnoeducativo)/i.test(name)) return "S"
  if (/instituci[oó]n\s+etnoeducativa/i.test(name)) return "S"
  return "N"
}

const TIPOS = ["PEI", "PEC", "PMI", "PFI"] as const

/**
 * Distribución del estado de cada documento por EE. La idea es que la
 * página refleje los % del Figma:
 *   - PEI:  ~50% completo — solo cuenta EEs con ETNIAS='N'.
 *   - PEC:  ~20% completo — solo cuenta EEs con ETNIAS='S'.
 *   - PMI:  ~20% completo — mismo universo que PEI (ETNIAS='N').
 *   - PFI:  ~20% completo — mismo universo que PEC (ETNIAS='S').
 *
 * El conteo se hace en función de cuántos EEs sembramos (10) y un
 * `weightedRandom` que sesga hacia PENDIENTE en PEC/PFI y PMI.
 */
function buildComplianceRows(): ComplianceRow[] {
  // Pesos: cuánto tira a COMPLETO vs PENDIENTE.
  const weights: Record<DocumentType, number> = {
    PEI: 0.5,
    PEC: 0.2,
    PMI: 0.2,
    PFI: 0.2,
  }

  // `seededRandom` evita que cada render del mock baraje las filas — usa
  // un LCG simple en función del nombre + tipo, suficiente para 10 EE.
  function seededRandom(seed: string): number {
    let h = 2166136261
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return ((h >>> 0) % 1000) / 1000
  }

  function pickStatus(type: DocumentType, name: string): "COMPLETO" | "PENDIENTE" {
    return seededRandom(`${type}-${name}`) < weights[type] ? "COMPLETO" : "PENDIENTE"
  }

  function fileNameFor(name: string, type: DocumentType): string {
    const slug = name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")
    return `${slug}_${type}_2026.pdf`
  }

  /**
   * Estado de un documento tal como lo devuelve el jsonb del backend: además
   * del status y el nombre, la REFERENCIA al binario. El visor la necesita
   * porque desde el tablero no puede consultar `/documentos` (ver el javadoc
   * de `visorSearchSchema`).
   */
  function documentState(
    status: "COMPLETO" | "PENDIENTE" | "NO_APLICA",
    name: string,
    type: DocumentType,
    index: number,
  ) {
    if (status !== "COMPLETO") {
      return { status, fileName: null, archivoId: null, downloadUrl: null }
    }
    // Id sintético estable por EE y tipo, para que el deep-link al visor no
    // cambie entre recargas.
    const archivoId = 490_000 + index * 10 + TIPOS.indexOf(type)
    return {
      status,
      fileName: fileNameFor(name, type),
      archivoId,
      downloadUrl: `/api/files/download/${archivoId}`,
    }
  }

  return ESTABLISHMENT_NAMES.map((name, index) => {
    const etnias = detectEtnias(name)
    // PEI/PMI solo aplican con ETNIAS='N', PEC/PFI solo con ETNIAS='S'.
    const peiPmiAplican = etnias === "N"
    const pecPfiAplican = etnias === "S"

    const pei = peiPmiAplican ? pickStatus("PEI", name) : "NO_APLICA"
    const pec = pecPfiAplican ? pickStatus("PEC", name) : "NO_APLICA"
    const pmi = peiPmiAplican ? pickStatus("PMI", name) : "NO_APLICA"
    const pfi = pecPfiAplican ? pickStatus("PFI", name) : "NO_APLICA"

    // Progreso: solo cuentan los documentos que aplican (2 por EE: PEI+PMI
    // o PEC+PFI, nunca los cuatro a la vez).
    const applicable: Array<"COMPLETO" | "PENDIENTE"> = []
    if (pei !== "NO_APLICA") applicable.push(pei)
    if (pec !== "NO_APLICA") applicable.push(pec)
    if (pmi !== "NO_APLICA") applicable.push(pmi)
    if (pfi !== "NO_APLICA") applicable.push(pfi)

    const completed = applicable.filter((status) => status === "COMPLETO").length
    const globalProgress =
      applicable.length === 0 ? 0 : Math.round((completed / applicable.length) * 100)

    return {
      id: index + 1,
      establishmentName: name,
      pei: documentState(pei, name, "PEI", index),
      pec: documentState(pec, name, "PEC", index),
      pmi: documentState(pmi, name, "PMI", index),
      pfi: documentState(pfi, name, "PFI", index),
      globalProgress,
    }
  })
}

export const complianceRowsDb: ComplianceRow[] = buildComplianceRows()

/**
 * Métricas globales del tablero: total de EE y avance por documento. Los
 * números del Figma (50 EE, 10/20 PEI, 6/30 PEC, 10/20 PMI, 6/30 PFI) son el
 * target final del sistema; el mock usa los conteos reales del set sembrado
 * (10 EE) y los proyecta con un factor de escala (`scale`) para acercarse a
 * esa realidad sin tener que sembrar 50 EE uno por uno.
 *
 * El denominador (`total`) de cada documento es la cantidad de EE a los que
 * el documento APLICA (según ETNIAS) — no el total de EE.
 */
export function getComplianceMetrics(): ComplianceMetrics {
  const total = complianceRowsDb.length

  function countApplicable(type: DocumentType): number {
    const key = type.toLowerCase() as "pei" | "pec" | "pmi" | "pfi"
    return complianceRowsDb.filter((row) => row[key].status !== "NO_APLICA").length
  }

  function countCompleted(type: DocumentType): number {
    const key = type.toLowerCase() as "pei" | "pec" | "pmi" | "pfi"
    return complianceRowsDb.filter((row) => row[key].status === "COMPLETO").length
  }

  // Factor de escala: si tenemos 10 EE sembrados y el Figma habla de 50,
  // el porcentaje se mantiene pero los denominadores se inflan al tamaño
  // del sistema real. Esto evita que el tablero diga "10 de 10" cuando
  // la realidad del Figma dice "10 de 20".
  const SCALE = 5

  function block(type: DocumentType) {
    const applicable = countApplicable(type) * SCALE
    const completed = countCompleted(type) * SCALE
    return {
      completed,
      total: applicable,
      percent: applicable === 0 ? 0 : Math.round((completed / applicable) * 100),
    }
  }

  return {
    totalEstablishments: total * SCALE,
    pei: block("PEI"),
    pec: block("PEC"),
    pmi: block("PMI"),
    pfi: block("PFI"),
  }
}
