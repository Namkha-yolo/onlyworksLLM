// api/analyze-screenshot.js (for Vercel/Netlify functions)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { image, goal } = req.body;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`, // Server-side env variable
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this work session screenshot. Goal: "${goal}". Return JSON with productivity analysis.`
                },
                {
                  type: 'image_url',
                  image_url: { url: image }
                }
              ]
            }
          ],
          max_tokens: 500
        })
      });
  
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse and return analysis
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        productivityScore: 50,
        activity: 'Analysis completed',
        insights: ['AI analysis completed'],
        focusLevel: 50,
        goalAlignment: 50,
        recommendations: []
      };
  
      res.status(200).json(analysis);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Analysis failed' });
    }
  }