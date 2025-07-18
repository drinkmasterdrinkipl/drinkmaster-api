const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  try {
    const { ingredients, language = 'pl' } = req.body;
    
    const prompt = language === 'pl'
      ? `Mam te składniki: ${ingredients}. Zasugeruj koktajle które mogę zrobić. Zwróć w formacie JSON: {cocktails: [{name, available: true, description, difficulty, ingredients: [{name, amount, unit}], instructions[], glassType}], shoppingList: [{ingredient, unlocksCount, priority}]}`
      : `I have these ingredients: ${ingredients}. Suggest cocktails I can make. Return in JSON format: {cocktails: [{name, available: true, description, difficulty, ingredients: [{name, amount, unit}], instructions[], glassType}], shoppingList: [{ingredient, unlocksCount, priority}]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Jesteś ekspertem barmanem. Analizuj składniki i sugeruj koktajle. Zwracaj TYLKO JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    // UŻYWAMY PRAWDZIWEJ ODPOWIEDZI!
    const aiResponse = response.choices[0].message.content;
    console.log('AI MyBar Response:', aiResponse);
    
    let suggestions;
    try {
      suggestions = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Parse error, using fallback');
      suggestions = {
        cocktails: [{
          name: "Prosty drink",
          available: true,
          description: "Drink z dostępnych składników",
          difficulty: "easy",
          ingredients: [{ name: "Składnik", amount: "50", unit: "ml" }],
          instructions: ["Wymieszaj", "Podaj"],
          glassType: "highball"
        }],
        shoppingList: [{
          ingredient: "Syrop",
          unlocksCount: 3,
          priority: "high"
        }]
      };
    }

    // POPRAWNE - używamy suggestions z AI!
    const result = {
      data: suggestions
    };

    res.json(result);
  } catch (error) {
    console.error('MyBar error:', error);
    res.status(500).json({ error: error.message });
  }
};
