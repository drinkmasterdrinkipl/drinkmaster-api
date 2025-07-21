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
10. ALWAYS create recipe for the EXACT cocktail requested

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
  "glassType": "[glass type - SHORT name]",
  "method": "[method in requested language]",
  "instructions": [
    "[Professional step 1]",
    "[Professional step 2]",
    "[Professional step 3]"
  ],
  "garnish": "[Professional garnish description]",
  "ice": "[Type of ice]",
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
GLASS TYPES (use SHORT names):
- rocks glass → rocks
- coupe glass → coupe
- highball glass → highball
- martini glass → martini
- collins glass → collins
- hurricane glass → hurricane
- flute glass → flute
- shot glass → shot
- wine glass → kieliszek

METHODS:
- shaken → wstrząsany
- stirred → mieszany
- built → budowany
- blended → blendowany
- thrown → rzucany
- rolled → toczony

ICE TYPES:
- ice cubes → kostki
- crushed ice → kruszony
- large cube → duża kostka
- no ice → bez lodu
- sphere → kula

ENGLISH GLASS TYPES (SHORT):
- rocks/old fashioned
- coupe
- highball
- martini
- collins
- hurricane
- flute
- shot`;

module.exports = async (req, res) => {
  console.log('🍹 Recipe generator endpoint called');
  console.log('📥 Full request body:', req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { drinkName, cocktailName, ingredients = [], language = 'pl' } = req.body;
    const finalCocktailName = drinkName || cocktailName;
    
    console.log(`📝 Generating recipe for: ${finalCocktailName} in ${language}`);
    
    if (!finalCocktailName) {
      return res.status(400).json({ error: 'Cocktail name is required' });
    }

    let userPrompt;
    
    if (language === 'pl') {
      userPrompt = `Stwórz profesjonalny przepis na koktajl "${finalCocktailName}".
      
WAŻNE: 
- Musisz stworzyć przepis na DOKŁADNIE TEN koktajl: ${finalCocktailName}
- NIE TWÓRZ przepisu na inny koktajl!
- name: dokładnie "${finalCocktailName}"

WYMAGANIA:
- Wszystkie teksty PO POLSKU
- method: po polsku (wstrząsany/mieszany/budowany/blendowany)
- glassType: KRÓTKA nazwa po polsku (rocks/coupe/highball/martini/collins)
- ice: krótko po polsku (kostki/kruszony/duża kostka/bez lodu)
- Prawdziwa historia koktajlu z konkretnymi datami i twórcami
- Dokładne proporcje składników w ml (standardy IBA jeśli istnieją)
- servingTemp: tylko liczba bez °C
- abv: tylko liczba bez % i bez ~
- NIE UŻYWAJ EMOTEK

${ingredients.length > 0 ? `Użyj tych składników: ${ingredients.join(', ')}` : ''}`;
    } else {
      userPrompt = `Create a professional cocktail recipe for "${finalCocktailName}".
      
IMPORTANT: 
- You must create a recipe for EXACTLY THIS cocktail: ${finalCocktailName}
- DO NOT create a recipe for any other cocktail!
- name: exactly "${finalCocktailName}"

REQUIREMENTS:
- All text in ENGLISH
- method: in English (shaken/stirred/built/blended)
- glassType: SHORT name (rocks/coupe/highball/martini/collins)
- ice: short form (cubed/crushed/large cube/no ice)
- Real cocktail history with specific dates and creators
- Exact ingredient measurements in ml (IBA standards if applicable)
- servingTemp: number only without °C
- abv: number only without % or ~
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
      
      // Ensure name matches request
      recipe.name = recipe.name || finalCocktailName;
      recipe.nameEn = recipe.nameEn || finalCocktailName;
      
      // Add default values if missing
      recipe.servingTemp = recipe.servingTemp || "5";
      recipe.ice = recipe.ice || (language === 'pl' ? "kostki" : "cubed");
      recipe.abv = recipe.abv || 20;
      recipe.prepTime = recipe.prepTime || 5;
      recipe.difficulty = recipe.difficulty || "medium";
      
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
      
      // Fallback for parsing errors - SPECIFIC to requested cocktail
      const fallbackRecipes = {
        'Negroni': {
          pl: {
            name: "Negroni",
            ingredients: [
              { name: "gin", amount: "30", unit: "ml" },
              { name: "Campari", amount: "30", unit: "ml" },
              { name: "słodki wermut", amount: "30", unit: "ml" }
            ],
            method: "mieszany",
            glassType: "rocks",
            history: "Negroni został stworzony w 1919 roku we Florencji, gdy hrabia Camillo Negroni poprosił o wzmocnienie swojego ulubionego koktajlu Americano poprzez zastąpienie wody sodowej ginem."
          }
        },
        'Daiquiri': {
          pl: {
            name: "Daiquiri",
            ingredients: [
              { name: "biały rum", amount: "60", unit: "ml" },
              { name: "sok z limonki", amount: "25", unit: "ml" },
              { name: "syrop cukrowy", amount: "15", unit: "ml" }
            ],
            method: "wstrząsany",
            glassType: "coupe",
            history: "Daiquiri powstało około 1898 roku na Kubie, w kopalni żelaza niedaleko Santiago de Cuba. Nazwę zawdzięcza plaży Daiquiri."
          }
        }
      };
      
      const fallback = fallbackRecipes[finalCocktailName]?.[language] || {
        name: finalCocktailName,
        ingredients: [
          { name: language === 'pl' ? "Główny alkohol" : "Base spirit", amount: "60", unit: "ml" },
          { name: language === 'pl' ? "Modyfikator" : "Modifier", amount: "30", unit: "ml" }
        ],
        method: language === 'pl' ? "mieszany" : "stirred",
        glassType: "rocks",
        history: language === 'pl' 
          ? `${finalCocktailName} to klasyczny koktajl o bogatej historii.`
          : `${finalCocktailName} is a classic cocktail with a rich history.`
      };
      
      recipe = {
        ...fallback,
        nameEn: finalCocktailName,
        category: "classic",
        instructions: language === 'pl' 
          ? ["Dodaj wszystkie składniki do szklanki", "Wymieszaj", "Podaj z lodem"]
          : ["Add all ingredients to glass", "Stir well", "Serve over ice"],
        garnish: language === 'pl' ? "Skórka cytryny" : "Lemon peel",
        ice: language === 'pl' ? "kostki" : "cubed",
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

    console.log('✅ Sending recipe for:', response.name);
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipe',
      details: error.message 
    });
  }
};