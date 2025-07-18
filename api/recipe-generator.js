const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  try {
    const { alcoholName, language = 'pl' } = req.body;
    
    const systemPrompt = language === 'pl'
      ? "Jesteś ekspertem barmanem. Generuj przepisy na koktajle w formacie JSON."
      : "You are an expert bartender. Generate cocktail recipes in JSON format.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Przepis na koktajl z ${alcoholName}` }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const result = {
      data: {
        cocktails: [{
          name: alcoholName,
          category: "classic",
          difficulty: "medium",
          prepTime: 5,
          ingredients: [
            { name: alcoholName, amount: "50", unit: "ml" },
            { name: "Sok z limonki", amount: "30", unit: "ml" },
            { name: "Syrop cukrowy", amount: "20", unit: "ml" }
          ],
          instructions: [
            "Wstrząśnij składniki z lodem",
            "Przecedź do kieliszka",
            "Udekoruj"
          ],
          glassType: "coupe",
          garnish: "Plasterek limonki",
          alcoholContent: "medium",
          tags: ["klasyczny", "orzeźwiający"]
        }]
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Recipe error:', error);
    res.status(500).json({ error: error.message });
  }
};
