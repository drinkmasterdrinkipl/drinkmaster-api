const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MYBAR_SYSTEM_PROMPT = `You are an expert bartender helping users make cocktails with available ingredients.

LANGUAGE: Respond in the language specified in the request (pl/en).

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown or formatting
2. Suggest ONLY cocktails possible with given ingredients
3. Recommend ONE strategic ingredient that unlocks most new cocktails
4. Calculate realistic "unlocksCount" based on classic recipes
5. Include one "almost possible" cocktail missing just 1 ingredient

OUTPUT FORMAT (EXACTLY):
{
  "cocktails": [
    {
      "name": "[Cocktail name]",
      "available": true,
      "description": "[Why this cocktail is perfect with these ingredients]",
      "difficulty": "[easy|medium|hard]",
      "ingredients": [
        {"name": "[ingredient]", "amount": "[number]", "unit": "[ml|dash|piece]"}
      ],
      "instructions": ["[Step 1]", "[Step 2]", "[Step 3]"],
      "glassType": "[glass type]"
    }
  ],
  "almostPossible": {
    "name": "[Cocktail name]",
    "missingIngredient": "[What's missing]",
    "description": "[What this cocktail would add to your repertoire]",
    "ingredients": [
      {"name": "[ingredient]", "amount": "[number]", "unit": "[ml|dash|piece]"}
    ]
  },
  "shoppingList": [
    {
      "ingredient": "[Most valuable addition]",
      "unlocksCount": [number],
      "priority": "[high|medium|low]",
      "reason": "[Why this ingredient is recommended]",
      "newCocktails": ["[Cocktail 1]", "[Cocktail 2]", "[Cocktail 3]"]
    }
  ]
}

POLISH EXAMPLE for "gin, cytryna, cukier":
{
  "cocktails": [
    {
      "name": "Gin Sour",
      "available": true,
      "description": "Klasyczny sour z idealną równowagą ginu, świeżej cytryny i słodyczy. Orzeźwiający i elegancki.",
      "difficulty": "easy",
      "ingredients": [
        {"name": "Gin", "amount": "50", "unit": "ml"},
        {"name": "Sok z cytryny", "amount": "25", "unit": "ml"},
        {"name": "Syrop cukrowy", "amount": "15", "unit": "ml"}
      ],
      "instructions": [
        "Przygotuj syrop cukrowy (1:1 cukier z wodą)",
        "Wstrząśnij wszystkie składniki z lodem",
        "Przecedź do kieliszka coupe"
      ],
      "glassType": "kieliszek coupe"
    }
  ],
  "almostPossible": {
    "name": "Gin Fizz",
    "missingIngredient": "Woda sodowa",
    "description": "Dodając wodę sodową, przekształcisz Gin Sour w orzeźwiający, musujący Gin Fizz - idealny na lato!",
    "ingredients": [
      {"name": "Gin", "amount": "50", "unit": "ml"},
      {"name": "Sok z cytryny", "amount": "25", "unit": "ml"},
      {"name": "Syrop cukrowy", "amount": "15", "unit": "ml"},
      {"name": "Woda sodowa", "amount": "60", "unit": "ml"}
    ]
  },
  "shoppingList": [
    {
      "ingredient": "Woda sodowa",
      "unlocksCount": 8,
      "priority": "high",
      "reason": "Podstawa wielu klasycznych drinków, dodaje orzeźwienia i lekkości",
      "newCocktails": ["Gin Fizz", "Tom Collins", "Mojito", "Cuba Libre", "Paloma"]
    }
  ]
}`;

module.exports = async (req, res) => {
  try {
    const { ingredients, language = 'pl' } = req.body;
    console.log(`MyBar request - Ingredients: ${ingredients}, Language: ${language}`);
    
    const userPrompt = language === 'pl'
      ? `Mam te składniki: ${ingredients}. Zasugeruj koktajle które mogę zrobić, jeden który prawie mogę zrobić (brakuje 1 składnika) i co warto dokupić. Odpowiedz w formacie JSON po polsku.`
      : `I have these ingredients: ${ingredients}. Suggest cocktails I can make, one I almost can make (missing 1 ingredient), and what's worth buying. Respond in JSON format in English.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MYBAR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponse = response.choices[0].message.content;
    console.log('Raw MyBar AI Response:', aiResponse.substring(0, 200) + '...');
    
    // Aggressive cleaning
    let cleanedResponse = aiResponse;
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    cleanedResponse = cleanedResponse.trim();
    
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    let suggestions;
    try {
      suggestions = JSON.parse(cleanedResponse);
      console.log('Successfully parsed MyBar JSON');
      
      // Validate structure
      if (!suggestions.cocktails || !Array.isArray(suggestions.cocktails)) {
        throw new Error('Invalid structure - missing cocktails array');
      }
      
      // Convert unlocksCount to number if needed
      if (suggestions.shoppingList && suggestions.shoppingList[0]) {
        if (typeof suggestions.shoppingList[0].unlocksCount === 'string') {
          suggestions.shoppingList[0].unlocksCount = parseInt(suggestions.shoppingList[0].unlocksCount) || 5;
        }
      }
    } catch (e) {
      console.error('MyBar parse error:', e);
      console.error('Failed to parse:', cleanedResponse.substring(0, 500));
      
      // Smart fallback based on ingredients
      const ingredientsList = ingredients.toLowerCase();
      
      const fallbackResponse = {
        cocktails: [{
          name: language === 'pl' ? "Prosty drink" : "Simple drink",
          available: true,
          description: language === 'pl' 
            ? "Klasyczny drink z dostępnych składników"
            : "Classic drink with available ingredients",
          difficulty: "easy",
          ingredients: [
            { 
              name: ingredientsList.includes('whisky') ? 'Whisky' : 
                    ingredientsList.includes('gin') ? 'Gin' : 
                    ingredientsList.includes('rum') ? 'Rum' : 
                    language === 'pl' ? 'Alkohol' : 'Spirit', 
              amount: "50", 
              unit: "ml" 
            }
          ],
          instructions: language === 'pl'
            ? ["Wymieszaj składniki", "Podaj z lodem"]
            : ["Mix ingredients", "Serve with ice"],
          glassType: language === 'pl' ? "szklanka" : "glass"
        }],
        almostPossible: {
          name: language === 'pl' ? "Klasyczny koktajl" : "Classic cocktail",
          missingIngredient: language === 'pl' ? "Dodatkowy składnik" : "Additional ingredient",
          description: language === 'pl'
            ? "Dodaj ten składnik aby stworzyć więcej możliwości"
            : "Add this ingredient to create more possibilities",
          ingredients: [
            { name: language === 'pl' ? "Składnik" : "Ingredient", amount: "50", unit: "ml" }
          ]
        },
        shoppingList: [{
          ingredient: language === 'pl' ? "Woda sodowa" : "Soda water",
          unlocksCount: 5,
          priority: "high",
          reason: language === 'pl' 
            ? "Podstawowy składnik wielu koktajli"
            : "Basic ingredient for many cocktails",
          newCocktails: ["Fizz", "Collins", "Highball"]
        }]
      };
      
      suggestions = fallbackResponse;
    }

    // Transform for compatibility with frontend
    const transformedResponse = {
      cocktails: suggestions.cocktails,
      shoppingList: suggestions.shoppingList
    };
    
    // Add almostPossible to missingOneIngredient array if exists
    if (suggestions.almostPossible) {
      transformedResponse.missingOneIngredient = [{
        drink: {
          ...suggestions.almostPossible,
          available: false,
          difficulty: "easy",
          instructions: ["Mix", "Serve"],
          glassType: suggestions.almostPossible.glassType || "glass"
        },
        missingIngredient: suggestions.almostPossible.missingIngredient
      }];
    }

    const result = {
      data: transformedResponse
    };

    res.json(result);
  } catch (error) {
    console.error('MyBar error:', error);
    res.status(500).json({ error: error.message });
  }
};