import * as z from "zod"

import { loginInputSchema } from "@/lib/auth"

// El schema de la API solo exige que la contraseña venga; el del formulario
// además avisa del largo mínimo antes de gastar un intento contra el
// servidor. La política completa vive en `passwordRules`, que solo aplica
// donde se *crea* una contraseña.
export const loginFormSchema = loginInputSchema.extend({
  // `z.string({ message: ... })` deja a Zod pintar el "Requerido" cuando el
  // string es `undefined`; después `.min(8)` corre solo si hay valor. Encadenar
  // dos `.min` dejaba al segundo mensaje tapando al primero en el caso vacío.
  password: z.string({ message: "Requerido" }).min(8, "Debe tener al menos 8 caracteres."),
  // Sin marcar: la sesión dura lo que indique el backend (unos minutos).
  // Marcada: el backend devuelve un token de larga duración — la sesión
  // sobrevive a cerrar y reabrir el navegador.
  rememberMe: z.boolean(),
})
export type LoginFormValues = z.infer<typeof loginFormSchema>

export const loginSearchSchema = z.object({
  redirectTo: z.string().optional(),
})
export type LoginSearch = z.infer<typeof loginSearchSchema>

export const forgotPasswordFormSchema = z.object({
  email: z.email("Email inválido"),
})
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>

// El usuario es el correo, así que pedirlo por correo sería circular: la
// identidad se prueba con el documento.
export const forgotUsernameFormSchema = z.object({
  document: z
    .string()
    .trim()
    .min(1, "Requerido")
    .regex(/^\d+$/, "Debe contener solo números, sin puntos ni espacios.")
    .min(6, "Debe tener al menos 6 dígitos.")
    .max(15, "Debe tener máximo 15 dígitos."),
})
export type ForgotUsernameFormValues = z.infer<typeof forgotUsernameFormSchema>

/**
 * Política de contraseñas: misma que la API mockeada en
 * `mocks/handlers/auth.ts::consumePasswordResetToken`.
 *
 * Fuente única: cada regla es un objeto con un `test` (booleano, recibe
 * el valor crudo) y un `message` (lo que muestra el `<FieldError>`).
 *
 * El schema Zod se arma iterando este array y agregando una issue por
 * regla fallida; el `<RestorePasswordForm>` reutiliza el mismo array
 * para dibujar el checklist de feedback antes del submit. Cambiar una
 * regla acá cambia validación y UI al mismo tiempo.
 */
export interface PasswordRule {
  /** Etiqueta visible en el checklist del form. */
  label: string
  /** Mensaje que muestra `<FieldError>` si el `test` devuelve false. */
  message: string
  /** Test puro sobre el valor del campo. */
  test: (value: string) => boolean
}

export const passwordRules: readonly PasswordRule[] = [
  {
    label: "Al menos 8 caracteres",
    message: "Debe tener al menos 8 caracteres.",
    test: (v) => v.length >= 8,
  },
  {
    label: "Una minúscula (a–z)",
    message: "Debe incluir al menos una minúscula.",
    test: (v) => /[a-z]/.test(v),
  },
  {
    label: "Una mayúscula (A–Z)",
    message: "Debe incluir al menos una mayúscula.",
    test: (v) => /[A-Z]/.test(v),
  },
  {
    label: "Un número (0–9)",
    message: "Debe incluir al menos un número.",
    test: (v) => /\d/.test(v),
  },
  {
    label: "Un caracter especial (símbolo)",
    message: "Debe incluir al menos un caracter especial.",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
] as const

// La pantalla de confirmación se identifica solo con el token: de él salen
// el email destino, cuándo se envió y cuánto le queda. Nada de eso viaja en
// la URL, así la página es recargable/compartible sin exponer el correo.
export const checkEmailSearchSchema = z.object({
  token: z.string().optional(),
})
export type CheckEmailSearch = z.infer<typeof checkEmailSearchSchema>

export const restorePasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(1, "Requerido")
      .superRefine((value, ctx) => {
        for (const rule of passwordRules) {
          if (!rule.test(value)) {
            ctx.addIssue({
              code: "custom",
              message: rule.message,
            })
          }
        }
      }),
    confirmPassword: z.string().min(1, "Requerido"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  })

export type RestorePasswordFormValues = z.infer<typeof restorePasswordFormSchema>

export const restorePasswordSearchSchema = z.object({
  token: z.string().optional(),
})
export type RestorePasswordSearch = z.infer<typeof restorePasswordSearchSchema>
