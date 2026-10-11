import { describe, expect, it } from "vitest"
import {
  allocate,
  allocationTotal,
  applyAdjustments,
  boqDirectTotal,
  directUnitCost,
  groupBoq,
  isAllocationValid,
  lineTotal,
  moveItem,
  quickScenarios,
} from "../lib/calc"
import { DEFAULT_ALLOCATION, type Adjustment, type BoqItem } from "../lib/types"
import { parseNonNegative, serializeBackup, validateBackup, validateProjectFields } from "../lib/validation"

const item = (o: Partial<BoqItem>): BoqItem => ({
  id: Math.random().toString(),
  category: "C",
  itemNo: "1",
  description: "x",
  unit: "cu.m",
  quantity: 0,
  material: 0,
  labor: 0,
  equipment: 0,
  other: 0,
  rateSource: "",
  ...o,
})

describe("BOQ", () => {
  it("computes direct unit cost and line total", () => {
    const i = item({ quantity: 2.5, material: 100, labor: 50, equipment: 10, other: 5 })
    expect(directUnitCost(i)).toBe(165)
    expect(lineTotal(i)).toBe(412.5)
  })
  it("treats negative/NaN as 0", () => {
    expect(lineTotal(item({ quantity: -3, material: 100 }))).toBe(0)
    expect(directUnitCost(item({ material: NaN, labor: 20 }))).toBe(20)
  })
  it("groups and subtotals by category", () => {
    const items = [
      item({ category: "C", quantity: 1, material: 100 }),
      item({ category: "A", quantity: 2, labor: 10 }),
      item({ category: "C", quantity: 3, material: 10 }),
    ]
    const g = groupBoq(items)
    expect(g.map((s) => s.code)).toEqual(["A", "C"])
    expect(g[1].subtotal).toBe(130)
    expect(boqDirectTotal(items)).toBe(150)
  })
  it("reorders items", () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
  })
})

describe("Quick estimate", () => {
  it("default allocation totals 100", () => {
    expect(allocationTotal(DEFAULT_ALLOCATION)).toBe(100)
    expect(isAllocationValid(DEFAULT_ALLOCATION)).toBe(true)
    expect(isAllocationValid({ ...DEFAULT_ALLOCATION, A: 4 })).toBe(false)
  })
  it("computes scenarios and allocations", () => {
    const s = quickScenarios(120, { low: 25000, expected: 30000, high: 38000 })
    expect(s.map((x) => x.total)).toEqual([3_000_000, 3_600_000, 4_560_000])
    const a = allocate(1_000_000, DEFAULT_ALLOCATION)
    expect(a.find((x) => x.code === "C")?.amount).toBe(150_000)
    expect(a.reduce((t, x) => t + x.amount, 0)).toBe(1_000_000)
  })
})

describe("Adjustments", () => {
  const adj = (o: Partial<Adjustment>): Adjustment => ({
    id: Math.random().toString(),
    label: "x",
    type: "percent",
    value: 0,
    base: "direct",
    effect: "add",
    enabled: true,
    ...o,
  })
  it("applies in order with correct bases", () => {
    const r = applyAdjustments(1000, [
      adj({ label: "OH", value: 10 }),
      adj({ label: "Profit", value: 10 }),
      adj({ label: "Tax", value: 12, base: "running" }),
      adj({ label: "Credit", type: "fixed", value: 50, effect: "deduct" }),
      adj({ label: "Off", value: 99, enabled: false }),
    ])
    expect(r.rows.map((x) => x.amount)).toEqual([100, 100, 144, -50])
    expect(r.rows[2].baseAmount).toBe(1200)
    expect(r.grandTotal).toBe(1294)
    expect(r.rows).toHaveLength(4)
  })
})

describe("Validation", () => {
  it("parses numbers", () => {
    expect(parseNonNegative("12.5")).toEqual({ ok: true, value: 12.5 })
    expect(parseNonNegative("-1").ok).toBe(false)
    expect(parseNonNegative("abc").ok).toBe(false)
    expect(parseNonNegative("").ok).toBe(false)
  })
  it("validates project fields", () => {
    expect(validateProjectFields({ name: "", floorArea: 0, floors: 0 })).toHaveProperty("name")
    expect(Object.keys(validateProjectFields({ name: "A", floorArea: 50, floors: 2 }))).toHaveLength(0)
  })
  it("round-trips a backup and rejects bad files", () => {
    const json = serializeBackup({
      version: 1,
      projects: [
        {
          id: "p1", name: "House", location: "", buildingType: "", floorArea: 80, floors: 1, client: "", date: "",
          notes: "", assumptions: "",
          quick: { low: 1, expected: 2, high: 3, allocation: { ...DEFAULT_ALLOCATION }, inclusions: "", exclusions: "" },
          boq: [item({ id: "b1", quantity: 1, material: 5 })], adjustments: [], createdAt: "", updatedAt: "",
        },
      ],
      rates: [],
    })
    const r = validateBackup(json)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.projects[0].boq[0].material).toBe(5)
    expect(validateBackup("{").ok).toBe(false)
    expect(validateBackup(JSON.stringify({ projects: [] })).ok).toBe(false)
    expect(validateBackup(JSON.stringify({ app: "merltimator", projects: [{ name: "x" }] })).ok).toBe(false)
  })
})
