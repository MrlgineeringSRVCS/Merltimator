"use client"

import { useId, useState } from "react"
import { Check, RotateCcw } from "lucide-react"
import { FUNCTIONS } from "@/lib/formula"
import { FORMULA_DEFS, sampleScope, validateFormula, type FormulaDef, type FormulaKey, type FormulaMap } from "@/lib/formulas"
import { actions } from "@/lib/store"
import { num } from "@/lib/calc"
import { Button, Card, SectionTitle } from "./ui"

const GROUPS = ["BOQ", "Quick estimate", "Adjustments", "Results"] as const

export function FormulaEditor({ saved }: { saved: FormulaMap | undefined }) {
  const initial = () =>
    Object.fromEntries(FORMULA_DEFS.map((d) => [d.key, saved?.[d.key] ?? d.defaultExpr])) as Record<FormulaKey, string>
  const [draft, setDraft] = useState<Record<FormulaKey, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const results = Object.fromEntries(FORMULA_DEFS.map((d) => [d.key, validateFormula(d.key, draft[d.key])])) as Record<
    FormulaKey,
    ReturnType<typeof validateFormula>
  >
  const errorCount = Object.values(results).filter((r) => !r.ok).length
  const dirty = FORMULA_DEFS.some((d) => draft[d.key].trim() !== (saved?.[d.key] ?? d.defaultExpr))

  const save = () => {
    const map: FormulaMap = {}
    for (const d of FORMULA_DEFS) {
      const v = draft[d.key].trim()
      if (v !== d.defaultExpr) map[d.key] = v
    }
    actions.saveFormulas(map)
    setSavedAt(new Date().toLocaleTimeString())
  }

  const resetAll = () => {
    if (!confirm("Reset every formula to its default? Click Save to apply.")) return
    setDraft(Object.fromEntries(FORMULA_DEFS.map((d) => [d.key, d.defaultExpr])) as Record<FormulaKey, string>)
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        title="Calculation formulas"
        desc="Every estimate and result in Merltimator is computed from these formulas. Edit any of them, check the live test result, then save. Changes apply to all projects and reports."
        actions={
          <>
            <Button onClick={resetAll}>
              <RotateCcw className="size-4" aria-hidden /> Reset all to default
            </Button>
            <Button variant="primary" onClick={save} disabled={errorCount > 0 || !dirty}>
              <Check className="size-4" aria-hidden /> Save formulas
            </Button>
          </>
        }
      />

      <div aria-live="polite" className="text-sm">
        {errorCount > 0 ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-danger">
            {errorCount} formula{errorCount > 1 ? "s have" : " has"} an error. Fix before saving.
          </p>
        ) : dirty ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">You have unsaved changes.</p>
        ) : savedAt ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-ok">Formulas saved at {savedAt}.</p>
        ) : null}
      </div>

      <Card>
        <h3 className="mb-2 text-sm font-semibold">Formula syntax</h3>
        <p className="mb-2 text-sm text-muted">
          Operators: <code>+ - * / ^ ( )</code> and comparisons <code>{"< > <= >= == !="}</code> (true = 1, false = 0).
          Division by zero returns 0. If a saved formula ever fails, the default is used so totals never break.
        </p>
        <ul className="flex flex-wrap gap-2 text-xs">
          {Object.entries(FUNCTIONS).map(([k, f]) => (
            <li key={k} className="rounded bg-accent-soft px-2 py-1 font-mono text-navy">
              {f.desc}
            </li>
          ))}
        </ul>
      </Card>

      {GROUPS.map((g) => (
        <section key={g} aria-labelledby={`grp-${g}`} className="flex flex-col gap-3">
          <h3 id={`grp-${g}`} className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted">
            {g}
          </h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {FORMULA_DEFS.filter((d) => d.group === g).map((d) => (
              <FormulaRow
                key={d.key}
                def={d}
                value={draft[d.key]}
                result={results[d.key]}
                onChange={(v) => setDraft((s) => ({ ...s, [d.key]: v }))}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function FormulaRow({
  def,
  value,
  result,
  onChange,
}: {
  def: FormulaDef
  value: string
  result: ReturnType<typeof validateFormula>
  onChange: (v: string) => void
}) {
  const id = useId()
  const changed = value.trim() !== def.defaultExpr
  const scope = sampleScope(def)
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <label htmlFor={id} className="font-semibold text-navy">
            {def.label}
          </label>
          <p className="text-xs text-muted">{def.desc}</p>
        </div>
        {changed && (
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
            Custom
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm font-medium text-muted">{def.result} =</span>
      </div>
      <textarea
        id={id}
        value={value}
        spellCheck={false}
        rows={2}
        aria-invalid={!result.ok}
        aria-describedby={`${id}-res`}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border bg-white px-2.5 py-2 font-mono text-sm text-navy outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          result.ok ? "border-line" : "border-danger bg-red-50"
        }`}
      />

      <div className="flex flex-wrap gap-1.5" aria-label="Insert variable">
        {def.vars.map((v) => (
          <button
            key={v.name}
            type="button"
            title={`${v.desc} (test value ${num(v.sample)})`}
            onClick={() => onChange(`${value}${value && !/\s$/.test(value) ? " " : ""}${v.name}`)}
            className="rounded border border-line px-1.5 py-0.5 font-mono text-xs text-navy hover:bg-accent-soft"
          >
            {v.name}
          </button>
        ))}
      </div>

      <details className="text-xs text-muted">
        <summary className="cursor-pointer select-none">Variables and test values</summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1">
          {def.vars.map((v) => (
            <div key={v.name} className="contents">
              <dt className="font-mono text-navy">{v.name}</dt>
              <dd>{v.desc}</dd>
              <dd className="text-right tabular-nums">{num(scope[v.name])}</dd>
            </div>
          ))}
        </dl>
      </details>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
        <p id={`${id}-res`} className={`text-xs ${result.ok ? "text-ok" : "text-danger"}`} role={result.ok ? undefined : "alert"}>
          {result.ok ? `Test result: ${num(result.value)}` : `Error: ${result.error}`}
        </p>
        <Button size="sm" variant="ghost" disabled={!changed} onClick={() => onChange(def.defaultExpr)}>
          <RotateCcw className="size-3.5" aria-hidden /> Default
        </Button>
      </div>
      <p className="text-[11px] text-muted">
        Default: <code className="font-mono">{def.defaultExpr}</code>
      </p>
    </Card>
  )
}
