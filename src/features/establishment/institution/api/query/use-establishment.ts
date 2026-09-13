import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRow } from "@/lib/response-envelope"
import { env } from "@/config/env"
import { fetchEmployee } from "@/features/establishment/employees/api/query/use-employee"

import type { CatalogItem } from "@/types/catalog"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface EstablishmentQueryResult {
  status: "ok"
  establishment: EstablishmentDetails
  /**
   * Registro completo de TFUNCIONARIO (no solo `Person`) para rector y
   * secretaria, cuando el EE ya tiene uno enlazado (`fk_tfuncionario_rector`/
   * `secretaria` no nulo) — `null` en mock, o si el EE nunca tuvo uno
   * asignado. El form de establecimiento solo edita los campos de `Person`
   * (`.person` acá), pero al guardar necesita reenviar el resto del
   * `Employee` (clase, jornada de contratación, estado, dirección, etc.)
   * tal cual vino, para no pisarlos con `null` al hacer el PATCH de
   * `fn_fun_actualizar` — ver `add-establishment-page.tsx`.
   */
  principalEmployee: Employee | null
  secretaryEmployee: Employee | null
}

/** Fila cruda de `fn_est_buscar_por_pk` (V53, `RETURNS SETOF TESTABLECIMIENTO`)
 * — columnas sueltas de la tabla, sin ningún catálogo resuelto. */
interface RealEstablishmentDetailRow {
  pk_establecimiento: number
  codigo: string
  nombre: string
  nit: string
  fk_tmunicipio: number | null
  fk_tlista_valor_zona: number | null
  localidad: string | null
  comuna: string | null
  barrio: string | null
  direccion: string | null
  correo_electronico: string | null
  telefono: string | null
  fax: string | null
  pagina_web: string | null
  fk_tpropiedad_juridica: number | null
  /**
   * `pk_tarchivo` del escudo. `fn_est_buscar_por_pk` es HOY la única query que
   * lo expone, así que este es el único camino para pintar el escudo: con este
   * id se acuña el token de vista (ver `ArchivoImage`).
   */
  fk_tarchivo: number | null
  resolucion_aprobacion: string | null
  licencia_funcionamiento: string | null
  fecha_licencia: string | null
  fk_tlv_calendario: number | null
  fk_tlv_idioma: number | null
  fk_tlv_genero_est: number | null
  fk_tdiscapacidad: number | null
  fk_tlv_regimen_catcosto: number | null
  fk_tlv_rango_tarifa: number | null
  talento: "S" | "N" | null
  etnias: "S" | "N" | null
  fk_tfuncionario_rector: number | null
  fk_tfuncionario_secretaria: number | null
  subsidio: "S" | "N" | null
}

/** `{id}` nada más: la query no hace join contra el catálogo real (ni
 * `TLISTA_VALOR` ni `TPROPIEDAD_JURIDICA`/`TMUNICIPIO`), así que `code`/
 * `name` quedan vacíos. Alcanza para que los `<Select>` del formulario
 * (que resuelven la etiqueta visible contra el catálogo ya cargado, por
 * `id`) muestren la opción correcta — no alcanza para mostrar el nombre en
 * un lugar que lo lea directo del objeto sin pasar por un `<Select>`. */
function toStub(id: number | null): CatalogItem | null {
  return id === null ? null : { id, code: "", name: "" }
}

function toFreeText(value: string | null): CatalogItem | null {
  const text = value?.trim()
  return text ? { id: 0, code: text, name: text } : null
}

function toEstablishmentDetails(
  row: RealEstablishmentDetailRow,
  principal: Employee | null,
  secretary: Employee | null,
): EstablishmentDetails {
  return {
    id: row.pk_establecimiento,
    basicInfo: {
      name: row.nombre,
      dane: row.codigo,
      nit: row.nit,
      ownershipType: toStub(row.fk_tpropiedad_juridica),
      logoArchivoId: row.fk_tarchivo ?? null,
    },
    address: {
      // `{id, name:"", department:{id:0,name:""}}`: mismo criterio que
      // `toStub` — el `<Select>` de municipio resuelve la etiqueta contra
      // `useMunicipalitiesQuery()` ya cargado, por `id`.
      municipality:
        row.fk_tmunicipio === null
          ? null
          : { id: row.fk_tmunicipio, name: "", department: { id: 0, name: "" } },
      zone: toStub(row.fk_tlista_valor_zona),
      district: toFreeText(row.barrio),
      commune: toFreeText(row.comuna),
      locality: toFreeText(row.localidad),
      address: row.direccion ?? "",
    },
    contact: {
      email: row.correo_electronico ?? "",
      website: row.pagina_web ?? "",
      phone: row.telefono ?? "",
      fax: row.fax ?? "",
    },
    additionalInfo: {
      approvalResolution: row.resolucion_aprobacion ?? "",
      teachingLanguage: toStub(row.fk_tlv_idioma),
      calendar: toStub(row.fk_tlv_calendario),
      // REV: estaban hardcodeados en `null` — `fn_est_buscar_por_pk` hace
      // `SELECT *` de TESTABLECIMIENTO (trae FK_TLV_REGIMEN_CATCOSTO/
      // FK_TLV_RANGO_TARIFA como cualquier otra columna), pero la fila cruda
      // nunca declaraba esos dos campos ni el mapeo los leía — por eso el
      // select se veía vacío al reabrir el editar aunque el dato sí se
      // hubiera guardado.
      costRegime: toStub(row.fk_tlv_regimen_catcosto),
      populationGender: toStub(row.fk_tlv_genero_est),
      tuitionRange: toStub(row.fk_tlv_rango_tarifa),
      disabilityType: toStub(row.fk_tdiscapacidad),
      // No hay columna booleana de licencia: `LICENCIA_FUNCIONAMIENTO` es
      // VARCHAR y es lo que ya usa `licenseStatus` — `operatingLicense` no
      // tiene una columna real detrás (tampoco viaja al crear, ver
      // mutations/create.ts: no está en el `param_types` registrado).
      // Se aproxima a partir de si hay texto de estado de licencia.
      operatingLicense: Boolean(row.licencia_funcionamiento?.trim()),
      licenseStatus: row.licencia_funcionamiento ?? "",
      licenseDate: row.fecha_licencia,
      ethnicAttention: row.etnias === "S",
      giftedAttention: row.talento === "S",
      subsidy: row.subsidio === "S",
    },
    // fk_tfuncionario_rector/secretaria: `fn_est_buscar_por_pk` solo trae el
    // PK suelto (no hace join contra TUSUARIO), así que la persona completa
    // se resuelve aparte en `fetchEstablishment` (mismo PK que
    // `fn_usu_empleado_buscar_por_pk` espera, ver `principalEmployee`/
    // `secretaryEmployee` de `EstablishmentQueryResult`) y se pasa acá ya
    // resuelta. `null` si el EE nunca tuvo uno asignado.
    principal: principal?.person ?? null,
    secretary: secretary?.person ?? null,
  }
}

/**
 * `fk_tfuncionario_rector`/`secretaria` son el mismo PK que
 * `fn_usu_empleado_buscar_por_pk` espera (TFUNCIONARIO es una sola tabla
 * para rector/secretaria/docentes/etc.) — se reusa `fetchEmployee` en vez
 * de duplicar el mapeo de fila cruda a `Person`. `null` si el EE no tiene
 * uno enlazado.
 */
async function fetchLinkedFuncionario(pk: number | null): Promise<Employee | null> {
  if (pk === null) return null
  const result = await fetchEmployee(pk)
  return result.employee
}

async function fetchEstablishment(id: number): Promise<EstablishmentQueryResult> {
  if (env.ENABLE_API_MOCKING) {
    const result: EstablishmentQueryResult = await api.get(
      apiPath(`/establishments/${id}`, `/establecimientos/${id}`),
    )
    return { ...result, principalEmployee: null, secretaryEmployee: null }
  }

  // GET /establecimientos/:id (pigse) — fila cruda envuelta en {rows:[...]}.
  const row = unwrapRow<RealEstablishmentDetailRow>(
    (await api.get(`/pigse/establecimientos/${id}`)) as unknown as
      | { rows: RealEstablishmentDetailRow[] }
      | RealEstablishmentDetailRow,
  )

  const [principalEmployee, secretaryEmployee] = await Promise.all([
    fetchLinkedFuncionario(row.fk_tfuncionario_rector),
    fetchLinkedFuncionario(row.fk_tfuncionario_secretaria),
  ])

  return {
    status: "ok",
    establishment: toEstablishmentDetails(row, principalEmployee, secretaryEmployee),
    principalEmployee,
    secretaryEmployee,
  }
}

export function useEstablishmentQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["establishments", id],
    queryFn: () => fetchEstablishment(id as number),
    enabled: enabled && Boolean(id),
  })
}
