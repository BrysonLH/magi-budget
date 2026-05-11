export const theme = {
  AMBER: '#ff8c00',
  AMBER_DIM: '#7a4500',
  BG: '#0a0805',
  PANEL: '#120d06',
  BORDER: '#3a2509',
  TEXT: '#fdba74',
  MUTED: '#6b4a1f',
  GREEN: '#86efac',
  RED: '#fb7185',
  YELLOW: '#fbbf24',
}

// Default categories seeded on first sign-in
export const DEFAULT_CATEGORIES = [
  { name: 'Housing', color: '#7dd3fc' },
  { name: 'Food', color: '#fbbf24' },
  { name: 'Transport', color: '#a78bfa' },
  { name: 'Subscriptions', color: '#f472b6' },
  { name: 'Entertainment', color: '#fb7185' },
  { name: 'Clothes', color: '#fdba74' },
  { name: 'Health', color: '#86efac' },
  { name: 'Other', color: '#94a3b8' },
]

export const PALETTE = [
  '#7dd3fc', '#fbbf24', '#a78bfa', '#f472b6', '#fb7185',
  '#fdba74', '#86efac', '#94a3b8', '#ff8c00', '#34d399',
  '#60a5fa', '#facc15', '#c084fc', '#f9a8d4', '#fca5a5',
]

export const INCOME_TYPES = ['Internship', 'Stipend', 'Side Hustle', 'Transfer', 'Other']

export const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0)

export const today = () => new Date().toISOString().split('T')[0]

// Get current month YYYY-MM
export const currentMonth = () => new Date().toISOString().slice(0, 7)
