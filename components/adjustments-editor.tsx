"use client"

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { applyAdjustments, boqDirectTotal, moveItem, num, peso } from "@/lib/calc"
import { uid } from "@/lib/store"
import type { Adjustment, Project } from "@/lib/types"
import { Button, Card, NumInput, SectionTitle } from "./ui"

const sel = "rounded border border-line bg-white px-2 py-1 text-sm"

export function AdjustmentsEditor({ project, update }: { project: Project; update: (fn: (p: Project) => Project) => void }) {
  const adjs = project.adjustments
  const setAdjs = (fn: (a: Adjustment[]) => Adjustment[]) => update((p) => ({ ...p, adjustments: fn(p.adjustments) }))
  const patch = (id: string, v: Partial<Adjustment>) => setAdjs((a) => a.map((x) => (x.id === id ? { ...x, ...v } : x)))
  const result = applyAdjustments(boqDirectTotal(project.boq, project), adjs)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle
          title="Cost adjustments"
          desc="Applied top to bottom on the BOQ direct cost. Percentages use either the direct cost or the running subtotal just before that line, so nothing is counted twice. No tax rate is assumed — enter the rate that applies to your project."
          actions={
            <Button
              variant="primary"
              onClick={() => setAdjs((a) => [...a, { id: uid(), label: "New adjustment", type: "percent", value: 0, base: "direct", effect: "add", enabled: true }])}
            >
              <Plus className="size-4" aria-hidden /> Add adjustment
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-2 font-medium">On</th>
                <th className="py-2 pr-2 font-medium">Label</th>
                <th className="py-2 pr-2 font-medium">Effect</th>
                <th className="py-2 pr-2 font-medium">Type</th>
                <th className="w-28 py-2 pr-2 font-medium">Value</th>
                <th className="py-2 pr-2 font-medium">Calculation base</th>
                <th className="py-2 pr-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {adjs.map((a, i) => (
                <tr key={a.id} className="border-b border-line/60">
                  <td className="py-1.5 pr-2">
                    <input type="checkbox" aria-label={`Enable ${a.label}`} checked={a.enabled} onChange={(e) => patch(a.id, { enabled: e.target.checked })} className="size-4 accent-accent" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input aria-label="Adjustment label" value={a.label} onChange={(e) => patch(a.id, { label: e.target.value })} className={`${sel} w-full`} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <select aria-label="Effect" value={a.effect} onChange={(e) => patch(a.id, { effect: e.target.value as Adjustment["effect"] })} className={sel}>
                      <option value="add">Add</option>
                      <option value="deduct">Deduct</option>
                    </select>
                  </td>
                  <td className="py-1.5 pr-2">
                    <select aria-label="Type" value={a.type} onChange={(e) => patch(a.id, { type: e.target.value as Adjustment["type"] })} className={sel}>
                      <option value="percent">Percent %</option>
                      <option value="fixed">Fixed ₱</option>
                    </select>
                  </td>
                  <td className="py-1.5 pr-2">
                    <NumInput srOnlyLabel label={`${a.label} value`} value={a.value} onChange={(v) => patch(a.id, { value: v })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    {a.type === "percent" ? (
                      <select aria-label="Calculation base" value={a.base} onChange={(e) => patch(a.id, { base: e.target.value as Adjustment["base"] })} className={sel}>
                        <option value="direct">Direct cost</option>
                        <option value="running">Running subtotal</option>
                      </select>
                    ) : (
                      <span className="text-xs text-muted">Fixed amount</span>
                    )}
                  </td>
                  <td className="py-1.5">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => setAdjs((x) => moveItem(x, i, -1))}><ArrowUp className="size-3.5" /></Button>
                      <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === adjs.length - 1} onClick={() => setAdjs((x) => moveItem(x, i, 1))}><ArrowDown className="size-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-danger" aria-label={`Delete ${a.label}`} onClick={() => setAdjs((x) => x.filter((y) => y.id !== a.id))}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 font-semibold">Calculation details</h3>
        <AdjustmentSummary result={result} />
      </Card>
    </div>
  )
}

export function AdjustmentSummary({ result }: { result: ReturnType<typeof applyAdjustments> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-1.5 pr-2 font-medium">#</th>
            <th className="py-1.5 pr-2 font-medium">Item</th>
            <th className="py-1.5 pr-2 font-medium">Calculation</th>
            <th className="py-1.5 pr-2 text-right font-medium">Amount</th>
            <th className="py-1.5 text-right font-medium">Running total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line/60">
            <td className="py-1.5 pr-2">—</td>
            <td className="py-1.5 pr-2 font-medium">BOQ direct cost</td>
            <td className="py-1.5 pr-2 text-muted">Sum of line totals</td>
            <td className="py-1.5 pr-2 text-right tabular-nums">{peso(result.directCost)}</td>
            <td className="py-1.5 text-right tabular-nums">{peso(result.directCost)}</td>
          </tr>
          {result.rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60">
              <td className="py-1.5 pr-2">{r.order}</td>
              <td className="py-1.5 pr-2">{r.label}</td>
              <td className="py-1.5 pr-2 text-muted">
                {r.pct !== null ? `${num(r.pct)}% × ${r.baseLabel} (${peso(r.baseAmount ?? 0)})` : r.baseLabel}
                {r.effect === "deduct" ? " — deduction" : ""}
              </td>
              <td className={`py-1.5 pr-2 text-right tabular-nums ${r.amount < 0 ? "text-danger" : ""}`}>{peso(r.amount)}</td>
              <td className="py-1.5 text-right tabular-nums">{peso(r.runningTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td colSpan={4} className="py-2 text-right">Total estimated project cost</td>
            <td className="py-2 text-right tabular-nums">{peso(result.grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
