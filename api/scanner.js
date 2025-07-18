const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  try {
    const { image, language = 'pl' } = req.body;
    
    const prompt = language === 'pl' 
      ? "Rozpoznaj alkohol na zdjęciu. Zwróć TYLKO obiekt JSON (bez markdown, bez dodatkowego tekstu) z polami: name, brand, type, country, alcoholContent (liczba), description, servingSuggestions (array), cocktailSuggestions (array)"
      : "Identify the alcohol in the image. Return ONLY JSON object (no markdown, no extra text) with fields: name, brand, type, country, alcoholContent (number), description, servingSuggestions (array), cocktailSuggestions (array)";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system",
          content: "You are a bartender AI. Analyze images and return ONLY valid JSON. No markdown blocks, no explanations, just pure JSON."
        },
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

    const aiResponse = response.choices[0].message.content;
    console.log('Raw Scanner AI Response:', aiResponse);
    
    // Czyszczenie odpowiedzi
    let cleanedResponse = aiResponse;
    
    // Usuń markdown jeśli jest
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.split('```json')[1].split('```')[0];
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.split('```')[1].split('```')[0];
    }
    
    // Usuń wszystkie nowe linie i nadmiarowe spacje
    cleanedResponse = cleanedResponse.trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
      console.log('Successfully parsed scanner data');
    } catch (e) {
      console.error('Scanner parse error:', e);
      console.error('Failed to parse:', cleanedResponse.substring(0, 200));
      
      // Próba wyciągnięcia danych z tekstu
      const nameMatch = cleanedResponse.match(/"name":\s*"([^"]+)"/);
      const brandMatch = cleanedResponse.match(/"brand":\s*"([^"]+)"/);
      const typeMatch = cleanedResponse.match(/"type":\s*"([^"]+)"/);
      
      parsedData = {
        name: nameMatch ? nameMatch[1] : "Nierozpoznany alkohol",
        brand: brandMatch ? brandMatch[1] : "Nieznana",
        type: typeMatch ? typeMatch[1] : "alcohol",
        country: "Nieznany",
        alcoholContent: 40,
        description: "Nie udało się w pełni rozpoznać butelki",
        servingSuggestions: ["Czysta", "Z lodem"],
        cocktailSuggestions: ["Klasyczne koktajle"]
      };
    }

    // Upewnij się że alcoholContent to liczba
    if (typeof parsedData.alcoholContent === 'string') {
      parsedData.alcoholContent = parseFloat(parsedData.alcoholContent) || 40;
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
