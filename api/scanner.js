const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCANNER_SYSTEM_PROMPT = `You are a certified sommelier and master bartender analyzing alcohol bottles.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks
2. ALL text must be in the language specified in request (pl/en)
3. Provide rich, detailed descriptions (3-5 sentences)
4. Include simple flavor characteristics in the description itself
5. Add one interesting fact about the product
6. Suggest only classic cocktails appropriate for the spirit type

POLISH SPIRIT TYPES (use exactly these):
- whisky (not whiskey)
- wódka
- gin
- rum
- tequila
- koniak
- likier
- brandy
- wino
- szampan
- piwo
- inny

OUTPUT FORMAT (EXACT):
{
  "name": "[Full product name]",
  "brand": "[Brand name]", 
  "type": "[use Polish types from above if language=pl]",
  "country": "[Country in requested language]",
  "alcoholContent": [number only],
  "description": "[3-5 sentences including flavor profile. Example: 'Metaxa to grecki napój spirytusowy łączący brandy z aromatycznymi ziołami. Ma słodki, łagodny smak z nutami miodu, wanilii i suszonych owoców. Charakteryzuje się gładką, aksamitną teksturą i długim, ciepłym finiszem.']",
  "cocktailSuggestions": ["[cocktail 1]", "[cocktail 2]", "[cocktail 3]"],
  "funFact": "[One interesting fact]"
}`;

module.exports = async (req, res) => {
  try {
    const { image, language = 'pl' } = req.body;
    console.log(`Scanner request - Language: ${language}`);
    
    const userPrompt = language === 'pl' 
      ? `Rozpoznaj alkohol. Podaj typ po polsku (whisky, wódka, gin, rum, tequila, koniak, likier, brandy, wino, szampan, piwo, inny). W opisie zawrzyj charakterystykę smakową.`
      : `Identify the alcohol. Include flavor characteristics in the description.`;

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
      temperature: 0.2
    });

    const aiResponse = response.choices[0].message.content;
    console.log('Raw Scanner AI Response:', aiResponse.substring(0, 200) + '...');
    
    // Fast parsing
    let cleanedResponse = aiResponse.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
      
      // Ensure alcoholContent is number
      if (typeof parsedData.alcoholContent === 'string') {
        parsedData.alcoholContent = parseFloat(parsedData.alcoholContent.replace('%', '')) || 40;
      }
      
      // Fix cocktails based on type
      const cocktailMap = {
        'brandy': ['Sidecar', 'Brandy Alexander', 'Stinger'],
        'likier': ['B-52', 'White Russian', 'Espresso Martini'],
        'whisky': ['Old Fashioned', 'Manhattan', 'Whiskey Sour'],
        'wódka': ['Moscow Mule', 'Bloody Mary', 'Cosmopolitan'],
        'gin': ['Gin & Tonic', 'Martini', 'Negroni'],
        'rum': ['Mojito', 'Daiquiri', 'Mai Tai'],
        'tequila': ['Margarita', 'Paloma', 'Tequila Sunrise'],
        'koniak': ['Sidecar', 'French 75', 'Sazerac'],
        'wino': language === 'pl' ? ['Sangria', 'Kir', 'Spritz'] : ['Sangria', 'Kir', 'Spritz'],
        'szampan': ['Mimosa', 'Bellini', 'French 75']
      };
      
      // For Metaxa specifically
      if (parsedData.name && parsedData.name.toLowerCase().includes('metaxa')) {
        parsedData.cocktailSuggestions = ['Metaxa Sour', 'Metaxa Ginger', 'Metaxa Tonic'];
      } else if (cocktailMap[parsedData.type]) {
        parsedData.cocktailSuggestions = cocktailMap[parsedData.type];
      }
      
    } catch (e) {
      console.error('Parse error:', e);
      
      parsedData = {
        name: language === 'pl' ? "Nierozpoznany alkohol" : "Unrecognized alcohol",
        brand: language === 'pl' ? "Nieznana marka" : "Unknown brand",
        type: language === 'pl' ? "inny" : "other",
        country: language === 'pl' ? "Nieznany" : "Unknown",
        alcoholContent: 40,
        description: language === 'pl' 
          ? "Nie udało się rozpoznać produktu. Może to być rzadki lub regionalny alkohol. Spróbuj zrobić wyraźniejsze zdjęcie etykiety przy dobrym oświetleniu."
          : "Could not identify the product. This might be a rare or regional alcohol. Try taking a clearer photo with better lighting.",
        cocktailSuggestions: language === 'pl'
          ? ["Klasyczne koktajle"]
          : ["Classic cocktails"],
        funFact: language === 'pl'
          ? "Każdy alkohol ma swoją unikalną historię i tradycję produkcji."
          : "Every alcohol has its unique history and production tradition."
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