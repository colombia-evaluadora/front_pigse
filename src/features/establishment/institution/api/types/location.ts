export interface Department {
  id: number
  code?: string
  name: string
}

export interface Municipality {
  id: number
  code?: string
  name: string
  department: Department
}
