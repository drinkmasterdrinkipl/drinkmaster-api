const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCANNER_SYSTEM_PROMPT = `You are an expert sommelier and bartender AI. Analyze alcohol bottle images with precision.

LANGUAGE: Respond in the language specified in the request (pl/en).

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. All text fields must be in the requested language
3. Numbers must be numeric type, not strings
4. If uncertain, make educated guesses based on visible features

OUTPUT FORMAT (EXACTLY):
{
  "name": "[Product name]",
  "brand": "[Brand]",
  "type": "[whiskey|vodka|gin|rum|tequila|wine|champagne|beer|liqueur|other]",
  "country": "[Country]",
  "alcoholContent": [number],
  "description": "[2-3 sentences about taste, production, characteristics]",
  "servingSuggestions": ["[How to serve 1]", "[How to serve 2]", "[How to serve 3]"],
  "cocktailSuggestions": ["[Cocktail 1]", "[Cocktail 2]", "[Cocktail 3]"]
}

POLISH EXAMPLE:
{
  "name": "Johnnie Walker Black Label",
  "brand": "Johnnie Walker",
  "type": "whiskey",
  "country": "Szkocja",
  "alcoholContent": 40,
  "description": "Szkocka whisky blended o bogatym, złożonym smaku z nutami dymu i wanilii. Dojrzewa minimum 12 lat w dębowych beczkach.",
  "servingSuggestions": ["Czysta z kostką lodu", "Z odrobiną wody", "W tumblrze"],
  "cocktailSuggestions": ["Whisky Sour", "Old Fashioned", "Rob Roy"]
}`;

module.exports = async (req, res) => {
  try {
    const { image, language = 'pl' } = req.body;
    console.log(`Scanner request - Language: ${language}`);
    
    const userPrompt = language === 'pl' 
      ? "Przeanalizuj zdjęcie butelki alkoholu i zwróć informacje w formacie JSON po polsku."
      : "Analyze the alcohol bottle image and return information in JSON format in English.";

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
      temperature: 0.7
    });

    const aiResponse = response.choices[0].message.content;
    console.log('Raw Scanner AI Response:', aiResponse);
    
    // Clean response
    let cleanedResponse = aiResponse;
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    cleanedResponse = cleanedResponse.trim();
    
    // Find JSON boundaries
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
      console.log('Successfully parsed scanner data');
      
      // Ensure alcoholContent is a number
      if (typeof parsedData.alcoholContent === 'string') {
        parsedData.alcoholContent = parseFloat(parsedData.alcoholContent) || 40;
      }
    } catch (e) {
      console.error('Scanner parse error:', e);
      console.error('Failed to parse:', cleanedResponse.substring(0, 200));
      
      // Fallback response
      parsedData = {
        name: language === 'pl' ? "Nierozpoznany alkohol" : "Unrecognized alcohol",
        brand: language === 'pl' ? "Nieznana" : "Unknown",
        type: "other",
        country: language === 'pl' ? "Nieznany" : "Unknown",
        alcoholContent: 40,
        description: language === 'pl' 
          ? "Nie udało się w pełni rozpoznać produktu. Spróbuj zrobić wyraźniejsze zdjęcie etykiety."
          : "Could not fully recognize the product. Try taking a clearer photo of the label.",
        servingSuggestions: language === 'pl' 
          ? ["Czysta", "Z lodem", "W koktajlach"]
          : ["Neat", "On the rocks", "In cocktails"],
        cocktailSuggestions: language === 'pl'
          ? ["Klasyczne koktajle", "Drinki mieszane", "Shoty"]
          : ["Classic cocktails", "Mixed drinks", "Shots"]
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