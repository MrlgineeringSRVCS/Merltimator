import { CATEGORIES, type Adjustment, type BoqItem, type CategoryCode } from "./types"

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

const safe = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0)

export function directUnitCost(item: Pick<BoqItem, "material" | "labor" | "equipment" | "other">) {
  return round2(safe(item.material) + safe(item.labor) + safe(item.equipment) + safe(item.other))
}

export function lineTotal(item: BoqItem) {
  return round2(safe(item.quantity) * directUnitCost(item))
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
      subtotal: round2(sectionItems.reduce((s, i) => s + lineTotal(i), 0)),
    }
  }).filter((s) => s.items.length > 0)
}

export function boqDirectTotal(items: BoqItem[]) {
  return round2(items.reduce((s, i) => s + lineTotal(i), 0))
}

export function allocationTotal(allocation: Record<string, number>) {
  return round2(Object.values(allocation).reduce((s, v) => s + safe(v), 0))
}

export function isAllocationValid(allocation: Record<string, number>) {
  return Math.abs(allocationTotal(allocation) - 100) < 0.001
}

export function quickScenarios(area: number, rates: { low: number; expected: number; high: number }) {
  const a = safe(area)
  return (["low", "expected", "high"] as const).map((key) => ({
    key,
    label: key === "low" ? "Low" : key === "expected" ? "Expected" : "High",
    rate: safe(rates[key]),
    total: round2(a * safe(rates[key])),
  }))
}

export function allocate(total: number, allocation: Record<CategoryCode, number>) {
  return CATEGORIES.map((c) => ({
    code: c.code,
    name: c.name,
    pct: safe(allocation[c.code]),
    amount: round2((safe(total) * safe(allocation[c.code])) / 100),
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
        amount = round2((baseAmount * safe(a.value)) / 100) * sign
      } else {
        amount = round2(safe(a.value)) * sign
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
  return { directCost, rows, grandTotal: running }
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
