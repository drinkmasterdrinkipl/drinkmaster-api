const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `You are a world-class head bartender with 20 years of experience. Create ONLY authentic, complete recipes according to IBA standards.

ABSOLUTE RULES:

1. NEVER skip key ingredients (especially citrus juices!)
2. ALWAYS provide ALL ingredients needed for the cocktail
3. Instructions must be COMPLETE - don't cut off sentences
4. ALL text in the requested language (pl/en) except 'method' field

CLASSIC IBA RECIPES (EXACT PROPORTIONS):
- Negroni: gin 30ml, Campari 30ml, sweet vermouth 30ml (1:1:1)
- Old Fashioned: bourbon/rye 60ml, sugar cube 1, Angostura 2 dash, Orange bitters 1 dash
- Manhattan: rye whiskey 60ml, sweet vermouth 30ml, Angostura 2 dash
- Martini: gin 60ml, dry vermouth 10ml
- Margarita: tequila 50ml, Cointreau 30ml, fresh lime juice 20ml
- Daiquiri: white rum 60ml, fresh lime juice 25ml, simple syrup 15ml
- Whiskey Sour: whiskey 60ml, fresh lemon juice 30ml, simple syrup 20ml, egg white (optional)
- Vodka Sour: vodka 60ml, fresh lemon juice 30ml, simple syrup 15ml, egg white (optional)
- Mojito: white rum 50ml, fresh lime juice 30ml, sugar 2 tsp, fresh mint 10-12 leaves, soda top
- Moscow Mule: vodka 50ml, fresh lime juice 15ml, ginger beer 120ml
- Porn Star Martini: vodka 50ml, passion fruit puree 30ml, vanilla syrup 15ml, fresh lime juice 15ml, Prosecco 60ml (shot on side)
- Espresso Martini: vodka 50ml, coffee liqueur 20ml, fresh espresso 30ml, simple syrup 10ml
- Aperol Spritz: Aperol 60ml, Prosecco 90ml, soda 30ml (2:3:1)
- Cosmopolitan: vodka citron 45ml, Cointreau 15ml, fresh lime juice 15ml, cranberry juice 30ml
- Mai Tai: aged rum 30ml, rhum agricole 30ml, orange curaçao 15ml, orgeat 15ml, fresh lime juice 30ml
- Cuba Libre: rum 50ml, cola 120ml, fresh lime juice 10ml

LANGUAGE-SPECIFIC TRANSLATIONS:

For POLISH (pl):
- mixing glass = "szklanica barmańska"
- bar spoon = "łyżka barmańska"
- fresh lime juice = "świeżo wyciśnięty sok z limonki"
- fresh lemon juice = "świeżo wyciśnięty sok z cytryny"
- simple syrup = "syrop cukrowy"
- egg white = "białko jaja"
- soda water = "woda gazowana"
- ginger beer = "piwo imbirowe"
- sugar cube = "kostka cukru"
- ice types: kostki/kruszony/duża kostka/brak

Glass types in Polish:
- rocks = "szklanka rocks"
- coupe = "kieliszek coupe"
- highball = "szklanka highball"
- martini = "kieliszek martini"
- copper mug = "kubek miedziany"
- wine glass = "kieliszek do wina"

For ENGLISH (en):
- Use standard English bartending terms
- ice types: cubed/crushed/large cube/none

INSTRUCTION RULES:
1. Minimum 4-7 steps for each cocktail
2. COMPLETE sentences, no cutting off
3. Detailed descriptions of each action
4. For stirred: always in mixing glass
5. For shaken: always shake hard for 12-15 seconds
6. For built: build in serving glass

JSON FORMAT:
{
  "name": "[name in request language]",
  "nameEn": "[English name]",
  "category": "classic/modern/tiki/sour/highball",
  "history": "[2-3 sentences of real history in request language]",
  "ingredients": [
    {"name": "[ingredient in request language]", "amount": "[number]", "unit": "ml/dash/cube/tsp/leaves/piece"}
  ],
  "glassType": "[glass type in request language]",
  "method": "shaken/stirred/built/thrown/rolled",
  "instructions": [
    "[COMPLETE sentence in request language - step 1]",
    "[COMPLETE sentence in request language - step 2]",
    "[COMPLETE sentence in request language - step 3]",
    "[COMPLETE sentence in request language - step 4]",
    "[COMPLETE sentence in request language - step 5]"
  ],
  "garnish": "[garnish in request language]",
  "ice": "[ice type in request language]"
}`;

module.exports = async (req, res) => {
  console.log('🍹 Recipe generator endpoint called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { drinkName, cocktailName, ingredients = [], language } = req.body;
    const finalCocktailName = drinkName || cocktailName;
    const requestLanguage = language || 'en'; // Default to English if not specified
    
    console.log(`📝 Generating recipe for: ${finalCocktailName}`);
    console.log(`🌍 Language requested: ${requestLanguage}`);
    console.log(`📦 Full request body:`, JSON.stringify(req.body));
    
    if (!finalCocktailName) {
      return res.status(400).json({ error: 'Cocktail name is required' });
    }

    let userPrompt;
    
    if (requestLanguage === 'pl') {
      userPrompt = `Create COMPLETE recipe for "${finalCocktailName}" cocktail.

CRITICAL:
- ALL text in POLISH except 'method' field
- ALL ingredients with Polish names (świeżo wyciśnięty sok z limonki, NOT fresh lime juice)
- Glass types in Polish (szklanka highball, NOT highball glass)
- Instructions in Polish
- History in Polish
- Ice types: kostki/kruszony/duża kostka/brak

RETURN PURE JSON!`;
    } else {
      userPrompt = `Create COMPLETE recipe for "${finalCocktailName}" cocktail.

CRITICAL:
- ALL text in ENGLISH
- Standard bartending terminology
- Complete ingredient list with measurements
- Ice types: cubed/crushed/large cube/none

RETURN PURE JSON!`;
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
      temperature: 0.1,
      max_tokens: 1200
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('🤖 AI Response received');
    
    // Parse response
    let recipe;
    try {
      const cleanedResponse = aiResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
        
      recipe = JSON.parse(cleanedResponse);
      
      // Remove ice from ingredients if present
      if (recipe.ingredients) {
        recipe.ingredients = recipe.ingredients.filter(ing => 
          !ing.name.toLowerCase().includes('lód') && 
          !ing.name.toLowerCase().includes('ice') &&
          !ing.name.toLowerCase().includes('led')
        );
      }
      
      // FIX MISSING INGREDIENTS for specific cocktails
      const nameLower = finalCocktailName.toLowerCase();
      
      // Moscow Mule must have lime juice
      if (nameLower.includes('moscow mule')) {
        const hasLime = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lime') || 
          i.name.toLowerCase().includes('limonk')
        );
        
        if (!hasLime) {
          recipe.ingredients.splice(1, 0, {
            name: requestLanguage === 'pl' ? "świeżo wyciśnięty sok z limonki" : "fresh lime juice",
            amount: "15",
            unit: "ml"
          });
        }
      }
      
      // Sour cocktails must have lemon juice
      if (nameLower.includes('sour')) {
        const hasLemon = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lemon') || 
          i.name.toLowerCase().includes('cytry')
        );
        
        if (!hasLemon) {
          recipe.ingredients.splice(1, 0, {
            name: requestLanguage === 'pl' ? "świeżo wyciśnięty sok z cytryny" : "fresh lemon juice",
            amount: "30",
            unit: "ml"
          });
        }
      }
      
      // Cuba Libre must have lime juice
      if (nameLower.includes('cuba libre')) {
        const hasLime = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lime') || 
          i.name.toLowerCase().includes('limonk')
        );
        
        if (!hasLime) {
          recipe.ingredients.splice(2, 0, {
            name: requestLanguage === 'pl' ? "świeżo wyciśnięty sok z limonki" : "fresh lime juice",
            amount: "10",
            unit: "ml"
          });
        }
      }
      
      // Ensure correct proportions for classics
      if (nameLower.includes('negroni') && recipe.ingredients.length >= 3) {
        recipe.ingredients[0].amount = "30";
        recipe.ingredients[1].amount = "30";
        recipe.ingredients[2].amount = "30";
      }
      
      // Ensure required fields
      recipe.name = recipe.name || finalCocktailName;
      recipe.nameEn = recipe.nameEn || finalCocktailName;
      recipe.category = recipe.category || "classic";
      recipe.method = recipe.method || "stirred";
      recipe.ice = recipe.ice || (requestLanguage === 'pl' ? "kostki" : "cubed");
      
      // Ensure instructions are complete
      if (recipe.instructions && recipe.instructions.length > 0) {
        recipe.instructions = recipe.instructions.filter(inst => 
          inst && inst.length > 10 && !inst.endsWith('...')
        );
      }
      
      // Default values for app compatibility
      recipe.difficulty = "medium";
      recipe.prepTime = 5;
      recipe.abv = 25;
      recipe.servingTemp = "5";
      recipe.flavor = "";
      recipe.occasion = "";
      recipe.proTip = "";
      recipe.tags = [];
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw response:', aiResponse);
      return res.status(500).json({ 
        error: 'Failed to parse recipe',
        details: 'Invalid JSON response'
      });
    }

    // Format final response
    const response = {
      ...recipe,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    console.log('✅ Recipe created:', response.name);
    console.log('🌍 Language:', requestLanguage);
    console.log('📊 Ingredients:', response.ingredients.map(i => `${i.name}: ${i.amount}${i.unit}`));
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipe',
      details: error.message 
    });
  }
};