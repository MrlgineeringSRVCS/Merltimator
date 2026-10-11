"use client"

import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react"
import { parseNonNegative } from "@/lib/validation"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-blue-700",
  secondary: "bg-white text-navy border border-line hover:bg-accent-soft",
  ghost: "text-navy hover:bg-accent-soft",
  danger: "bg-white text-danger border border-red-200 hover:bg-red-50",
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm"
      } ${variants[variant]} ${className}`}
    />
  )
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-white p-4 md:p-5 ${className}`}>{children}</section>
}

export function SectionTitle({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-navy text-balance">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-muted text-pretty">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const inputCls =
  "w-full rounded-md border bg-white px-2.5 py-1.5 text-sm text-navy outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: (id: string, cls: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children(id, `${inputCls} ${error ? "border-danger" : "border-line"}`)}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  error,
  multiline,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  multiline?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <Field label={label} error={error}>
      {(id, cls) =>
        multiline ? (
          <textarea id={id} className={`${cls} min-h-20`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} type={type} className={cls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </Field>
  )
}

/** Numeric input that only commits valid, non-negative values; invalid text shows an inline error. */
export function NumInput({
  value,
  onChange,
  label,
  srOnlyLabel,
  className = "",
  step = "any",
}: {
  value: number
  onChange: (v: number) => void
  label: string
  srOnlyLabel?: boolean
  className?: string
  step?: string
}) {
  const id = useId()
  const [text, setText] = useState(String(value))
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(String(value))
  }
  const parsed = parseNonNegative(text)
  const error = parsed.ok ? undefined : parsed.error
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={srOnlyLabel ? "sr-only" : "text-xs font-medium text-muted"}>
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        type="number"
        min={0}
        step={step}
        value={text}
        aria-invalid={!!error}
        title={error}
        onChange={(e) => {
          setText(e.target.value)
          const p = parseNonNegative(e.target.value)
          if (p.ok) {
            setLastValue(p.value)
            onChange(p.value)
          }
        }}
        className={`${inputCls} text-right tabular-nums ${error ? "border-danger bg-red-50" : "border-line"}`}
      />
      {error && !srOnlyLabel && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function SampleBadge() {
  return (
    <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
      Sample — not a market quotation
    </span>
  )
}

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line bg-white px-6 py-10 text-center">
      <p className="font-medium text-navy">{title}</p>
      <p className="max-w-md text-sm text-muted text-pretty">{desc}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 md:items-center md:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 md:max-w-2xl md:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
