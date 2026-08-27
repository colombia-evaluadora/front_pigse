import { createFormHook, createFormHookContexts } from "@tanstack/react-form"

/**
 * Contexto compartido de formularios para todos los `useForm`/`useField` de
 * la app. La gracia es que `useFieldContext` y `useAppForm` comparten los
 * mismos `fieldContext`/`formContext`, así un helper como `TextFilter`
 * definido en un archivo puede leer el `field` actual sin recibirlo por
 * props — basta con que el padre lo monte dentro de `<form.AppField>`.
 *
 * Las primitivas (`TextField`, `SelectField`, …) se dejan vacías a propósito:
 * cada form registra las suyas localmente si las necesita. Mantener este
 * módulo chico evita que el resto de la app herede opinionated components.
 */
const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
})

export { useFieldContext, useFormContext }
