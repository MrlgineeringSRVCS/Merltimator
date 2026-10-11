import { CATEGORIES, DEFAULT_ALLOCATION, type AppData, type Project, type RateEntry } from "./types"

export function parseNonNegative(input: string): { ok: true; value: number } | { ok: false; error: string } {
  const t = input.trim()
  if (t === "") return { ok: false, error: "Required" }
  const n = Number(t)
  if (!Number.isFinite(n)) return { ok: false, error: "Enter a valid number" }
  if (n < 0) return { ok: false, error: "Must be 0 or greater" }
  return { ok: true, value: n }
}

export function validateProjectFields(p: Pick<Project, "name" | "floorArea" | "floors">) {
  const errors: Record<string, string> = {}
  if (!p.name.trim()) errors.name = "Project name is required"
  if (!Number.isFinite(p.floorArea) || p.floorArea <= 0) errors.floorArea = "Floor area must be greater than 0"
  if (!Number.isInteger(p.floors) || p.floors < 1) errors.floors = "Floors must be a whole number of at least 1"
  return errors
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d)
const nn = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d)
const codes = new Set<string>(CATEGORIES.map((c) => c.code))

function cleanProject(raw: unknown, i: number): Project {
  if (!isObj(raw)) throw new Error(`Project #${i + 1} is not an object`)
  if (typeof raw.id !== "string" || typeof raw.name !== "string" || !raw.name.trim())
    throw new Error(`Project #${i + 1} is missing an id or name`)
  const q = isObj(raw.quick) ? raw.quick : {}
  const alloc = isObj(q.allocation) ? q.allocation : {}
  const allocation = { ...DEFAULT_ALLOCATION }
  for (const c of CATEGORIES) if (c.code in alloc) allocation[c.code] = nn(alloc[c.code])
  const boq = Array.isArray(raw.boq) ? raw.boq : []
  const adjs = Array.isArray(raw.adjustments) ? raw.adjustments : []
  return {
    id: raw.id,
    name: raw.name,
    location: str(raw.location),
    buildingType: str(raw.buildingType),
    floorArea: nn(raw.floorArea, 1) || 1,
    floors: Math.max(1, Math.round(nn(raw.floors, 1))),
    client: str(raw.client),
    date: str(raw.date),
    notes: str(raw.notes),
    assumptions: str(raw.assumptions),
    quick: {
      low: nn(q.low),
      expected: nn(q.expected),
      high: nn(q.high),
      allocation,
      inclusions: str(q.inclusions),
      exclusions: str(q.exclusions),
    },
    boq: boq.map((b, j) => {
      if (!isObj(b) || typeof b.id !== "string") throw new Error(`BOQ item #${j + 1} in "${raw.name}" is invalid`)
      return {
        id: b.id,
        category: (codes.has(str(b.category)) ? b.category : "Q") as Project["boq"][number]["category"],
        itemNo: str(b.itemNo),
        description: str(b.description),
        unit: str(b.unit),
        quantity: nn(b.quantity),
        material: nn(b.material),
        labor: nn(b.labor),
        equipment: nn(b.equipment),
        other: nn(b.other),
        rateSource: str(b.rateSource),
      }
    }),
    adjustments: adjs.filter(isObj).map((a, j) => ({
      id: str(a.id, `adj-${j}`),
      label: str(a.label, "Adjustment"),
      type: a.type === "fixed" ? "fixed" : "percent",
      value: nn(a.value),
      base: a.base === "running" ? "running" : "direct",
      effect: a.effect === "deduct" ? "deduct" : "add",
      enabled: a.enabled !== false,
    })),
    createdAt: str(raw.createdAt, new Date().toISOString()),
    updatedAt: str(raw.updatedAt, new Date().toISOString()),
  }
}

function cleanRate(raw: unknown, i: number): RateEntry {
  if (!isObj(raw) || typeof raw.id !== "string" || typeof raw.name !== "string")
    throw new Error(`Rate #${i + 1} is invalid`)
  const types = ["material", "labor", "equipment", "other"]
  return {
    id: raw.id,
    type: (types.includes(str(raw.type)) ? raw.type : "material") as RateEntry["type"],
    name: raw.name,
    unit: str(raw.unit),
    rate: nn(raw.rate),
    source: str(raw.source),
    location: str(raw.location),
    date: str(raw.date),
    notes: str(raw.notes),
    sample: raw.sample === true,
  }
}

export function validateBackup(json: string): { ok: true; data: AppData } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: "File is not valid JSON." }
  }
  if (!isObj(parsed) || parsed.app !== "merltimator") return { ok: false, error: "This is not a Merltimator backup file." }
  if (!Array.isArray(parsed.projects)) return { ok: false, error: "Backup has no projects list." }
  try {
    return {
      ok: true,
      data: {
        version: 1,
        projects: parsed.projects.map(cleanProject),
        rates: Array.isArray(parsed.rates) ? parsed.rates.map(cleanRate) : [],
      },
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export function serializeBackup(data: AppData) {
  return JSON.stringify({ app: "merltimator", exportedAt: new Date().toISOString(), ...data }, null, 2)
}
