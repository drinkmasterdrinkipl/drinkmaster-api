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

ICE USAGE:
- Mojito, Mint Julep = lód kruszony (crushed ice)
- Most cocktails = kostki lodu (ice cubes)
- Old Fashioned = duża kostka (large cube)

POLISH UNITS:
- ml = ml
- pieces = sztuki
- leaves = listki  
- dashes = krople
- tsp = łyżeczki

OUTPUT FORMAT:
{
  "cocktails": [
    {
      "name": "Name",
      "available": true,
      "description": "Description",
      "difficulty": "easy|medium|hard",
      "ingredients": [
        {"name": "ingredient", "amount": "amount", "unit": "unit"}
      ],
      "instructions": ["step1", "step2"],
      "glassType": "glass"
    }
  ],
  "almostPossible": {
    "name": "Cocktail",
    "missingIngredient": "What's missing",
    "description": "Description",
    "ingredients": [full ingredient list]
  },
  "shoppingList": [
    {
      "ingredient": "Item",
      "unlocksCount": number,
      "priority": "high|medium|low",
      "reason": "Why recommended",
      "newCocktails": ["cocktail1", "cocktail2"]
    }
  ]
}`;

module.exports = async (req, res) => {
  try {
    const { ingredients, language = 'pl' } = req.body;
    console.log(`MyBar request - Ingredients: ${ingredients}, Language: ${language}`);
    
    const userPrompt = language === 'pl'
      ? `Mam składniki: ${ingredients}

WAŻNE:
- Używaj dokładnie nazw składników które podałem (jeśli napisałem "whisky" nie zmieniaj na "bourbon")
- Podaj TYLKO autentyczne, klasyczne przepisy
- Mint Julep ZAWSZE z bourbonem, Mojito ZAWSZE z białym rumem
- Pełne listy składników dla każdego koktajlu
- Lód kruszony gdzie potrzebny (Mojito, Julep)

Zasugeruj koktajle możliwe do zrobienia, jeden prawie możliwy i strategiczny zakup.`
      : `I have ingredients: ${ingredients}

IMPORTANT:
- Use exactly the ingredient names I provided
- ONLY authentic, classic recipes
- Mint Julep ALWAYS with bourbon, Mojito ALWAYS with white rum
- Complete ingredient lists for each cocktail
- Crushed ice where appropriate

Suggest available cocktails, one almost possible, and strategic purchase.`;

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
    console.log('Raw MyBar AI Response:', aiResponse.substring(0, 200) + '...');
    
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
      console.log('Successfully parsed MyBar JSON');
      
      // Validate and fix data
      if (suggestions.cocktails) {
        suggestions.cocktails = suggestions.cocktails.filter(cocktail => {
          // Ensure ingredients exist
          if (!cocktail.ingredients || cocktail.ingredients.length === 0) {
            console.error('Removing cocktail with no ingredients:', cocktail.name);
            return false;
          }
          
          // Fix classic recipes if wrong
          if (cocktail.name.toLowerCase().includes('julep') && 
              cocktail.ingredients.some(i => i.name.toLowerCase().includes('rum'))) {
            console.log('Fixing Mint Julep - changing rum to bourbon');
            cocktail.ingredients.forEach(ing => {
              if (ing.name.toLowerCase().includes('rum')) {
                ing.name = 'Bourbon';
              }
            });
          }
          
          if (cocktail.name.toLowerCase().includes('mojito') && 
              cocktail.ingredients.some(i => i.name.toLowerCase().includes('whisk'))) {
            console.log('Fixing Mojito - changing whisky to white rum');
            cocktail.ingredients.forEach(ing => {
              if (ing.name.toLowerCase().includes('whisk')) {
                ing.name = language === 'pl' ? 'Biały rum' : 'White rum';
              }
            });
          }
          
          // Fix ice
          cocktail.ingredients.forEach(ing => {
            if (ing.name.toLowerCase().includes('lód') || ing.name.toLowerCase().includes('ice')) {
              ing.unit = "";
              
              if (cocktail.name.toLowerCase().includes('mojito') || 
                  cocktail.name.toLowerCase().includes('julep')) {
                ing.name = language === 'pl' ? 'Lód kruszony' : 'Crushed ice';
                ing.amount = language === 'pl' ? 'do pełna' : 'fill with';
              } else if (cocktail.name.toLowerCase().includes('old fashioned')) {
                ing.name = language === 'pl' ? 'Duża kostka lodu' : 'Large ice cube';
                ing.amount = '1';
              } else {
                ing.name = language === 'pl' ? 'Kostki lodu' : 'Ice cubes';
                ing.amount = language === 'pl' ? 'do pełna' : 'fill with';
              }
            }
          });
          
          // Ensure required fields
          cocktail.instructions = cocktail.instructions || [
            language === 'pl' ? 'Wymieszaj składniki' : 'Mix ingredients'
          ];
          cocktail.glassType = cocktail.glassType || (
            language === 'pl' ? 'odpowiednia szklanka' : 'appropriate glass'
          );
          
          return true;
        });
      }
      
      // Fix almostPossible
      if (suggestions.almostPossible && 
          (!suggestions.almostPossible.ingredients || suggestions.almostPossible.ingredients.length === 0)) {
        console.log('Fixing empty ingredients in almostPossible');
        suggestions.almostPossible = null;
      }
      
    } catch (e) {
      console.error('MyBar parse error:', e);
      
      // Safe fallback
      suggestions = {
        cocktails: [{
          name: language === 'pl' ? "Prosty drink" : "Simple drink",
          available: true,
          description: language === 'pl' 
            ? "Klasyczny drink z dostępnych składników"
            : "Classic drink with available ingredients",
          difficulty: "easy",
          ingredients: [
            { name: language === 'pl' ? "Alkohol" : "Spirit", amount: "50", unit: "ml" },
            { name: language === 'pl' ? "Kostki lodu" : "Ice cubes", amount: language === 'pl' ? "do pełna" : "fill with", unit: "" }
          ],
          instructions: language === 'pl'
            ? ["Napełnij szklankę lodem", "Dodaj alkohol", "Wymieszaj"]
            : ["Fill glass with ice", "Add spirit", "Stir"],
          glassType: language === 'pl' ? "szklanka" : "glass"
        }],
        almostPossible: null,
        shoppingList: [{
          ingredient: language === 'pl' ? "Cytryna" : "Lemon",
          unlocksCount: 5,
          priority: "high",
          reason: language === 'pl' 
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
          glassType: suggestions.almostPossible.glassType || (language === 'pl' ? "szklanka" : "glass")
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