"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { peso } from "@/lib/calc"
import { actions, uid } from "@/lib/store"
import type { RateEntry, RateType } from "@/lib/types"
import { Button, Card, EmptyState, Field, Modal, NumInput, SampleBadge, SectionTitle, TextField } from "./ui"
import { filterRates } from "./rate-picker"

const TYPES: RateType[] = ["material", "labor", "equipment", "other"]

const blank = (): RateEntry => ({
  id: uid(), type: "material", name: "", unit: "", rate: 0, source: "", location: "",
  date: new Date().toISOString().slice(0, 10), notes: "", sample: false,
})

export function RateLibrary({ rates }: { rates: RateEntry[] }) {
  const [q, setQ] = useState("")
  const [type, setType] = useState<RateType | "all">("all")
  const [editing, setEditing] = useState<RateEntry | null>(null)
  const list = filterRates(rates, q).filter((r) => type === "all" || r.type === type)

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        title="Rate Library"
        desc="Save your own supplier quotes and labor rates. Copying a rate into a BOQ line copies its current value only."
        actions={
          <Button variant="primary" onClick={() => setEditing(blank())}>
            <Plus className="size-4" aria-hidden /> Add rate
          </Button>
        }
      />
      <div className="flex flex-col gap-2 md:flex-row">
        <label htmlFor="lib-search" className="sr-only">Search rates</label>
        <input
          id="lib-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, unit, source, location..."
          className="flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <label htmlFor="lib-type" className="sr-only">Filter by type</label>
        <select id="lib-type" value={type} onChange={(e) => setType(e.target.value as RateType | "all")} className="rounded-md border border-line bg-white px-3 py-2 text-sm capitalize">
          <option value="all">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No rates" desc={rates.length ? "No rates match your search." : "Add your first rate to reuse it across BOQs."} />
      ) : (
        <Card className="overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Source / supplier</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-line/60">
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.name}</p>
                    {r.sample && <SampleBadge />}
                    {r.notes && <p className="text-xs text-muted">{r.notes}</p>}
                  </td>
                  <td className="px-3 py-2 capitalize">{r.type}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{peso(r.rate)} / {r.unit || "unit"}</td>
                  <td className="px-3 py-2">{r.source || "—"}</td>
                  <td className="px-3 py-2">{r.location || "—"}</td>
                  <td className="px-3 py-2">{r.date || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}><Pencil className="size-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-danger" aria-label={`Delete ${r.name}`} onClick={() => confirm(`Delete rate "${r.name}"?`) && actions.deleteRate(r.id)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {editing && <RateForm initial={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function RateForm({ initial, onClose }: { initial: RateEntry; onClose: () => void }) {
  const [r, setR] = useState(initial)
  const [err, setErr] = useState("")
  const set = <K extends keyof RateEntry>(k: K, v: RateEntry[K]) => setR((x) => ({ ...x, [k]: v }))
  return (
    <Modal title={initial.name ? "Edit rate" : "Add rate"} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!r.name.trim()) return setErr("Item name is required")
          // Editing a sample makes it the user's own entry
          actions.saveRate({ ...r, name: r.name.trim(), sample: r.sample && JSON.stringify(r) === JSON.stringify(initial) })
          onClose()
        }}
      >
        {r.sample && <SampleBadge />}
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Item name *" value={r.name} onChange={(v) => { set("name", v); setErr("") }} error={err} />
          <Field label="Type">
            {(id, cls) => (
              <select id={id} className={`${cls} capitalize`} value={r.type} onChange={(e) => set("type", e.target.value as RateType)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </Field>
          <TextField label="Unit" value={r.unit} onChange={(v) => set("unit", v)} placeholder="bag, pc, cu.m, day" />
          <NumInput label="Rate (₱ per unit)" value={r.rate} onChange={(v) => set("rate", v)} />
          <TextField label="Source / supplier" value={r.source} onChange={(v) => set("source", v)} />
          <TextField label="Location" value={r.location} onChange={(v) => set("location", v)} />
          <TextField label="Date recorded" type="date" value={r.date} onChange={(v) => set("date", v)} />
        </div>
        <TextField label="Notes" multiline value={r.notes} onChange={(v) => set("notes", v)} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save rate</Button>
        </div>
      </form>
    </Modal>
  )
}
