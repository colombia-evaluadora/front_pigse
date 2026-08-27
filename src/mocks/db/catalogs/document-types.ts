import type { CatalogItem } from "@/types/catalog"

// Tipos de documento tal como los devuelve la base de datos, en su mismo orden.
// Ojo: "CC" aparece dos veces (la cédula y su versión 2), así que el `id` es lo
// único que distingue una de otra — no uses el `code` como llave.
export const DOCUMENT_TYPES: CatalogItem[] = [
  {
    id: 1,
    code: "CCa",
    name: "Certificado Cabildo",
  },
  {
    id: 2,
    code: "CC",
    name: "Cédula de Ciudadanía",
  },
  {
    id: 3,
    code: "CC",
    name: "Cédula de Ciudadanía v2",
  },
  {
    id: 4,
    code: "CE",
    name: "Cédula de Extranjería ó Identificación de Extranjería",
  },
  {
    id: 5,
    code: "NUIP",
    name: "Número Unico de Identificación Personal (NUIP)",
  },
  {
    id: 6,
    code: "NIP",
    name: "Número de Identificación Personal (NIP)",
  },
  {
    id: 7,
    code: "NES",
    name: "Número de Identificación establecido por la Secretaría de Educación",
  },
  {
    id: 8,
    code: "RC",
    name: "Registro Civil de Nacimiento",
  },
  {
    id: 9,
    code: "TI",
    name: "Tarjeta de Identidad",
  },
  {
    id: 10,
    code: "PPT",
    name: "Permiso por Protección temporal",
  },
  {
    id: 11,
    code: "PEP",
    name: "Permiso Especial de Permanencia",
  },
]
