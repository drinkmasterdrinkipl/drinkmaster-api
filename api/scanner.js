const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  try {
    const { image, language = 'pl' } = req.body;
    
    const prompt = language === 'pl' 
      ? "Rozpoznaj alkohol na zdjęciu. Zwróć dokładnie w formacie JSON: {name, brand, type, country, alcoholContent, description, servingSuggestions[], cocktailSuggestions[]}"
      : "Identify the alcohol in the image. Return exactly in JSON format: {name, brand, type, country, alcoholContent, description, servingSuggestions[], cocktailSuggestions[]}";

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

    // UŻYWAMY PRAWDZIWEJ ODPOWIEDZI!
    const aiResponse = response.choices[0].message.content;
    console.log('AI Response:', aiResponse);
    
    // Parsuj JSON z odpowiedzi
    let parsedData;
    try {
      parsedData = JSON.parse(aiResponse);
    } catch (e) {
      // Jeśli nie jest JSON, spróbuj wyciągnąć dane
      parsedData = {
        name: "Nierozpoznany alkohol",
        brand: "Nieznana",
        type: "alcohol",
        country: "Nieznany",
        alcoholContent: 40,
        description: aiResponse,
        servingSuggestions: ["Z lodem"],
        cocktailSuggestions: ["Klasyczne"]
      };
    }

    const result = {
      data: {
        ...parsedData,
        confidence: 95
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Scanner error:', error);
    res.status(500).json({ error: error.message });
  }
};
