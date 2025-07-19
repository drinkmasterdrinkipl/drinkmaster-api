const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MYBAR_SYSTEM_PROMPT = `You are a world-class bartender with IBA certification and deep knowledge of classic cocktail recipes.

LANGUAGE: Respond in the requested language (pl/en).

CRITICAL COCKTAIL RULES:
1. Use ONLY authentic IBA (International Bartenders Association) recipes
2. NEVER substitute base spirits (Mint Julep = bourbon, Mojito = white rum, etc.)
3. Respect classic proportions and methods
4. Return ONLY valid JSON without any markdown

CLASSIC RECIPES (MUST BE EXACT):
- Mint Julep: 60ml bourbon, 10ml simple syrup, 8 mint leaves, crushed ice
- Mojito: 45ml white rum, 20ml lime juice, 6 mint leaves, 2 tsp sugar, soda water
- Whiskey Sour: 45ml bourbon, 25ml lemon juice, 20ml simple syrup, optional egg white
- Old Fashioned: 45ml bourbon/rye, 1 sugar cube, 2 dashes Angostura bitters
- Martini: 60ml gin, 10ml dry vermouth
- Manhattan: 50ml rye whiskey, 20ml sweet vermouth, 2 dashes Angostura
- Negroni: 30ml gin, 30ml Campari, 30ml sweet vermouth
- Margarita: 35ml tequila, 20ml Cointreau, 15ml lime juice
- Daiquiri: 45ml white rum, 25ml lime juice, 15ml simple syrup
- Mai Tai: 30ml white rum, 15ml dark rum, 15ml Orange Curaçao, 15ml Orgeat, 30ml lime juice

POLISH UNITS (EXACT TRANSLATIONS):
- ml = ml
- pieces = sztuki (1 sztuka, 2-4 sztuki, 5+ sztuk)
- dashes = krople (1 kropla, 2-4 krople, 5+ kropli)
- bar spoon = łyżka barmańska
- leaves = listki
- crushed ice = lód kruszony
- ice cubes = kostki lodu
- tsp = łyżeczka
- pinch = szczypta

OUTPUT FORMAT:
{
  "cocktails": [
    {
      "name": "[Exact cocktail name]",
      "available": true,
      "description": "[Professional description]",
      "difficulty": "easy|medium|hard",
      "ingredients": [
        {"name": "[exact ingredient]", "amount": "[exact amount]", "unit": "[correct unit]"}
      ],
      "instructions": ["[Professional step]"],
      "glassType": "[Correct glass]"
    }
  ],
  "almostPossible": {
    "name": "[Classic cocktail]",
    "missingIngredient": "[What's missing]",
    "description": "[Why it's worth making]",
    "ingredients": [{"name": "", "amount": "", "unit": ""}]
  },
  "shoppingList": [
    {
      "ingredient": "[Strategic addition]",
      "unlocksCount": [realistic number],
      "priority": "high|medium|low",
      "reason": "[Professional reasoning]",
      "newCocktails": ["[Classic 1]", "[Classic 2]", "[Classic 3]"]
    }
  ]
}`;

module.exports = async (req, res) => {
  try {
    const { ingredients, language = 'pl' } = req.body;
    console.log(`MyBar request - Ingredients: ${ingredients}, Language: ${language}`);
    
    const userPrompt = language === 'pl'
      ? `Składniki: ${ingredients}

ZASADY BARMANA:
1. Używaj TYLKO klasycznych, sprawdzonych receptur
2. Mint Julep = bourbon (NIE rum!), Mojito = biały rum (NIE whisky!)
3. Lód kruszony = "lód kruszony", NIE "kruszon"
4. Dokładne proporcje w ml, sztukach, kroplach
5. Profesjonalne opisy

Zasugeruj koktajle które mogę zrobić, jeden prawie możliwy (brak 1 składnika) i strategiczny zakup.`
      : `Ingredients: ${ingredients}

BARTENDER RULES:
1. Use ONLY classic, authentic recipes
2. Mint Julep = bourbon (NOT rum!), Mojito = white rum (NOT whisky!)
3. Exact proportions in ml, pieces, dashes
4. Professional descriptions

Suggest cocktails I can make, one almost possible (missing 1 ingredient), and strategic purchase.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MYBAR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3, // Niska dla dokładności
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
      
      // Validate classic recipes
      if (suggestions.cocktails) {
        suggestions.cocktails.forEach(cocktail => {
          // Sprawdź Mint Julep
          if (cocktail.name.toLowerCase().includes('julep')) {
            const wrongIngredient = cocktail.ingredients.find(i => 
              i.name.toLowerCase().includes('rum')
            );
            if (wrongIngredient) {
              console.error('ERROR: Mint Julep with rum detected! Fixing...');
              wrongIngredient.name = 'Bourbon';
              wrongIngredient.amount = '60';
            }
          }
          
          // Popraw jednostki lodu
          cocktail.ingredients.forEach(ing => {
            if (ing.name.toLowerCase().includes('lód') || ing.name.toLowerCase().includes('ice')) {
              if (ing.unit === 'ml' || ing.unit === 'kruszon') {
                if (ing.name.toLowerCase().includes('krusz') || ing.name.toLowerCase().includes('crush')) {
                  ing.unit = language === 'pl' ? 'kruszony' : 'crushed';
                  ing.amount = language === 'pl' ? 'do pełna' : 'fill with';
                } else {
                  ing.unit = language === 'pl' ? 'kostki' : 'cubes';
                }
              }
            }
          });
        });
      }
    } catch (e) {
      console.error('MyBar parse error:', e);
      
      // Professional fallback based on ingredients
      const ingLower = ingredients.toLowerCase();
      const hasWhisky = ingLower.includes('whisk') || ingLower.includes('bourbon');
      const hasLemon = ingLower.includes('cytry') || ingLower.includes('lemon');
      const hasSugar = ingLower.includes('cukier') || ingLower.includes('sugar') || ingLower.includes('syrop');
      
      suggestions = {
        cocktails: [],
        almostPossible: null,
        shoppingList: []
      };
      
      // Whiskey Sour jeśli mamy whisky, cytrynę i cukier
      if (hasWhisky && hasLemon && hasSugar) {
        suggestions.cocktails.push({
          name: "Whiskey Sour",
          available: true,
          description: language === 'pl' 
            ? "Klasyczny sour - idealny balans whisky, świeżej cytryny i słodyczy. Drink z 1860 roku."
            : "Classic sour - perfect balance of whiskey, fresh lemon and sweetness. Dating from 1860.",
          difficulty: "easy",
          ingredients: [
            { name: language === 'pl' ? "Bourbon" : "Bourbon", amount: "45", unit: "ml" },
            { name: language === 'pl' ? "Sok z cytryny" : "Lemon juice", amount: "25", unit: "ml" },
            { name: language === 'pl' ? "Syrop cukrowy" : "Simple syrup", amount: "20", unit: "ml" },
            { name: language === 'pl' ? "Lód" : "Ice", amount: language === 'pl' ? "do pełna" : "fill with", unit: language === 'pl' ? "kostki" : "cubes" }
          ],
          instructions: language === 'pl'
            ? [
                "Wstrząśnij bourbon, sok z cytryny i syrop z lodem",
                "Wstrząsaj energicznie przez 15 sekund",
                "Przecedź do szklanki old-fashioned z lodem",
                "Opcjonalnie: udekoruj plasterkiem cytryny i wisienką"
              ]
            : [
                "Shake bourbon, lemon juice and syrup with ice",
                "Shake vigorously for 15 seconds",
                "Strain into old-fashioned glass with ice",
                "Optional: garnish with lemon slice and cherry"
              ],
          glassType: language === 'pl' ? "szklanka old-fashioned" : "old-fashioned glass"
        });
        
        suggestions.almostPossible = {
          name: "Boston Sour",
          missingIngredient: language === 'pl' ? "Białko jaja" : "Egg white",
          description: language === 'pl'
            ? "Dodając białko, stworzysz kremową pianę i bardziej aksamitną teksturę"
            : "Adding egg white creates creamy foam and silkier texture",
          ingredients: [
            { name: language === 'pl' ? "Bourbon" : "Bourbon", amount: "45", unit: "ml" },
            { name: language === 'pl' ? "Sok z cytryny" : "Lemon juice", amount: "25", unit: "ml" },
            { name: language === 'pl' ? "Syrop cukrowy" : "Simple syrup", amount: "20", unit: "ml" },
            { name: language === 'pl' ? "Białko jaja" : "Egg white", amount: "1", unit: language === 'pl' ? "sztuka" : "piece" }
          ]
        };
        
        suggestions.shoppingList = [{
          ingredient: language === 'pl' ? "Angostura bitters" : "Angostura bitters",
          unlocksCount: 12,
          priority: "high",
          reason: language === 'pl' 
            ? "Niezbędny składnik do Old Fashioned, Manhattan, Whiskey Sour Deluxe i wielu klasycznych koktajli"
            : "Essential for Old Fashioned, Manhattan, Whiskey Sour Deluxe and many classic cocktails",
          newCocktails: ["Old Fashioned", "Manhattan", "Sazerac", "Whiskey Sour Deluxe", "Vieux Carré"]
        }];
      }
    }

    // Transform for frontend
    const transformedResponse = {
      cocktails: suggestions.cocktails || [],
      shoppingList: suggestions.shoppingList || []
    };
    
    if (suggestions.almostPossible) {
      transformedResponse.missingOneIngredient = [{
        drink: {
          ...suggestions.almostPossible,
          available: false,
          difficulty: suggestions.almostPossible.difficulty || "medium",
          instructions: suggestions.almostPossible.instructions || [],
          glassType: suggestions.almostPossible.glassType || (language === 'pl' ? "kieliszek" : "glass")
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