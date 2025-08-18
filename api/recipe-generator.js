const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `You are a world-class head bartender with 20 years of experience. Create ONLY authentic, complete recipes according to IBA standards and classic cocktail books like "The Savoy Cocktail Book" by Harry Craddock (1930).

Reference for classic recipes: https://drinki.pl/drinki.html

ABSOLUTE RULES:

1. NEVER skip key ingredients (especially citrus juices!)
2. ALWAYS provide ALL ingredients needed for the cocktail
3. Instructions must be COMPLETE - don't cut off sentences
4. ALL text in the requested language (pl/en) except 'method' field
5. NEVER include ice in ingredients list - ice is only mentioned in instructions
6. Match instructions to method: shaken = shaker, stirred = mixing glass, built = serving glass
7. Use classic recipes from The Savoy Cocktail Book and drinki.pl for historical accuracy
8. GLASSWARE IS CRITICAL - Each cocktail MUST be served in its traditional, correct glass type

GLASSWARE RULES (NEVER DEVIATE):

COUPE GLASS (kieliszek coupe) - ALWAYS SERVED WITHOUT ICE:
- Daiquiri, Margarita, Clover Club, White Lady, Aviation, Sidecar
- Most classic shaken cocktails served "up" (without ice)
- Porn Star Martini, Cosmopolitan, Bee's Knees
- Corpse Reviver #2, Blood and Sand, Hanky Panky

MARTINI GLASS (kieliszek martini) - ALWAYS SERVED WITHOUT ICE:
- Classic Martini, Manhattan, Espresso Martini, Martinez
- Any "-tini" variation served up
- All stirred cocktails served "up"

ROCKS/OLD FASHIONED GLASS (szklanka rocks) - SERVED WITH ICE:
- ALL SOUR cocktails (Whiskey Sour, Vodka Sour, Amaretto Sour, Pisco Sour)
- Old Fashioned, Negroni, Boulevardier, Sazerac
- Bramble (with crushed ice), Caipirinha (with crushed ice)
- Mint Julep (with crushed ice), Smash cocktails (with crushed ice)
- Any spirit served "on the rocks"
- Mai Tai

HIGHBALL GLASS (szklanka highball) - SERVED WITH ICE:
- Mojito (with crushed ice), Cuba Libre, Paloma, Tom Collins
- Moscow Mule (unless copper mug available)
- Long Island Iced Tea, Dark 'n' Stormy
- Any cocktail with soda/cola top-up

WINE GLASS (kieliszek do wina) - SERVED WITH ICE:
- Hugo, Aperol Spritz, any wine-based cocktails
- Sangria, wine cocktails

COPPER MUG (kubek miedziany) - SERVED WITH ICE:
- Moscow Mule (traditional), Kentucky Mule

FLUTE GLASS (kieliszek flute) - SERVED WITHOUT ICE:
- French 75, Mimosa, Bellini
- Any champagne-based cocktail

COLLINS GLASS (szklanka collins) - SERVED WITH ICE:
- Tom Collins, John Collins, any Collins variation
- Can substitute highball if needed

HURRICANE GLASS (szklanka hurricane) - SERVED WITH ICE:
- Hurricane, tropical tiki drinks

NICK & NORA (kieliszek nick & nora) - SERVED WITHOUT ICE:
- Alternative to coupe for classic cocktails
- Martini variations, Manhattan variations

ICE SERVING RULES:
- COUPE, MARTINI, FLUTE, NICK & NORA = NO ICE in serving glass (served "up")
- ROCKS, HIGHBALL, COLLINS, HURRICANE, WINE, COPPER MUG = WITH ICE in serving glass

CLASSIC IBA RECIPES WITH CORRECT GLASSWARE AND ICE:
- Negroni: gin 30ml, Campari 30ml, sweet vermouth 30ml - STIRRED in ROCKS glass WITH ICE
- Old Fashioned: bourbon/rye 60ml, sugar cube 1, Angostura 2 dash, Orange bitters 1 dash - STIRRED in ROCKS glass WITH ICE
- Manhattan: rye whiskey 60ml, sweet vermouth 30ml, Angostura 2 dash - STIRRED in MARTINI glass WITHOUT ICE
- Martinez: gin 45ml, sweet vermouth 45ml, maraschino 7.5ml, orange bitters 2 dash - STIRRED in MARTINI glass WITHOUT ICE
- Martini: gin 60ml, dry vermouth 10ml - STIRRED in MARTINI glass WITHOUT ICE
- Margarita: tequila 50ml, Cointreau 30ml, fresh lime juice 20ml - SHAKEN in COUPE glass WITHOUT ICE
- Daiquiri: white rum 60ml, fresh lime juice 25ml, simple syrup 15ml - SHAKEN in COUPE glass WITHOUT ICE
- Whiskey Sour: whiskey 60ml, fresh lemon juice 30ml, simple syrup 20ml, egg white (optional) - SHAKEN in ROCKS glass WITH ICE
- Vodka Sour: vodka 60ml, fresh lemon juice 30ml, simple syrup 15ml, egg white (optional) - SHAKEN in ROCKS glass WITH ICE
- Amaretto Sour: amaretto 45ml, fresh lemon juice 30ml, simple syrup 15ml, egg white (optional) - SHAKEN in ROCKS glass WITH ICE
- Pisco Sour: pisco 60ml, fresh lime juice 30ml, simple syrup 20ml, egg white, Angostura 3 dash - SHAKEN in ROCKS glass WITH ICE
- Mojito: white rum 50ml, fresh lime juice 30ml, sugar 2 tsp, fresh mint 10-12 leaves, soda water top - BUILT in HIGHBALL glass WITH CRUSHED ICE
- Moscow Mule: vodka 50ml, fresh lime juice 15ml, ginger beer 120ml - BUILT in COPPER MUG (or highball) WITH ICE
- Porn Star Martini: vodka 50ml, passion fruit puree 30ml, vanilla syrup 15ml, fresh lime juice 15ml, Prosecco 60ml - SHAKEN in COUPE glass WITHOUT ICE
- Espresso Martini: vodka 50ml, coffee liqueur 20ml, fresh espresso 30ml, simple syrup 10ml - SHAKEN in MARTINI glass WITHOUT ICE
- Aperol Spritz: Aperol 60ml, Prosecco 90ml, soda 30ml - BUILT in WINE glass WITH ICE
- Cosmopolitan: vodka citron 45ml, Cointreau 15ml, fresh lime juice 15ml, cranberry juice 30ml - SHAKEN in COUPE glass WITHOUT ICE
- Mai Tai: aged rum 30ml, rhum agricole 30ml, orange curaçao 15ml, orgeat 15ml, fresh lime juice 30ml - SHAKEN in ROCKS glass WITH ICE
- Cuba Libre: rum 50ml, cola 120ml, fresh lime juice 10ml - BUILT in HIGHBALL glass WITH ICE
- Hugo: Prosecco 90ml, elderflower syrup 30ml, fresh lime juice 20ml, soda water 30ml, fresh mint 10 leaves - BUILT in WINE glass WITH ICE
- Long Island Iced Tea: vodka 15ml, gin 15ml, white rum 15ml, tequila 15ml, Cointreau 15ml, fresh lemon juice 25ml, simple syrup 15ml, cola top - SHAKEN in HIGHBALL glass WITH ICE
- French 75: gin 30ml, fresh lemon juice 15ml, simple syrup 10ml, Champagne top - SHAKEN & BUILT in FLUTE glass WITHOUT ICE

CLASSIC EXTENDED RECIPES WITH CORRECT GLASSWARE AND ICE:
- Bramble: gin 50ml, fresh lemon juice 25ml, simple syrup 12.5ml, crème de mûre 15ml - SHAKEN in ROCKS glass WITH CRUSHED ICE
- Clover Club: gin 50ml, raspberry syrup 15ml, fresh lemon juice 15ml, egg white 1 - SHAKEN in COUPE glass WITHOUT ICE
- Hanky Panky: gin 45ml, sweet vermouth 45ml, Fernet Branca 7.5ml - STIRRED in COUPE glass WITHOUT ICE
- Blood and Sand: Scotch whisky 25ml, cherry brandy 25ml, sweet vermouth 25ml, fresh orange juice 25ml - SHAKEN in COUPE glass WITHOUT ICE
- Corpse Reviver #2: gin 25ml, Cointreau 25ml, Lillet Blanc 25ml, fresh lemon juice 25ml, absinthe rinse - SHAKEN in COUPE glass WITHOUT ICE
- White Lady: gin 40ml, Cointreau 30ml, fresh lemon juice 20ml - SHAKEN in COUPE glass WITHOUT ICE
- Aviation: gin 45ml, maraschino 15ml, fresh lemon juice 15ml, crème de violette 5ml - SHAKEN in COUPE glass WITHOUT ICE
- Sidecar: cognac 50ml, Cointreau 25ml, fresh lemon juice 25ml - SHAKEN in COUPE glass WITHOUT ICE
- Boulevardier: bourbon 30ml, Campari 30ml, sweet vermouth 30ml - STIRRED in ROCKS glass WITH ICE
- Sazerac: rye whiskey 60ml, sugar cube 1, Peychaud's bitters 3 dash, absinthe rinse - STIRRED in ROCKS glass WITH ICE

GLASSWARE DECISION TREE:
1. Is it served with ice in the glass? → ROCKS or HIGHBALL or WINE or COPPER MUG
2. Is it topped with soda/cola? → HIGHBALL WITH ICE
3. Is it a sour? → ROCKS WITH ICE (always)
4. Is it stirred and strong? → ROCKS WITH ICE (Negroni) or MARTINI WITHOUT ICE (Manhattan, Martinez)
5. Is it shaken and served up? → COUPE WITHOUT ICE (preferred) or MARTINI WITHOUT ICE
6. Does it contain Prosecco/Champagne as main ingredient? → WINE WITH ICE or FLUTE WITHOUT ICE
7. Is it a tiki/tropical drink? → HURRICANE WITH ICE or special tiki mug

CRITICAL: The glass type affects the entire drinking experience - aroma, temperature, presentation. NEVER compromise on correct glassware.

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
- fresh orange juice = "świeżo wyciśnięty sok z pomarańczy"
- simple syrup = "syrop cukrowy"
- elderflower syrup = "syrop z kwiatu bzu"
- raspberry syrup = "syrop malinowy"
- honey syrup = "syrop miodowy"
- egg white = "białko jaja"
- soda water = "woda gazowana"
- ginger beer = "piwo imbirowe"
- sugar cube = "kostka cukru"
- sugar = "cukier"
- fresh mint = "świeża miętą"
- top/top up = "do pełna"
- crème de mûre = "likier jeżynowy"
- cherry brandy = "likier wiśniowy"

Units in Polish:
- ml = ml
- leaves = listków
- leaf = listek
- pieces = sztuki
- piece = sztuka
- tsp = łyżeczki
- dash = dash

Glass types in Polish:
- rocks glass = "szklanka rocks"
- coupe glass = "kieliszek coupe"
- highball glass = "szklanka highball"
- martini glass = "kieliszek martini"
- copper mug = "kubek miedziany"
- wine glass = "kieliszek do wina"
- flute glass = "kieliszek flute"
- collins glass = "szklanka collins"
- hurricane glass = "szklanka hurricane"
- nick & nora = "kieliszek nick & nora"

Ice types in Polish:
- cubed = "kostki"
- crushed = "kruszony"
- no ice = "bez lodu"

CRUSHED ICE COCKTAILS:
- Mojito, Caipirinha, Bramble, Mint Julep, Smash cocktails

For ENGLISH (en):
- Use standard English bartending terms
- top/top up = "top up"

Ice types in English:
- cubed = "cubed"
- crushed = "crushed"
- no ice = "no ice"

JSON FORMAT:
{
  "name": "[name in request language]",
  "nameEn": "[English name]",
  "category": "classic/modern/tiki/sour/highball",
  "history": "[2-3 sentences of real history in request language]",
  "ingredients": [
    {"name": "[ingredient in request language]", "amount": "[number or 'top up']", "unit": "[unit in request language]"}
  ],
  "glassType": "[CORRECT glass type in request language based on GLASSWARE RULES]",
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
    const { drinkName, cocktailName, ingredients = [], language, firebaseUid } = req.body;
    const finalCocktailName = drinkName || cocktailName;
    const requestLanguage = language || 'en'; // Default to English if not specified
    
    console.log(`🔍 Generating recipe for: ${finalCocktailName}`);
    console.log(`🌍 Language requested: ${requestLanguage}`);
    console.log(`👤 FirebaseUid: ${firebaseUid}`);
    
    if (!finalCocktailName) {
      return res.status(400).json({ 
        success: false,
        error: 'Cocktail name is required' 
      });
    }

    let userPrompt;
    
    if (requestLanguage === 'pl') {
      userPrompt = `Create COMPLETE recipe for "${finalCocktailName}" cocktail.

CRITICAL:
- ALL text in POLISH except 'method' field
- ALL ingredients with Polish names (świeżo wyciśnięty sok z limonki, NOT fresh lime juice)
- Units in Polish: leaves = listków, tsp = łyżeczki, piece = sztuka
- Glass types in Polish (szklanka highball, NOT highball glass) - USE CORRECT TRADITIONAL GLASS
- Instructions in Polish
- History in Polish
- NEVER include ice in ingredients - only in instructions
- For soda/cola use "do pełna" NOT "0 ml"
- SOUR cocktails MUST use "szklanka rocks" WITH ICE
- HUGO MUST use "kieliszek do wina" WITH ICE
- MANHATTAN, MARTINI, MARTINEZ, DAIQUIRI, MARGARITA MUST be served WITHOUT ICE
- COUPE and MARTINI glasses = WITHOUT ICE ("bez lodu")
- ROCKS, HIGHBALL, WINE glasses = WITH ICE ("kostki")
- Follow GLASSWARE RULES and ICE RULES strictly
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
- USE CORRECT TRADITIONAL GLASS based on GLASSWARE RULES
- NEVER include ice in ingredients - only in instructions
- For soda/cola use "top up" NOT "0 ml"
- SOUR cocktails MUST use "rocks glass" WITH ICE
- HUGO MUST use "wine glass" WITH ICE
- MANHATTAN, MARTINI, MARTINEZ, DAIQUIRI, MARGARITA MUST be served WITHOUT ICE
- COUPE and MARTINI glasses = WITHOUT ICE ("no ice")
- ROCKS, HIGHBALL, WINE glasses = WITH ICE ("cubed")
- Follow GLASSWARE RULES and ICE RULES strictly
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
      
      // FIX SPECIFIC COCKTAILS AND GLASSWARE WITH ICE RULES
      const nameLower = finalCocktailName.toLowerCase();
      
      // CRITICAL FIX: MARTINEZ must be martini glass WITHOUT ice
      if (nameLower.includes('martinez')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek martini" : "martini glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
        
        // Fix instructions for Martinez
        if (recipe.instructions && requestLanguage === 'pl') {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/szklanki rocks/g, 'kieliszka martini')
              .replace(/szklanka rocks/g, 'kieliszek martini')
              .replace(/z lodem/g, 'bez lodu')
              .replace(/kostki lodu/g, 'bez lodu');
          });
        } else if (recipe.instructions) {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/rocks glass/g, 'martini glass')
              .replace(/with ice/g, 'without ice')
              .replace(/cubed ice/g, 'no ice');
          });
        }
      }
      
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
              .replace(/kieliszka martini/g, 'szklanki rocks')
              .replace(/kieliszek martini/g, 'szklanka rocks')
              .replace(/bez lodu/g, 'z lodem');
          });
        } else if (recipe.instructions) {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/highball glass/g, 'rocks glass')
              .replace(/coupe glass/g, 'rocks glass')
              .replace(/martini glass/g, 'rocks glass')
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
      
      // Fix classic cocktails glassware and ice - FORCE NO ICE for COUPE and MARTINI glasses
      if (nameLower.includes('daiquiri') || nameLower.includes('margarita') || 
          nameLower.includes('clover club') || nameLower.includes('white lady') ||
          nameLower.includes('aviation') || nameLower.includes('sidecar') ||
          nameLower.includes('cosmopolitan') || nameLower.includes('porn star martini') ||
          nameLower.includes('corpse reviver') || nameLower.includes('blood and sand') ||
          nameLower.includes('hanky panky')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek coupe" : "coupe glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      if (nameLower.includes('martini') && !nameLower.includes('porn star')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek martini" : "martini glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      if (nameLower.includes('manhattan')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek martini" : "martini glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      if (nameLower.includes('negroni') || nameLower.includes('boulevardier') || 
          nameLower.includes('old fashioned') || nameLower.includes('sazerac') ||
          nameLower.includes('mai tai')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
      }
      
      if (nameLower.includes('mojito') || nameLower.includes('cuba libre') || 
          nameLower.includes('tom collins') || nameLower.includes('paloma')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka highball" : "highball glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
      }
      
      if (nameLower.includes('spritz') || nameLower.includes('hugo')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek do wina" : "wine glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
      }
      
      if (nameLower.includes('french 75') || nameLower.includes('mimosa') || 
          nameLower.includes('bellini')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek flute" : "flute glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      // CRITICAL FIX: Force correct ice based on glass type
      const glassType = recipe.glassType ? recipe.glassType.toLowerCase() : '';
      
      if (glassType.includes('coupe') || glassType.includes('martini') || 
          glassType.includes('flute') || glassType.includes('nick')) {
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
        
        // Fix instructions to remove ice references
        if (recipe.instructions) {
          if (requestLanguage === 'pl') {
            recipe.instructions = recipe.instructions.map(inst => {
              return inst
                .replace(/z lodem/g, 'bez lodu')
                .replace(/kostki lodu/g, 'bez lodu')
                .replace(/dodaj lód/g, 'nie dodawaj lodu')
                .replace(/wlej do szklanki z lodem/g, 'wlej do kieliszka')
                .replace(/napełnij lodem/g, 'nie dodawaj lodu');
            });
          } else {
            recipe.instructions = recipe.instructions.map(inst => {
              return inst
                .replace(/with ice/g, 'without ice')
                .replace(/add ice/g, 'do not add ice')
                .replace(/fill with ice/g, 'serve without ice')
                .replace(/over ice/g, 'without ice');
            });
          }
        }
      }
      
      // Fix HUGO - always wine glass WITH ICE
      if (nameLower.includes('hugo')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek do wina" : "wine glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
        
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
      
      // Fix BRAMBLE - always rocks glass with crushed ice
      if (nameLower.includes('bramble')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass";
        recipe.ice = requestLanguage === 'pl' ? "kruszony" : "crushed";
      }
      
      // Fix MOJITO - always highball glass with crushed ice
      if (nameLower.includes('mojito')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka highball" : "highball glass";
        recipe.ice = requestLanguage === 'pl' ? "kruszony" : "crushed";
      }
      
      // Fix CAIPIRINHA - always rocks glass with crushed ice
      if (nameLower.includes('caipirinha')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass";
        recipe.ice = requestLanguage === 'pl' ? "kruszony" : "crushed";
      }
      
      // Fix MINT JULEP - always julep cup or rocks glass with crushed ice
      if (nameLower.includes('mint julep') || nameLower.includes('julep')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass";
        recipe.ice = requestLanguage === 'pl' ? "kruszony" : "crushed";
      }
      
      // Fix SMASH cocktails - always rocks glass with crushed ice
      if (nameLower.includes('smash')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass";
        recipe.ice = requestLanguage === 'pl' ? "kruszony" : "crushed";
      }
      
      // Long Island Iced Tea special handling
      if (nameLower.includes('long island')) {
        // Ensure it's shaken
        recipe.method = 'shaken';
        recipe.glassType = requestLanguage === 'pl' ? "szklanka highball" : "highball glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
        
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
      
      // Moscow Mule - copper mug preferred WITH ICE
      if (nameLower.includes('moscow mule')) {
        recipe.glassType = requestLanguage === 'pl' ? "kubek miedziany" : "copper mug";
        recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
        
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
      
      // Mojito must have soda water and use crushed ice
      if (nameLower.includes('mojito')) {
        recipe.ice = requestLanguage === 'pl' ? "kruszony" : "crushed";
        
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
        recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
        
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
        recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
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
      
      // Set default ice if not set
      if (!recipe.ice) {
        // Check glass type to determine ice
        const glassType = recipe.glassType ? recipe.glassType.toLowerCase() : '';
        if (glassType.includes('coupe') || glassType.includes('martini') || glassType.includes('flute') || glassType.includes('nick')) {
          recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
        } else {
          recipe.ice = requestLanguage === 'pl' ? "kostki" : "cubed";
        }
      }
      
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
      recipe.tips = "";
      recipe.funFact = recipe.history || "";
      recipe.alcoholContent = "medium";
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw response:', aiResponse);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to parse recipe',
        message: 'Invalid JSON response'
      });
    }

    // Format final response
    const response = {
      ...recipe,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };

    console.log('✅ Recipe created:', response.name);
    console.log('🌍 Language:', requestLanguage);
    console.log('🥃 Glass type:', response.glassType);
    console.log('🧊 Ice:', response.ice);
    console.log('📊 Ingredients:', response.ingredients.map(i => `${i.name}: ${i.amount}${i.unit}`));
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate recipe',
      message: error.message 
    });
  }
};