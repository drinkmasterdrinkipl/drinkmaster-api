const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MYBAR_SYSTEM_PROMPT = `You are a world-class bartender helping users make cocktails with available ingredients. You have deep knowledge of classic cocktails and their authentic recipes.

CRITICAL RULES:
1. Use ONLY authentic classic recipes with correct proportions
2. Return ONLY valid JSON - no markdown
3. ALL text in requested language (pl/en)
4. Never return empty ingredients arrays
5. Understand ingredient equivalents (e.g., lemon = lemon juice, sugar = simple syrup)
6. Suggest ONLY cocktails that can actually be made with given ingredients
7. For shopping suggestions, prioritize ingredients that unlock the most classic cocktails

INGREDIENT EQUIVALENTS:
- lemon/cytryna = fresh lemon juice
- lime/limonka = fresh lime juice  
- sugar/cukier = simple syrup
- egg/jajko = egg white
- soda/woda gazowana = soda water

CLASSIC COCKTAIL KNOWLEDGE:
- Whiskey Sour: whiskey, lemon juice, simple syrup (optional: egg white)
- Gin & Tonic: gin, tonic water
- Gin Sour: gin, lemon juice, simple syrup
- Cuba Libre: rum, cola, lime juice
- Long Island Iced Tea: vodka, gin, rum, tequila, triple sec, lemon juice, simple syrup, cola
- Margarita: tequila, triple sec/cointreau, lime juice
- Mojito: white rum, lime juice, sugar, mint, soda water
- Old Fashioned: whiskey/bourbon, sugar, bitters
- Manhattan: whiskey, sweet vermouth, bitters
- Negroni: gin, campari, sweet vermouth
- Martini: gin, dry vermouth
- Daiquiri: white rum, lime juice, simple syrup
- Tom Collins: gin, lemon juice, simple syrup, soda water
- Moscow Mule: vodka, lime juice, ginger beer
- Aperol Spritz: aperol, prosecco, soda water
- Espresso Martini: vodka, coffee liqueur, espresso
- Cosmopolitan: vodka, triple sec, lime juice, cranberry juice
- Mai Tai: rum, orange curaçao, orgeat, lime juice

OUTPUT FORMAT:
{
  "cocktails": [
    {
      "name": "Cocktail name",
      "available": true,
      "description": "Brief description",
      "difficulty": "easy|medium|hard",
      "ingredients": [
        {"name": "ingredient", "amount": "50", "unit": "ml"}
      ],
      "instructions": ["step1", "step2", "step3"],
      "glassType": "glass type",
      "method": "shaken|stirred|built",
      "ice": "cubed|crushed|none",
      "garnish": "garnish description"
    }
  ],
  "almostPossible": {
    "name": "Cocktail name",
    "missingIngredient": "What's missing",
    "description": "Description",
    "ingredients": [full ingredient list]
  },
  "shoppingList": [
    {
      "ingredient": "Item to buy",
      "unlocksCount": number,
      "priority": "high|medium|low", 
      "reason": "Why recommended",
      "newCocktails": ["cocktail1", "cocktail2", "cocktail3"]
    }
  ]
}`;

module.exports = async (req, res) => {
  try {
    const { ingredients, language } = req.body;
    const requestLanguage = language || 'en';
    
    console.log(`🍹 MyBar request - Ingredients: ${ingredients}`);
    console.log(`🌍 Language: ${requestLanguage}`);
    
    const userPrompt = requestLanguage === 'pl'
      ? `Mam te składniki: ${ingredients.join(', ')}

WAŻNE ZASADY:
- Traktuj cytryną jako sok z cytryny, limonkę jako sok z limonki, cukier jako syrop cukrowy
- Podaj MAKSYMALNIE 4 koktajle które NAPRAWDĘ można zrobić z tych składników
- Jeśli można zrobić mniej niż 4, podaj tylko te które są możliwe
- Używaj DOKŁADNYCH proporcji z klasycznych receptur
- Dla każdego koktajlu podaj pełną listę składników i instrukcje
- W shoppingList podaj 2 najlepsze zakupy które odblokują najwięcej klasycznych koktajli
- Wszystkie teksty po polsku

RETURN ONLY VALID JSON!`
      : `I have these ingredients: ${ingredients.join(', ')}

IMPORTANT RULES:
- Treat lemon as lemon juice, lime as lime juice, sugar as simple syrup
- Suggest MAXIMUM 4 cocktails that can ACTUALLY be made with these ingredients
- If less than 4 are possible, only suggest those that are possible
- Use EXACT proportions from classic recipes
- For each cocktail provide full ingredient list and instructions
- In shoppingList suggest 2 best purchases that unlock the most classic cocktails
- All text in English

RETURN ONLY VALID JSON!`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MYBAR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2500,
    });

    const aiResponse = response.choices[0].message.content;
    console.log('🤖 Raw MyBar Response:', aiResponse.substring(0, 200) + '...');
    
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
    
    let suggestions;
    try {
      suggestions = JSON.parse(cleanedResponse);
      console.log('✅ Successfully parsed MyBar JSON');
      
      // Ensure proper structure and add missing fields
      if (suggestions.cocktails) {
        suggestions.cocktails = suggestions.cocktails.map(cocktail => ({
          ...cocktail,
          available: true,
          difficulty: cocktail.difficulty || 'medium',
          method: cocktail.method || 'stirred',
          ice: cocktail.ice || (requestLanguage === 'pl' ? 'kostki' : 'cubed'),
          glassType: cocktail.glassType || (requestLanguage === 'pl' ? 'szklanka' : 'glass'),
          garnish: cocktail.garnish || '',
          instructions: cocktail.instructions || [
            requestLanguage === 'pl' ? 'Wymieszaj składniki' : 'Mix ingredients'
          ]
        }));
      }
      
    } catch (e) {
      console.error('MyBar parse error:', e);
      
      // Safe fallback
      suggestions = {
        cocktails: [],
        almostPossible: null,
        shoppingList: [{
          ingredient: requestLanguage === 'pl' ? "Cytryna" : "Lemon",
          unlocksCount: 5,
          priority: "high",
          reason: requestLanguage === 'pl' 
            ? "Podstawa wielu klasycznych koktajli"
            : "Essential for many classic cocktails",
          newCocktails: ["Whiskey Sour", "Tom Collins", "Gin Fizz"]
        }]
      };
    }

    // Transform for frontend compatibility
    const transformedResponse = {
      cocktails: suggestions.cocktails || [],
      shoppingList: suggestions.shoppingList || []
    };
    
    // Add missing one ingredient if exists
    if (suggestions.almostPossible && suggestions.almostPossible.ingredients && 
        suggestions.almostPossible.ingredients.length > 0) {
      transformedResponse.missingOneIngredient = [{
        drink: {
          ...suggestions.almostPossible,
          available: false,
          difficulty: suggestions.almostPossible.difficulty || "medium",
          method: suggestions.almostPossible.method || "stirred",
          ice: suggestions.almostPossible.ice || (requestLanguage === 'pl' ? 'kostki' : 'cubed'),
          instructions: suggestions.almostPossible.instructions || [],
          glassType: suggestions.almostPossible.glassType || (
            requestLanguage === 'pl' ? "szklanka" : "glass"
          )
        },
        missingIngredient: suggestions.almostPossible.missingIngredient
      }];
    }

    res.json({ data: transformedResponse });
    
  } catch (error) {
    console.error('MyBar error:', error);
    res.status(500).json({ error: error.message });
  }
};