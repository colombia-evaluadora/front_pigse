import type { CatalogItem } from "@/types/catalog"

// Género de la **población atendida** por el establecimiento (a quién va
// dirigida la oferta educativa). NO debe confundirse con el género de la
// persona física (`GENDERS`), que es otra cosa: una sola persona tiene un
// género, pero un establecimiento puede atender público masculino,
// femenino o mixto.
export const POPULATION_GENDERS: CatalogItem[] = [
  {
    id: 1,
    code: "MASCULINO",
    name: "Masculino",
  },
  {
    id: 2,
    code: "FEMENINO",
    name: "Femenino",
  },
  {
    id: 3,
    code: "MIXTO",
    name: "Mixto",
  },
]
