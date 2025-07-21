const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MYBAR_SYSTEM_PROMPT = `You are a world-class bartender helping users make cocktails with available ingredients.

CRITICAL RULES:
1. Use ONLY authentic classic recipes with correct base spirits
2. Return ONLY valid JSON - no markdown
3. ALL text in requested language (pl/en)
4. Never return empty ingredients arrays
5. Use exact ingredient names from user input

CLASSIC RECIPES (NEVER CHANGE BASE SPIRIT):
- Mint Julep: BOURBON (not rum), mint, sugar, crushed ice
- Mojito: WHITE RUM (not whisky), lime, mint, sugar, soda
- Whiskey Sour: WHISKEY/BOURBON, lemon, sugar
- Daiquiri: WHITE RUM, lime, sugar
- Margarita: TEQUILA, Cointreau/Triple Sec, lime
- Martini: GIN, dry vermouth
- Manhattan: RYE/BOURBON, sweet vermouth, bitters
- Old Fashioned: BOURBON/RYE, sugar, bitters

LANGUAGE-SPECIFIC TERMS:

Polish (pl):
- ice = lód
- crushed ice = lód kruszony
- ice cubes = kostki lodu
- large ice cube = duża kostka lodu
- ml = ml
- pieces = sztuki
- leaves = listki
- dashes = krople
- tsp = łyżeczki

English (en):
- Use standard bartending terms

OUTPUT FORMAT:
{
  "cocktails": [
    {
      "name": "Name in request language",
      "available": true,
      "description": "Description in request language",
      "difficulty": "easy|medium|hard",
      "ingredients": [
        {"name": "ingredient in request language", "amount": "amount", "unit": "unit"}
      ],
      "instructions": ["step1 in request language", "step2"],
      "glassType": "glass type in request language"
    }
  ],
  "almostPossible": {
    "name": "Cocktail name in request language",
    "missingIngredient": "What's missing in request language",
    "description": "Description in request language",
    "ingredients": [full ingredient list in request language]
  },
  "shoppingList": [
    {
      "ingredient": "Item in request language",
      "unlocksCount": number,
      "priority": "high|medium|low",
      "reason": "Why recommended in request language",
      "newCocktails": ["cocktail1", "cocktail2"]
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
      ? `I have these ingredients: ${ingredients}

CRITICAL:
- ALL text must be in POLISH
- Use Polish terms (kostki lodu, świeży sok z limonki, etc.)
- Use exactly the ingredient names I provided
- Only authentic classic recipes
- Mint Julep ALWAYS with bourbon, Mojito ALWAYS with white rum

Suggest available cocktails, one almost possible, and strategic purchases.`
      : `I have these ingredients: ${ingredients}

CRITICAL:
- ALL text must be in ENGLISH
- Use exactly the ingredient names I provided
- Only authentic classic recipes
- Mint Julep ALWAYS with bourbon, Mojito ALWAYS with white rum

Suggest available cocktails, one almost possible, and strategic purchases.`;

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
      
      // Validate and ensure language consistency
      if (suggestions.cocktails) {
        suggestions.cocktails = suggestions.cocktails.filter(cocktail => {
          // Ensure ingredients exist
          if (!cocktail.ingredients || cocktail.ingredients.length === 0) {
            console.error('Removing cocktail with no ingredients:', cocktail.name);
            return false;
          }
          
          // Fix classic recipes if base spirit is wrong
          const nameLower = cocktail.name.toLowerCase();
          
          if (nameLower.includes('julep') && 
              cocktail.ingredients.some(i => i.name.toLowerCase().includes('rum'))) {
            console.log('Fixing Mint Julep - changing rum to bourbon');
            cocktail.ingredients.forEach(ing => {
              if (ing.name.toLowerCase().includes('rum')) {
                ing.name = requestLanguage === 'pl' ? 'Bourbon' : 'Bourbon';
              }
            });
          }
          
          if (nameLower.includes('mojito') && 
              cocktail.ingredients.some(i => i.name.toLowerCase().includes('whisk'))) {
            console.log('Fixing Mojito - changing whisky to white rum');
            cocktail.ingredients.forEach(ing => {
              if (ing.name.toLowerCase().includes('whisk')) {
                ing.name = requestLanguage === 'pl' ? 'Biały rum' : 'White rum';
              }
            });
          }
          
          // Ensure instructions exist
          cocktail.instructions = cocktail.instructions || [
            requestLanguage === 'pl' ? 'Wymieszaj składniki' : 'Mix ingredients'
          ];
          
          // Ensure glass type
          cocktail.glassType = cocktail.glassType || (
            requestLanguage === 'pl' ? 'odpowiednia szklanka' : 'appropriate glass'
          );
          
          return true;
        });
      }
      
      // Fix almostPossible if empty ingredients
      if (suggestions.almostPossible && 
          (!suggestions.almostPossible.ingredients || suggestions.almostPossible.ingredients.length === 0)) {
        console.log('Removing almostPossible with empty ingredients');
        suggestions.almostPossible = null;
      }
      
    } catch (e) {
      console.error('MyBar parse error:', e);
      
      // Fallback response
      suggestions = {
        cocktails: [{
          name: requestLanguage === 'pl' ? "Prosty drink" : "Simple drink",
          available: true,
          description: requestLanguage === 'pl' 
            ? "Klasyczny drink z dostępnych składników"
            : "Classic drink with available ingredients",
          difficulty: "easy",
          ingredients: [
            { 
              name: requestLanguage === 'pl' ? "Alkohol" : "Spirit", 
              amount: "50", 
              unit: "ml" 
            },
            { 
              name: requestLanguage === 'pl' ? "Kostki lodu" : "Ice cubes", 
              amount: requestLanguage === 'pl' ? "do pełna" : "fill with", 
              unit: "" 
            }
          ],
          instructions: requestLanguage === 'pl'
            ? ["Napełnij szklankę lodem", "Dodaj alkohol", "Wymieszaj"]
            : ["Fill glass with ice", "Add spirit", "Stir"],
          glassType: requestLanguage === 'pl' ? "szklanka" : "glass"
        }],
        almostPossible: null,
        shoppingList: [{
          ingredient: requestLanguage === 'pl' ? "Cytryna" : "Lemon",
          unlocksCount: 5,
          priority: "high",
          reason: requestLanguage === 'pl' 
            ? "Podstawa wielu klasycznych koktajli"
            : "Essential for many classic cocktails",
          newCocktails: ["Whiskey Sour", "Tom Collins", "Daiquiri"]
        }]
      };
    }

    // Transform for frontend
    const transformedResponse = {
      cocktails: suggestions.cocktails || [],
      shoppingList: suggestions.shoppingList || []
    };
    
    if (suggestions.almostPossible && suggestions.almostPossible.ingredients && 
        suggestions.almostPossible.ingredients.length > 0) {
      transformedResponse.missingOneIngredient = [{
        drink: {
          ...suggestions.almostPossible,
          available: false,
          difficulty: suggestions.almostPossible.difficulty || "easy",
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