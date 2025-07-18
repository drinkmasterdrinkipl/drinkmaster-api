const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  try {
    const { ingredients, language = 'pl' } = req.body;
    
    const result = {
      data: {
        cocktails: [
          {
            name: "Whisky Cola",
            available: true,
            description: "Klasyczny drink",
            difficulty: "easy",
            ingredients: [
              { name: "Whisky", amount: "50", unit: "ml" },
              { name: "Cola", amount: "150", unit: "ml" }
            ],
            instructions: ["Napełnij lodem", "Dodaj whisky", "Dolej colę"],
            glassType: "highball"
          }
        ],
        shoppingList: [
          {
            ingredient: "Sok z limonki",
            unlocksCount: 5,
            priority: "high"
          }
        ]
      }
    };

    res.json(result);
  } catch (error) {
    console.error('MyBar error:', error);
    res.status(500).json({ error: error.message });
  }
};
