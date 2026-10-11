"use client"

import { useState } from "react"
import type { Project } from "@/lib/types"
import { validateProjectFields } from "@/lib/validation"
import { Button, Field, NumInput, TextField } from "./ui"

const TYPES = ["Residential", "Commercial", "Institutional", "Industrial", "Mixed-use", "Other"]

export function ProjectForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Project
  onSave: (p: Project) => void
  onCancel?: () => void
}) {
  const [p, setP] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const errors = validateProjectFields(p)
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((x) => ({ ...x, [k]: v }))

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
        if (Object.keys(errors).length === 0) onSave({ ...p, name: p.name.trim() })
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Project name *" value={p.name} onChange={(v) => set("name", v)} error={submitted ? errors.name : undefined} />
        <TextField label="Location" value={p.location} onChange={(v) => set("location", v)} placeholder="e.g. Quezon City, Metro Manila" />
        <Field label="Building type">
          {(id, cls) => (
            <select id={id} className={cls} value={p.buildingType} onChange={(e) => set("buildingType", e.target.value)}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          )}
        </Field>
        <TextField label="Client (optional)" value={p.client} onChange={(v) => set("client", v)} />
        <div>
          <NumInput label="Total floor area (m²) *" value={p.floorArea} onChange={(v) => set("floorArea", v)} />
          {submitted && errors.floorArea && <p className="mt-1 text-xs text-danger">{errors.floorArea}</p>}
        </div>
        <div>
          <NumInput label="Number of floors *" step="1" value={p.floors} onChange={(v) => set("floors", v)} />
          {submitted && errors.floors && <p className="mt-1 text-xs text-danger">{errors.floors}</p>}
        </div>
        <TextField label="Date" type="date" value={p.date} onChange={(v) => set("date", v)} />
      </div>
      <TextField label="Notes" multiline value={p.notes} onChange={(v) => set("notes", v)} />
      <TextField label="Assumptions" multiline value={p.assumptions} onChange={(v) => set("assumptions", v)} placeholder="e.g. Standard finishes, accessible site, prices as of date above" />
      <div className="flex justify-end gap-2">
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary">
          Save project
        </Button>
      </div>
    </form>
  )
}
