"use client"

import { allocate, allocationTotal, isAllocationValid, num, peso, quickScenarios } from "@/lib/calc"
import { getExpr } from "@/lib/formulas"
import { DEFAULT_ALLOCATION, type Project, type QuickEstimate } from "@/lib/types"
import { Button, Card, NumInput, SectionTitle, TextField } from "./ui"

export function QuickEstimatePanel({ project, update }: { project: Project; update: (fn: (p: Project) => Project) => void }) {
  const q = project.quick
  const setQ = (patch: Partial<QuickEstimate>) => update((p) => ({ ...p, quick: { ...p.quick, ...patch } }))
  const scenarios = quickScenarios(project.floorArea, q, project.floors)
  const expected = scenarios[1].total
  const allocTotal = allocationTotal(q.allocation)
  const valid = isAllocationValid(q.allocation)
  const rows = allocate(expected, q.allocation)

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        The quick estimate is a separate floor-area approximation. It is never added to the detailed BOQ total.
      </p>
      <Card>
        <SectionTitle
          title="Floor-area estimate"
          desc={`Formula: Scenario total = ${getExpr("quickTotal")} (area = ${num(project.floorArea)} m², floors = ${project.floors}). Edit it under Formulas.`}
        />
        <div className="grid gap-4 md:grid-cols-3">
          {scenarios.map((s) => (
            <div key={s.key} className={`rounded-md border p-3 ${s.key === "expected" ? "border-accent bg-accent-soft" : "border-line"}`}>
              <NumInput label={`${s.label} rate (₱ / m²)`} value={s.rate} onChange={(v) => setQ({ [s.key]: v })} />
              <p className="mt-3 text-xs text-muted">{s.label} scenario total</p>
              <p className="text-xl font-semibold tabular-nums">{peso(s.total)}</p>
            </div>
          ))}
        </div>
        {q.expected === 0 && <p className="mt-3 text-sm text-muted">Enter your own cost-per-m² rates. No market rates are assumed.</p>}
      </Card>

      <Card>
        <SectionTitle
          title="Category allocation (Expected scenario)"
          desc="Percentages must total exactly 100%."
          actions={
            <Button size="sm" onClick={() => setQ({ allocation: { ...DEFAULT_ALLOCATION } })}>
              Reset to default split
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-2 font-medium">Category</th>
                <th className="w-28 py-2 pr-2 font-medium">Allocation %</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b border-line/60">
                  <td className="py-1.5 pr-2">
                    <span className="font-medium">{r.code}.</span> {r.name}
                  </td>
                  <td className="py-1.5 pr-2">
                    <NumInput
                      srOnlyLabel
                      label={`${r.name} allocation percent`}
                      value={r.pct}
                      onChange={(v) => setQ({ allocation: { ...q.allocation, [r.code]: v } })}
                    />
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{valid ? peso(r.amount) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2">Total</td>
                <td className={`py-2 tabular-nums ${valid ? "text-ok" : "text-danger"}`}>{num(allocTotal)}%</td>
                <td className="py-2 text-right tabular-nums">{valid ? peso(expected) : "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!valid && (
          <p role="alert" className="mt-2 text-sm text-danger">
            Allocations total {num(allocTotal)}%. Adjust by {num(Math.abs(100 - allocTotal))}% to reach exactly 100%.
          </p>
        )}
      </Card>

      <Card className="grid gap-4 md:grid-cols-2">
        <TextField label="Inclusions" multiline value={q.inclusions} onChange={(v) => setQ({ inclusions: v })} placeholder="e.g. Structural, architectural, basic plumbing and electrical" />
        <TextField label="Exclusions" multiline value={q.exclusions} onChange={(v) => setQ({ exclusions: v })} placeholder="e.g. Permits, furniture, landscaping, lot cost" />
      </Card>
    </div>
  )
}
