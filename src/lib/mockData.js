// Demo mode mock data — never touches Supabase
export const MOCK_INCOME = [
  { id: '1', label: 'Sysco Technology — Internship', amount: 2400, type: 'Internship', date: '2026-05-01' },
  { id: '2', label: 'Sysco Technology — Internship', amount: 2400, type: 'Internship', date: '2026-04-15' },
  { id: '3', label: 'CMU Tepper Stipend', amount: 800, type: 'Stipend', date: '2026-04-01' },
  { id: '4', label: 'Freelance project', amount: 350, type: 'Side Hustle', date: '2026-03-20' },
  { id: '5', label: 'Sysco Technology — Internship', amount: 2400, type: 'Internship', date: '2026-03-15' },
]

export const MOCK_EXPENSES = [
  { id: '10', label: 'Pearl Washington — Rent', amount: 1195, category: 'Housing', date: '2026-05-01' },
  { id: '11', label: 'HEB groceries', amount: 87.43, category: 'Food', date: '2026-05-03' },
  { id: '12', label: 'Chick-fil-A', amount: 14.20, category: 'Food', date: '2026-05-05' },
  { id: '13', label: 'Shell — gas', amount: 52.00, category: 'Transport', date: '2026-05-04' },
  { id: '14', label: 'Spotify Premium', amount: 11.99, category: 'Subscriptions', date: '2026-05-01' },
  { id: '15', label: 'Netflix', amount: 15.49, category: 'Subscriptions', date: '2026-05-01' },
  { id: '16', label: 'Topgolf outing', amount: 65.00, category: 'Entertainment', date: '2026-05-06' },
  { id: '17', label: 'Nike — shoes', amount: 110.00, category: 'Clothes', date: '2026-04-28' },
  { id: '18', label: 'HEB groceries', amount: 74.12, category: 'Food', date: '2026-04-20' },
  { id: '19', label: 'Pearl Washington — Rent', amount: 1195, category: 'Housing', date: '2026-04-01' },
  { id: '20', label: 'Urgent care visit', amount: 45.00, category: 'Health', date: '2026-04-10' },
  { id: '21', label: 'Lyft rides', amount: 28.50, category: 'Transport', date: '2026-04-08' },
  { id: '22', label: 'Amazon order', amount: 43.99, category: 'Other', date: '2026-04-15' },
  { id: '23', label: 'Whataburger', amount: 12.40, category: 'Food', date: '2026-05-07' },
]

export const MOCK_SAVINGS = [
  { id: '30', amount: 500, note: 'Apartment deposit fund', date: '2026-05-01' },
  { id: '31', amount: 300, note: 'Emergency fund', date: '2026-04-01' },
  { id: '32', amount: 300, note: 'Emergency fund', date: '2026-03-01' },
]

export const MOCK_GOAL = 5000

export const MOCK_CATEGORIES = [
  { id: 'c1', name: 'Housing', color: '#7dd3fc', sort_order: 0 },
  { id: 'c2', name: 'Food', color: '#fbbf24', sort_order: 1 },
  { id: 'c3', name: 'Transport', color: '#a78bfa', sort_order: 2 },
  { id: 'c4', name: 'Subscriptions', color: '#f472b6', sort_order: 3 },
  { id: 'c5', name: 'Entertainment', color: '#fb7185', sort_order: 4 },
  { id: 'c6', name: 'Clothes', color: '#fdba74', sort_order: 5 },
  { id: 'c7', name: 'Health', color: '#86efac', sort_order: 6 },
  { id: 'c8', name: 'Other', color: '#94a3b8', sort_order: 7 },
]

export const MOCK_LIMITS = {
  Housing: 1300,
  Food: 350,
  Transport: 120,
  Subscriptions: 50,
  Entertainment: 200,
  Clothes: 150,
  Health: 100,
  Other: 150,
}
