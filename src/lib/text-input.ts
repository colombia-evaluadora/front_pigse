/**
 * Filtra `value` dejando solo dígitos, y lo recorta a `maxLength` si se
 * pasa. Pensado para `onChange` de inputs que en la base son VARCHAR
 * numéricos puros (identificación, NIT, DANE, …) — nunca alfanuméricos,
 * aunque el `<input>` sea `type="text"` (un `type="number"` no sirve para
 * estos campos: pierde ceros a la izquierda y acepta notación como `1e5`).
 *
 * Se aplica sobre el valor YA escrito (no intercepta la tecla), así que
 * cubre pegado/autocompletado igual que tipeo normal.
 */
export function toDigitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "")
  return maxLength ? digits.slice(0, maxLength) : digits
}

/**
 * Formatea un NIT colombiano mientras se escribe: hasta 10 dígitos, con un
 * guión insertado automáticamente antes del último (el dígito de
 * verificación) — p. ej. escribiendo "9001234567" queda "900123456-7".
 * Cualquier carácter que no sea dígito se descarta primero (vía
 * `toDigitsOnly`), así que pegar un NIT ya formateado con guión también
 * funciona: el guión pegado se descarta y se vuelve a insertar en la
 * posición correcta.
 */
export function toNitInput(value: string): string {
  const digits = toDigitsOnly(value, 10)
  return digits.length <= 1 ? digits : `${digits.slice(0, -1)}-${digits.slice(-1)}`
}

/**
 * Limpia un correo electrónico: quita caracteres invisibles y espacios en
 * los extremos. Al pegar un correo desde Outlook, Word, WhatsApp o una
 * página web suelen colarse caracteres de ancho cero (U+200B-U+200D, U+2060
 * WORD JOINER), el BOM (U+FEFF) o espacios no separables (U+00A0) que
 * `.trim()` no elimina. El correo "se ve" igual pero no coincide con el
 * guardado en la base, lo que rompe la reactivación por cambio de correo y
 * el login. Se usa en el `onChange` de los inputs de correo, al armar
 * payloads y al comparar correo anterior vs nuevo (para limpiar también
 * valores sucios que ya estén en la base).
 */
export function toEmailInput(value: string): string {
  return (value ?? "").replace(/[​-‍⁠﻿ ]/g, "").trim()
}
