import { evaluate, tryValidate } from "./formula"

export interface FormulaVar {
  name: string
  desc: string
  sample: number
}

export interface FormulaDef {
  key: string
  group: "BOQ" | "Quick estimate" | "Adjustments" | "Results"
  label: string
  result: string
  desc: string
  defaultExpr: string
  vars: FormulaVar[]
}

export const FORMULA_DEFS = [
  {
    key: "unitCost",
    group: "BOQ",
    label: "Direct unit cost",
    result: "Unit cost (₱ per unit)",
    desc: "Cost of one unit of a BOQ item from its component rates.",
    defaultExpr: "material + labor + equipment + other",
    vars: [
      { name: "material", desc: "Material rate per unit", sample: 500 },
      { name: "labor", desc: "Labor rate per unit", sample: 200 },
      { name: "equipment", desc: "Equipment rate per unit", sample: 50 },
      { name: "other", desc: "Other rate per unit", sample: 0 },
      { name: "quantity", desc: "Item quantity", sample: 10 },
    ],
  },
  {
    key: "lineTotal",
    group: "BOQ",
    label: "BOQ line total",
    result: "Line amount (₱)",
    desc: "Amount of a single BOQ line.",
    defaultExpr: "quantity * unitCost",
    vars: [
      { name: "quantity", desc: "Item quantity", sample: 10 },
      { name: "unitCost", desc: "Direct unit cost (from formula above)", sample: 750 },
      { name: "material", desc: "Material rate per unit", sample: 500 },
      { name: "labor", desc: "Labor rate per unit", sample: 200 },
      { name: "equipment", desc: "Equipment rate per unit", sample: 50 },
      { name: "other", desc: "Other rate per unit", sample: 0 },
    ],
  },
  {
    key: "sectionSubtotal",
    group: "BOQ",
    label: "Category subtotal",
    result: "Subtotal per category (₱)",
    desc: "Subtotal of one BOQ category (A–Q).",
    defaultExpr: "sumLines",
    vars: [
      { name: "sumLines", desc: "Sum of all line totals in the category", sample: 15000 },
      { name: "itemCount", desc: "Number of items in the category", sample: 3 },
    ],
  },
  {
    key: "directCost",
    group: "BOQ",
    label: "Direct cost total",
    result: "Direct cost (₱)",
    desc: "Total direct cost of the detailed BOQ before adjustments.",
    defaultExpr: "sumSections",
    vars: [
      { name: "sumSections", desc: "Sum of all category subtotals", sample: 1500000 },
      { name: "itemCount", desc: "Total number of BOQ items", sample: 40 },
      { name: "area", desc: "Project floor area (m²)", sample: 100 },
      { name: "floors", desc: "Number of floors", sample: 2 },
    ],
  },
  {
    key: "quickTotal",
    group: "Quick estimate",
    label: "Floor-area scenario total",
    result: "Scenario total (₱)",
    desc: "Low / Expected / High quick estimate total.",
    defaultExpr: "area * rate",
    vars: [
      { name: "area", desc: "Total floor area (m²)", sample: 100 },
      { name: "floors", desc: "Number of floors", sample: 2 },
      { name: "rate", desc: "Cost per m² for the scenario", sample: 30000 },
    ],
  },
  {
    key: "allocationAmount",
    group: "Quick estimate",
    label: "Category allocation amount",
    result: "Amount per category (₱)",
    desc: "Splits the Expected total into categories by percentage.",
    defaultExpr: "total * pct / 100",
    vars: [
      { name: "total", desc: "Expected scenario total", sample: 3000000 },
      { name: "pct", desc: "Allocation percentage for the category", sample: 15 },
    ],
  },
  {
    key: "percentAdjustment",
    group: "Adjustments",
    label: "Percentage adjustment",
    result: "Adjustment amount (₱)",
    desc: "Amount of a % adjustment (overhead, profit, contingency, tax…). Deductions are subtracted automatically.",
    defaultExpr: "base * pct / 100",
    vars: [
      { name: "base", desc: "Chosen base: direct cost or running subtotal", sample: 1500000 },
      { name: "pct", desc: "Percentage entered", sample: 10 },
      { name: "direct", desc: "Direct cost", sample: 1500000 },
      { name: "running", desc: "Running subtotal before this line", sample: 1650000 },
    ],
  },
  {
    key: "fixedAdjustment",
    group: "Adjustments",
    label: "Fixed adjustment",
    result: "Adjustment amount (₱)",
    desc: "Amount of a fixed-peso adjustment line.",
    defaultExpr: "value",
    vars: [
      { name: "value", desc: "Fixed amount entered", sample: 25000 },
      { name: "direct", desc: "Direct cost", sample: 1500000 },
      { name: "running", desc: "Running subtotal before this line", sample: 1650000 },
    ],
  },
  {
    key: "grandTotal",
    group: "Results",
    label: "Grand total",
    result: "Grand total (₱)",
    desc: "Final estimate after all adjustments.",
    defaultExpr: "running",
    vars: [
      { name: "running", desc: "Running total after all adjustment lines", sample: 1980000 },
      { name: "direct", desc: "Direct cost", sample: 1500000 },
      { name: "adjustments", desc: "Net sum of adjustment amounts", sample: 480000 },
    ],
  },
  {
    key: "costPerSqm",
    group: "Results",
    label: "Equivalent cost per m²",
    result: "₱ per m²",
    desc: "Grand total expressed per square meter of floor area.",
    defaultExpr: "if(area > 0, grandTotal / area, 0)",
    vars: [
      { name: "grandTotal", desc: "Grand total", sample: 1980000 },
      { name: "area", desc: "Total floor area (m²)", sample: 100 },
      { name: "floors", desc: "Number of floors", sample: 2 },
    ],
  },
] as const satisfies readonly FormulaDef[]

export type FormulaKey = (typeof FORMULA_DEFS)[number]["key"]
export type FormulaMap = Partial<Record<FormulaKey, string>>

const DEFS = Object.fromEntries(FORMULA_DEFS.map((d) => [d.key, d as FormulaDef])) as Record<FormulaKey, FormulaDef>
export const getDef = (key: FormulaKey) => DEFS[key]

export const sampleScope = (def: FormulaDef) => Object.fromEntries(def.vars.map((v) => [v.name, v.sample]))

let active: FormulaMap = {}

/** Called by the store whenever saved formulas change so calculations use the latest set. */
export function setActiveFormulas(map: FormulaMap | undefined) {
  active = map ?? {}
}

export function getExpr(key: FormulaKey) {
  return active[key]?.trim() || DEFS[key].defaultExpr
}

export const isCustom = (key: FormulaKey) => !!active[key]?.trim() && active[key]!.trim() !== DEFS[key].defaultExpr

/** Evaluates the active formula; falls back to the default if a saved custom formula is broken. */
export function calc(key: FormulaKey, scope: Record<string, number>): number {
  const def = DEFS[key]
  const full = { ...Object.fromEntries(def.vars.map((v) => [v.name, 0])), ...scope }
  try {
    return evaluate(getExpr(key), full)
  } catch {
    return evaluate(def.defaultExpr, full)
  }
}

export function validateFormula(key: FormulaKey, expr: string) {
  return tryValidate(expr, sampleScope(DEFS[key]))
}

/** Keeps only known keys whose formulas parse correctly. */
export function cleanFormulas(raw: unknown): FormulaMap {
  const out: FormulaMap = {}
  if (typeof raw !== "object" || raw === null) return out
  for (const def of FORMULA_DEFS) {
    const v = (raw as Record<string, unknown>)[def.key]
    if (typeof v === "string" && v.trim() && validateFormula(def.key, v).ok) out[def.key] = v.trim()
  }
  return out
}
