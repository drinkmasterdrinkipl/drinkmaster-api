const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  try {
    const { alcoholName, language = 'pl' } = req.body;
    
    const systemPrompt = language === 'pl'
      ? `Jesteś ekspertem barmanem. Generuj przepis na koktajl ${alcoholName} w formacie JSON. Zwróć TYLKO JSON bez dodatkowego tekstu.`
      : `You are an expert bartender. Generate recipe for ${alcoholName} cocktail in JSON format. Return ONLY JSON without additional text.`;

    const userPrompt = `Przepis na koktajl ${alcoholName}. Format JSON: {
      name: string,
      category: string,
      difficulty: "easy"|"medium"|"hard",
      prepTime: number,
      ingredients: [{name: string, amount: string, unit: string}],
      instructions: string[],
      glassType: string,
      garnish: string,
      alcoholContent: "low"|"medium"|"high",
      tags: string[]
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // UŻYWAMY PRAWDZIWEJ ODPOWIEDZI!
    const aiResponse = response.choices[0].message.content;
    console.log('AI Recipe Response:', aiResponse);
    
    let cocktailData;
    try {
      cocktailData = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Parse error, using fallback');
      cocktailData = {
        name: alcoholName,
        category: "classic",
        difficulty: "medium",
        prepTime: 5,
        ingredients: [
          { name: alcoholName, amount: "50", unit: "ml" },
          { name: "Składnik", amount: "25", unit: "ml" }
        ],
        instructions: ["Wymieszaj składniki", "Podaj w szkle"],
        glassType: "highball",
        garnish: "Dekoracja",
        alcoholContent: "medium",
        tags: ["klasyczny"]
      };
    }

    const result = {
      data: {
        cocktails: [cocktailData]
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Recipe error:', error);
    res.status(500).json({ error: error.message });
  }
};
