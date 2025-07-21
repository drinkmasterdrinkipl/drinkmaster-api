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
5. NEVER include ice in ingredients list - ice is only mentioned in instructions
6. Match instructions to method: shaken = shaker, stirred = mixing glass, built = serving glass

CLASSIC IBA RECIPES (EXACT PROPORTIONS):
- Negroni: gin 30ml, Campari 30ml, sweet vermouth 30ml (1:1:1) - STIRRED
- Old Fashioned: bourbon/rye 60ml, sugar cube 1, Angostura 2 dash, Orange bitters 1 dash - STIRRED
- Manhattan: rye whiskey 60ml, sweet vermouth 30ml, Angostura 2 dash - STIRRED
- Martini: gin 60ml, dry vermouth 10ml - STIRRED
- Margarita: tequila 50ml, Cointreau 30ml, fresh lime juice 20ml - SHAKEN
- Daiquiri: white rum 60ml, fresh lime juice 25ml, simple syrup 15ml - SHAKEN
- Whiskey Sour: whiskey 60ml, fresh lemon juice 30ml, simple syrup 20ml, egg white (optional) - SHAKEN in ROCKS glass
- Vodka Sour: vodka 60ml, fresh lemon juice 30ml, simple syrup 15ml, egg white (optional) - SHAKEN in ROCKS glass
- Amaretto Sour: amaretto 45ml, fresh lemon juice 30ml, simple syrup 15ml, egg white (optional) - SHAKEN in ROCKS glass
- Pisco Sour: pisco 60ml, fresh lime juice 30ml, simple syrup 20ml, egg white, Angostura 3 dash - SHAKEN in ROCKS glass
- Mojito: white rum 50ml, fresh lime juice 30ml, sugar 2 tsp, fresh mint 10-12 leaves, soda water top - BUILT
- Moscow Mule: vodka 50ml, fresh lime juice 15ml, ginger beer 120ml - BUILT
- Porn Star Martini: vodka 50ml, passion fruit puree 30ml, vanilla syrup 15ml, fresh lime juice 15ml, Prosecco 60ml (shot on side) - SHAKEN
- Espresso Martini: vodka 50ml, coffee liqueur 20ml, fresh espresso 30ml, simple syrup 10ml - SHAKEN
- Aperol Spritz: Aperol 60ml, Prosecco 90ml, soda 30ml (2:3:1) - BUILT
- Cosmopolitan: vodka citron 45ml, Cointreau 15ml, fresh lime juice 15ml, cranberry juice 30ml - SHAKEN
- Mai Tai: aged rum 30ml, rhum agricole 30ml, orange curaçao 15ml, orgeat 15ml, fresh lime juice 30ml - SHAKEN
- Cuba Libre: rum 50ml, cola 120ml, fresh lime juice 10ml - BUILT
- Hugo: Prosecco 90ml, elderflower syrup 30ml, fresh lime juice 20ml, soda water 30ml, fresh mint 10 leaves - BUILT in WINE glass
- Long Island Iced Tea: vodka 15ml, gin 15ml, white rum 15ml, tequila 15ml, Cointreau 15ml, fresh lemon juice 25ml, simple syrup 15ml, cola top - SHAKEN

CRITICAL GLASS RULES:
- ALL SOUR cocktails = ROCKS glass
- Hugo = WINE glass
- Mojito, Cuba Libre = HIGHBALL glass
- Martini variations = COUPE or MARTINI glass

INSTRUCTION RULES BY METHOD:
- SHAKEN: Use shaker, add ice to shaker, shake hard 12-15 seconds, strain
- STIRRED: Use mixing glass (szklanica barmańska), add ice to mixing glass, stir 30-40 seconds, strain
- BUILT: Build directly in serving glass, add ice to serving glass, stir gently

LANGUAGE-SPECIFIC TRANSLATIONS:

For POLISH (pl):
- shaker = "shaker"
- mixing glass = "szklanica barmańska"
- bar spoon = "łyżka barmańska"
- fresh lime juice = "świeżo wyciśnięty sok z limonki"
- fresh lemon juice = "świeżo wyciśnięty sok z cytryny"
- simple syrup = "syrop cukrowy"
- elderflower syrup = "syrop z kwiatu bzu"
- egg white = "białko jaja"
- soda water = "woda gazowana"
- ginger beer = "piwo imbirowe"
- sugar cube = "kostka cukru"
- sugar = "cukier"
- fresh mint = "świeża mięta"
- top/top up = "do pełna"

Units in Polish:
- ml = ml
- leaves = listków
- leaf = listek
- pieces = sztuki
- piece = sztuka
- tsp = łyżeczki
- dash = dash

Glass types in Polish:
- rocks = "szklanka rocks"
- coupe = "kieliszek coupe"
- highball = "szklanka highball"
- martini = "kieliszek martini"
- copper mug = "kubek miedziany"
- wine glass = "kieliszek do wina"

For ENGLISH (en):
- Use standard English bartending terms
- top/top up = "top up"

JSON FORMAT:
{
  "name": "[name in request language]",
  "nameEn": "[English name]",
  "category": "classic/modern/tiki/sour/highball",
  "history": "[2-3 sentences of real history in request language]",
  "ingredients": [
    {"name": "[ingredient in request language]", "amount": "[number or 'top up']", "unit": "[unit in request language]"}
  ],
  "glassType": "[glass type in request language]",
  "method": "shaken/stirred/built/thrown/rolled",
  "instructions": [
    "[COMPLETE sentence matching the method - step 1]",
    "[COMPLETE sentence matching the method - step 2]",
    "[COMPLETE sentence matching the method - step 3]",
    "[COMPLETE sentence matching the method - step 4]",
    "[COMPLETE sentence matching the method - step 5]"
  ],
  "garnish": "[garnish in request language]",
  "ice": "[ice type in request language - NOT in ingredients]"
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
- Units in Polish: leaves = listków, tsp = łyżeczki, piece = sztuka
- Glass types in Polish (szklanka highball, NOT highball glass)
- Instructions in Polish
- History in Polish
- NEVER include ice in ingredients - only in instructions
- For soda/cola use "do pełna" NOT "0 ml"
- SOUR cocktails MUST use "szklanka rocks"
- HUGO MUST use "kieliszek do wina"
- Match instructions to method:
  * If method is "shaken": use shaker in instructions
  * If method is "stirred": use szklanica barmańska in instructions
  * If method is "built": build in serving glass

RETURN PURE JSON!`;
    } else {
      userPrompt = `Create COMPLETE recipe for "${finalCocktailName}" cocktail.

CRITICAL:
- ALL text in ENGLISH
- Standard bartending terminology
- Complete ingredient list with measurements
- NEVER include ice in ingredients - only in instructions
- For soda/cola use "top up" NOT "0 ml"
- SOUR cocktails MUST use "rocks glass"
- HUGO MUST use "wine glass"
- Match instructions to method:
  * If method is "shaken": use shaker in instructions
  * If method is "stirred": use mixing glass in instructions
  * If method is "built": build in serving glass

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
          !ing.name.toLowerCase().includes('led') &&
          !ing.name.toLowerCase().includes('kostki lodu')
        );
      }
      
      // Fix units and translations for Polish
      if (requestLanguage === 'pl' && recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
          // Translate units
          if (ing.unit === 'leaves') ing.unit = 'listków';
          if (ing.unit === 'leaf') ing.unit = 'listek';
          if (ing.unit === 'piece') ing.unit = 'sztuka';
          if (ing.unit === 'pieces') ing.unit = 'sztuki';
          if (ing.unit === 'tsp') ing.unit = 'łyżeczki';
          if (ing.unit === 'tbsp') ing.unit = 'łyżki';
          
          // Fix soda/cola amount
          if ((ing.name.includes('woda gazowana') || ing.name.includes('soda') || 
               ing.name.includes('cola')) && (ing.amount === '0' || ing.amount === 0)) {
            ing.amount = 'do pełna';
            ing.unit = '';
          }
          
          // Fix "top" or "top up" amounts
          if (ing.amount === 'top' || ing.amount === 'top up' || ing.amount === 'dopełnić') {
            ing.amount = 'do pełna';
            ing.unit = '';
          }
        });
      }
      
      // FIX SPECIFIC COCKTAILS
      const nameLower = finalCocktailName.toLowerCase();
      
      // Fix ALL SOUR cocktails - always rocks glass with ice
      if (nameLower.includes('sour')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
        
        // Fix instructions for sours to mention rocks glass
        if (recipe.instructions && requestLanguage === 'pl') {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/szklanki highball/g, 'szklanki rocks')
              .replace(/szklanka highball/g, 'szklanka rocks')
              .replace(/kieliszka coupe/g, 'szklanki rocks')
              .replace(/kieliszek coupe/g, 'szklanka rocks')
              .replace(/bez lodu/g, 'z lodem');
          });
        } else if (recipe.instructions) {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/highball glass/g, 'rocks glass')
              .replace(/coupe glass/g, 'rocks glass')
              .replace(/without ice/g, 'with ice');
          });
        }
        
        // Ensure sour has lemon juice
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
      
      // Fix HUGO - always wine glass
      if (nameLower.includes('hugo')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek do wina" : "wine glass";
        
        // Fix instructions for Hugo to mention wine glass
        if (recipe.instructions && requestLanguage === 'pl') {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/szklanki highball/g, 'kieliszka do wina')
              .replace(/szklanka highball/g, 'kieliszek do wina')
              .replace(/szkle highball/g, 'kieliszku do wina');
          });
        } else if (recipe.instructions) {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/highball glass/g, 'wine glass')
              .replace(/highball/g, 'wine glass');
          });
        }
      }
      
      // Long Island Iced Tea special handling
      if (nameLower.includes('long island')) {
        // Ensure it's shaken
        recipe.method = 'shaken';
        
        // Ensure it has cola
        const hasCola = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('cola') || 
          i.name.toLowerCase().includes('coli')
        );
        
        if (!hasCola) {
          recipe.ingredients.push({
            name: requestLanguage === 'pl' ? "cola" : "cola",
            amount: requestLanguage === 'pl' ? "do pełna" : "top up",
            unit: ""
          });
        }
        
        // Fix instructions if they mention mixing glass
        if (recipe.instructions && requestLanguage === 'pl') {
          recipe.instructions = recipe.instructions.map(inst => 
            inst.replace(/szklanicy barmańskiej/g, 'shakera')
                .replace(/szklanicę barmańską/g, 'shaker')
                .replace(/mieszaj/g, 'wstrząśnij')
                .replace(/Mieszaj/g, 'Wstrząśnij')
          );
        }
      }
      
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
      
      // Mojito must have soda water
      if (nameLower.includes('mojito')) {
        const hasSoda = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('soda') || 
          i.name.toLowerCase().includes('woda gazowana')
        );
        
        if (!hasSoda) {
          recipe.ingredients.push({
            name: requestLanguage === 'pl' ? "woda gazowana" : "soda water",
            amount: requestLanguage === 'pl' ? "do pełna" : "top up",
            unit: ""
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
      
      // Fix garnish for Long Island Iced Tea
      if (nameLower.includes('long island') && requestLanguage === 'pl') {
        recipe.garnish = recipe.garnish || "ćwiartka limonki";
      }
      
      // Fix garnish for sours
      if (nameLower.includes('sour') && requestLanguage === 'pl') {
        recipe.garnish = recipe.garnish || "plasterek cytryny lub wiśnia koktajlowa";
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