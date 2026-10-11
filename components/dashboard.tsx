"use client"

import { useRef, useState } from "react"
import { Copy, Download, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { applyAdjustments, boqDirectTotal, peso, num } from "@/lib/calc"
import { actions, newProject } from "@/lib/store"
import type { AppData, Project } from "@/lib/types"
import { serializeBackup, validateBackup } from "@/lib/validation"
import { Button, Card, EmptyState, Modal, SectionTitle } from "./ui"
import { ProjectForm } from "./project-form"

export function Dashboard({ data, onOpen }: { data: AppData; onOpen: (id: string) => void }) {
  const [editing, setEditing] = useState<Project | null>(null)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function exportJson() {
    const blob = new Blob([serializeBackup(actions.getAll())], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `merltimator-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg({ type: "ok", text: "Backup exported." })
  }

  async function importJson(file: File) {
    const result = validateBackup(await file.text())
    if (!result.ok) return setMsg({ type: "err", text: `Import failed: ${result.error}` })
    const replace = confirm(
      `Backup contains ${result.data.projects.length} project(s) and ${result.data.rates.length} rate(s).\n\nOK = Replace all current data\nCancel = Merge (matching IDs are overwritten)`,
    )
    actions.importData(result.data, replace ? "replace" : "merge")
    setMsg({ type: "ok", text: `Imported ${result.data.projects.length} project(s) (${replace ? "replaced" : "merged"}).` })
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        title="Projects"
        desc="Each project keeps its own details, quick estimate, BOQ and adjustments."
        actions={
          <>
            <Button onClick={exportJson}>
              <Download className="size-4" aria-hidden /> Export JSON
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" aria-hidden /> Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import backup file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importJson(f)
                e.target.value = ""
              }}
            />
            <Button variant="primary" onClick={() => setEditing(newProject())}>
              <Plus className="size-4" aria-hidden /> New project
            </Button>
          </>
        }
      />

      <p className="rounded-md border border-blue-200 bg-accent-soft px-3 py-2 text-sm text-navy">
        Projects are saved in this browser only (localStorage). They do not sync across devices or browsers — use
        Export JSON to back up and Import JSON to restore elsewhere.
      </p>
      {msg && (
        <p role="status" className={`text-sm ${msg.type === "ok" ? "text-ok" : "text-danger"}`}>
          {msg.text}
        </p>
      )}

      {data.projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          desc="Create your first project to start a quick floor-area estimate or a detailed quantity-based BOQ."
          action={
            <Button variant="primary" onClick={() => setEditing(newProject())}>
              <Plus className="size-4" aria-hidden /> New project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((p) => {
            const total = applyAdjustments(boqDirectTotal(p.boq, p), p.adjustments).grandTotal
            return (
              <Card key={p.id} className="flex flex-col gap-3">
                <button type="button" onClick={() => onOpen(p.id)} className="text-left">
                  <h3 className="font-semibold text-navy hover:text-accent">{p.name}</h3>
                  <p className="text-sm text-muted">
                    {[p.buildingType, p.location].filter(Boolean).join(" · ") || "No location"}
                  </p>
                </button>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Floor area</dt>
                    <dd className="font-medium tabular-nums">{num(p.floorArea)} m²</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">BOQ items</dt>
                    <dd className="font-medium tabular-nums">{p.boq.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">BOQ total</dt>
                    <dd className="font-medium tabular-nums">{peso(total)}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button size="sm" variant="primary" onClick={() => onOpen(p.id)}>
                    Open
                  </Button>
                  <Button size="sm" onClick={() => setEditing(p)}>
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </Button>
                  <Button size="sm" onClick={() => actions.duplicateProject(p.id)}>
                    <Copy className="size-3.5" aria-hidden /> Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => confirm(`Delete "${p.name}"? This cannot be undone.`) && actions.deleteProject(p.id)}
                  >
                    <Trash2 className="size-3.5" aria-hidden /> Delete
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {editing && (
        <Modal title={editing.name ? "Edit project" : "New project"} onClose={() => setEditing(null)}>
          <ProjectForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={(p) => {
              actions.saveProject(p)
              setEditing(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}
