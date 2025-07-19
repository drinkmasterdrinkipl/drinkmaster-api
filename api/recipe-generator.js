const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `You are a world-renowned mixologist creating authentic cocktail recipes.

LANGUAGE: Respond in the language specified in the request (pl/en).

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no formatting
2. Provide authentic, balanced recipes
3. Include historical context and interesting facts
4. All measurements in ml for liquids, pieces/dashes for others
5. Instructions must be professional and clear

OUTPUT FORMAT (EXACTLY):
{
  "name": "[Cocktail name]",
  "category": "[classic|modern|tiki|shot|mocktail]",
  "difficulty": "[easy|medium|hard]",
  "prepTime": [minutes as number],
  "history": "[2-3 sentences about cocktail origin and evolution]",
  "ingredients": [
    {"name": "[ingredient]", "amount": "[number]", "unit": "[ml|dash|piece|bar spoon]"}
  ],
  "glassType": "[specific glass type]",
  "method": "[shaken|stirred|built|blended|layered]",
  "instructions": [
    "[Step 1]",
    "[Step 2]",
    "[Step 3]",
    "[Step 4]"
  ],
  "garnish": "[Garnish description]",
  "tips": "[Pro tip or serving suggestion]",
  "funFact": "[Interesting trivia about this cocktail]",
  "alcoholContent": "[low|medium|high]",
  "tags": ["[tag1]", "[tag2]", "[tag3]"]
}

POLISH EXAMPLE for "Martini":
{
  "name": "Martini",
  "category": "classic",
  "difficulty": "medium",
  "prepTime": 5,
  "history": "Martini powstało w USA w latach 1860-70. Ewoluowało od słodkiego drinka z wermutem 1:1 do suchego klasyka znanego dziś.",
  "ingredients": [
    {"name": "Gin", "amount": "60", "unit": "ml"},
    {"name": "Wermut dry", "amount": "10", "unit": "ml"},
    {"name": "Oliwka lub skórka cytryny", "amount": "1", "unit": "piece"}
  ],
  "glassType": "kieliszek martini",
  "method": "stirred",
  "instructions": [
    "Schłódź kieliszek w zamrażarce",
    "Napełnij mixing glass lodem",
    "Dodaj gin i wermut, mieszaj 30 sekund",
    "Przecedź do schłodzonego kieliszka"
  ],
  "garnish": "Oliwka na wykałaczce lub twist ze skórki cytryny",
  "tips": "Im mniej wermutu, tym bardziej 'dry'. Churchill mawiał, że wystarczy spojrzeć na butelkę wermutu",
  "funFact": "James Bond wolał wstrząśnięte, nie mieszane - co jest herezją wśród barmanów!",
  "alcoholContent": "high",
  "tags": ["klasyczny", "elegancki", "aperitif"]
}`;

module.exports = async (req, res) => {
  try {
    const { alcoholName, language = 'pl' } = req.body;
    console.log(`Recipe request - Cocktail: ${alcoholName}, Language: ${language}`);
    
    const userPrompt = language === 'pl'
      ? `Stwórz profesjonalny przepis na koktajl "${alcoholName}". Zwróć kompletny przepis w formacie JSON po polsku.`
      : `Create a professional recipe for "${alcoholName}" cocktail. Return complete recipe in JSON format in English.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: RECIPE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiResponse = response.choices[0].message.content;
    console.log('Raw Recipe AI Response:', aiResponse.substring(0, 200) + '...');
    
    // Clean response
    let cleanedResponse = aiResponse;
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    cleanedResponse = cleanedResponse.trim();
    
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    let cocktailData;
    try {
      cocktailData = JSON.parse(cleanedResponse);
      console.log('Successfully parsed recipe data');
      
      // Ensure prepTime is a number
      if (typeof cocktailData.prepTime === 'string') {
        cocktailData.prepTime = parseInt(cocktailData.prepTime) || 5;
      }
    } catch (e) {
      console.error('Recipe parse error:', e);
      console.error('Failed to parse:', cleanedResponse.substring(0, 300));
      
      // Fallback recipe
      cocktailData = {
        name: alcoholName,
        category: "classic",
        difficulty: "medium",
        prepTime: 5,
        history: language === 'pl' 
          ? `${alcoholName} to klasyczny koktajl o bogatej historii. Ceniony przez koneserów na całym świecie.`
          : `${alcoholName} is a classic cocktail with rich history. Appreciated by connoisseurs worldwide.`,
        ingredients: [
          { name: alcoholName, amount: "50", unit: "ml" },
          { name: language === 'pl' ? "Składnik dodatkowy" : "Additional ingredient", amount: "25", unit: "ml" }
        ],
        glassType: language === 'pl' ? "odpowiedni kieliszek" : "appropriate glass",
        method: "shaken",
        instructions: language === 'pl'
          ? ["Wstrząśnij składniki z lodem", "Przecedź do kieliszka", "Udekoruj"]
          : ["Shake ingredients with ice", "Strain into glass", "Garnish"],
        garnish: language === 'pl' ? "Odpowiednia dekoracja" : "Appropriate garnish",
        tips: language === 'pl' 
          ? "Używaj świeżych składników dla najlepszego smaku"
          : "Use fresh ingredients for best flavor",
        funFact: language === 'pl'
          ? "Każdy barman ma swoją wersję tego klasyka"
          : "Every bartender has their own version of this classic",
        alcoholContent: "medium",
        tags: language === 'pl' ? ["klasyczny", "popularny"] : ["classic", "popular"]
      };
    }

    const result = {
      data: {
        cocktails: [cocktailData]
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Recipe error:', error);
    res.status(500).json({ error: error.message });
  }
};