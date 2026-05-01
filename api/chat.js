// File: api/chat.js

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { messages } = req.body;
    
    // IMPORTANT: If you pasted your actual key directly into generate-quiz.js, 
    // you must paste it here too! Example: const apiKey = 'AIza...';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'undefined') {
      console.error("CRITICAL VERCEL ERROR: GEMINI_API_KEY is missing in chat.js!");
      return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    // 1. Convert frontend history to Gemini's format
    const geminiHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // 2. Point to the active Gemini 2.5 Flash model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // 3. Make the secure request to Google
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: "You are a friendly, encouraging AI Study Tutor for De-Bright Talented Kids School in Ghana — a primary school. You help students in Class 6 with their subjects. Keep responses concise, simple, age-appropriate, and use Ghanaian context where possible. Use emojis to be friendly. Do not use complex formatting." }]
        },
        contents: geminiHistory
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini Raw Error:', errText);
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const data = await geminiRes.json();
    
    // Extract the text from Gemini's response
    const aiText = data.candidates[0].content.parts[0].text;

    // 4. Return it in the exact JSON shape your frontend is currently expecting
    return res.status(200).json({ content: [{ text: aiText }] });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
}
