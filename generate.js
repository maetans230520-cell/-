/**
 * Vercel Serverless Function for Gemini API Integration
 * File: /api/generate.js
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, allowedPlatforms, apiKey } = req.body;
    
    // Read GEMINI_API_KEY from Vercel environment variables or request override
    const finalApiKey = process.env.GEMINI_API_KEY || apiKey;

    if (!finalApiKey) {
      return res.status(400).json({ error: 'GEMINI_API_KEY environment variable is required.' });
    }

    const systemPrompt = `
You are '인강 수색대 AI', an expert online course finder.
User query: "${prompt}"
Allowed Platforms: ${allowedPlatforms}

MANDATORY RULES & DOUBLE-CHECK VERIFICATION:
1. Recommend 3 to 5 highly relevant specific courses ONLY from the allowed platforms: ${allowedPlatforms}.
2. CRITICAL - DIRECT LINK VERIFICATION:
   - NEVER return generic main domain URLs (e.g. MUST NOT be "https://www.megastudy.net/").
   - Double check that links point specifically to course detail pages (/course/..., /lecture/..., /vod/...).
3. Output MUST strictly be valid JSON adhering to:
{
  "summary": "Strategic course guide summary",
  "courses": [
    {
      "platform": "Platform Name",
      "courseTitle": "Course Title",
      "instructor": "Teacher Name",
      "directUrl": "Direct Specific Course URL",
      "targetAudience": "Target Level",
      "keyFeatures": ["Feature 1", "Feature 2"],
      "recommendationReason": "Recommendation Reason"
    }
  ]
}
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${finalApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Allowed platforms: ${allowedPlatforms}. Query: ${prompt}` }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return res.status(500).json({ error: 'Failed to retrieve response from Gemini API.' });
    }

    const parsedData = JSON.parse(resultText);
    return res.status(200).json(parsedData);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};