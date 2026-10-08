import { toEmailInput } from "@/lib/text-input"
import { z } from "zod"

/**
 * Las reglas de los campos de una persona, en un solo lugar.
 *
 * Existen porque las dos pantallas que dan de alta personas —funcionarios y
 * rector/secretaria de establecimiento— tenían cada una su propia validación,
 * y ya se habían desincronizado: institución verificaba el formato del correo
 * y funcionarios no, así que el mismo correo pasaba en una pantalla y lo
 * rechazaba el backend en la otra. Cuando eso ocurre, el usuario recibe el
 * mensaje técnico de Java en vez de uno que le diga qué corregir.
 *
 * Cada regla se aplica **solo si el campo tiene algo**: la obligatoriedad se
 * decide aparte, porque depende de si la persona es nueva o ya existe.
 */

/**
 * Nombres y apellidos: letras (con tildes y ñ), espacios, apóstrofo y guion.
 * El guion cubre los apellidos compuestos y el apóstrofo los de origen
 * extranjero; lo que queda fuera son dígitos y signos de puntuación.
 */
export const NOMBRE_PERSONA = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/

/** Documento: entre 3 y 15 dígitos, sin separadores. */
export const DOCUMENTO = /^\d{3,15}$/

/** Teléfono: hasta 10 dígitos. */
export const TELEFONO = /^\d{1,10}$/

/**
 * Correo. Se usa el mismo patrón que el contacto del establecimiento en vez
 * de `z.string().email()`: aquel es más permisivo que el `@Email` de Java, y
 * la diferencia se paga con un error del backend en lugar de un mensaje
 * debajo del campo.
 */
export const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MENSAJES = {
  nombre: "No uses números ni caracteres especiales.",
  documento: "El documento debe tener entre 3 y 15 dígitos.",
  telefono: "El teléfono no debe superar los 10 dígitos.",
  correo: "Ingresa un correo electrónico válido.",
  menorDeEdad: "La persona debe ser mayor de edad.",
} as const

/** Años que se exigen para considerar mayor de edad. */
export const EDAD_MINIMA = 18

const vacio = (valor: string | null | undefined) => valor == null || valor.trim() === ""

/**
 * Aplica las reglas de formato de una persona sobre un `ctx` de zod. No
 * valida obligatoriedad: un campo en blanco no produce ningún mensaje acá.
 *
 * `path` se arma con el nombre del campo tal cual lo usa cada formulario para
 * ubicar el mensaje debajo del input.
 */
export function validarFormatoPersona(
  persona: {
    firstName?: string | null
    middleName?: string | null
    lastName?: string | null
    secondLastName?: string | null
    identification?: string | null
    phone?: string | null
    email?: string | null
    birthDate?: string | null
  },
  ctx: z.RefinementCtx,
): void {
  const revisar = (path: string, valor: string | null | undefined, regla: RegExp, message: string) => {
    if (!vacio(valor) && !regla.test((valor as string).trim())) {
      ctx.addIssue({ code: "custom", path: [path], message })
    }
  }

  revisar("firstName", persona.firstName, NOMBRE_PERSONA, MENSAJES.nombre)
  revisar("middleName", persona.middleName, NOMBRE_PERSONA, MENSAJES.nombre)
  revisar("lastName", persona.lastName, NOMBRE_PERSONA, MENSAJES.nombre)
  revisar("secondLastName", persona.secondLastName, NOMBRE_PERSONA, MENSAJES.nombre)
  revisar("identification", persona.identification, DOCUMENTO, MENSAJES.documento)
  revisar("phone", persona.phone, TELEFONO, MENSAJES.telefono)
  revisar("email", persona.email == null ? persona.email : toEmailInput(persona.email), CORREO, MENSAJES.correo)

  if (!vacio(persona.birthDate)) {
    const nacimiento = new Date(persona.birthDate as string)
    const limite = new Date()
    limite.setFullYear(limite.getFullYear() - EDAD_MINIMA)

    if (Number.isNaN(nacimiento.getTime()) || nacimiento > limite) {
      ctx.addIssue({ code: "custom", path: ["birthDate"], message: MENSAJES.menorDeEdad })
    }
  }
}
