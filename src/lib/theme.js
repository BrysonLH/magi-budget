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

export const CAT_COLOR = {
  Housing: '#7dd3fc',
  Food: '#fbbf24',
  Transport: '#a78bfa',
  Subscriptions: '#f472b6',
  Entertainment: '#fb7185',
  Clothes: '#fdba74',
  Health: '#86efac',
  Other: '#94a3b8',
}

export const CATEGORIES = Object.keys(CAT_COLOR)
export const INCOME_TYPES = ['Internship', 'Stipend', 'Side Hustle', 'Transfer', 'Other']

export const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0)

export const today = () => new Date().toISOString().split('T')[0]
