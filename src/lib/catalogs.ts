export const CATALOGS = {
  DOCUMENT_TYPES: "document-types",
  EMPLOYEE_ROLES: "employee-roles",
  GENDERS: "genders",
  POPULATION_GENDERS: "population-genders",
  MUNICIPALITIES: "municipalities",
  // "Nivel educativo de enseñanza" del funcionario (categoría real
  // NIVEL_ENSENANZA). No confundir con HIGHEST_EDUCATION_LEVELS.
  EDUCATION_LEVELS: "education-levels",
  // "Último nivel educativo aprobado" del funcionario (categoría real
  // ULT_NIVEL) — antes compartía el mismo catálogo que EDUCATION_LEVELS,
  // separado tras confirmar que son categorías distintas en la base real.
  HIGHEST_EDUCATION_LEVELS: "highest-education-levels",
  WORK_SCHEDULES: "work-schedules",
  EMPLOYEE_CLASSES: "employee-classes",
  EMPLOYEE_GRADES: "employee-grades",
  FUNDING_SOURCES: "funding-sources",
  FUNCTIONAL_POSITIONS: "functional-positions",
  EMPLOYMENT_TYPES: "employment-types",
  CALENDARIOS: "calendarios",
  COST_REGIMEN: "cost-regimen",
  RANGO_TARIFAS: "rango-tarifas",
  IDIOMAS: "idiomas",
  LEGAL_TYPES: "legal-types",
  ZONES: "zones",
  DISABILITIES: "disabilities",
  LICENSE_STATUSES: "license-statuses",
  ENTITY_STATUSES: "entity-statuses",
} as const
