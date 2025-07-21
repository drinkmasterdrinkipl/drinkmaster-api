const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `Jesteś ekspertem barmana z 20-letnim doświadczeniem w najlepszych barach świata. Tworzysz precyzyjne, profesjonalne przepisy na koktajle z prawdziwą historią i dokładnymi proporcjami używanymi w renomowanych barach.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks
2. ALL text must be in the language specified in request (pl/en)
3. Use REAL historical facts with accurate dates and locations
4. Provide EXACT measurements in ml as used in professional bars
5. Include professional bartending techniques
6. Specify exact glass type and serving temperature
7. NO EMOJIS - use plain text only
8. servingTemp: return NUMBER ONLY without °C (e.g., "5" not "5°C")
9. abv: return NUMBER ONLY without % or ~ (e.g., 25 not "~25%")
10. method: always return in English ("shaken", "stirred", "built", "blended")

OUTPUT FORMAT (EXACT):
{
  "name": "[Cocktail name in requested language]",
  "nameEn": "[English name]",
  "category": "classic/modern/tiki/sour",
  "history": "[2-3 sentences with REAL dates, places, and creator names]",
  "ingredients": [
    {"name": "[ingredient]", "amount": "[number]", "unit": "ml/dash/barspoon"},
    {"name": "[ingredient]", "amount": "[number]", "unit": "ml/dash/barspoon"}
  ],
  "glassType": "[exact glass type in requested language]",
  "method": "shaken/stirred/built/blended",
  "instructions": [
    "[Professional step 1]",
    "[Professional step 2]",
    "[Professional step 3]"
  ],
  "garnish": "[Professional garnish description]",
  "ice": "[Type of ice in requested language: kostki/kruszony/duża kostka/bez]",
  "servingTemp": "5",
  "abv": 25,
  "prepTime": 5,
  "difficulty": "easy/medium/hard",
  "flavor": "[Flavor profile description]",
  "occasion": "[When to serve this cocktail]",
  "proTip": "[Professional bartender tip]",
  "tags": ["tag1", "tag2"]
}

POLISH TRANSLATIONS:
- ice cubes → kostki lodu
- crushed ice → kruszony lód
- large cube → duża kostka
- no ice → bez lodu
- rocks glass → szklanka rocks
- coupe glass → kieliszek coupe
- highball glass → szklanka highball
- martini glass → kieliszek martini
- collins glass → szklanka collins`;

module.exports = async (req, res) => {
  console.log('🍹 Recipe generator endpoint called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cocktailName, ingredients = [], language = 'pl' } = req.body;
    console.log(`📝 Generating recipe for: ${cocktailName} in ${language}`);

    let userPrompt;
    
    if (language === 'pl') {
      userPrompt = `Stwórz profesjonalny przepis na koktajl "${cocktailName}".
      
WYMAGANIA:
- Wszystkie teksty PO POLSKU (oprócz method które ma być po angielsku)
- Prawdziwa historia koktajlu z konkretnymi datami i twórcami
- Dokładne proporcje składników w ml (standardy IBA jeśli istnieją)
- Profesjonalne techniki barmańskie
- servingTemp: tylko liczba bez °C
- abv: tylko liczba bez % i bez ~
- method: po angielsku (shaken/stirred/built/blended)
- NIE UŻYWAJ EMOTEK

${ingredients.length > 0 ? `Użyj tych składników: ${ingredients.join(', ')}` : ''}`;
    } else {
      userPrompt = `Create a professional cocktail recipe for "${cocktailName}".
      
REQUIREMENTS:
- All text in ENGLISH
- Real cocktail history with specific dates and creators
- Exact ingredient measurements in ml (IBA standards if applicable)
- Professional bartending techniques
- servingTemp: number only without °C
- abv: number only without % or ~
- method: in English (shaken/stirred/built/blended)
- NO EMOJIS

${ingredients.length > 0 ? `Use these ingredients: ${ingredients.join(', ')}` : ''}`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: RECIPE_SYSTEM_PROMPT
        },
        { 
          role: "user", 
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1200
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('🤖 AI Response received');
    
    // Parse response
    let recipe;
    try {
      const cleanedResponse = aiResponse.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      recipe = JSON.parse(cleanedResponse);
      
      // Clean up data formatting
      if (recipe.servingTemp) {
        recipe.servingTemp = String(recipe.servingTemp).replace(/[°C]/g, '').trim();
      }
      if (recipe.abv) {
        recipe.abv = Number(String(recipe.abv).replace(/[~%]/g, '').trim());
      }
      
      // Ensure method is in English
      const methodMap = {
        'wstrząsany': 'shaken',
        'mieszany': 'stirred',
        'budowany': 'built',
        'blendowany': 'blended'
      };
      
      if (recipe.method && methodMap[recipe.method.toLowerCase()]) {
        recipe.method = methodMap[recipe.method.toLowerCase()];
      }
      
      // Add default values if missing
      recipe.servingTemp = recipe.servingTemp || "5";
      recipe.ice = recipe.ice || (language === 'pl' ? "kostki lodu" : "ice cubes");
      recipe.abv = recipe.abv || 20;
      recipe.prepTime = recipe.prepTime || 5;
      recipe.difficulty = recipe.difficulty || "medium";
      recipe.nameEn = recipe.nameEn || cocktailName;
      
      // Ensure proper formatting
      if (recipe.ingredients) {
        recipe.ingredients = recipe.ingredients.map(ing => ({
          name: ing.name,
          amount: String(ing.amount),
          unit: ing.unit || 'ml'
        }));
      }
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      // Fallback for parsing errors
      recipe = {
        name: cocktailName,
        nameEn: cocktailName,
        category: "classic",
        history: language === 'pl' 
          ? `${cocktailName} to klasyczny koktajl o bogatej historii.`
          : `${cocktailName} is a classic cocktail with a rich history.`,
        ingredients: [
          { name: language === 'pl' ? "Główny alkohol" : "Base spirit", amount: "60", unit: "ml" },
          { name: language === 'pl' ? "Modyfikator" : "Modifier", amount: "30", unit: "ml" }
        ],
        glassType: language === 'pl' ? "szklanka rocks" : "rocks glass",
        method: "stirred",
        instructions: language === 'pl' 
          ? ["Dodaj wszystkie składniki do szklanki", "Wymieszaj", "Podaj z lodem"]
          : ["Add all ingredients to glass", "Stir well", "Serve over ice"],
        garnish: language === 'pl' ? "Skórka cytryny" : "Lemon peel",
        ice: language === 'pl' ? "kostki lodu" : "ice cubes",
        servingTemp: "5",
        abv: 25,
        prepTime: 5,
        difficulty: "easy",
        flavor: language === 'pl' ? "Zbalansowany" : "Balanced",
        occasion: language === 'pl' ? "Wieczór" : "Evening",
        proTip: language === 'pl' 
          ? "Używaj świeżych składników"
          : "Use fresh ingredients",
        tags: language === 'pl' ? ["klasyczny"] : ["classic"]
      };
    }

    // Format final response to match frontend expectations
    const response = {
      ...recipe,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    console.log('✅ Sending professional recipe');
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipe',
      details: error.message 
    });
  }
};