const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCANNER_SYSTEM_PROMPT = `You are a certified sommelier and master bartender analyzing alcohol bottles.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no extra text
2. ALL text must be in the language specified in request (pl/en)
3. Identify bottles accurately based on visible labels
4. Suggest ONLY classic cocktails appropriate for the spirit type
5. Use exact Polish translations when language is 'pl'

POLISH TRANSLATIONS:
- neat = czysta
- on the rocks = z lodem  
- with water = z wodą
- chilled = schłodzona
- room temperature = w temperaturze pokojowej
- whiskey = whisky (nie whiskey)
- bourbon = bourbon
- cognac = koniak

OUTPUT FORMAT (EXACT):
{
  "name": "[Full product name in original language]",
  "brand": "[Brand name]", 
  "type": "[whiskey|vodka|gin|rum|tequila|wine|champagne|beer|liqueur|cognac|other]",
  "country": "[Country in requested language]",
  "alcoholContent": [number only, no %],
  "description": "[2-3 sentences in requested language]",
  "servingSuggestions": ["[suggestion 1]", "[suggestion 2]", "[suggestion 3]"],
  "cocktailSuggestions": ["[cocktail 1]", "[cocktail 2]", "[cocktail 3]"]
}`;

module.exports = async (req, res) => {
  try {
    const { image, language = 'pl' } = req.body;
    console.log(`Scanner request - Language: ${language}`);
    
    const userPrompt = language === 'pl' 
      ? "Rozpoznaj alkohol na zdjęciu. Zwróć dane po polsku zgodnie z formatem. Sugeruj tylko klasyczne koktajle pasujące do tego typu alkoholu."
      : "Identify the alcohol in the image. Return data in English according to format. Suggest only classic cocktails suitable for this spirit type.";

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
      max_tokens: 800,
      temperature: 0.3
    });

    const aiResponse = response.choices[0].message.content;
    console.log('Raw Scanner AI Response:', aiResponse.substring(0, 200) + '...');
    
    // Clean response - remove any markdown or code blocks
    let cleanedResponse = aiResponse;
    cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/gi, '');
    cleanedResponse = cleanedResponse.trim();
    
    // Extract JSON
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
        parsedData.alcoholContent = parseFloat(parsedData.alcoholContent.replace('%', '')) || 40;
      }
      
      // Validate cocktail suggestions based on spirit type
      const cocktailMap = {
        whiskey: ['Old Fashioned', 'Manhattan', 'Whiskey Sour', 'Mint Julep', 'Boulevardier'],
        vodka: ['Moscow Mule', 'Bloody Mary', 'Cosmopolitan', 'Vodka Martini', 'White Russian'],
        gin: ['Gin & Tonic', 'Martini', 'Negroni', 'Gin Fizz', 'Tom Collins'],
        rum: ['Mojito', 'Daiquiri', 'Mai Tai', 'Cuba Libre', 'Piña Colada'],
        tequila: ['Margarita', 'Paloma', 'Tequila Sunrise', 'El Diablo', 'Tommy\'s Margarita'],
        cognac: ['Sidecar', 'Brandy Alexander', 'French 75', 'Vieux Carré', 'Sazerac'],
        wine: language === 'pl' ? ['Czyste', 'Sangria', 'Kir'] : ['Pure', 'Sangria', 'Kir'],
        champagne: ['Mimosa', 'Bellini', 'French 75', 'Kir Royal', 'Champagne Cocktail']
      };
      
      // Ensure appropriate cocktails for the spirit type
      if (cocktailMap[parsedData.type] && parsedData.cocktailSuggestions) {
        const validCocktails = cocktailMap[parsedData.type];
        if (parsedData.cocktailSuggestions.length === 0 || 
            !parsedData.cocktailSuggestions.some(c => validCocktails.some(vc => c.includes(vc)))) {
          parsedData.cocktailSuggestions = validCocktails.slice(0, 3);
        }
      }
      
    } catch (e) {
      console.error('Scanner parse error:', e);
      console.error('Failed to parse:', cleanedResponse.substring(0, 300));
      
      // Fallback response
      parsedData = {
        name: language === 'pl' ? "Nierozpoznany alkohol" : "Unrecognized alcohol",
        brand: language === 'pl' ? "Nieznana marka" : "Unknown brand",
        type: "other",
        country: language === 'pl' ? "Nieznany" : "Unknown",
        alcoholContent: 40,
        description: language === 'pl' 
          ? "Nie udało się dokładnie rozpoznać produktu. Spróbuj zrobić wyraźniejsze zdjęcie etykiety, najlepiej przy dobrym oświetleniu."
          : "Could not accurately identify the product. Try taking a clearer photo of the label with better lighting.",
        servingSuggestions: language === 'pl' 
          ? ["Czysta", "Z lodem", "W koktajlach"]
          : ["Neat", "On the rocks", "In cocktails"],
        cocktailSuggestions: language === 'pl'
          ? ["Klasyczne koktajle", "Drinki mieszane", "Autorskie kreacje"]
          : ["Classic cocktails", "Mixed drinks", "Signature creations"]
      };
    }

    // Remove any flavorProfile if it exists
    delete parsedData.flavorProfile;

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