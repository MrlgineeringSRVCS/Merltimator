"use client"

import { useState } from "react"
import { Printer } from "lucide-react"
import { allocate, applyAdjustments, costPerSqm, boqDirectTotal, directUnitCost, groupBoq, isAllocationValid, lineTotal, num, peso, quickScenarios } from "@/lib/calc"
import type { Project, RateEntry } from "@/lib/types"
import { AdjustmentSummary } from "./adjustments-editor"
import { Button } from "./ui"

type Kind = "quick" | "boq" | "summary"
const TITLES: Record<Kind, string> = { quick: "Quick Floor-Area Estimate", boq: "Detailed Bill of Quantities", summary: "Cost Summary" }

export function Reports({ project, rates }: { project: Project; rates: RateEntry[] }) {
  const [kind, setKind] = useState<Kind>("boq")
  const sections = groupBoq(project.boq)
  const result = applyAdjustments(boqDirectTotal(project.boq, project), project.adjustments)
  const sources = Array.from(new Set(project.boq.map((i) => i.rateSource).filter(Boolean)))
  const usesSamples = sources.some((s) => s.includes("[SAMPLE]")) || rates.some((r) => r.sample && sources.some((s) => s.startsWith(r.name)))

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Report type">
          {(Object.keys(TITLES) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${kind === k ? "bg-navy text-white" : "border border-line bg-white text-navy"}`}
            >
              {TITLES[k]}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden /> Print / Save as PDF
        </Button>
      </div>

      <article className="print-area mx-auto w-full max-w-[210mm] rounded-lg border border-line bg-white p-6 text-sm md:p-10">
        <header className="mb-5 border-b-2 border-navy pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Merltimator — Construction Cost Estimator</p>
          <h1 className="mt-1 text-2xl font-bold">{TITLES[kind]}</h1>
          <p className="text-xs text-muted">Generated {new Date().toLocaleDateString("en-PH")}</p>
        </header>

        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-3">
          {[
            ["Project", project.name],
            ["Client", project.client || "—"],
            ["Location", project.location || "—"],
            ["Building type", project.buildingType],
            ["Floor area", `${num(project.floorArea)} m²`],
            ["Floors", String(project.floors)],
            ["Date", project.date || "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        {kind === "quick" && <QuickReport project={project} />}
        {kind === "boq" && (
          <>
            {sections.length === 0 && <p className="text-muted">No BOQ items.</p>}
            {sections.map((s) => (
              <div key={s.code} className="mb-4">
                <h2 className="mb-1 bg-navy px-2 py-1 text-xs font-semibold text-white">
                  {s.code}. {s.name}
                </h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line text-left text-muted">
                      <th className="py-1 pr-1">No.</th>
                      <th className="py-1 pr-1">Description</th>
                      <th className="py-1 pr-1 text-right">Qty</th>
                      <th className="py-1 pr-1">Unit</th>
                      <th className="py-1 pr-1 text-right">Mat.</th>
                      <th className="py-1 pr-1 text-right">Lab.</th>
                      <th className="py-1 pr-1 text-right">Equip.</th>
                      <th className="py-1 pr-1 text-right">Other</th>
                      <th className="py-1 pr-1 text-right">Unit cost</th>
                      <th className="py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.items.map((i) => (
                      <tr key={i.id} className="border-b border-line/50 tabular-nums">
                        <td className="py-1 pr-1">{i.itemNo}</td>
                        <td className="py-1 pr-1">{i.description || "—"}</td>
                        <td className="py-1 pr-1 text-right">{num(i.quantity)}</td>
                        <td className="py-1 pr-1">{i.unit}</td>
                        <td className="py-1 pr-1 text-right">{num(i.material)}</td>
                        <td className="py-1 pr-1 text-right">{num(i.labor)}</td>
                        <td className="py-1 pr-1 text-right">{num(i.equipment)}</td>
                        <td className="py-1 pr-1 text-right">{num(i.other)}</td>
                        <td className="py-1 pr-1 text-right">{num(directUnitCost(i))}</td>
                        <td className="py-1 text-right">{peso(lineTotal(i))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan={9} className="py-1 text-right">Subtotal {s.code}</td>
                      <td className="py-1 text-right tabular-nums">{peso(s.subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
            <h2 className="mb-1 mt-4 font-semibold">Cost adjustments</h2>
            <AdjustmentSummary result={result} />
          </>
        )}
        {kind === "summary" && (
          <>
            <table className="mb-4 w-full text-sm">
              <tbody>
                {sections.map((s) => (
                  <tr key={s.code} className="border-b border-line/60">
                    <td className="py-1">{s.code}. {s.name}</td>
                    <td className="py-1 text-right tabular-nums">{peso(s.subtotal)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1.5">Direct cost subtotal</td>
                  <td className="py-1.5 text-right tabular-nums">{peso(result.directCost)}</td>
                </tr>
              </tbody>
            </table>
            <AdjustmentSummary result={result} />
            <p className="mt-2 text-right text-xs text-muted">
              Equivalent rate: {peso(costPerSqm(result.grandTotal, project.floorArea, project.floors))} per m²
            </p>
          </>
        )}

        <div className="mt-6 grid gap-3 text-xs md:grid-cols-2">
          <Block title="Assumptions" text={project.assumptions} />
          <Block title="Notes" text={project.notes} />
          {kind === "quick" && <Block title="Inclusions" text={project.quick.inclusions} />}
          {kind === "quick" && <Block title="Exclusions" text={project.quick.exclusions} />}
          {kind !== "quick" && <Block title="Rate sources" text={sources.join("\n")} />}
        </div>

        <footer className="mt-6 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
          <strong>Disclaimer:</strong> This is a preliminary estimate prepared from user-entered quantities and rates. It
          is not a contractor&apos;s quotation or a guaranteed price. Actual costs vary with location, market conditions,
          design changes, site conditions and time. Verify all rates with current supplier quotations and consult a
          licensed engineer or quantity surveyor before making financial decisions.
          {usesSamples && " Some rates used are SAMPLE values — NOT market quotations."}
        </footer>
      </article>
    </div>
  )
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="whitespace-pre-line text-muted">{text || "None stated."}</p>
    </div>
  )
}

function QuickReport({ project }: { project: Project }) {
  const scenarios = quickScenarios(project.floorArea, project.quick, project.floors)
  const valid = isAllocationValid(project.quick.allocation)
  const alloc = allocate(scenarios[1].total, project.quick.allocation)
  return (
    <>
      <p className="mb-2 text-xs text-muted">Formula: Floor area × Cost per m². Not combined with the detailed BOQ.</p>
      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-1">Scenario</th>
            <th className="py-1 text-right">Rate / m²</th>
            <th className="py-1 text-right">Estimated cost</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr key={s.key} className={`border-b border-line/60 tabular-nums ${s.key === "expected" ? "font-semibold" : ""}`}>
              <td className="py-1">{s.label}</td>
              <td className="py-1 text-right">{peso(s.rate)}</td>
              <td className="py-1 text-right">{peso(s.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mb-1 font-semibold">Allocation by category (Expected)</h2>
      {!valid ? (
        <p className="text-danger">Allocation does not total 100% — fix it in the Quick estimate tab.</p>
      ) : (
        <table className="w-full text-xs">
          <tbody>
            {alloc.filter((a) => a.pct > 0).map((a) => (
              <tr key={a.code} className="border-b border-line/50 tabular-nums">
                <td className="py-1">{a.code}. {a.name}</td>
                <td className="py-1 text-right">{num(a.pct)}%</td>
                <td className="py-1 text-right">{peso(a.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
