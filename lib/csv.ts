function escape(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T & string; label: string; format?: (v: any, row: T) => unknown }[],
): string {
  const header = columns.map((c) => escape(c.label)).join(",")
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const raw = row[c.key]
          const out = c.format ? c.format(raw, row) : raw
          return escape(out)
        })
        .join(","),
    )
    .join("\n")
  return `﻿${header}\n${body}\n`
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
