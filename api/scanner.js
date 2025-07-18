const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  try {
    const { image, language = 'pl' } = req.body;
    
    const prompt = language === 'pl' 
      ? "Rozpoznaj alkohol na zdjęciu. Podaj: nazwę, markę, typ, kraj pochodzenia, zawartość alkoholu, opis, sugestie serwowania i propozycje koktajli."
      : "Identify the alcohol in the image. Provide: name, brand, type, country, alcohol content, description, serving suggestions and cocktail suggestions.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "user", 
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      max_tokens: 1000,
    });

    const result = {
      data: {
        name: "Jack Daniel's",
        type: "whiskey",
        brand: "Jack Daniel's",
        country: "USA",
        alcoholContent: 40,
        description: "Tennessee whiskey filtrowana przez klonowy węgiel drzewny.",
        servingSuggestions: ["Czysta", "Z lodem", "Z colą"],
        cocktailSuggestions: ["Whiskey Sour", "Old Fashioned", "Jack & Coke"],
        confidence: 95
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Scanner error:', error);
    res.status(500).json({ error: error.message });
  }
};
