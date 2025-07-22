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
5. Understand ingredient equivalents and common typos:
   - lemon/cytryna/cytyrna = fresh lemon juice
   - lime/limonka/liomka = fresh lime juice  
   - sugar/cukier/cukir = simple syrup
   - egg/jajko/jajo = egg white
   - soda/woda gazowana/gazowana = soda water
   - whisky/whiskey/wisky = whiskey
   - vodka/wódka/wodka = vodka
6. ONLY suggest cocktails where user has ALL required ingredients
7. For shopping suggestions, prioritize ingredients that unlock the most classic cocktails
8. Maximum 4 cocktails that can be made with given ingredients
9. Include COMPLETE recipe details like in professional recipe generator
10. NEVER suggest a cocktail if missing ANY ingredient (including soda water, tonic, etc.)

GLASSWARE RULES (ALWAYS USE CORRECT GLASS):
- Rocks/Old Fashioned glass: Whiskey Sour, Old Fashioned, Negroni
- Highball glass: Tom Collins, Mojito, Cuba Libre, Long Island
- Coupe glass: Margarita, Daiquiri, Clover Club
- Martini glass: Martini, Manhattan, Espresso Martini
- Wine glass: Aperol Spritz, Hugo
- Copper mug: Moscow Mule

INGREDIENT EQUIVALENTS AND TYPOS:
- Common typos: wisky->whisky, wodka->vodka, cytyna->cytryna, liomka->limonka
- gindzier->ginger beer, tonic->tonik, kampari->campari
- Always understand user intent even with typos

CLASSIC COCKTAIL RECIPES (USE EXACT PROPORTIONS):
- Whiskey Sour: whiskey 60ml, lemon juice 30ml, simple syrup 20ml
- Tom Collins: gin 50ml, lemon juice 25ml, simple syrup 15ml, soda water top
- Gin & Tonic: gin 50ml, tonic water 150ml
- Cuba Libre: rum 50ml, cola 120ml, lime juice 10ml
- Mojito: white rum 50ml, lime juice 30ml, sugar 2 tsp, mint 10-12 leaves, soda water top
- Margarita: tequila 50ml, triple sec 30ml, lime juice 20ml
- Negroni: gin 30ml, campari 30ml, sweet vermouth 30ml
- Old Fashioned: whiskey 60ml, sugar cube 1, bitters 2 dash
- Moscow Mule: vodka 50ml, lime juice 15ml, ginger beer 120ml

OUTPUT FORMAT:
{
  "cocktails": [
    {
      "name": "Cocktail name in requested language",
      "nameEn": "English name",
      "available": true,
      "description": "Brief description in requested language",
      "category": "classic/modern/tiki/sour",
      "ingredients": [
        {"name": "ingredient", "amount": "50", "unit": "ml"}
      ],
      "instructions": [
        "Complete step 1",
        "Complete step 2",
        "Complete step 3"
      ],
      "glassType": "correct glass type in requested language",
      "method": "shaken|stirred|built",
      "ice": "cubed|crushed|none",
      "garnish": "garnish description",
      "history": "Brief history in requested language"
    }
  ],
  "almostPossible": [
    {
      "name": "Cocktail name",
      "missingIngredient": "What's missing (be specific)",
      "description": "Description",
      "ingredients": [full ingredient list]
    }
  ],
  "shoppingList": [
    {
      "ingredient": "Item to buy",
      "unlocksCount": number,
      "priority": "high|medium|low", 
      "reason": "Why recommended in requested language",
      "newCocktails": ["cocktail1", "cocktail2", "cocktail3"]
    }
  ]
}

IMPORTANT:
- If user has gin, lemon, sugar but NO soda water - Tom Collins goes to almostPossible
- If user has vodka, lime but NO ginger beer - Moscow Mule goes to almostPossible
- Always check EVERY ingredient before suggesting as available`;

module.exports = async (req, res) => {
  try {
    const { ingredients, language } = req.body;
    const requestLanguage = language || 'en';
    
    console.log(`🍹 MyBar request - Ingredients: ${ingredients}`);
    console.log(`🌍 Language: ${requestLanguage}`);
    
    const userPrompt = requestLanguage === 'pl'
      ? `Mam te składniki (mogą zawierać błędy): ${ingredients.join(', ')}

KRYTYCZNE ZASADY:
- Rozpoznaj składniki nawet z błędami (np. "cytyna" = cytryna, "wisky" = whisky)
- Podaj TYLKO koktajle które NAPRAWDĘ można zrobić ze WSZYSTKICH wymaganych składników
- Jeśli brakuje JAKIEGOKOLWIEK składnika (np. woda gazowana, tonik) - koktajl idzie do almostPossible
- Maksymalnie 4 koktajle w sekcji cocktails
- Dla każdego koktajlu podaj PEŁNY przepis jak w profesjonalnym barze
- Używaj DOKŁADNYCH proporcji i prawidłowych szklanek
- W almostPossible podaj maksymalnie 3 koktajle gdzie brakuje tylko 1 składnika
- W shoppingList podaj 2 najlepsze zakupy
- Wszystkie teksty po polsku

Przykład: jeśli użytkownik ma gin, cytrynę, cukier ale NIE MA wody gazowanej - Tom Collins NIE może być w cocktails, tylko w almostPossible z informacją że brakuje wody gazowanej.

RETURN ONLY VALID JSON!`
      : `I have these ingredients (may contain typos): ${ingredients.join(', ')}

CRITICAL RULES:
- Recognize ingredients even with typos (e.g. "lemon" = lemon juice, "wisky" = whisky)
- Suggest ONLY cocktails that can ACTUALLY be made with ALL required ingredients
- If missing ANY ingredient (e.g. soda water, tonic) - cocktail goes to almostPossible
- Maximum 4 cocktails in cocktails section
- For each cocktail provide COMPLETE recipe like in professional bar
- Use EXACT proportions and correct glassware
- In almostPossible include max 3 cocktails missing only 1 ingredient
- In shoppingList suggest 2 best purchases
- All text in English

Example: if user has gin, lemon, sugar but NO soda water - Tom Collins CANNOT be in cocktails, only in almostPossible noting soda water is missing.

RETURN ONLY VALID JSON!`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MYBAR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000,
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
      
      // Process cocktails section
      if (suggestions.cocktails) {
        suggestions.cocktails = suggestions.cocktails.map(cocktail => {
          // Ensure all required fields
          const processed = {
            ...cocktail,
            available: true,
            category: cocktail.category || 'classic',
            method: cocktail.method || 'stirred',
            ice: cocktail.ice || (requestLanguage === 'pl' ? 'kostki' : 'cubed'),
            glassType: cocktail.glassType || (requestLanguage === 'pl' ? 'szklanka' : 'glass'),
            garnish: cocktail.garnish || '',
            history: cocktail.history || '',
            instructions: cocktail.instructions || [
              requestLanguage === 'pl' ? 'Wymieszaj składniki' : 'Mix ingredients'
            ]
          };
          
          // Fix glass types for Polish
          if (requestLanguage === 'pl') {
            processed.glassType = processed.glassType
              .replace('szklanka wysokiej', 'szklanka highball')
              .replace('kieliszek do martini', 'kieliszek martini');
          }
          
          return processed;
        });
      }
      
      // Process almostPossible section - now it's an array
      if (suggestions.almostPossible && Array.isArray(suggestions.almostPossible)) {
        // Keep it as array, just ensure fields
        suggestions.almostPossible = suggestions.almostPossible.map(item => ({
          ...item,
          ingredients: item.ingredients || []
        }));
      } else if (suggestions.almostPossible && !Array.isArray(suggestions.almostPossible)) {
        // Convert single object to array
        suggestions.almostPossible = [suggestions.almostPossible];
      }
      
    } catch (e) {
      console.error('MyBar parse error:', e);
      
      // Safe fallback
      suggestions = {
        cocktails: [],
        almostPossible: [],
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
    
    // Process almostPossible - support both array and single object
    if (suggestions.almostPossible) {
      const almostPossibleArray = Array.isArray(suggestions.almostPossible) 
        ? suggestions.almostPossible 
        : [suggestions.almostPossible];
      
      transformedResponse.missingOneIngredient = almostPossibleArray
        .filter(item => item && item.ingredients && item.ingredients.length > 0)
        .map(item => ({
          drink: {
            name: item.name,
            nameEn: item.nameEn || item.name,
            description: item.description || '',
            available: false,
            category: item.category || "classic",
            method: item.method || "stirred",
            ice: item.ice || (requestLanguage === 'pl' ? 'kostki' : 'cubed'),
            instructions: item.instructions || [],
            glassType: item.glassType || (requestLanguage === 'pl' ? "szklanka" : "glass"),
            ingredients: item.ingredients,
            garnish: item.garnish || '',
            history: item.history || ''
          },
          missingIngredient: item.missingIngredient
        }));
    } else {
      transformedResponse.missingOneIngredient = [];
    }

    res.json({ data: transformedResponse });
    
  } catch (error) {
    console.error('MyBar error:', error);
    res.status(500).json({ error: error.message });
  }
};