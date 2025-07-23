const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MYBAR_SYSTEM_PROMPT = `You are a world-class bartender helping users make cocktails with available ingredients. You have deep knowledge of classic cocktails, their authentic recipes, AND brand names.

CRITICAL RULES:
1. Use ONLY authentic classic recipes with correct proportions
2. Return ONLY valid JSON - no markdown
3. ALL text in requested language (pl/en)
4. Never return empty ingredients arrays
5. BE INTUITIVE - understand what users mean:
   - "cytryna" = user HAS lemon juice (sok z cytryny)
   - "limonka" = user HAS lime juice (sok z limonki)
   - "cukier" = user HAS simple syrup (syrop cukrowy)
   - Users don't need to specify "sok z" - assume juice is available
   - Ignore garnish/minor ingredients like egg white, bitters, salt for availability
6. ONLY suggest cocktails where user has ALL MAIN ingredients
7. For shopping suggestions, prioritize ingredients that unlock the most classic cocktails
8. Maximum 4 cocktails that can be made with given ingredients
9. Include COMPLETE recipe details
10. Minor ingredients (egg white, bitters, salt rim) are OPTIONAL - don't block cocktail if missing

BRAND RECOGNITION - BE SMART:
Common brands and what they are:
- Jack Daniels / Jack Daniel's = whiskey (bourbon)
- Jim Beam = whiskey (bourbon)  
- Johnnie Walker = whisky (scotch)
- Bombay / Bombay Sapphire = gin
- Tanqueray = gin
- Beefeater = gin
- Gordon's = gin
- Absolut = vodka
- Grey Goose = vodka
- Smirnoff = vodka
- Stolichnaya = vodka
- Bacardi = rum
- Captain Morgan = rum
- Havana Club = rum
- Jose Cuervo = tequila
- Patron = tequila
- Olmeca = tequila
- Schweppes = can be tonic water OR ginger ale OR soda water (check context)
- Kinley = tonic water (Indian Ocean brand)
- Coca-Cola / Coke = cola
- Pepsi = cola
- Sprite / 7UP = lemon-lime soda (NOT soda water)
- Canada Dry = ginger ale
- Jack Daniel's Honey = honey whiskey liqueur
- Jägermeister = herbal liqueur
- Baileys = Irish cream liqueur
- Kahlua = coffee liqueur
- Malibu = coconut rum
- Aperol = aperitif (for Aperol Spritz)
- Campari = bitter liqueur
- Martini = vermouth brand
- Cinzano = vermouth brand
- Cointreau = triple sec (premium)
- Grand Marnier = orange liqueur

SMART INTERPRETATION:
- "whisky" or any whiskey brand = user has whiskey
- "gin" or any gin brand = user has gin  
- "vodka" or "wódka" or any vodka brand = user has vodka
- "rum" or any rum brand = user has rum
- "tonic" or "tonik" or "Kinley" = user has tonic water
- "wermut" or "vermouth" or "Martini" or "Cinzano" = user has vermouth
- "campari" = user has Campari
- "baileys" = user has Irish cream
- "kahlua" or "kahluá" = user has coffee liqueur
- "triple sec" or "cointreau" = user has triple sec
- "miód" or "honey" = user has honey

CRITICAL FILTERING RULES:
1. IGNORE ALL non-cocktail items:
   - Furniture (krzesło, stół, okno, wersalka, kanapa, fotel, łóżko)
   - Food not used in cocktails (kiełbasa, kaszanka, chleb, ser, mięso)
   - Random objects (telefon, telewizor, samochód, rower)
   - Clothing (spodnie, koszula, buty)
2. ONLY ACCEPT cocktail-related ingredients:
   - Spirits: whisky, gin, rum, vodka, tequila, etc.
   - Mixers: cola, tonic, soda water, ginger beer, ginger ale
   - Juices: lemon, lime, orange, pineapple, cranberry, grapefruit
   - Herbs/garnish: mięta (mint), bazylia (basil), ogórek (cucumber)
   - Syrups/sweeteners: sugar, honey, grenadine, maple syrup
   - Liqueurs: triple sec, cointreau, campari, vermouth, baileys, kahlua
   - Others: milk, cream, coffee, egg white
3. Filter out everything else silently

INGREDIENT INTERPRETATION - THIS IS CRITICAL:
- cytryna/lemon = lemon juice IS AVAILABLE
- limonka/lime = lime juice IS AVAILABLE
- cukier/sugar = simple syrup IS AVAILABLE
- pomarańcza/orange = orange juice IS AVAILABLE
- grejpfrut/grapefruit = grapefruit juice IS AVAILABLE
- woda gazowana/soda water/sparkling water = soda water IS AVAILABLE
- bazylia/basil = fresh basil IS AVAILABLE
- mięta/mint = fresh mint IS AVAILABLE
- mleko/milk = milk IS AVAILABLE
- Always assume juice/syrup form unless specifically stated otherwise

CRITICAL COCKTAIL CHECKS:
- Whiskey Sour: whiskey + lemon + sugar (egg white OPTIONAL)
- Gin Sour: gin + lemon + sugar (egg white OPTIONAL)
- Tom Collins: gin + lemon + sugar + soda water (ALL required)
- Gin & Tonic: gin + tonic water
- Cuba Libre: rum + cola + lime (ALL required)
- Mojito: rum + lime + sugar + mint + soda water (ALL required)
- Margarita: tequila + triple sec + lime (ALL required, salt rim OPTIONAL)
- Negroni: gin + campari + vermouth (ALL required)
- White Russian: vodka + kahlua + cream/milk (ALL required)
- Black Russian: vodka + kahlua
- Gin Basil Smash: gin + lemon + sugar + basil (ALL required)
- Whiskey Honey: whiskey + honey + lemon (ALL required)
- Aperol Spritz: aperol + prosecco/sparkling wine + soda water (ALL required)

SHOPPING SUGGESTIONS - BE EXTREMELY SMART:
Before suggesting ANY ingredient, check:
1. Does user have ALL OTHER required ingredients for the cocktail?
2. Will this ONE purchase actually unlock a cocktail?
3. Is it a sensible suggestion based on what they already have?

NEVER suggest:
- Triple sec if no tequila (for Margarita)
- Mint if no rum, lime, sugar AND soda (for Mojito) 
- Basil if no gin, lemon AND sugar (for Gin Basil Smash)
- Any ingredient that requires multiple other missing ingredients

GOOD suggestions:
- If has gin + lemon + sugar → suggest soda water (unlocks Tom Collins)
- If has gin + campari → suggest vermouth (unlocks Negroni)
- If has vodka + kahlua → suggest milk/cream (unlocks White Russian)
- If has gin + lemon + sugar → suggest basil (unlocks Gin Basil Smash)

CLASSIC COCKTAIL RECIPES (USE EXACT PROPORTIONS):
- Whiskey Sour: whiskey 60ml, lemon juice 30ml, simple syrup 20ml, (egg white optional)
- Gin Sour: gin 60ml, lemon juice 30ml, simple syrup 20ml, (egg white optional)
- Tom Collins: gin 50ml, lemon juice 25ml, simple syrup 15ml, soda water top
- Gin & Tonic: gin 50ml, tonic water 150ml
- Cuba Libre: rum 50ml, cola 120ml, lime juice 10ml
- Mojito: white rum 50ml, lime juice 30ml, sugar 2 tsp, mint 10-12 leaves, soda water top
- Margarita: tequila 50ml, triple sec 30ml, lime juice 20ml
- Negroni: gin 30ml, campari 30ml, sweet vermouth 30ml
- Old Fashioned: whiskey 60ml, sugar cube 1, bitters 2 dash
- Moscow Mule: vodka 50ml, lime juice 15ml, ginger beer 120ml
- White Russian: vodka 40ml, kahlua 20ml, heavy cream 20ml
- Black Russian: vodka 50ml, kahlua 25ml
- Gin Basil Smash: gin 60ml, lemon juice 30ml, simple syrup 20ml, basil 8-10 leaves
- Aperol Spritz: aperol 60ml, prosecco 90ml, soda water splash
- Whiskey Honey: whiskey 50ml, honey 20ml, lemon juice 20ml, hot water 30ml

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
      "nameEn": "English name",
      "missingIngredient": "What's missing (only ESSENTIAL ingredients)",
      "description": "Description",
      "category": "classic",
      "ingredients": [full ingredient list],
      "instructions": ["step1", "step2"],
      "glassType": "glass type",
      "method": "method",
      "ice": "ice type",
      "garnish": "garnish"
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

CRITICAL EXAMPLES:
- If user has "Bombay, whisky, cola, tonic, cukier, cytryna, campari, wermut":
  CAN MAKE: Whiskey Sour, Gin Sour, Gin & Tonic, Negroni
  SUGGEST: limonka (for Cuba Libre), bazylia (for Gin Basil Smash)
  DON'T SUGGEST: triple sec (no tequila), mint (no rum)

- If user has only "cola, rum":
  CAN'T MAKE: anything
  ALMOST: Cuba Libre (missing lime)
  SUGGEST: limonka (unlocks Cuba Libre)

REMEMBER: Be smart about brands, check ALL ingredients before suggestions!`;

module.exports = async (req, res) => {
  try {
    const { ingredients, language } = req.body;
    const requestLanguage = language || 'en';
    
    console.log(`🍹 MyBar request - Ingredients: ${ingredients}`);
    console.log(`🌍 Language: ${requestLanguage}`);
    
    // Pre-process ingredients to normalize common typos AND brands
    const normalizedIngredients = ingredients.map(ing => {
      const lower = ing.toLowerCase().trim();
      
      // Brand mapping - keep original but help AI understand
      const brandMap = {
        'jack daniels': 'whisky',
        'jack daniel\'s': 'whisky',
        'jack daniels miodowy': 'honey whiskey liqueur',
        'jack daniel\'s honey': 'honey whiskey liqueur',
        'jim beam': 'whisky',
        'johnnie walker': 'whisky',
        'bombay': 'gin',
        'bombay sapphire': 'gin',
        'tanqueray': 'gin',
        'beefeater': 'gin',
        'gordon\'s': 'gin',
        'absolut': 'vodka',
        'grey goose': 'vodka',
        'smirnoff': 'vodka',
        'stolichnaya': 'vodka',
        'bacardi': 'rum',
        'captain morgan': 'rum',
        'havana club': 'rum',
        'jose cuervo': 'tequila',
        'patron': 'tequila',
        'olmeca': 'tequila',
        'kinley': 'tonic water',
        'schweppes': 'tonic water',
        'coca-cola': 'cola',
        'coca cola': 'cola',
        'coke': 'cola',
        'pepsi': 'cola',
        'sprite': 'lemon-lime soda',
        '7up': 'lemon-lime soda',
        'canada dry': 'ginger ale'
      };
      
      // Check brand mapping first but keep original
      for (const [brand, ingredient] of Object.entries(brandMap)) {
        if (lower.includes(brand)) {
          return ing; // Keep original for AI to understand context
        }
      }
      
      // Common typos mapping
      const typoMap = {
        'łiski': 'whisky',
        'wisky': 'whisky',
        'wiskey': 'whisky',
        'dzin': 'gin',
        'dżin': 'gin',
        'wodka': 'vodka',
        'wódka': 'vodka',
        'liomka': 'limonka',
        'cytyna': 'cytryna',
        'cukir': 'cukier',
        'minta': 'mięta',
        'mieta': 'mięta',
        'ogurek': 'ogórek',
        'bazylka': 'bazylia',
        'kola': 'cola',
        'tonik': 'tonic'
      };
      
      return typoMap[lower] || ing;
    });
    
    const userPrompt = requestLanguage === 'pl'
      ? `Mam te składniki: ${normalizedIngredients.join(', ')}

KRYTYCZNE ZASADY INTERPRETACJI:
- IGNORUJ wszystkie przedmioty niezwiązane z koktajlami (meble, jedzenie, ubrania, przedmioty)
- Akceptuj TYLKO składniki koktajlowe: alkohole, miksery, soki, zioła, likiery
- ROZPOZNAWAJ MARKI: 
  - "Bombay" = gin
  - "Jack Daniels" = whisky
  - "Kinley" = tonic water (NIE woda gazowana!)
  - "Baileys" = likier Irish cream
  - "Kahlua" = likier kawowy
  - "Campari" = bitter do Negroni
  - "Martini"/"Cinzano" = wermut
- "cytryna" = MAM sok z cytryny
- "limonka" = MAM sok z limonki
- "cukier" = MAM syrop cukrowy
- "miód" = MAM miód płynny

SPRAWDŹ DOKŁADNIE WSZYSTKIE KOKTAJLE:
1. Whiskey Sour: whisky + cytryna + cukier
2. Gin Sour: gin + cytryna + cukier
3. Gin & Tonic: gin + tonic
4. Negroni: gin + campari + wermut (WSZYSTKIE 3!)
5. White Russian: wódka + kahlua + mleko/śmietana
6. Black Russian: wódka + kahlua
7. Tom Collins: gin + cytryna + cukier + woda gazowana (WSZYSTKIE 4!)
8. Cuba Libre: rum + cola + limonka (WSZYSTKIE 3!)
9. Gin Basil Smash: gin + cytryna + cukier + bazylia (WSZYSTKIE 4!)

SUGESTIE ZAKUPÓW - MYŚL LOGICZNIE:
- NIGDY nie sugeruj triple sec jeśli nie ma tequili!
- NIGDY nie sugeruj mięty jeśli nie ma rumu, limonki, cukru I wody gazowanej!
- Sugeruj TYLKO składniki które odblokują koktajl przy obecnych składnikach
- Przykład: jeśli ma gin + cytryna + cukier → sugeruj bazylię (odblokuje Gin Basil Smash)
- Przykład: jeśli ma gin + campari → sugeruj wermut (odblokuje Negroni)

Podaj koktajle które NAPRAWDĘ można zrobić.
Maksymalnie 4 koktajle w sekcji cocktails.
W shoppingList maksymalnie 3 najlepsze propozycje.
Wszystkie teksty po polsku.

RETURN ONLY VALID JSON!`
      : `I have these ingredients: ${normalizedIngredients.join(', ')}

CRITICAL INTERPRETATION RULES:
- IGNORE all non-cocktail items (furniture, food, clothes, objects)
- Accept ONLY cocktail ingredients: spirits, mixers, juices, herbs, liqueurs
- RECOGNIZE BRANDS:
  - "Bombay" = gin
  - "Jack Daniels" = whiskey
  - "Kinley" = tonic water (NOT soda water!)
  - "Baileys" = Irish cream liqueur
  - "Kahlua" = coffee liqueur
  - "Campari" = bitter for Negroni
  - "Martini"/"Cinzano" = vermouth
- "lemon" = I HAVE lemon juice
- "lime" = I HAVE lime juice
- "sugar" = I HAVE simple syrup
- "honey" = I HAVE liquid honey

CHECK ALL COCKTAILS CAREFULLY:
1. Whiskey Sour: whiskey + lemon + sugar
2. Gin Sour: gin + lemon + sugar
3. Gin & Tonic: gin + tonic
4. Negroni: gin + campari + vermouth (ALL 3!)
5. White Russian: vodka + kahlua + milk/cream
6. Black Russian: vodka + kahlua
7. Tom Collins: gin + lemon + sugar + soda water (ALL 4!)
8. Cuba Libre: rum + cola + lime (ALL 3!)
9. Gin Basil Smash: gin + lemon + sugar + basil (ALL 4!)

SHOPPING SUGGESTIONS - THINK LOGICALLY:
- NEVER suggest triple sec if no tequila!
- NEVER suggest mint if no rum, lime, sugar AND soda water!
- Only suggest ingredients that unlock cocktails with current ingredients
- Example: if has gin + lemon + sugar → suggest basil (unlocks Gin Basil Smash)
- Example: if has gin + campari → suggest vermouth (unlocks Negroni)

List cocktails I can ACTUALLY make.
Maximum 4 cocktails in cocktails section.
Maximum 3 items in shoppingList.
All text in English.

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
      console.log(`📊 Results: ${suggestions.cocktails?.length || 0} available, ${suggestions.almostPossible?.length || 0} missing 1`);
      
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
      
      // Process almostPossible section
      if (suggestions.almostPossible && Array.isArray(suggestions.almostPossible)) {
        suggestions.almostPossible = suggestions.almostPossible.map(item => ({
          ...item,
          nameEn: item.nameEn || item.name,
          ingredients: item.ingredients || [],
          instructions: item.instructions || [],
          method: item.method || 'stirred',
          ice: item.ice || (requestLanguage === 'pl' ? 'kostki' : 'cubed'),
          glassType: item.glassType || (requestLanguage === 'pl' ? 'szklanka' : 'glass'),
          garnish: item.garnish || ''
        }));
      } else if (suggestions.almostPossible && !Array.isArray(suggestions.almostPossible)) {
        suggestions.almostPossible = [suggestions.almostPossible];
      } else {
        suggestions.almostPossible = [];
      }
      
    } catch (e) {
      console.error('MyBar parse error:', e);
      
      // Enhanced fallback with better brand recognition
      const ingredientsList = normalizedIngredients.map(i => i.toLowerCase());
      
      // Better ingredient detection
      const hasWhisky = ingredientsList.some(i => 
        i.includes('whisk') || i.includes('jack daniel') || i.includes('jim beam') || 
        i.includes('johnnie walker') || i.includes('jameson')
      );
      const hasGin = ingredientsList.some(i => 
        i.includes('gin') || i.includes('bombay') || i.includes('tanqueray') ||
        i.includes('beefeater') || i.includes('gordon')
      );
      const hasTonic = ingredientsList.some(i => 
        i.includes('tonic') || i.includes('tonik') || i.includes('kinley') || 
        (i.includes('schweppes') && !i.includes('soda'))
      );
      const hasVodka = ingredientsList.some(i => 
        i.includes('vodka') || i.includes('wódka') || i.includes('absolut') || 
        i.includes('smirnoff') || i.includes('grey goose') || i.includes('stolichnaya')
      );
      const hasRum = ingredientsList.some(i => 
        i.includes('rum') && !i.includes('kahlua') || i.includes('bacardi') || 
        i.includes('captain morgan') || i.includes('havana')
      );
      const hasCola = ingredientsList.some(i => 
        i.includes('cola') || i.includes('coke') || i.includes('pepsi') || i.includes('coca')
      );
      const hasSugar = ingredientsList.some(i => 
        i.includes('cukier') || i.includes('sugar') || i.includes('syrop cukrowy')
      );
      const hasLemon = ingredientsList.some(i => 
        i.includes('cytryn') || i.includes('lemon')
      );
      const hasLime = ingredientsList.some(i => 
        i.includes('limonk') || i.includes('lime')
      );
      const hasSoda = ingredientsList.some(i => 
        i.includes('woda gazowana') || i.includes('soda water') || 
        i.includes('sparkling water') || (i.includes('schweppes') && i.includes('soda'))
      );
      const hasCampari = ingredientsList.some(i => i.includes('campari'));
      const hasVermouth = ingredientsList.some(i => 
        i.includes('wermut') || i.includes('vermouth') || i.includes('martini') || 
        i.includes('cinzano')
      );
      const hasKahlua = ingredientsList.some(i => 
        i.includes('kahlua') || i.includes('kahluá') || i.includes('kalua')
      );
      const hasBaileys = ingredientsList.some(i => 
        i.includes('bailey') || i.includes('irish cream')
      );
      const hasMilk = ingredientsList.some(i => 
        i.includes('mleko') || i.includes('milk') || i.includes('śmietan') || 
        i.includes('cream')
      );
      const hasBasil = ingredientsList.some(i => 
        i.includes('bazyl') || i.includes('basil')
      );
      const hasMint = ingredientsList.some(i => 
        i.includes('mięt') || i.includes('mint') || i.includes('mient')
      );
      const hasHoney = ingredientsList.some(i => 
        i.includes('miód') || i.includes('honey')
      );
      
      const fallbackCocktails = [];
      const fallbackAlmostPossible = [];
      const shoppingList = [];
      
      // Check for Gin & Tonic
      if (hasGin && hasTonic) {
        fallbackCocktails.push({
          name: "Gin & Tonic",
          nameEn: "Gin & Tonic",
          available: true,
          description: requestLanguage === 'pl' ? "Klasyczny orzeźwiający drink" : "Classic refreshing drink",
          category: "highball",
          ingredients: [
            {name: "Gin", amount: "50", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Tonik" : "Tonic water", amount: "150", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Napełnij szklankę lodem", "Dodaj gin", "Dopełnij tonikiem", "Delikatnie zamieszaj"]
            : ["Fill glass with ice", "Add gin", "Top with tonic", "Stir gently"],
          glassType: "highball",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: requestLanguage === 'pl' ? "Plasterek limonki lub cytryny" : "Lime or lemon slice",
          history: ""
        });
      }
      
      // Check for Whiskey Sour
      if (hasWhisky && hasSugar && hasLemon) {
        fallbackCocktails.push({
          name: "Whiskey Sour",
          nameEn: "Whiskey Sour",
          available: true,
          description: requestLanguage === 'pl' ? "Klasyczny kwaśny koktajl" : "Classic sour cocktail",
          category: "sour",
          ingredients: [
            {name: requestLanguage === 'pl' ? "Whisky" : "Whiskey", amount: "60", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Sok z cytryny" : "Lemon juice", amount: "30", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Syrop cukrowy" : "Simple syrup", amount: "20", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Wstrząśnij wszystkie składniki z lodem", "Przecedź do szklanki rocks", "Udekoruj plasterkiem cytryny"]
            : ["Shake all ingredients with ice", "Strain into rocks glass", "Garnish with lemon wheel"],
          glassType: requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass",
          method: "shaken",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: requestLanguage === 'pl' ? "Plasterek cytryny" : "Lemon wheel",
          history: ""
        });
      }
      
      // Check for Gin Sour
      if (hasGin && hasSugar && hasLemon) {
        fallbackCocktails.push({
          name: "Gin Sour",
          nameEn: "Gin Sour",
          available: true,
          description: requestLanguage === 'pl' ? "Orzeźwiający kwaśny koktajl" : "Refreshing sour cocktail",
          category: "sour",
          ingredients: [
            {name: "Gin", amount: "60", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Sok z cytryny" : "Lemon juice", amount: "30", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Syrop cukrowy" : "Simple syrup", amount: "20", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Wstrząśnij wszystkie składniki z lodem", "Przecedź do szklanki coupe", "Udekoruj cytryną"]
            : ["Shake all ingredients with ice", "Strain into coupe glass", "Garnish with lemon"],
          glassType: requestLanguage === 'pl' ? "kieliszek coupe" : "coupe glass",
          method: "shaken",
          ice: requestLanguage === 'pl' ? "bez lodu" : "no ice",
          garnish: requestLanguage === 'pl' ? "Skórka cytryny" : "Lemon peel",
          history: ""
        });
      }
      
      // Check for Negroni
      if (hasGin && hasCampari && hasVermouth) {
        fallbackCocktails.push({
          name: "Negroni",
          nameEn: "Negroni",
          available: true,
          description: requestLanguage === 'pl' ? "Klasyczny włoski aperitif" : "Classic Italian aperitif",
          category: "classic",
          ingredients: [
            {name: "Gin", amount: "30", unit: "ml"},
            {name: "Campari", amount: "30", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Słodki wermut" : "Sweet vermouth", amount: "30", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Dodaj wszystkie składniki do szklanki z lodem", "Zamieszaj", "Udekoruj skórką pomarańczy"]
            : ["Add all ingredients to glass with ice", "Stir", "Garnish with orange peel"],
          glassType: requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass",
          method: "stirred",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: requestLanguage === 'pl' ? "Skórka pomarańczy" : "Orange peel",
          history: ""
        });
      }
      
      // Check for White Russian
      if (hasVodka && hasKahlua && (hasMilk || hasBaileys)) {
        fallbackCocktails.push({
          name: "White Russian",
          nameEn: "White Russian",
          available: true,
          description: requestLanguage === 'pl' ? "Kremowy koktajl kawowy" : "Creamy coffee cocktail",
          category: "classic",
          ingredients: [
            {name: requestLanguage === 'pl' ? "Wódka" : "Vodka", amount: "40", unit: "ml"},
            {name: "Kahlua", amount: "20", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Śmietanka" : "Heavy cream", amount: "20", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Dodaj wódkę i kahlua do szklanki z lodem", "Delikatnie wlej śmietankę po łyżce"]
            : ["Add vodka and kahlua to glass with ice", "Float cream on top"],
          glassType: requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: "",
          history: ""
        });
      }
      
      // Check for Cuba Libre
      if (hasRum && hasCola && hasLime) {
        fallbackCocktails.push({
          name: "Cuba Libre",
          nameEn: "Cuba Libre",
          available: true,
          description: requestLanguage === 'pl' ? "Klasyczny drink z rumem i colą" : "Classic rum and cola cocktail",
          category: "highball",
          ingredients: [
            {name: requestLanguage === 'pl' ? "Rum" : "Rum", amount: "50", unit: "ml"},
            {name: "Cola", amount: "120", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Sok z limonki" : "Lime juice", amount: "10", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Napełnij szklankę lodem", "Dodaj rum i sok z limonki", "Dopełnij colą i delikatnie zamieszaj"]
            : ["Fill glass with ice", "Add rum and lime juice", "Top with cola and stir gently"],
          glassType: "highball",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: requestLanguage === 'pl' ? "Ćwiartka limonki" : "Lime wedge",
          history: ""
        });
      } else if (hasRum && hasCola && !hasLime) {
        fallbackAlmostPossible.push({
          name: "Cuba Libre",
          nameEn: "Cuba Libre",
          missingIngredient: requestLanguage === 'pl' ? "limonka" : "lime",
          description: requestLanguage === 'pl' ? "Orzeźwiający koktajl z rumem, colą i limonką" : "Refreshing cocktail with rum, cola and lime",
          category: "highball",
          ingredients: [
            {name: requestLanguage === 'pl' ? "Rum" : "Rum", amount: "50", unit: "ml"},
            {name: "Cola", amount: "120", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Sok z limonki" : "Lime juice", amount: "10", unit: "ml"}
          ],
          instructions: [],
          glassType: "highball",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: ""
        });
      }
      
      // Check for Tom Collins
      if (hasGin && hasLemon && hasSugar && hasSoda) {
        fallbackCocktails.push({
          name: "Tom Collins",
          nameEn: "Tom Collins",
          available: true,
          description: requestLanguage === 'pl' ? "Orzeźwiający koktajl ginowy z cytryną" : "Refreshing gin cocktail with lemon",
          category: "collins",
          ingredients: [
            {name: "Gin", amount: "50", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Sok z cytryny" : "Lemon juice", amount: "25", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Syrop cukrowy" : "Simple syrup", amount: "15", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Woda gazowana" : "Soda water", amount: "100", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Dodaj gin, sok z cytryny i syrop do szklanki z lodem", "Dopełnij wodą gazowaną", "Delikatnie zamieszaj"]
            : ["Add gin, lemon juice and syrup to glass with ice", "Top with soda water", "Stir gently"],
          glassType: "highball",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: requestLanguage === 'pl' ? "Plasterek cytryny i wisienka" : "Lemon slice and cherry",
          history: ""
        });
      } else if (hasGin && hasLemon && hasSugar && !hasSoda) {
        fallbackAlmostPossible.push({
          name: "Tom Collins",
          nameEn: "Tom Collins",
          missingIngredient: requestLanguage === 'pl' ? "woda gazowana" : "soda water",
          description: requestLanguage === 'pl' ? "Orzeźwiający koktajl ginowy z cytryną" : "Refreshing gin cocktail with lemon",
          category: "collins",
          ingredients: [
            {name: "Gin", amount: "50", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Sok z cytryny" : "Lemon juice", amount: "25", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Syrop cukrowy" : "Simple syrup", amount: "15", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Woda gazowana" : "Soda water", amount: "100", unit: "ml"}
          ],
          instructions: [],
          glassType: "highball",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: ""
        });
      }
      
      // Smart shopping suggestions based on what user has
      
      // If has gin + lemon + sugar, suggest basil for Gin Basil Smash
      if (hasGin && hasLemon && hasSugar && !hasBasil) {
        shoppingList.push({
          ingredient: requestLanguage === 'pl' ? "Bazylia" : "Basil",
          unlocksCount: 1,
          priority: "high",
          reason: requestLanguage === 'pl' 
            ? "Masz gin, cytrynę i cukier - dodaj tylko bazylię do Gin Basil Smash!"
            : "You have gin, lemon and sugar - just add basil for Gin Basil Smash!",
          newCocktails: ["Gin Basil Smash"]
        });
      }
      
      // If has gin + campari, suggest vermouth for Negroni
      if (hasGin && hasCampari && !hasVermouth) {
        shoppingList.push({
          ingredient: requestLanguage === 'pl' ? "Wermut" : "Vermouth",
          unlocksCount: 1,
          priority: "high",
          reason: requestLanguage === 'pl' 
            ? "Masz gin i Campari - dodaj wermut do klasycznego Negroni!"
            : "You have gin and Campari - add vermouth for classic Negroni!",
          newCocktails: ["Negroni"]
        });
      }
      
      // If has vodka + kahlua, suggest milk/cream for White Russian
      if (hasVodka && hasKahlua && !hasMilk && !hasBaileys) {
        shoppingList.push({
          ingredient: requestLanguage === 'pl' ? "Mleko lub śmietanka" : "Milk or cream",
          unlocksCount: 1,
          priority: "high",
          reason: requestLanguage === 'pl' 
            ? "Masz wódkę i Kahlua - dodaj mleko do White Russian!"
            : "You have vodka and Kahlua - add milk for White Russian!",
          newCocktails: ["White Russian"]
        });
      }
      
      // If has rum and cola but no lime, suggest lime
      if (hasRum && hasCola && !hasLime) {
        shoppingList.push({
          ingredient: requestLanguage === 'pl' ? "Limonka" : "Lime",
          unlocksCount: 1,
          priority: "high",
          reason: requestLanguage === 'pl' 
            ? "Masz rum i colę - brakuje tylko limonki do Cuba Libre!"
            : "You have rum and cola - just need lime for Cuba Libre!",
          newCocktails: ["Cuba Libre"]
        });
      }
      
      // If has gin, lemon, sugar but no soda, suggest soda water
      if (hasGin && hasLemon && hasSugar && !hasSoda) {
        shoppingList.push({
          ingredient: requestLanguage === 'pl' ? "Woda gazowana" : "Soda water",
          unlocksCount: 1,
          priority: "high",
          reason: requestLanguage === 'pl' 
            ? "Masz gin, cytrynę i cukier - brakuje tylko wody gazowanej do Tom Collins!"
            : "You have gin, lemon and sugar - just need soda water for Tom Collins!",
          newCocktails: ["Tom Collins"]
        });
      }
      
      // Limit to 3 suggestions
      shoppingList.splice(3);
      
      // Limit cocktails to 4
      fallbackCocktails.splice(4);
      
      suggestions = {
        cocktails: fallbackCocktails,
        almostPossible: fallbackAlmostPossible,
        shoppingList: shoppingList
      };
    }

    // CRITICAL: Return data wrapped in 'data' property for consistency with other endpoints
    const responseData = {
      possibleDrinks: suggestions.cocktails || [],
      missingOneIngredient: (suggestions.almostPossible || [])
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
        })),
      shoppingList: suggestions.shoppingList || []
    };

    console.log('📤 Sending to frontend:', {
      possibleDrinks: responseData.possibleDrinks.length,
      missingOneIngredient: responseData.missingOneIngredient.length,
      shoppingList: responseData.shoppingList.length
    });

    // CRITICAL: Wrap response in 'data' property to match what frontend expects
    res.json({ data: responseData });
    
  } catch (error) {
    console.error('MyBar error:', error);
    res.status(500).json({ error: error.message });
  }
};