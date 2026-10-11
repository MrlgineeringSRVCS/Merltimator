import { calc } from "./formulas"
import { CATEGORIES, type Adjustment, type BoqItem, type CategoryCode } from "./types"

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

const safe = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0)

const rates = (item: Pick<BoqItem, "material" | "labor" | "equipment" | "other"> & { quantity?: number }) => ({
  material: safe(item.material),
  labor: safe(item.labor),
  equipment: safe(item.equipment),
  other: safe(item.other),
  quantity: safe(item.quantity ?? 0),
})

export function directUnitCost(item: Pick<BoqItem, "material" | "labor" | "equipment" | "other"> & { quantity?: number }) {
  return round2(calc("unitCost", rates(item)))
}

export function lineTotal(item: BoqItem) {
  return round2(calc("lineTotal", { ...rates(item), unitCost: directUnitCost(item) }))
}

export interface BoqSection {
  code: CategoryCode
  name: string
  items: BoqItem[]
  subtotal: number
}

export function groupBoq(items: BoqItem[]): BoqSection[] {
  return CATEGORIES.map((c) => {
    const sectionItems = items.filter((i) => i.category === c.code)
    return {
      code: c.code,
      name: c.name,
      items: sectionItems,
      subtotal: round2(
        calc("sectionSubtotal", {
          sumLines: sectionItems.reduce((s, i) => s + lineTotal(i), 0),
          itemCount: sectionItems.length,
        }),
      ),
    }
  }).filter((s) => s.items.length > 0)
}

export function boqDirectTotal(items: BoqItem[], project?: { floorArea: number; floors: number }) {
  return round2(
    calc("directCost", {
      sumSections: groupBoq(items).reduce((s, sec) => s + sec.subtotal, 0),
      itemCount: items.length,
      area: safe(project?.floorArea ?? 0),
      floors: safe(project?.floors ?? 0),
    }),
  )
}

export function costPerSqm(grandTotal: number, area: number, floors = 1) {
  return round2(calc("costPerSqm", { grandTotal, area: safe(area), floors: safe(floors) }))
}

export function allocationTotal(allocation: Record<string, number>) {
  return round2(Object.values(allocation).reduce((s, v) => s + safe(v), 0))
}

export function isAllocationValid(allocation: Record<string, number>) {
  return Math.abs(allocationTotal(allocation) - 100) < 0.001
}

export function quickScenarios(area: number, rates: { low: number; expected: number; high: number }, floors = 1) {
  const a = safe(area)
  return (["low", "expected", "high"] as const).map((key) => ({
    key,
    label: key === "low" ? "Low" : key === "expected" ? "Expected" : "High",
    rate: safe(rates[key]),
    total: round2(calc("quickTotal", { area: a, floors: safe(floors), rate: safe(rates[key]) })),
  }))
}

export function allocate(total: number, allocation: Record<CategoryCode, number>) {
  return CATEGORIES.map((c) => ({
    code: c.code,
    name: c.name,
    pct: safe(allocation[c.code]),
    amount: round2(calc("allocationAmount", { total: safe(total), pct: safe(allocation[c.code]) })),
  }))
}

export interface AdjustmentRow {
  id: string
  order: number
  label: string
  type: Adjustment["type"]
  effect: Adjustment["effect"]
  pct: number | null
  baseLabel: string
  baseAmount: number | null
  amount: number
  runningTotal: number
}

/**
 * Adjustments are applied in list order. A percentage adjustment is computed on either the
 * direct cost or the running subtotal immediately before it, so each amount is counted once.
 */
export function applyAdjustments(direct: number, adjustments: Adjustment[]) {
  const directCost = round2(safe(direct))
  let running = directCost
  const rows: AdjustmentRow[] = []
  adjustments
    .filter((a) => a.enabled)
    .forEach((a, idx) => {
      const sign = a.effect === "deduct" ? -1 : 1
      let amount: number
      let baseAmount: number | null = null
      if (a.type === "percent") {
        baseAmount = a.base === "direct" ? directCost : running
        amount =
          round2(calc("percentAdjustment", { base: baseAmount, pct: safe(a.value), direct: directCost, running })) * sign
      } else {
        amount = round2(calc("fixedAdjustment", { value: safe(a.value), direct: directCost, running })) * sign
      }
      running = round2(running + amount)
      rows.push({
        id: a.id,
        order: idx + 1,
        label: a.label,
        type: a.type,
        effect: a.effect,
        pct: a.type === "percent" ? safe(a.value) : null,
        baseLabel: a.type === "percent" ? (a.base === "direct" ? "Direct cost" : "Running subtotal") : "Fixed amount",
        baseAmount,
        amount,
        runningTotal: running,
      })
    })
  const grandTotal = round2(
    calc("grandTotal", { running, direct: directCost, adjustments: round2(running - directCost) }),
  )
  return { directCost, rows, grandTotal }
}

export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  const [it] = next.splice(index, 1)
  next.splice(target, 0, it)
  return next
}

export const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(n)

export const num = (n: number) => new Intl.NumberFormat("en-PH", { maximumFractionDigits: 3 }).format(n)
