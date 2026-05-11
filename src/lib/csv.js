// Simple CSV export — handles quoting and special chars
function escapeCsv(val) {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function rowsToCsv(headers, rows) {
  const head = headers.join(',')
  const body = rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(',')).join('\n')
  return `${head}\n${body}`
}

export function downloadCsv(filename, headers, rows) {
  const csv = rowsToCsv(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportAll({ income, expenses, savings }) {
  const ts = new Date().toISOString().slice(0, 10)
  const all = [
    ...income.map((r) => ({
      type: 'INCOME',
      date: r.date,
      label: r.label,
      category: r.type,
      amount: Number(r.amount),
    })),
    ...expenses.map((r) => ({
      type: 'EXPENSE',
      date: r.date,
      label: r.label,
      category: r.category,
      amount: -Number(r.amount),
    })),
    ...savings.map((r) => ({
      type: 'SAVINGS',
      date: r.date,
      label: r.note || 'Transfer',
      category: '',
      amount: -Number(r.amount),
    })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  downloadCsv(`magi-money-${ts}.csv`, ['type', 'date', 'label', 'category', 'amount'], all)
}
