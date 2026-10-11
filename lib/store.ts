"use client"

import { useSyncExternalStore } from "react"
import { DEFAULT_ALLOCATION, type Adjustment, type AppData, type Project, type RateEntry } from "./types"

const KEY = "merltimator:v1"
const EMPTY: AppData = { version: 1, projects: [], rates: [] }
let cache: AppData | null = null
const listeners = new Set<() => void>()

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)

const SAMPLE_RATES: Omit<RateEntry, "id">[] = [
  { type: "material", name: "Portland cement, 40kg bag", unit: "bag", rate: 260, source: "Illustrative sample", location: "—", date: "", notes: "", sample: true },
  { type: "material", name: "Deformed bar 10mm x 6m", unit: "pc", rate: 200, source: "Illustrative sample", location: "—", date: "", notes: "", sample: true },
  { type: "material", name: "CHB 4in", unit: "pc", rate: 16, source: "Illustrative sample", location: "—", date: "", notes: "", sample: true },
  { type: "labor", name: "Skilled labor (mason/carpenter)", unit: "day", rate: 800, source: "Illustrative sample", location: "—", date: "", notes: "", sample: true },
  { type: "equipment", name: "Concrete mixer rental", unit: "day", rate: 1500, source: "Illustrative sample", location: "—", date: "", notes: "", sample: true },
]

export function defaultAdjustments(): Adjustment[] {
  return [
    { id: uid(), label: "Overhead", type: "percent", value: 0, base: "direct", effect: "add", enabled: true },
    { id: uid(), label: "Contractor's profit", type: "percent", value: 0, base: "direct", effect: "add", enabled: true },
    { id: uid(), label: "Contingency", type: "percent", value: 0, base: "direct", effect: "add", enabled: true },
    { id: uid(), label: "Other costs", type: "fixed", value: 0, base: "direct", effect: "add", enabled: true },
    { id: uid(), label: "Tax (enter applicable rate)", type: "percent", value: 0, base: "running", effect: "add", enabled: true },
    { id: uid(), label: "Credits / deductions", type: "fixed", value: 0, base: "direct", effect: "deduct", enabled: true },
  ]
}

export function newProject(): Project {
  const now = new Date().toISOString()
  return {
    id: uid(),
    name: "",
    location: "",
    buildingType: "Residential",
    floorArea: 100,
    floors: 1,
    client: "",
    date: now.slice(0, 10),
    notes: "",
    assumptions: "",
    quick: { low: 0, expected: 0, high: 0, allocation: { ...DEFAULT_ALLOCATION }, inclusions: "", exclusions: "" },
    boq: [],
    adjustments: defaultAdjustments(),
    createdAt: now,
    updatedAt: now,
  }
}

function load(): AppData {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      cache = JSON.parse(raw) as AppData
      return cache
    }
  } catch {
    /* fall through to seed */
  }
  cache = { version: 1, projects: [], rates: SAMPLE_RATES.map((r) => ({ ...r, id: uid() })) }
  persist(cache)
  return cache
}

function persist(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    alert("Could not save to browser storage. It may be full or disabled.")
  }
}

function set(updater: (d: AppData) => AppData) {
  cache = updater(load())
  persist(cache)
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null
      l()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener("storage", onStorage)
  }
}

export function useAppData() {
  return useSyncExternalStore(subscribe, load, () => EMPTY)
}

export const actions = {
  saveProject(p: Project) {
    const stamped = { ...p, updatedAt: new Date().toISOString() }
    set((d) => ({
      ...d,
      projects: d.projects.some((x) => x.id === p.id)
        ? d.projects.map((x) => (x.id === p.id ? stamped : x))
        : [stamped, ...d.projects],
    }))
  },
  updateProject(id: string, fn: (p: Project) => Project) {
    set((d) => ({
      ...d,
      projects: d.projects.map((x) => (x.id === id ? { ...fn(x), updatedAt: new Date().toISOString() } : x)),
    }))
  },
  deleteProject(id: string) {
    set((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== id) }))
  },
  duplicateProject(id: string) {
    set((d) => {
      const src = d.projects.find((x) => x.id === id)
      if (!src) return d
      const now = new Date().toISOString()
      const copy: Project = structuredClone(src)
      copy.id = uid()
      copy.name = `${src.name} (copy)`
      copy.boq = copy.boq.map((b) => ({ ...b, id: uid() }))
      copy.adjustments = copy.adjustments.map((a) => ({ ...a, id: uid() }))
      copy.createdAt = now
      copy.updatedAt = now
      return { ...d, projects: [copy, ...d.projects] }
    })
  },
  saveRate(r: RateEntry) {
    set((d) => ({
      ...d,
      rates: d.rates.some((x) => x.id === r.id) ? d.rates.map((x) => (x.id === r.id ? r : x)) : [r, ...d.rates],
    }))
  },
  deleteRate(id: string) {
    set((d) => ({ ...d, rates: d.rates.filter((x) => x.id !== id) }))
  },
  importData(data: AppData, mode: "merge" | "replace") {
    set((d) => {
      if (mode === "replace") return data
      const pIds = new Set(data.projects.map((p) => p.id))
      const rIds = new Set(data.rates.map((r) => r.id))
      return {
        version: 1,
        projects: [...data.projects, ...d.projects.filter((p) => !pIds.has(p.id))],
        rates: [...data.rates, ...d.rates.filter((r) => !rIds.has(r.id))],
      }
    })
  },
  getAll: () => load(),
}
