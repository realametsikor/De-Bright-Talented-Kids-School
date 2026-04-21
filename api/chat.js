// File: api/chat.js

export default async function handler(req, res) {
  // We only want to accept POST requests to this secure route
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the chat history sent from our frontend
    const { messages } = req.body;

    // Fetch from Anthropic securely
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // process.env grabs the key securely from Vercel's servers, hiding it from the browser!
        'x-api-key': process.env.ANTHROPIC_API_KEY, 
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: `You are a friendly, encouraging AI Study Tutor for De-Bright Talented Kids School in Ghana — a primary school. You help students in Class 6 with their subjects. Keep responses concise, simple, age-appropriate, and use Ghanaian context where possible. Use emojis to be friendly. Do not use complex formatting.`,
        messages: messages
      })
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      throw new Error(data.error?.message || 'Anthropic API Error');
    }

    // Send the AI's response back to your frontend
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
}
