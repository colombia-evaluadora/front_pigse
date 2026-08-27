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
 * siembran a mano siguiendo la regla del Figma:
 *
 *  - PEI y PEC son mutuamente excluyentes por modalidad del EE:
 *      · "Institución Educativa" / "Colegio Mayor" → PEI aplica, PEC NO_APLICA.
 *      · "Centro Etnoeducativo" / "Institución Etnoeducativa" → PEC aplica,
 *        PEI NO_APLICA.
 *  - PMI siempre aplica — todos los EE pueden/deben subirlo.
 *
 * El progreso global del EE y los KPIs por documento del tablero se calculan
 * sobre los documentos APLICABLES: un `NO_APLICA` no entra ni en el numerador
 * ni en el denominador, para no castigar con 0% a un EE que por modalidad
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
 * Modalididad del EE, inferida del nombre. La detección es best-effort para
 * sembrar el mock — en el backend real saldría de un campo de la EE (el
 * "nivel" / "modalidad" del catálogo del SSO).
 *
 *  - `IE`   → aplica PEI, PEC NO_APLICA.
 *  - `ETNO` → aplica PEC, PEI NO_APLICA (incluye "Centro Educativo",
 *             "Centro Etnoeducativo" e "Institución Etnoeducativa").
 */
type Modality = "IE" | "ETNO"

function detectModality(name: string): Modality {
  if (/centro\s+(educativo|etnoeducativo)/i.test(name)) return "ETNO"
  if (/instituci[oó]n\s+etnoeducativa/i.test(name)) return "ETNO"
  return "IE"
}

/**
 * Distribución del estado de cada documento por EE. La idea es que la
 * página refleje los % del Figma:
 *   - PEI:  ~50% completo (10 de 20) — solo cuenta EEs IE.
 *   - PEC:  ~20% completo (6 de 30)  — solo cuenta EEs ETNO.
 *   - PMI:  ~20% completo (10 de 50) — cuenta todos.
 *
 * El conteo se hace en función de cuántos EEs sembramos (10) y un
 * `weightedRandom` que sesga hacia PENDIENTE en PEC y PMI.
 */
function buildComplianceRows(): ComplianceRow[] {
  // Pesos: cuánto tira a COMPLETO vs PENDIENTE. PEI ~ 0.5, PEC ~ 0.2,
  // PMI ~ 0.2. La función `pickStatus` usa estos valores para mapear un
  // pseudo-aleatorio estable a un estado.
  const weights: Record<DocumentType, number> = {
    PEI: 0.5,
    PEC: 0.2,
    PMI: 0.2,
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
    const archivoId = 490_000 + index * 10 + ["PEI", "PEC", "PMI"].indexOf(type)
    return {
      status,
      fileName: fileNameFor(name, type),
      archivoId,
      downloadUrl: `/api/files/download/${archivoId}`,
    }
  }

  return ESTABLISHMENT_NAMES.map((name, index) => {
    const modality = detectModality(name)
    // PEI solo aplica a IE, PEC solo aplica a ETNO, PMI siempre.
    const peiApplies = modality === "IE"
    const pecApplies = modality === "ETNO"

    const pei = peiApplies ? pickStatus("PEI", name) : "NO_APLICA"
    const pec = pecApplies ? pickStatus("PEC", name) : "NO_APLICA"
    const pmi = pickStatus("PMI", name)

    // Progreso: solo cuentan los documentos que aplican. Si un EE tiene PEI
    // y PMI aplicables y PEC NO_APLICA, el denominador es 2. PMI siempre
    // aplica, así que entra directo.
    const applicable: Array<"COMPLETO" | "PENDIENTE"> = []
    if (pei !== "NO_APLICA") applicable.push(pei)
    if (pec !== "NO_APLICA") applicable.push(pec)
    applicable.push(pmi)

    const completed = applicable.filter((status) => status === "COMPLETO").length
    const globalProgress =
      applicable.length === 0 ? 0 : Math.round((completed / applicable.length) * 100)

    return {
      id: index + 1,
      establishmentName: name,
      pei: documentState(pei, name, "PEI", index),
      pec: documentState(pec, name, "PEC", index),
      pmi: documentState(pmi, name, "PMI", index),
      globalProgress,
    }
  })
}

export const complianceRowsDb: ComplianceRow[] = buildComplianceRows()

/**
 * Métricas globales del tablero: total de EE y avance por documento. Los
 * números del Figma (50 EE, 10/20 PEI, 6/30 PEC, 10/50 PMI) son el target
 * final del sistema; el mock usa los conteos reales del set sembrado
 * (10 EE, ~5/8 PEI, ~2/2 PEC, ~2/10 PMI) y los proyecta con un factor de
 * escala (`scale`) para acercarse a esa realidad sin tener que sembrar 50
 * EE uno por uno.
 *
 * Para PEI/PEC el denominador (`total`) es la cantidad de EE a los que el
 * documento APLICA — no el total de EE — porque un etnoeducativo no entra
 * en el conteo de PEI y viceversa. PMI sí cuenta sobre todos.
 */
export function getComplianceMetrics(): ComplianceMetrics {
  const total = complianceRowsDb.length

  function countApplicable(type: DocumentType): number {
    const key = type.toLowerCase() as "pei" | "pec" | "pmi"
    return complianceRowsDb.filter((row) => row[key].status !== "NO_APLICA").length
  }

  function countCompleted(type: DocumentType): number {
    const key = type.toLowerCase() as "pei" | "pec" | "pmi"
    return complianceRowsDb.filter((row) => row[key].status === "COMPLETO").length
  }

  // Factor de escala: si tenemos 10 EE sembrados y el Figma habla de 50,
  // el porcentaje se mantiene pero los denominadores se inflan al tamaño
  // del sistema real. Esto evita que el tablero diga "10 de 10" cuando
  // la realidad del Figma dice "10 de 20".
  const SCALE = 5

  const peiApplicable = countApplicable("PEI") * SCALE
  const peiCompleted = countCompleted("PEI") * SCALE
  const pecApplicable = countApplicable("PEC") * SCALE
  const pecCompleted = countCompleted("PEC") * SCALE
  const pmiApplicable = countApplicable("PMI") * SCALE
  const pmiCompleted = countCompleted("PMI") * SCALE

  return {
    totalEstablishments: total * SCALE,
    pei: {
      completed: peiCompleted,
      total: peiApplicable,
      percent: peiApplicable === 0 ? 0 : Math.round((peiCompleted / peiApplicable) * 100),
    },
    pec: {
      completed: pecCompleted,
      total: pecApplicable,
      percent: pecApplicable === 0 ? 0 : Math.round((pecCompleted / pecApplicable) * 100),
    },
    pmi: {
      completed: pmiCompleted,
      total: pmiApplicable,
      percent: pmiApplicable === 0 ? 0 : Math.round((pmiCompleted / pmiApplicable) * 100),
    },
  }
}
