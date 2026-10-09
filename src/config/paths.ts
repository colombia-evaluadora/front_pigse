export const paths = {
  home: {
    path: "/",
    getHref: () => "/",
  },

  auth: {
    login: {
      path: "/login",
      getHref: (redirectTo?: string | null) =>
        `/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`,
    },
    forgotPassword: {
      path: "/forgot-password",
      getHref: () => "/forgot-password",
    },
    forgotUsername: {
      path: "/forgot-username",
      getHref: () => "/forgot-username",
    },
    checkEmail: {
      path: "/check-email",
      getHref: (token?: string | null) =>
        `/check-email${token ? `?token=${encodeURIComponent(token)}` : ""}`,
    },
    restorePassword: {
      path: "/restore-password",
      getHref: (token?: string | null) =>
        `/restore-password${token ? `?token=${encodeURIComponent(token)}` : ""}`,
    },
    // Destino del enlace de "Activa tu cuenta" (creación de cuenta por un
    // administrador) — mismo patrón que restorePassword, contra
    // /activationTokenStatus y /activateAccount en vez de sus pares de
    // restore.
    activate: {
      path: "/activate",
      getHref: (token?: string | null) =>
        `/activate${token ? `?token=${encodeURIComponent(token)}` : ""}`,
    },
  },

  app: {
    root: {
      path: "/app",
      getHref: () => "/app",
    },
    rolesMenus: {
      path: "administracion/roles-menus",
      getHref: () => "/app/administracion/roles-menus",
    },
    establishments: {
      root: {
        path: "establecimiento-educativo",
        getHref: () => "/app/establecimiento-educativo",
      },

      general: {
        path: "establecimiento-educativo/general",
        getHref: () => "/app/establecimiento-educativo/general",
      },

      add: {
        path: "establecimiento-educativo/agregar",
        getHref: () => "/app/establecimiento-educativo/agregar",
      },

      edit: {
        path: "establecimiento-educativo/editar/$establishmentId",
        getHref: (establishmentId: string | number) =>
          `/app/establecimiento-educativo/editar/${establishmentId}`,
      },

      campuses: {
        path: "establecimiento-educativo/sedes",
        getHref: () => "/app/establecimiento-educativo/sedes",
      },

      officials: {
        path: "establecimiento-educativo/funcionarios",
        getHref: () => "/app/establecimiento-educativo/funcionarios",
      },
    },
    /**
     * Gestión documental: tabla de documentos institucionales (PEI, PMI) con
     * su estado de entrega y la acción de subir/reemplazar/eliminar. Vive
     * afuera del grupo "Establecimiento educativo" del menú porque es un
     * ítem suelto en la sección "Monitoreo" del sidebar (ver
     * `mocks/db/navigation.ts`).
     */
    gestionDocumental: {
      path: "gestion-documental",
      getHref: () => "/app/gestion-documental",
    },
    /**
     * Fecha límite global de "Gestión documental" + excepciones por
     * establecimiento (V522). Vive bajo `administracion` (no bajo
     * `gestion-documental`, que ya tiene el param dinámico `$tipo` -- un
     * segmento fijo "fecha-limite" ahí colisionaría con esa ruta).
     */
    gestionDocumentalFechaLimite: {
      path: "administracion/gestion-documental/fecha-limite",
      getHref: () => "/app/administracion/gestion-documental/fecha-limite",
    },
    /**
     * Anexos de un tipo puntual: los 4 (PEI/PEC/PMI/PFI, V521) van por
     * categorías -- "entrar" a cualquiera muestra sus anexos fijos (5 para
     * PEI/PEC, 1 para PMI/PFI).
     */
    gestionDocumentalDetalle: {
      path: "gestion-documental/$tipo",
      getHref: (tipo: string) => `/app/gestion-documental/${tipo}`,
    },
    /**
     * Monitoreo y cumplimiento: tablero del usuario monitor con las métricas
     * globales de entrega documental (PEI / PEC / PMI) y el detalle por EE.
     * Comparte el grupo "Monitoreo" del menú con `gestionDocumental` (la
     * vista institucional).
     */
    monitoreoCumplimiento: {
      path: "monitoreo-cumplimiento",
      getHref: () => "/app/monitoreo-cumplimiento",
    },
    /**
     * Visor de PDF: la página a la que lleva el botón "Consultar" tanto de
     * la vista institucional como del tablero de monitoreo. El tipo
     * (`PEI` / `PEC` / `PMI`) viaja en la URL como segmento, no como
     * query — así el `resolveNavPathname` puede marcar el item correcto
     * del menú cuando se navega entre visores.
     */
    visor: {
      path: "visor/$type",
      getHref: (type: string) => `/app/visor/${type}`,
    },
    /**
     * Página "Sin acceso": a donde redirige el guard de rutas
     * (`menuGuardRoute` en `router.tsx`) cuando un usuario autenticado
     * intenta entrar a una URL que no está en su menú (ver
     * `features/navigation/lib/route-access.ts`), y `/app` cuando el usuario
     * no tiene ningún menú. `?desde=` trae la URL original.
     */
    unauthorized: {
      path: "sin-acceso",
      getHref: () => "/app/sin-acceso",
    },
    // Las dos vistas del registro de actividad (por sesión y por tablas)
    // cuelgan del mismo prefijo `registro-de-actividad` para que el item del
    // menú pueda marcarse activo en cualquiera de las dos y en sus subrutas.
    auditoriaSesiones: {
      path: "registro-de-actividad/sesiones",
      getHref: () => "/app/registro-de-actividad/sesiones",
    },
    auditoriaSesionOperaciones: {
      path: "registro-de-actividad/sesiones/$sessionId/operaciones",
      getHref: (sessionId: string) =>
        `/app/registro-de-actividad/sesiones/${sessionId}/operaciones`,
    },
    auditoriaTablas: {
      path: "registro-de-actividad/tablas",
      getHref: () => "/app/registro-de-actividad/tablas",
    },
    auditoriaTablaDetalle: {
      path: "registro-de-actividad/tablas/$tableSlug",
      getHref: (tableSlug: string) => `/app/registro-de-actividad/tablas/${tableSlug}`,
    },
    /**
     * Actividad de usuarios: listado de funcionarios (rectores y
     * secretarios) que ya usaron la plataforma, con su último ingreso y un
     * badge de estado (`CON_INGRESO`/`SIN_INGRESO`). Pensada
     * para la secretaría territorial — los roles habilitados son los que
     * tienen el menú (V499, `role_route`). Vive fuera del
     * grupo "Registro de actividad" (auditoría de cambios en BD): es otro
     * dominio, aunque comparta la sección "Administración" del menú.
     */
    actividadUsuarios: {
      path: "actividad-usuarios",
      getHref: () => "/app/actividad-usuarios",
    },
  },
} as const
