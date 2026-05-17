export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { image, type } = req.body
  if (!image || !type) return res.status(400).json({ error: 'image and type are required' })

  const prompts = {
    student: `You are digitizing a school student register. Look at this image carefully and extract student information.
Return ONLY a valid JSON object — no markdown, no explanation, no backticks — with exactly these fields:
{"firstName":"","lastName":"","dateOfBirth":"","gender":"","grade":"","parentName":"","phone":"","notes":""}
Rules: dateOfBirth in YYYY-MM-DD format. gender is Male or Female. grade examples: KG A, KG B, Grade 1 ... Grade 6. Use empty string for anything unclear.`,

    receipt: `You are digitizing a school fee payment receipt. Look at this image carefully and extract payment details.
Return ONLY a valid JSON object — no markdown, no explanation, no backticks — with exactly these fields:
{"studentName":"","amount":0,"date":"","method":"cash","feeName":"","receivedBy":"","notes":""}
Rules: date in YYYY-MM-DD format. method is cash, bank, or mobile. amount is a number. Use empty string for anything unclear.`
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
            { type: 'text', text: prompts[type] || prompts.student }
          ]
        }]
      })
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Anthropic API error' })

    const text = data.content?.[0]?.text || ''
    try {
      const cleaned = text.replace(/```json|```/g, '').trim()
      return res.status(200).json({ success: true, data: JSON.parse(cleaned) })
    } catch {
      return res.status(200).json({ success: false, error: 'Could not parse AI response', raw: text })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
