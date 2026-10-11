"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, BookOpen, Plus, Trash2 } from "lucide-react"
import { boqDirectTotal, directUnitCost, groupBoq, lineTotal, peso } from "@/lib/calc"
import { uid } from "@/lib/store"
import { CATEGORIES, type BoqItem, type CategoryCode, type Project, type RateEntry } from "@/lib/types"
import { Button, Card, EmptyState, NumInput, SectionTitle } from "./ui"
import { RatePicker } from "./rate-picker"

const cellInput = "w-full rounded border border-line bg-white px-2 py-1 text-sm outline-none focus:border-accent"
const RATE_COLS = [
  { key: "material", label: "Material" },
  { key: "labor", label: "Labor" },
  { key: "equipment", label: "Equip." },
  { key: "other", label: "Other" },
] as const

export function BoqEditor({
  project,
  rates,
  update,
}: {
  project: Project
  rates: RateEntry[]
  update: (fn: (p: Project) => Project) => void
}) {
  const [newCat, setNewCat] = useState<CategoryCode>("A")
  const [picking, setPicking] = useState<string | null>(null)
  const sections = groupBoq(project.boq)
  const direct = boqDirectTotal(project.boq)

  const setItems = (fn: (items: BoqItem[]) => BoqItem[]) => update((p) => ({ ...p, boq: fn(p.boq) }))
  const patch = (id: string, v: Partial<BoqItem>) => setItems((items) => items.map((i) => (i.id === id ? { ...i, ...v } : i)))

  function addItem(category: CategoryCode) {
    const count = project.boq.filter((i) => i.category === category).length
    setItems((items) => [
      ...items,
      { id: uid(), category, itemNo: `${category}.${count + 1}`, description: "", unit: "", quantity: 0, material: 0, labor: 0, equipment: 0, other: 0, rateSource: "" },
    ])
  }

  function moveWithinSection(id: string, delta: number) {
    setItems((items) => {
      const idx = items.findIndex((i) => i.id === id)
      const sameCat = items.map((x, n) => (x.category === items[idx].category ? n : -1)).filter((n) => n >= 0)
      const pos = sameCat.indexOf(idx)
      const target = sameCat[pos + delta]
      if (target === undefined) return items
      const next = [...items]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle
          title="Detailed Bill of Quantities"
          desc="Direct unit cost = Material + Labor + Equipment + Other direct.  Line total = Quantity × Direct unit cost."
          actions={
            <div className="flex gap-2">
              <label htmlFor="new-cat" className="sr-only">
                Category for new item
              </label>
              <select id="new-cat" value={newCat} onChange={(e) => setNewCat(e.target.value as CategoryCode)} className={`${cellInput} h-9 max-w-56`}>
                {CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}. {c.name}
                  </option>
                ))}
              </select>
              <Button variant="primary" onClick={() => addItem(newCat)}>
                <Plus className="size-4" aria-hidden /> Add item
              </Button>
            </div>
          }
        />
        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-navy px-4 py-3 text-white">
          <span className="text-sm text-blue-100">Direct cost subtotal ({project.boq.length} items)</span>
          <span className="text-xl font-semibold tabular-nums">{peso(direct)}</span>
        </div>
      </Card>

      {sections.length === 0 && (
        <EmptyState
          title="No BOQ items yet"
          desc="Choose a work category above and click Add item. You can copy saved rates from the Rate Library into each line."
        />
      )}

      {sections.map((s) => (
        <Card key={s.code} className="p-0 md:p-0">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h3 className="font-semibold">
              {s.code}. {s.name}
            </h3>
            <Button size="sm" onClick={() => addItem(s.code)}>
              <Plus className="size-3.5" aria-hidden /> Add to {s.code}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs text-muted">
                  <th className="w-20 px-2 py-2 font-medium">Item no.</th>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="w-20 px-2 py-2 font-medium">Unit</th>
                  <th className="w-24 px-2 py-2 font-medium">Qty</th>
                  {RATE_COLS.map((c) => (
                    <th key={c.key} className="w-24 px-2 py-2 font-medium">
                      {c.label} ₱/unit
                    </th>
                  ))}
                  <th className="w-28 px-2 py-2 text-right font-medium">Direct unit</th>
                  <th className="w-32 px-2 py-2 text-right font-medium">Line total</th>
                  <th className="w-36 px-2 py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {s.items.map((it, idx) => (
                  <tr key={it.id} className="border-t border-line/60 align-top">
                    <td className="px-2 py-1.5">
                      <input aria-label="Item number" className={cellInput} value={it.itemNo} onChange={(e) => patch(it.id, { itemNo: e.target.value })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input aria-label="Description" className={cellInput} value={it.description} placeholder="Describe work item" onChange={(e) => patch(it.id, { description: e.target.value })} />
                      <div className="mt-1 flex items-center gap-2">
                        <label className="sr-only" htmlFor={`cat-${it.id}`}>
                          Category
                        </label>
                        <select
                          id={`cat-${it.id}`}
                          value={it.category}
                          onChange={(e) => patch(it.id, { category: e.target.value as CategoryCode })}
                          className="rounded border border-line bg-white px-1 py-0.5 text-xs text-muted"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              Move to {c.code}
                            </option>
                          ))}
                        </select>
                        {it.rateSource && <span className="truncate text-xs text-muted">Source: {it.rateSource}</span>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <input aria-label="Unit" className={cellInput} value={it.unit} placeholder="cu.m" onChange={(e) => patch(it.id, { unit: e.target.value })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput srOnlyLabel label="Quantity" value={it.quantity} onChange={(v) => patch(it.id, { quantity: v })} />
                    </td>
                    {RATE_COLS.map((c) => (
                      <td key={c.key} className="px-2 py-1.5">
                        <NumInput srOnlyLabel label={`${c.label} unit rate`} value={it[c.key]} onChange={(v) => patch(it.id, { [c.key]: v })} />
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-right tabular-nums">{peso(directUnitCost(it))}</td>
                    <td className="px-2 py-2.5 text-right font-medium tabular-nums">{peso(lineTotal(it))}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" aria-label="Move up" disabled={idx === 0} onClick={() => moveWithinSection(it.id, -1)}>
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Move down" disabled={idx === s.items.length - 1} onClick={() => moveWithinSection(it.id, 1)}>
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Copy rate from library" onClick={() => setPicking(it.id)}>
                          <BookOpen className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          aria-label="Delete item"
                          onClick={() => confirm("Delete this BOQ item?") && setItems((items) => items.filter((i) => i.id !== it.id))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-surface font-semibold">
                  <td colSpan={9} className="px-2 py-2 text-right">
                    Subtotal {s.code}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{peso(s.subtotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ))}

      {sections.length > 0 && (
        <Card>
          <h3 className="mb-2 font-semibold">Cost summary by category</h3>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {sections.map((s) => (
              <li key={s.code} className="flex justify-between gap-4 py-1.5">
                <span>
                  {s.code}. {s.name}
                </span>
                <span className="tabular-nums">{peso(s.subtotal)}</span>
              </li>
            ))}
            <li className="flex justify-between py-2 font-semibold">
              <span>Direct cost subtotal</span>
              <span className="tabular-nums">{peso(direct)}</span>
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted">Overhead, profit, contingency and taxes are set in the Adjustments tab.</p>
        </Card>
      )}

      {picking && (
        <RatePicker
          rates={rates}
          onClose={() => setPicking(null)}
          onPick={(r) => {
            const line = project.boq.find((i) => i.id === picking)
            const src = `${r.name} (${r.source || "no source"}${r.date ? `, ${r.date}` : ""})${r.sample ? " [SAMPLE]" : ""}`
            patch(picking, {
              [r.type]: r.rate,
              unit: line?.unit || r.unit,
              description: line?.description || r.name,
              rateSource: line?.rateSource ? `${line.rateSource}; ${src}` : src,
            })
            setPicking(null)
          }}
        />
      )}
    </div>
  )
}
