import { describe, expect, it, afterEach } from "vitest"
import { evaluate, tryValidate } from "../lib/formula"
import { setActiveFormulas, cleanFormulas } from "../lib/formulas"
import { applyAdjustments, lineTotal, quickScenarios, costPerSqm } from "../lib/calc"

afterEach(() => setActiveFormulas({}))

describe("formula evaluator", () => {
  it("respects precedence, parentheses and functions", () => {
    expect(evaluate("a + b * 2", { a: 1, b: 3 })).toBe(7)
    expect(evaluate("(a + b) * 2", { a: 1, b: 3 })).toBe(8)
    expect(evaluate("2 ^ 3 ^ 2", {})).toBe(512)
    expect(evaluate("-a + max(1, 5, 3)", { a: 2 })).toBe(3)
    expect(evaluate("round(10 / 3, 2)", {})).toBe(3.33)
    expect(evaluate("if(a > 0, 10, 20)", { a: 0 })).toBe(20)
    expect(evaluate("a / 0", { a: 5 })).toBe(0)
  })
  it("rejects unknown names and unsafe input", () => {
    expect(tryValidate("foo + 1", { a: 1 }).ok).toBe(false)
    expect(tryValidate("alert(1)", {}).ok).toBe(false)
    expect(tryValidate("a +", { a: 1 }).ok).toBe(false)
    expect(tryValidate("window.x", {}).ok).toBe(false)
  })
})

describe("custom formulas drive calculations", () => {
  const item = { id: "1", category: "C" as const, itemNo: "", description: "", unit: "", quantity: 10, material: 100, labor: 50, equipment: 0, other: 0, rateSource: "" }
  it("line total with wastage factor", () => {
    expect(lineTotal(item)).toBe(1500)
    setActiveFormulas({ lineTotal: "quantity * unitCost * 1.05" })
    expect(lineTotal(item)).toBe(1575)
  })
  it("quick estimate per floor", () => {
    setActiveFormulas({ quickTotal: "area * floors * rate" })
    expect(quickScenarios(100, { low: 1, expected: 2, high: 3 }, 2)[1].total).toBe(400)
  })
  it("percent adjustment and grand total", () => {
    setActiveFormulas({ percentAdjustment: "base * pct / 100 * 2", grandTotal: "round(running, -0)" })
    const r = applyAdjustments(1000, [{ id: "a", label: "x", type: "percent", value: 10, base: "direct", effect: "add", enabled: true }])
    expect(r.grandTotal).toBe(1200)
  })
  it("broken saved formula falls back to default", () => {
    setActiveFormulas({ costPerSqm: "nope" })
    expect(costPerSqm(1000, 10)).toBe(100)
    expect(cleanFormulas({ costPerSqm: "nope", lineTotal: "quantity * unitCost" })).toEqual({ lineTotal: "quantity * unitCost" })
  })
})
