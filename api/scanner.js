const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCANNER_SYSTEM_PROMPT = `You are a certified sommelier and spirits expert analyzing bottle images.

LANGUAGE: Respond in the requested language (pl/en).

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks
2. Identify bottles accurately based on labels, shape, color
3. Suggest only classic cocktails appropriate for the identified spirit
4. Use proper Polish translations (lód kruszony, not kruszon)

OUTPUT FORMAT:
{
  "name": "[Full product name]",
  "brand": "[Brand name]",
  "type": "[whiskey|vodka|gin|rum|tequila|wine|champagne|beer|liqueur|other]",
  "country": "[Country of origin]",
  "alcoholContent": [number],
  "description": "[2-3 professional sentences about the product]",
  "servingSuggestions": ["[How professionals serve it]"],
  "cocktailSuggestions": ["[Only classic cocktails for this spirit]"]
}

POLISH VOCABULARY:
- neat = czysta
- on the rocks = z lodem
- with water = z wodą
- chilled = schłodzona
- room temperature = w temperaturze pokojowej`;

module.exports = async (req, res) => {
  try {
    const { image, language = 'pl' } = req.body;
    console.log(`Scanner request - Language: ${language}`);
    
    const userPrompt = language === 'pl' 
      ? "Przeanalizuj butelkę alkoholu. Podaj dokładne informacje. Sugeruj tylko klasyczne koktajle odpowiednie dla tego alkoholu."
      : "Analyze the alcohol bottle. Provide accurate information. Suggest only classic cocktails appropriate for this spirit.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system",
          content: SCANNER_SYSTEM_PROMPT
        },
        { 
          role: "user", 
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const aiResponse = response.choices[0].message.content;
    console.log('Raw Scanner AI Response:', aiResponse.substring(0, 200) + '...');
    
    // Clean response
    let cleanedResponse = aiResponse;
    cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/gi, '');
    cleanedResponse = cleanedResponse.trim();
    
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
      console.log('Successfully parsed scanner data');
      
      // Ensure alcoholContent is number
      if (typeof parsedData.alcoholContent === 'string') {
        parsedData.alcoholContent = parseFloat(parsedData.alcoholContent) || 40;
      }
      
      // Validate cocktail suggestions are appropriate
      if (parsedData.type === 'whiskey' && parsedData.cocktailSuggestions) {
        const validWhiskeyCocktails = ['Old Fashioned', 'Manhattan', 'Whiskey Sour', 'Mint Julep', 'Boulevardier', 'Sazerac'];
        parsedData.cocktailSuggestions = parsedData.cocktailSuggestions.filter(c => 
          validWhiskeyCocktails.some(vc => c.toLowerCase().includes(vc.toLowerCase()))
        );
        if (parsedData.cocktailSuggestions.length === 0) {
          parsedData.cocktailSuggestions = language === 'pl' 
            ? ['Old Fashioned', 'Whiskey Sour', 'Manhattan']
            : ['Old Fashioned', 'Whiskey Sour', 'Manhattan'];
        }
      }
      
    } catch (e) {
      console.error('Scanner parse error:', e);
      
      parsedData = {
        name: language === 'pl' ? "Nierozpoznany alkohol" : "Unrecognized alcohol",
        brand: language === 'pl' ? "Nieznana" : "Unknown",
        type: "other",
        country: language === 'pl' ? "Nieznany" : "Unknown",
        alcoholContent: 40,
        description: language === 'pl' 
          ? "Nie udało się dokładnie rozpoznać produktu. Spróbuj zrobić wyraźniejsze zdjęcie etykiety."
          : "Could not accurately identify the product. Try taking a clearer photo of the label.",
        servingSuggestions: language === 'pl' 
          ? ["Czysta", "Z lodem", "W koktajlach"]
          : ["Neat", "On the rocks", "In cocktails"],
        cocktailSuggestions: language === 'pl'
          ? ["Klasyczne koktajle"]
          : ["Classic cocktails"]
      };
    }

    res.json({
      data: {
        ...parsedData,
        confidence: 95
      }
    });
    
  } catch (error) {
    console.error('Scanner error:', error);
    res.status(500).json({ error: error.message });
  }
};