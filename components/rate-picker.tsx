"use client"

import { useState } from "react"
import { peso } from "@/lib/calc"
import type { RateEntry } from "@/lib/types"
import { Button, EmptyState, Modal, SampleBadge } from "./ui"

export function filterRates(rates: RateEntry[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return rates
  return rates.filter((r) => [r.name, r.unit, r.source, r.location, r.type, r.notes].join(" ").toLowerCase().includes(q))
}

export function RatePicker({ rates, onPick, onClose }: { rates: RateEntry[]; onPick: (r: RateEntry) => void; onClose: () => void }) {
  const [q, setQ] = useState("")
  const list = filterRates(rates, q)
  return (
    <Modal title="Copy rate from library" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">
        The rate value is copied into the matching column (material, labor, equipment or other) of this line. Later
        library edits will not change it.
      </p>
      <label htmlFor="rate-search" className="sr-only">
        Search rates
      </label>
      <input
        id="rate-search"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search rates..."
        className="mb-3 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {list.length === 0 ? (
        <EmptyState title="No rates found" desc="Add rates in the Rate Library tab first." />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {list.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs capitalize text-muted">
                  {r.type} · {peso(r.rate)} / {r.unit || "unit"}
                </p>
                {r.sample && <SampleBadge />}
              </div>
              <Button size="sm" variant="primary" onClick={() => onPick(r)}>
                Use
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
