export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { image, type } = req.body
  if (!image || !type) return res.status(400).json({ error: 'image and type are required' })

  const prompts = {
    student: `You are digitizing a school student register. Extract one student's information from this image.
Return ONLY valid JSON, no markdown, no explanation:
{"firstName":"","lastName":"","dateOfBirth":"","gender":"","grade":"","parentName":"","phone":"","notes":""}
Rules: dateOfBirth in YYYY-MM-DD. gender is Male or Female. grade examples: KG A, KG B, Grade 1 to Grade 6. Empty string for anything unclear.`,

    bulk_students: `You are digitizing a handwritten school student register page. The columns are: First Name, Last Name, Class/Grade, Date of Birth, Sex/Gender.
Extract ALL students visible on this page.
Return ONLY a valid JSON array, no markdown, no explanation, no backticks:
[{"firstName":"","lastName":"","dateOfBirth":"","gender":"","grade":""},...]
Rules:
- dateOfBirth in YYYY-MM-DD format (e.g. "4 Jan 1989" becomes "1989-01-04")
- gender: Male or Female only
- grade examples: KG A, KG B, Grade 1, Grade 2, Grade 3, Grade 4, Grade 5, Grade 6
- Include every student row you can read, even if some fields are unclear
- Use empty string for fields you cannot read clearly
- Return an empty array [] if no students found`,

    receipt: `You are digitizing a school fee payment receipt. Extract payment details.
Return ONLY valid JSON, no markdown, no explanation:
{"studentName":"","amount":0,"date":"","method":"cash","feeName":"","receivedBy":"","notes":""}
Rules: date in YYYY-MM-DD. method is cash, bank, or mobile. amount is a number.`
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
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
            { type: 'text', text: prompts[type] || prompts.bulk_students }
          ]
        }]
      })
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' })

    const text = data.content?.[0]?.text || ''
    try {
      const cleaned = text.replace(/```json|```/g, '').trim()
      return res.status(200).json({ success: true, data: JSON.parse(cleaned) })
    } catch {
      return res.status(200).json({ success: false, error: 'Could not parse response', raw: text })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
