import * as z from "zod"

const createEnv = () => {
  const EnvSchema = z.object({
    API_URL: z.string().optional().default("/api"),
    ENABLE_API_MOCKING: z
      .string()
      .refine((s) => s === "active" || s === "inactive", {
        message: "ENABLE_API_MOCKING must be either 'active' or 'inactive'",
      })
      .transform((s) => s === "active")
      .optional()
      .default(true),
    APP_URL: z.string().optional().default("http://localhost:5173"),
    // Identifica esta app ante el backend SSO (ej. `?app=` en /sso-admin/myMenu)
    // para que sepa de qué aplicación traer rutas/menú/permisos.
    NAME: z.string().optional().default("PIGSE"),
  })

  const envVars = Object.entries(import.meta.env).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (key.startsWith("VITE_APP_")) {
        acc[key.replace("VITE_APP_", "")] = value as string
      }
      return acc
    },
    {},
  )

  const parsedEnv = EnvSchema.safeParse(envVars)

  if (!parsedEnv.success) {
    throw new Error(
      `Invalid env provided.
The following variables are missing or invalid:
${Object.entries(parsedEnv.error.flatten().fieldErrors)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}
`,
    )
  }

  return parsedEnv.data
}

export const env = createEnv()
