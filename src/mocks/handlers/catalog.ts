import { http, HttpResponse } from "msw"
import { CATALOGS } from "@/lib/catalogs"
import { DOCUMENT_TYPES } from "@/mocks/db/catalogs/document-types"
import { EMPLOYEE_ROLES } from "@/mocks/db/catalogs/employee-roles"
import { GENDERS } from "@/mocks/db/catalogs/genders"
import { MUNICIPALITIES } from "@/mocks/db/catalogs/municipalities"
import { EDUCATION_LEVELS } from "@/mocks/db/catalogs/education-levels"
import { WORK_SCHEDULES } from "@/mocks/db/catalogs/work-schedules"
import { EMPLOYEE_CLASSES } from "@/mocks/db/catalogs/employee-classes"
import { EMPLOYEE_GRADES } from "@/mocks/db/catalogs/employee-grades"
import { FUNDING_SOURCES } from "@/mocks/db/catalogs/funding-sources"
import { FUNCTIONAL_POSITIONS } from "@/mocks/db/catalogs/functional-positions"
import { EMPLOYMENT_TYPES } from "@/mocks/db/catalogs/employment-types"
import {
  CALENDARS,
  COST_REGIMEN,
  RANGO_TARIFAS,
  IDIOMAS,
  LEGAL_TYPES,
  ZONES,
  DISABILITIES,
  LICENSE_STATUSES,
} from "@/mocks/db/catalogs/establishment"
import { POPULATION_GENDERS } from "@/mocks/db/catalogs/population-genders"
import { ENTITY_STATUSES } from "@/mocks/db/catalogs/entity-statuses"

export const catalogHandlers = [
  http.get(`/api/catalogs/${CATALOGS.DOCUMENT_TYPES}`, () => {
    return HttpResponse.json(DOCUMENT_TYPES)
  }),

  http.get(`/api/catalogs/${CATALOGS.EMPLOYEE_ROLES}`, () => {
    return HttpResponse.json(EMPLOYEE_ROLES)
  }),

  http.get(`/api/catalogs/${CATALOGS.GENDERS}`, () => {
    return HttpResponse.json(GENDERS)
  }),

  http.get(`/api/catalogs/${CATALOGS.POPULATION_GENDERS}`, () => {
    return HttpResponse.json(POPULATION_GENDERS)
  }),

  http.get(`/api/catalogs/${CATALOGS.MUNICIPALITIES}`, () => {
    return HttpResponse.json(MUNICIPALITIES)
  }),

  http.get(`/api/catalogs/${CATALOGS.EDUCATION_LEVELS}`, () => {
    return HttpResponse.json(EDUCATION_LEVELS)
  }),

  // Antes compartía el catálogo de arriba con "highestEducationLevel"; el
  // real tiene una categoría distinta para cada campo (NIVEL_ENSENANZA vs
  // ULT_NIVEL — ver CATALOG_CATEGORIAS en use-catalogs.ts), así que acá
  // también se separan, reusando el mismo fixture (misma data, distinto
  // catálogo, no hay razón para que difieran en el mock).
  http.get(`/api/catalogs/${CATALOGS.HIGHEST_EDUCATION_LEVELS}`, () => {
    return HttpResponse.json(EDUCATION_LEVELS)
  }),

  http.get(`/api/catalogs/${CATALOGS.WORK_SCHEDULES}`, () => {
    return HttpResponse.json(WORK_SCHEDULES)
  }),

  http.get(`/api/catalogs/${CATALOGS.EMPLOYEE_CLASSES}`, () => {
    return HttpResponse.json(EMPLOYEE_CLASSES)
  }),

  http.get(`/api/catalogs/${CATALOGS.EMPLOYEE_GRADES}`, () => {
    return HttpResponse.json(EMPLOYEE_GRADES)
  }),

  http.get(`/api/catalogs/${CATALOGS.FUNDING_SOURCES}`, () => {
    return HttpResponse.json(FUNDING_SOURCES)
  }),

  http.get(`/api/catalogs/${CATALOGS.FUNCTIONAL_POSITIONS}`, () => {
    return HttpResponse.json(FUNCTIONAL_POSITIONS)
  }),

  http.get(`/api/catalogs/${CATALOGS.EMPLOYMENT_TYPES}`, () => {
    return HttpResponse.json(EMPLOYMENT_TYPES)
  }),

  http.get(`/api/catalogs/${CATALOGS.CALENDARIOS}`, () => {
    return HttpResponse.json(CALENDARS)
  }),

  http.get(`/api/catalogs/${CATALOGS.COST_REGIMEN}`, () => {
    return HttpResponse.json(COST_REGIMEN)
  }),

  http.get(`/api/catalogs/${CATALOGS.RANGO_TARIFAS}`, () => {
    return HttpResponse.json(RANGO_TARIFAS)
  }),

  http.get(`/api/catalogs/${CATALOGS.IDIOMAS}`, () => {
    return HttpResponse.json(IDIOMAS)
  }),

  http.get(`/api/catalogs/${CATALOGS.LEGAL_TYPES}`, () => {
    return HttpResponse.json(LEGAL_TYPES)
  }),

  http.get(`/api/catalogs/${CATALOGS.ZONES}`, () => {
    return HttpResponse.json(ZONES)
  }),

  http.get(`/api/catalogs/${CATALOGS.DISABILITIES}`, () => {
    return HttpResponse.json(DISABILITIES)
  }),

  http.get(`/api/catalogs/${CATALOGS.LICENSE_STATUSES}`, () => {
    return HttpResponse.json(LICENSE_STATUSES)
  }),

  http.get(`/api/catalogs/${CATALOGS.ENTITY_STATUSES}`, () => {
    return HttpResponse.json(ENTITY_STATUSES)
  }),

  // Cargo de PIGSE (tlista_valor.CARGO) — catálogo distinto de
  // FUNCTIONAL_POSITIONS (NOMBRE_CARGO, de CEVAL); reusa el mismo fixture
  // porque el mock no distingue la categoría real, solo la forma del dato.
  http.get(`/api/catalogs/${CATALOGS.CARGOS}`, () => {
    return HttpResponse.json(FUNCTIONAL_POSITIONS)
  }),
]
