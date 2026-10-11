/**
 * Safe arithmetic expression evaluator. Never uses eval/Function: input is tokenized and parsed
 * by a small recursive-descent parser that only understands numbers, known variables,
 * + - * / ^ %, parentheses, comparisons and a whitelist of math functions.
 */

type Token =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "(" }
  | { t: ")" }
  | { t: "," }

type Node =
  | { k: "num"; v: number }
  | { k: "var"; name: string }
  | { k: "un"; op: string; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "call"; fn: string; args: Node[] }

export const FUNCTIONS: Record<string, { arity: [number, number]; desc: string; fn: (...a: number[]) => number }> = {
  min: { arity: [1, 20], desc: "min(a, b, …) smallest value", fn: (...a) => Math.min(...a) },
  max: { arity: [1, 20], desc: "max(a, b, …) largest value", fn: (...a) => Math.max(...a) },
  round: {
    arity: [1, 2],
    desc: "round(x, d) round to d decimals",
    fn: (x, d = 0) => {
      const f = 10 ** Math.max(0, Math.min(10, Math.trunc(d)))
      return Math.round((x + Number.EPSILON) * f) / f
    },
  },
  ceil: { arity: [1, 1], desc: "ceil(x) round up", fn: Math.ceil },
  floor: { arity: [1, 1], desc: "floor(x) round down", fn: Math.floor },
  abs: { arity: [1, 1], desc: "abs(x) absolute value", fn: Math.abs },
  sqrt: { arity: [1, 1], desc: "sqrt(x) square root", fn: Math.sqrt },
  if: { arity: [3, 3], desc: "if(cond, a, b) a when cond ≠ 0, else b", fn: (c, a, b) => (c !== 0 ? a : b) },
}

const OPS2 = ["<=", ">=", "==", "!="]
const OPS1 = "+-*/^%<>"

function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
    } else if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i))
      if (!m) throw new Error(`Invalid number at position ${i + 1}`)
      out.push({ t: "num", v: Number(m[0]) })
      i += m[0].length
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!
      out.push({ t: "id", v: m[0] })
      i += m[0].length
    } else if (OPS2.includes(src.slice(i, i + 2))) {
      out.push({ t: "op", v: src.slice(i, i + 2) })
      i += 2
    } else if (OPS1.includes(c)) {
      out.push({ t: "op", v: c })
      i++
    } else if (c === "(" || c === ")" || c === ",") {
      out.push({ t: c })
      i++
    } else {
      throw new Error(`Unexpected character "${c}" at position ${i + 1}`)
    }
  }
  return out
}

function parse(tokens: Token[]): Node {
  let p = 0
  const peek = () => tokens[p]
  const isOp = (...ops: string[]) => {
    const t = peek()
    return t?.t === "op" && ops.includes(t.v)
  }
  const bin = (next: () => Node, ops: string[]) => () => {
    let a = next()
    while (isOp(...ops)) {
      const op = (tokens[p++] as { v: string }).v
      a = { k: "bin", op, a, b: next() }
    }
    return a
  }
  const primary = (): Node => {
    const t = tokens[p++]
    if (!t) throw new Error("Formula ends unexpectedly")
    if (t.t === "num") return { k: "num", v: t.v }
    if (t.t === "(") {
      const e = comparison()
      if (tokens[p++]?.t !== ")") throw new Error('Missing closing ")"')
      return e
    }
    if (t.t === "id") {
      if (peek()?.t === "(") {
        p++
        const args: Node[] = []
        if (peek()?.t !== ")") {
          args.push(comparison())
          while (peek()?.t === ",") {
            p++
            args.push(comparison())
          }
        }
        if (tokens[p++]?.t !== ")") throw new Error(`Missing ")" after ${t.v}(…)`)
        return { k: "call", fn: t.v, args }
      }
      return { k: "var", name: t.v }
    }
    throw new Error(`Unexpected "${t.t === "op" ? t.v : t.t}"`)
  }
  const power = (): Node => {
    const a = unary()
    if (isOp("^")) {
      p++
      return { k: "bin", op: "^", a, b: power() }
    }
    return a
  }
  function unary(): Node {
    if (isOp("-", "+")) {
      const op = (tokens[p++] as { v: string }).v
      return { k: "un", op, a: unary() }
    }
    return primary()
  }
  const term = bin(power, ["*", "/", "%"])
  const sum = bin(term, ["+", "-"])
  const comparison = bin(sum, ["<", ">", "<=", ">=", "==", "!="])
  const root = comparison()
  if (p < tokens.length) throw new Error("Unexpected extra input after formula")
  return root
}

function check(n: Node, vars: Set<string>) {
  if (n.k === "var" && !vars.has(n.name)) throw new Error(`Unknown variable "${n.name}"`)
  if (n.k === "un") check(n.a, vars)
  if (n.k === "bin") {
    check(n.a, vars)
    check(n.b, vars)
  }
  if (n.k === "call") {
    const f = FUNCTIONS[n.fn]
    if (!f) throw new Error(`Unknown function "${n.fn}"`)
    if (n.args.length < f.arity[0] || n.args.length > f.arity[1])
      throw new Error(`${n.fn}() takes ${f.arity[0] === f.arity[1] ? f.arity[0] : `${f.arity[0]}–${f.arity[1]}`} argument(s)`)
    n.args.forEach((a) => check(a, vars))
  }
}

function run(n: Node, scope: Record<string, number>): number {
  switch (n.k) {
    case "num":
      return n.v
    case "var":
      return scope[n.name] ?? 0
    case "un":
      return n.op === "-" ? -run(n.a, scope) : run(n.a, scope)
    case "call":
      return FUNCTIONS[n.fn].fn(...n.args.map((a) => run(a, scope)))
    case "bin": {
      const a = run(n.a, scope)
      const b = run(n.b, scope)
      switch (n.op) {
        case "+": return a + b
        case "-": return a - b
        case "*": return a * b
        case "/": return b === 0 ? 0 : a / b
        case "%": return b === 0 ? 0 : a % b
        case "^": return a ** b
        case "<": return a < b ? 1 : 0
        case ">": return a > b ? 1 : 0
        case "<=": return a <= b ? 1 : 0
        case ">=": return a >= b ? 1 : 0
        case "==": return a === b ? 1 : 0
        case "!=": return a !== b ? 1 : 0
      }
    }
  }
  return 0
}

const compiled = new Map<string, Node>()

/** Parses and validates a formula against allowed variable names. Throws a readable error. */
export function compile(expr: string, allowed: string[]): Node {
  const key = `${allowed.join(",")}|${expr}`
  const hit = compiled.get(key)
  if (hit) return hit
  if (!expr.trim()) throw new Error("Formula is empty")
  if (expr.length > 500) throw new Error("Formula is too long (max 500 characters)")
  const node = parse(tokenize(expr))
  check(node, new Set(allowed))
  compiled.set(key, node)
  return node
}

export function evaluate(expr: string, scope: Record<string, number>): number {
  const v = run(compile(expr, Object.keys(scope)), scope)
  if (!Number.isFinite(v)) throw new Error("Result is not a finite number")
  return v
}

export function tryValidate(expr: string, scope: Record<string, number>): { ok: true; value: number } | { ok: false; error: string } {
  try {
    return { ok: true, value: evaluate(expr, scope) }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
