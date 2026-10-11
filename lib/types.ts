import type { FormulaMap } from "./formulas"

export const CATEGORIES = [
  { code: "A", name: "General Requirements and Temporary Facilities" },
  { code: "B", name: "Site Preparation and Earthworks" },
  { code: "C", name: "Concrete Works" },
  { code: "D", name: "Reinforcing Steel" },
  { code: "E", name: "Formwork" },
  { code: "F", name: "Masonry and Plastering" },
  { code: "G", name: "Structural and Architectural Steel" },
  { code: "H", name: "Roofing and Waterproofing" },
  { code: "I", name: "Doors and Windows" },
  { code: "J", name: "Ceilings and Partitions" },
  { code: "K", name: "Floor and Wall Finishes" },
  { code: "L", name: "Painting" },
  { code: "M", name: "Plumbing and Sanitary Works" },
  { code: "N", name: "Electrical Works" },
  { code: "O", name: "Other Building Services" },
  { code: "P", name: "External and Site Development Works" },
  { code: "Q", name: "Provisional Items and Other Costs" },
] as const

export type CategoryCode = (typeof CATEGORIES)[number]["code"]

export const DEFAULT_ALLOCATION: Record<CategoryCode, number> = {
  A: 3, B: 3, C: 15, D: 12, E: 6, F: 9, G: 4, H: 7, I: 6,
  J: 4, K: 8, L: 3, M: 5, N: 6, O: 2, P: 4, Q: 3,
}

export interface BoqItem {
  id: string
  category: CategoryCode
  itemNo: string
  description: string
  unit: string
  quantity: number
  material: number
  labor: number
  equipment: number
  other: number
  rateSource: string
}

export type AdjustmentBase = "direct" | "running"

export interface Adjustment {
  id: string
  label: string
  type: "percent" | "fixed"
  value: number
  base: AdjustmentBase
  effect: "add" | "deduct"
  enabled: boolean
}

export interface QuickEstimate {
  low: number
  expected: number
  high: number
  allocation: Record<CategoryCode, number>
  inclusions: string
  exclusions: string
}

export interface Project {
  id: string
  name: string
  location: string
  buildingType: string
  floorArea: number
  floors: number
  client: string
  date: string
  notes: string
  assumptions: string
  quick: QuickEstimate
  boq: BoqItem[]
  adjustments: Adjustment[]
  createdAt: string
  updatedAt: string
}

export type RateType = "material" | "labor" | "equipment" | "other"

export interface RateEntry {
  id: string
  type: RateType
  name: string
  unit: string
  rate: number
  source: string
  location: string
  date: string
  notes: string
  sample: boolean
}

export interface AppData {
  version: 1
  projects: Project[]
  rates: RateEntry[]
  formulas?: FormulaMap
}
