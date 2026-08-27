/**
 * Mensajes de éxito de las operaciones de escritura.
 *
 * Antes se mostraba tal cual el `message` que devuelve el backend (ej.
 * "Establecimiento actualizado."), que llega abreviado, sin el nombre
 * completo de la entidad y con una redacción distinta en cada endpoint.
 * Acá quedan centralizados para que todos digan lo mismo: "<La entidad>
 * se <acción> correctamente."
 *
 * Los errores siguen usando el `message` del backend: ese sí explica *por qué*
 * falló, y esa información el front no la tiene.
 */
interface EntityMessages {
  created?: string
  updated?: string
  deleted?: string
  /** Borrado múltiple desde la barra de herramientas de la tabla. */
  deletedMany?: (count: number) => string
  /**
   * Mensaje para flujos que no encajan en created/updated/deleted: por
   * ahora solo lo usa "document" para distinguir la carga de la versión
   * vigente (`uploaded`) del borrado (`deleted`), porque la carga no es
   * exactamente una creación ni una actualización — es la subida de un
   * archivo que puede o no reemplazar uno existente.
   */
  uploaded?: string
}

export const SUCCESS_MESSAGES = {
  establishment: {
    created: "El establecimiento educativo se creó correctamente.",
    updated: "El establecimiento educativo se actualizó correctamente.",
    deleted: "El establecimiento educativo se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El establecimiento educativo se eliminó correctamente."
        : `Los ${count} establecimientos educativos se eliminaron correctamente.`,
  },
  employee: {
    created: "El funcionario se creó correctamente.",
    updated: "El funcionario se actualizó correctamente.",
    deleted: "El funcionario se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El funcionario se eliminó correctamente."
        : `Los ${count} funcionarios se eliminaron correctamente.`,
  },
  academicPeriod: {
    created: "El periodo académico se creó correctamente.",
    updated: "El periodo académico se actualizó correctamente.",
    deleted: "El periodo académico se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El periodo académico se eliminó correctamente."
        : `Los ${count} periodos académicos se eliminaron correctamente.`,
  },
  evaluationPeriod: {
    created: "El periodo de evaluación se creó correctamente.",
    updated: "El periodo de evaluación se actualizó correctamente.",
    deleted: "El periodo de evaluación se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El periodo de evaluación se eliminó correctamente."
        : `Los ${count} periodos de evaluación se eliminaron correctamente.`,
  },
  grade: {
    created: "El grado se creó correctamente.",
    updated: "El grado se actualizó correctamente.",
    deleted: "El grado se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El grado se eliminó correctamente."
        : `Los ${count} grados se eliminaron correctamente.`,
  },
  gradeGroup: {
    created: "El grupo de grados se creó correctamente.",
    updated: "El grupo de grados se actualizó correctamente.",
    deleted: "El grupo de grados se eliminó correctamente.",
  },
  ratingScale: {
    created: "La escala de valoración se creó correctamente.",
    updated: "La escala de valoración se actualizó correctamente.",
    deleted: "La escala de valoración se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "La escala de valoración se eliminó correctamente."
        : `Las ${count} escalas de valoración se eliminaron correctamente.`,
  },
  studyPlan: {
    created: "El plan de estudio se creó correctamente.",
    updated: "El plan de estudio se actualizó correctamente.",
    deleted: "El plan de estudio se eliminó correctamente.",
  },
  areaSubject: {
    created: "El área o asignatura se creó correctamente.",
    updated: "El área o asignatura se actualizó correctamente.",
    deleted: "El área o asignatura se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El área o asignatura se eliminó correctamente."
        : `Las ${count} áreas o asignaturas se eliminaron correctamente.`,
  },
  academicAssignment: {
    created: "La asignación académica se creó correctamente.",
    updated: "La asignación académica se actualizó correctamente.",
    deleted: "La asignación académica se eliminó correctamente.",
  },
  evaluationCriteria: {
    created: "Los criterios de evaluación se guardaron correctamente.",
    updated: "Los criterios de evaluación se guardaron correctamente.",
    deleted: "Los criterios de evaluación se eliminaron correctamente.",
  },
  promotionCriteria: {
    created: "Los criterios de promoción se guardaron correctamente.",
    updated: "Los criterios de promoción se guardaron correctamente.",
    deleted: "Los criterios de promoción se eliminaron correctamente.",
  },
  schedule: {
    created: "El horario se guardó correctamente.",
    updated: "El horario se guardó correctamente.",
    deleted: "El horario se eliminó correctamente.",
  },
  document: {
    /** Subir o reemplazar la versión vigente. */
    uploaded: "El documento se cargó correctamente.",
    /** Eliminar la versión vigente (la anterior pasa al historial). */
    deleted: "El documento se eliminó correctamente.",
  },
} satisfies Record<string, EntityMessages>
