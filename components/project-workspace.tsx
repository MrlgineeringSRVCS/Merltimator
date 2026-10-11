"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { actions } from "@/lib/store"
import type { Project, RateEntry } from "@/lib/types"
import { AdjustmentsEditor } from "./adjustments-editor"
import { BoqEditor } from "./boq-editor"
import { ProjectForm } from "./project-form"
import { QuickEstimatePanel } from "./quick-estimate"
import { Reports } from "./reports"
import { Button, Card } from "./ui"

const TABS = ["Details", "Quick estimate", "BOQ", "Adjustments", "Reports"] as const
type Tab = (typeof TABS)[number]

export function ProjectWorkspace({ project, rates, onBack }: { project: Project; rates: RateEntry[]; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("BOQ")
  const [saved, setSaved] = useState(false)
  const update = (fn: (p: Project) => Project) => actions.updateProject(project.id, fn)

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden /> Projects
          </Button>
          <h1 className="truncate text-xl font-semibold">{project.name}</h1>
        </div>
        <div role="tablist" aria-label="Project sections" className="flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-navy"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" aria-label={tab}>
        {tab === "Details" && (
          <Card>
            <ProjectForm
              key={project.updatedAt}
              initial={project}
              onSave={(p) => {
                actions.saveProject(p)
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
              }}
            />
            {saved && <p role="status" className="mt-2 text-sm text-ok">Saved.</p>}
          </Card>
        )}
        {tab === "Quick estimate" && <QuickEstimatePanel project={project} update={update} />}
        {tab === "BOQ" && <BoqEditor project={project} rates={rates} update={update} />}
        {tab === "Adjustments" && <AdjustmentsEditor project={project} update={update} />}
        {tab === "Reports" && <Reports project={project} rates={rates} />}
      </div>
    </div>
  )
}
