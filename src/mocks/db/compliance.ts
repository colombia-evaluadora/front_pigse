import type {
  ComplianceCategory,
  ComplianceDocumentDetail,
  ComplianceDocumentState,
  ComplianceMetrics,
  CompliancePlazo,
  ComplianceRow,
  DocumentType,
} from "@/features/monitoring/api/types/compliance"

/**
 * Mock del tablero de Monitoreo y del detalle documental por EE. Una sola
 * fuente (anexos con archivos por EE x tipo) de la que salen las filas de
 * `fn_cumplimiento_listar` (V523), el detalle de V555.1 y las métricas, para
 * que los tres digan lo mismo. Mismas reglas que el backend:
 *
 *  - ETNIAS 'N' → aplican PEI + PMI; 'S' (etnoeducativo) → PEC + PFI.
 *  - PEI/PEC: 4 anexos obligatorios + "Plan escolar de gestión del riesgo"
 *    opcional; "Plan de estudios" admite varios archivos.
 *  - PMI/PFI: el plan + "Autoevaluación institucional", ambos obligatorios.
 *  - Plazo: excepción del EE si la tiene, si no la fecha global (V522).
 *
 * Datos deterministas (sin `Math.random`): recargar da siempre lo mismo.
 */

/** Fecha global de entrega. Ya pasó (para ver "Vencido") salvo excepciones. */
export const MOCK_FECHA_LIMITE_GLOBAL = "2026-09-30"

interface SeedEstablishment {
  name: string
  code: string
  municipio: string
  municipioId: number
  etnias: "S" | "N"
  /** Excepción propia (prórroga). */
  excepcion?: string
  /** 0..1: qué tan avanzado está (determina cuántos anexos cargó). */
  avance: number
}

const SEED: SeedEstablishment[] = [
  { name: "INSTITUCION ETNOEDUCATIVO #6 GUACHAQUERO", code: "244001000611", municipio: "Riohacha", municipioId: 44001, etnias: "S", avance: 0.6 },
  { name: "Institución Educativa Denzil Escolar", code: "244001000123", municipio: "Riohacha", municipioId: 44001, etnias: "N", avance: 1 },
  { name: "Institución Educativa Livio Reginaldo Fishione", code: "244430000456", municipio: "Maicao", municipioId: 44430, etnias: "N", avance: 0.5, excepcion: "2026-12-15" },
  { name: "Institución Educativa Isabel María Cuesta", code: "244847000789", municipio: "Uribia", municipioId: 44847, etnias: "N", avance: 0 },
  { name: "Institución Educativa José Antonio Galán", code: "244001000222", municipio: "Riohacha", municipioId: 44001, etnias: "N", avance: 0.8 },
  { name: "Centro Etnoeducativo No 27 Sanbenitino", code: "244847000333", municipio: "Uribia", municipioId: 44847, etnias: "S", avance: 0, excepcion: "2026-11-30" },
  { name: "Institución Educativa Técnica Agropecuaria La Esperanza", code: "244430000444", municipio: "Maicao", municipioId: 44430, etnias: "N", avance: 1 },
  { name: "Institución Etnoeducativa Rural Kamushiwou", code: "244560000555", municipio: "Manaure", municipioId: 44560, etnias: "S", avance: 1 },
  { name: "Institución Educativa Rural El Carmen", code: "244090000666", municipio: "Dibulla", municipioId: 44090, etnias: "N", avance: 0.3 },
  { name: "Institución Educativa San José de Calasanz", code: "244001000777", municipio: "Riohacha", municipioId: 44001, etnias: "N", avance: 0.9 },
  { name: "Institución Educativa Distrital Villas de San Pablo", code: "244001000888", municipio: "Riohacha", municipioId: 44001, etnias: "N", avance: 0.2 },
  { name: "Centro Etnoeducativo Integral Rural Akuaipa", code: "244560000999", municipio: "Manaure", municipioId: 44560, etnias: "S", avance: 0.4 },
]

interface SeedCategoria {
  codigo: string
  nombre: string
  obligatoria: boolean
}

function peiPecCategorias(): SeedCategoria[] {
  return [
    { codigo: "PLAN_ESTUDIOS", nombre: "Plan de estudios", obligatoria: true },
    { codigo: "MANUAL_CONVIVENCIA", nombre: "Manual de convivencia", obligatoria: true },
    { codigo: "PROYECTOS_TRANSVERSALES", nombre: "Proyectos pedagógicos transversales", obligatoria: true },
    { codigo: "SIEE", nombre: "Sistema Institucional de Evaluación (SIEE)", obligatoria: true },
    { codigo: "PLAN_GESTION_RIESGO", nombre: "Plan escolar de gestión del riesgo (opcional)", obligatoria: false },
  ]
}

const TIPOS: DocumentType[] = ["PEI", "PEC", "PMI", "PFI"]

const CATEGORIAS: Record<DocumentType, SeedCategoria[]> = {
  PEI: peiPecCategorias(),
  PEC: peiPecCategorias(),
  PMI: [
    { codigo: "PLAN_MEJORAMIENTO", nombre: "Plan de Mejoramiento Institucional", obligatoria: true },
    { codigo: "AUTOEVALUACION_INSTITUCIONAL", nombre: "Autoevaluación institucional (anexo)", obligatoria: true },
  ],
  PFI: [
    { codigo: "PLAN_FORTALECIMIENTO", nombre: "Plan de Fortalecimiento Institucional", obligatoria: true },
    { codigo: "AUTOEVALUACION_INSTITUCIONAL", nombre: "Autoevaluación institucional (anexo)", obligatoria: true },
  ],
}

const TYPE_NAMES: Record<DocumentType, string> = {
  PEI: "Proyecto Educativo Institucional (PEI)",
  PEC: "Proyecto Educativo Comunitario (PEC)",
  PMI: "Plan de Mejoramiento Institucional (PMI)",
  PFI: "Plan de Fortalecimiento Institucional (PFI)",
}

/** Archivos sembrados, por `archivoId` (lo usa el mock de descarga). */
export const complianceFilesById = new Map<number, { fileName: string }>()

function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

function isoDaysAgo(days: number, hour: number) {
  const date = new Date("2026-10-08T00:00:00")
  date.setDate(date.getDate() - days)
  date.setHours(hour, 15, 0, 0)
  return date.toISOString().slice(0, 19)
}

function buildCategorias(avance: number, index: number, type: DocumentType): ComplianceCategory[] {
  const categorias = CATEGORIAS[type]
  const obligatorias = categorias.filter((c) => c.obligatoria).length
  const cargar = Math.round(avance * obligatorias)
  let obligatoriasCargadas = 0

  return categorias.map((categoria, position) => {
    let cargada = avance === 1
    if (categoria.obligatoria) {
      cargada = obligatoriasCargadas < cargar
      if (cargada) obligatoriasCargadas += 1
    }
    const multiple = categoria.codigo === "PLAN_ESTUDIOS"
    const cantidad = cargada ? (multiple && avance >= 0.6 ? 2 : 1) : 0
    const archivos = Array.from({ length: cantidad }, (_, n) => {
      const archivoId = 700_000 + index * 100 + TIPOS.indexOf(type) * 20 + position * 3 + n
      // Los planes PMI/PFI suelen llegar en Excel y algún anexo en Word: así
      // se ve el caso "sin vista previa" del visor.
      const plan = type === "PMI" || type === "PFI"
      const extension = plan ? (position === 0 ? "xlsx" : "pdf") : n === 1 ? "docx" : "pdf"
      const base = slug(categoria.nombre.replace(/\(.*\)/, ""))
      const fileName = `${base}${n ? `_secundaria` : ""}_${type}_2026.${extension}`
      complianceFilesById.set(archivoId, { fileName })
      return {
        id: multiple ? String(archivoId) : categoria.codigo,
        archivoId,
        fileName,
        uploadedAt: isoDaysAgo((index * 7 + position * 5 + n) % 60, 8 + position),
        sizeBytes: 180_000 + (((index + 1) * (position + 3) * 97_531) % 4_800_000),
        downloadUrl: `/api/files/download/${archivoId}`,
      }
    })
    return {
      categoria: categoria.codigo,
      categoriaName: categoria.nombre,
      obligatoria: categoria.obligatoria,
      status: archivos.length ? ("COMPLETO" as const) : ("PENDIENTE" as const),
      multiple,
      archivos,
    }
  })
}

interface SeedDocs {
  seed: SeedEstablishment
  id: number
  porTipo: Partial<Record<DocumentType, ComplianceCategory[]>>
}

const SEEDED: SeedDocs[] = SEED.map((seed, index) => {
  const tipos: DocumentType[] = seed.etnias === "S" ? ["PEC", "PFI"] : ["PEI", "PMI"]
  const porTipo: SeedDocs["porTipo"] = {}
  for (const tipo of tipos) {
    // El plan (PMI/PFI) va un poco atrás del proyecto educativo.
    const avance = tipo === "PMI" || tipo === "PFI" ? (seed.avance >= 1 ? 1 : seed.avance * 0.8) : seed.avance
    porTipo[tipo] = buildCategorias(avance, index, tipo)
  }
  return { seed, id: index + 1, porTipo }
})

function maxDate(values: (string | null | undefined)[]): string | null {
  const sorted = values.filter((value): value is string => Boolean(value)).sort()
  return sorted.length ? sorted[sorted.length - 1] : null
}

function stateFor(categorias: ComplianceCategory[] | undefined, type: DocumentType): ComplianceDocumentState {
  if (!categorias) return { status: "NO_APLICA", estado: "NO_APLICA" }
  const obligatorias = categorias.filter((c) => c.obligatoria)
  const done = obligatorias.filter((c) => c.archivos.length > 0).length
  const total = obligatorias.length
  const plan = type === "PMI" || type === "PFI" ? categorias[0].archivos[0] : undefined
  return {
    status: done === total ? "COMPLETO" : "PENDIENTE",
    estado: done === total ? "COMPLETO" : done > 0 ? "PARCIAL" : "SIN_CARGAR",
    fileName: plan?.fileName ?? null,
    archivoId: plan?.archivoId ?? null,
    downloadUrl: plan?.downloadUrl ?? null,
    completedCategories: done,
    totalCategories: total,
    lastUploadedAt: maxDate(categorias.flatMap((c) => c.archivos.map((a) => a.uploadedAt))),
  }
}

function plazoDe(fecha: string | null): CompliancePlazo {
  if (!fecha) return "SIN_FECHA"
  const hoy = new Date().toISOString().slice(0, 10)
  return hoy > fecha ? "VENCIDO" : "VIGENTE"
}

function rowFor({ seed, id, porTipo }: SeedDocs): ComplianceRow {
  const pei = stateFor(porTipo.PEI, "PEI")
  const pec = stateFor(porTipo.PEC, "PEC")
  const pmi = stateFor(porTipo.PMI, "PMI")
  const pfi = stateFor(porTipo.PFI, "PFI")
  const aplicables = [pei, pec, pmi, pfi].filter((s) => s.status !== "NO_APLICA")
  const completos = aplicables.filter((s) => s.status === "COMPLETO").length
  const fechaLimite = seed.excepcion ?? MOCK_FECHA_LIMITE_GLOBAL
  return {
    id,
    establishmentName: seed.name,
    establishmentCode: seed.code,
    municipioId: seed.municipioId,
    municipio: seed.municipio,
    etnoeducativo: seed.etnias === "S",
    pei,
    pec,
    pmi,
    pfi,
    globalProgress: aplicables.length ? Math.round((completos / aplicables.length) * 100) : 0,
    lastUploadedAt: maxDate(aplicables.map((s) => s.lastUploadedAt)),
    fechaLimite,
    tieneExcepcion: seed.excepcion != null,
    plazo: plazoDe(fechaLimite),
  }
}

export const complianceRowsDb: ComplianceRow[] = SEEDED.map(rowFor).sort((a, b) =>
  a.establishmentName.localeCompare(b.establishmentName, "es"),
)

/** Detalle de V555.1; `null` si el EE no existe. */
export function getComplianceDetail(id: number, type: DocumentType): ComplianceDocumentDetail | null {
  const docs = SEEDED.find((entry) => entry.id === id)
  if (!docs) return null
  const row = rowFor(docs)
  const state = stateFor(docs.porTipo[type], type)
  const categorias: ComplianceCategory[] =
    docs.porTipo[type] ??
    CATEGORIAS[type].map((c) => ({
      categoria: c.codigo,
      categoriaName: c.nombre,
      obligatoria: c.obligatoria,
      status: "NO_APLICA" as const,
      multiple: c.codigo === "PLAN_ESTUDIOS",
      archivos: [],
    }))
  return {
    establishmentId: id,
    establishmentName: row.establishmentName,
    establishmentCode: row.establishmentCode ?? null,
    municipio: row.municipio ?? null,
    etnoeducativo: row.etnoeducativo ?? null,
    type,
    typeName: TYPE_NAMES[type],
    status: state.status,
    estado: state.estado ?? null,
    completedCategories: state.completedCategories ?? null,
    totalCategories: state.totalCategories ?? null,
    lastUploadedAt: state.lastUploadedAt ?? null,
    fechaLimite: row.fechaLimite ?? null,
    tieneExcepcion: row.tieneExcepcion ?? null,
    plazo: row.plazo ?? null,
    categorias,
  }
}

/** KPIs: completos sobre los EE a los que aplica cada tipo. */
export function getComplianceMetrics(): ComplianceMetrics {
  function block(key: "pei" | "pec" | "pmi" | "pfi") {
    const aplican = complianceRowsDb.filter((row) => row[key].status !== "NO_APLICA")
    const completed = aplican.filter((row) => row[key].status === "COMPLETO").length
    return {
      completed,
      total: aplican.length,
      percent: aplican.length ? Math.round((completed / aplican.length) * 100) : 0,
    }
  }
  return {
    totalEstablishments: complianceRowsDb.length,
    pei: block("pei"),
    pec: block("pec"),
    pmi: block("pmi"),
    pfi: block("pfi"),
  }
}
