export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, full_name, role } = req.body
  if (!email || !full_name || !role) return res.status(400).json({ error: 'email, full_name and role required' })

  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.VITE_SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.VITE_SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({ email, password: 'Gratitude2026!', email_confirm: true, user_metadata: { full_name, role } })
  })

  const data = await response.json()
  if (!response.ok) return res.status(400).json({ error: data.message || 'Failed to create user' })

  await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.VITE_SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.VITE_SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({ id: data.id, full_name, role })
  })

  return res.status(200).json({ success: true })
}
