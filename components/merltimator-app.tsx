"use client"

import { useState } from "react"
import { Calculator, FolderOpen, Library, Sigma } from "lucide-react"
import { useAppData } from "@/lib/store"
import { Dashboard } from "./dashboard"
import { FormulaEditor } from "./formula-editor"
import { ProjectWorkspace } from "./project-workspace"
import { RateLibrary } from "./rate-library"

type View = { name: "dashboard" } | { name: "rates" } | { name: "formulas" } | { name: "project"; id: string }

export function MerltimatorApp() {
  const data = useAppData()
  const [view, setView] = useState<View>({ name: "dashboard" })
  const project = view.name === "project" ? data.projects.find((p) => p.id === view.id) : undefined

  const navBtn = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
      active ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10"
    }`

  return (
    <div className="min-h-dvh">
      <header className="no-print bg-navy text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <button type="button" onClick={() => setView({ name: "dashboard" })} className="flex items-center gap-2.5 text-left">
            <span className="flex size-9 items-center justify-center rounded-md bg-accent">
              <Calculator className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold leading-tight">Merltimator</span>
              <span className="block text-xs text-blue-200">Plan smarter. Estimate accurately. Build confidently.</span>
            </span>
          </button>
          <nav aria-label="Main" className="flex gap-1">
            <button
              type="button"
              className={navBtn(view.name === "dashboard" || view.name === "project")}
              aria-current={view.name === "dashboard" || view.name === "project" ? "page" : undefined}
              onClick={() => setView({ name: "dashboard" })}
            >
              <FolderOpen className="size-4" aria-hidden /> Projects
            </button>
            <button
              type="button"
              className={navBtn(view.name === "rates")}
              aria-current={view.name === "rates" ? "page" : undefined}
              onClick={() => setView({ name: "rates" })}
            >
              <Library className="size-4" aria-hidden /> Rate Library
            </button>
            <button
              type="button"
              className={navBtn(view.name === "formulas")}
              aria-current={view.name === "formulas" ? "page" : undefined}
              onClick={() => setView({ name: "formulas" })}
            >
              <Sigma className="size-4" aria-hidden /> Formulas
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {view.name === "rates" && <RateLibrary rates={data.rates} />}
        {view.name === "formulas" && <FormulaEditor saved={data.formulas} />}
        {view.name === "dashboard" && (
          <Dashboard data={data} onOpen={(id) => setView({ name: "project", id })} />
        )}
        {view.name === "project" &&
          (project ? (
            <ProjectWorkspace project={project} rates={data.rates} onBack={() => setView({ name: "dashboard" })} />
          ) : (
            <p className="text-muted">Project not found.</p>
          ))}
      </main>
    </div>
  )
}
