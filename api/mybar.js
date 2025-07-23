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
- Absolut = vodka
- Smirnoff = vodka
- Bacardi = rum
- Captain Morgan = rum
- Jose Cuervo = tequila
- Patron = tequila
- Schweppes = can be tonic water OR ginger ale OR soda water (ask context)
- Kinley = tonic water (Indian Ocean brand)
- Coca-Cola / Coke = cola
- Pepsi = cola
- Sprite / 7UP = lemon-lime soda (NOT soda water)
- Canada Dry = ginger ale
- Jack Daniel's Honey = honey whiskey liqueur
- Jack Daniel's Fire = cinnamon whiskey liqueur

SMART INTERPRETATION:
- "Jack Daniels" = user has whiskey
- "Jack Daniels miodowy" = user has honey whiskey liqueur
- "Kinley" = user has TONIC WATER (not soda water!)
- "Schweppes" alone = assume tonic water
- "Schweppes tonic" = tonic water
- "Schweppes soda" = soda water

CRITICAL FILTERING RULES:
1. IGNORE ALL non-cocktail items:
   - Furniture (krzesło, stół, okno, wersalka, kanapa, fotel, łóżko)
   - Food not used in cocktails (kiełbasa, kaszanka, chleb, ser, mięso)
   - Random objects (telefon, telewizor, samochód, rower)
   - Clothing (spodnie, koszula, buty)
2. ONLY ACCEPT cocktail-related ingredients:
   - Spirits: whisky, gin, rum, vodka, tequila, etc.
   - Mixers: cola, tonic, soda water, ginger beer
   - Juices: lemon, lime, orange, pineapple, cranberry
   - Herbs/garnish: mięta (mint), bazylia (basil), ogórek (cucumber)
   - Syrups/sweeteners: sugar, honey, grenadine
   - Liqueurs: triple sec, cointreau, campari, vermouth
3. Filter out everything else silently

TYPO UNDERSTANDING:
- łiski/wisky/wiskey → whisky
- dzin/dżin/gin → gin
- wodka/wódka → vodka
- rom/rhum → rum
- liomka/limonka → lime
- cytyna/cytryna → lemon
- minta/mienta → mięta
- ogurek/ogórek → cucumber
- bazylka/bazylia → basil
- kola/cola → cola
- tonik/tonic → tonic water
- cukir/cukier → sugar

INGREDIENT INTERPRETATION - THIS IS CRITICAL:
- cytryna/lemon = lemon juice IS AVAILABLE
- limonka/lime = lime juice IS AVAILABLE
- cukier/sugar = simple syrup IS AVAILABLE
- pomarańcza/orange = orange juice IS AVAILABLE
- woda gazowana/soda water/sparkling water = soda water IS AVAILABLE
- bazylia/basil = fresh basil IS AVAILABLE
- mięta/mint = fresh mint IS AVAILABLE
- Always assume juice/syrup form unless specifically stated otherwise

WHEN CHECKING IF USER CAN MAKE A COCKTAIL:
- Whiskey Sour needs: whisky + lemon/cytryna + sugar/cukier (egg white is OPTIONAL)
- Gin Sour needs: gin + lemon/cytryna + sugar/cukier (egg white is OPTIONAL) 
- Cuba Libre needs: rum + cola + lime/limonka
- Margarita needs: tequila + triple sec + lime/limonka (salt rim is OPTIONAL)
- Tom Collins needs: gin + lemon/cytryna + sugar/cukier + soda water/woda gazowana
- Gin & Tonic needs: gin + tonic water (Kinley IS tonic water!)
- Mojito needs: rum + lime/limonka + sugar/cukier + MINT/mięta + soda water/woda gazowana (ALL are required!)
- Gin Basil Smash needs: gin + lemon/cytryna + sugar/cukier + basil/bazylia
- Lynchburg Lemonade needs: Jack Daniels + triple sec + lemon + sugar + lemon-lime soda

SHOPPING SUGGESTIONS - BE SMART:
- Check what cocktails user is CLOSE to making
- Don't suggest ingredients for cocktails where user is missing multiple key ingredients
- Example: If user has only "mięta" (mint), DON'T suggest rum for Mojito (they also need lime, sugar, soda)
- Example: If user has "gin, cytryna, cukier", suggest "woda gazowana" for Tom Collins
- Be realistic - one purchase should unlock at least one cocktail

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
- Gin Basil Smash: gin 60ml, lemon juice 30ml, simple syrup 20ml, basil 8-10 leaves
- Lynchburg Lemonade: Jack Daniels 45ml, triple sec 20ml, lemon juice 30ml, simple syrup 15ml, lemon-lime soda top

GLASSWARE RULES:
- Rocks/Old Fashioned glass: Whiskey Sour, Old Fashioned, Negroni
- Highball glass: Tom Collins, Mojito, Cuba Libre, Lynchburg Lemonade
- Coupe glass: Margarita, Daiquiri, Clover Club
- Martini glass: Martini, Manhattan, Espresso Martini
- Wine glass: Aperol Spritz, Hugo
- Copper mug: Moscow Mule

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

IMPORTANT EXAMPLES:
- If user has "whisky, cytryna, cukier" they CAN make Whiskey Sour (show in cocktails section)
- If user has "gin, cytryna, cukier" they CAN make Gin Sour (show in cocktails section)
- If user has "rum, cola" but NO lime, Cuba Libre goes to almostPossible
- If user has "gin, cytryna, cukier" but NO soda water, Tom Collins goes to almostPossible
- If user has "Bombay, Kinley" they CAN make Gin & Tonic (Bombay=gin, Kinley=tonic)
- If user has "Jack Daniels, Bombay, cytryna, cukier, Kinley" they CAN make:
  - Whiskey Sour (Jack Daniels + cytryna + cukier)
  - Gin Sour (Bombay + cytryna + cukier) 
  - Gin & Tonic (Bombay + Kinley)
  And shopping suggestion: bazylia for Gin Basil Smash
- Only suggest shopping items that make sense with user's current ingredients`;

module.exports = async (req, res) => {
  try {
    const { ingredients, language } = req.body;
    const requestLanguage = language || 'en';
    
    console.log(`🍹 MyBar request - Ingredients: ${ingredients}`);
    console.log(`🌍 Language: ${requestLanguage}`);
    
    // Pre-process ingredients to normalize common typos AND brands
    const normalizedIngredients = ingredients.map(ing => {
      const lower = ing.toLowerCase().trim();
      
      // Brand mapping
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
        'absolut': 'vodka',
        'smirnoff': 'vodka',
        'bacardi': 'rum',
        'captain morgan': 'rum',
        'jose cuervo': 'tequila',
        'patron': 'tequila',
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
      
      // Check brand mapping first
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
- Akceptuj TYLKO składniki koktajlowe: alkohole, miksery, soki, zioła (mięta, bazylia, ogórek)
- ROZPOZNAWAJ MARKI: 
  - "Jack Daniels" = whisky
  - "Bombay" = gin
  - "Kinley" = tonic water (NIE woda gazowana!)
  - itp. (patrz lista marek)
- "cytryna" = MAM sok z cytryny (lemon juice)
- "limonka" = MAM sok z limonki (lime juice)
- "cukier" = MAM syrop cukrowy (simple syrup)
- "pomarańcza" = MAM sok pomarańczowy (orange juice)

WAŻNE - DOKŁADNIE SPRAWDŹ:
- Jeśli użytkownik ma "whisky, cukier, cytryna" = MOŻE zrobić Whiskey Sour (pokaz w sekcji cocktails)
- Jeśli użytkownik ma "gin, cukier, cytryna" = MOŻE zrobić Gin Sour (pokaz w sekcji cocktails)
- Jeśli użytkownik ma "Bombay, Kinley" = MOŻE zrobić Gin & Tonic (Bombay to gin, Kinley to tonic!)
- Jeśli użytkownik ma "rum, cola" ale NIE MA limonki = Cuba Libre idzie do almostPossible
- Jeśli użytkownik ma "gin, cytryna, cukier" ale NIE MA wody gazowanej = Tom Collins idzie do almostPossible
- NIE WYMAGAJ białka jajka, bitterów, soli - to opcjonalne

PRZYKŁADY:
- "Jack Daniels, Bombay, cola, cukier, cytryna" = użytkownik może zrobić:
  - Whiskey Sour (Jack Daniels + cytryna + cukier)
  - Gin Sour (Bombay + cytryna + cukier)
- "Jack Daniels, Bombay, cytryna, cukier, Kinley" = użytkownik może zrobić:
  - Whiskey Sour (Jack Daniels + cytryna + cukier)
  - Gin Sour (Bombay + cytryna + cukier)
  - Gin & Tonic (Bombay + Kinley)
  I sugestia zakupu: bazylia do Gin Basil Smash (ma już gin + cytryna + cukier)
- "gin, Kinley" = użytkownik może zrobić Gin & Tonic (Kinley to tonic water!)
- Sugeruj tylko sensowne zakupy które pasują do obecnych składników użytkownika
- NIE sugeruj że mięta "odblokuje Mojito" jeśli użytkownik nie ma rumu, limonki, cukru i wody gazowanej!
- NIE sugeruj że triple sec "odblokuje Margaritę" jeśli użytkownik nie ma tequili!
- Sugestie zakupów muszą być realistyczne - jeden składnik odblokuje drink TYLKO jeśli użytkownik ma WSZYSTKIE pozostałe składniki

WAŻNE DLA SUGESTII ZAKUPÓW:
- Sprawdź WSZYSTKIE wymagane składniki przed sugerowaniem zakupu
- Jeśli użytkownik ma TYLKO miętę, NIE sugeruj rumu dla Mojito (brakuje też limonki, cukru, wody)
- Jeśli użytkownik ma gin + Kinley, może sugerować cytrynę i cukier dla Tom Collins (potrzebuje tylko wody gazowanej)

Podaj koktajle które NAPRAWDĘ można zrobić ze składników.
Maksymalnie 4 koktajle w sekcji cocktails.
W shoppingList maksymalnie 3 najlepsze propozycje.
Wszystkie teksty po polsku.
Kinley to TONIC WATER, nie woda gazowana!

RETURN ONLY VALID JSON!`
      : `I have these ingredients: ${normalizedIngredients.join(', ')}

CRITICAL INTERPRETATION RULES:
- IGNORE all non-cocktail items (furniture, food, clothes, objects)
- Accept ONLY cocktail ingredients: spirits, mixers, juices, herbs (mint, basil, cucumber)
- RECOGNIZE BRANDS:
  - "Jack Daniels" = whiskey
  - "Bombay" = gin
  - "Kinley" = tonic water (NOT soda water!)
  - etc. (see brand list)
- "lemon" = I HAVE lemon juice
- "lime" = I HAVE lime juice
- "sugar" = I HAVE simple syrup
- "orange" = I HAVE orange juice

IMPORTANT - CHECK CAREFULLY:
- If user has "whisky, sugar, lemon" = CAN make Whiskey Sour (show in cocktails section)
- If user has "Bombay, Kinley" = CAN make Gin & Tonic (Bombay is gin, Kinley is tonic!)
- If user has "rum, cola" but NO lime = Cuba Libre goes to almostPossible
- If user has "gin, lemon, sugar" but NO soda water = Tom Collins goes to almostPossible
- DO NOT REQUIRE egg white, bitters, salt rim - these are optional

EXAMPLES:
- "Jack Daniels, Bombay, cola, sugar, lemon" = user can make Whiskey Sour (Jack Daniels is whiskey)
- "gin, Kinley" = user can make Gin & Tonic (Kinley is tonic water!)
- Only suggest shopping items that make sense with user's current ingredients
- DON'T suggest that mint "unlocks Mojito" if user doesn't have rum, lime, sugar and soda water!
- DON'T suggest that triple sec "unlocks Margarita" if user doesn't have tequila!
- Shopping suggestions must be realistic - one ingredient unlocks a drink ONLY if user has ALL other required ingredients

IMPORTANT FOR SHOPPING SUGGESTIONS:
- Check ALL required ingredients before suggesting a purchase
- If user has ONLY mint, DON'T suggest rum for Mojito (also missing lime, sugar, soda)
- If user has gin + Kinley, can suggest lemon and sugar for Tom Collins (would only need soda water)

List cocktails I can ACTUALLY make with ingredients.
Maximum 4 cocktails in cocktails section.
Maximum 3 items in shoppingList.
All text in English.
Kinley is TONIC WATER, not soda water!

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
      
      // Enhanced fallback with brand recognition
      const ingredientsList = normalizedIngredients.map(i => i.toLowerCase());
      
      // Brand recognition in fallback
      const hasWhisky = ingredientsList.some(i => 
        i.includes('whisk') || i.includes('jack daniel') || i.includes('jim beam') || i.includes('johnnie walker')
      );
      const hasGin = ingredientsList.some(i => 
        i.includes('gin') || i.includes('bombay') || i.includes('tanqueray')
      );
      const hasTonic = ingredientsList.some(i => 
        i.includes('tonic') || i.includes('kinley') || (i.includes('schweppes') && !i.includes('soda'))
      );
      const hasVodka = ingredientsList.some(i => 
        i.includes('vodka') || i.includes('absolut') || i.includes('smirnoff')
      );
      const hasRum = ingredientsList.some(i => 
        i.includes('rum') || i.includes('bacardi') || i.includes('captain morgan')
      );
      const hasCola = ingredientsList.some(i => 
        i.includes('cola') || i.includes('coke') || i.includes('pepsi') || i.includes('coca')
      );
      const hasSugar = ingredientsList.some(i => i.includes('cukier') || i.includes('sugar'));
      const hasLemon = ingredientsList.some(i => i.includes('cytryn') || i.includes('lemon'));
      const hasLime = ingredientsList.some(i => i.includes('limonk') || i.includes('lime'));
      const hasSoda = ingredientsList.some(i => 
        i.includes('woda gazowana') || 
        i.includes('soda water') || 
        i.includes('sparkling water') ||
        (i.includes('schweppes') && i.includes('soda'))
      );
      
      const fallbackCocktails = [];
      const fallbackAlmostPossible = [];
      const shoppingList = [];
      
      // Check for Gin & Tonic (including Kinley!)
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
      
      // Check for Whiskey Sour (including Jack Daniels!)
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
      
      // Smart shopping suggestions based on what user has
      if (hasGin && hasTonic && !hasLime) {
        shoppingList.push({
          ingredient: requestLanguage === 'pl' ? "Limonka" : "Lime",
          unlocksCount: 0,
          priority: "low",
          reason: requestLanguage === 'pl' 
            ? "Idealny dodatek do Gin & Tonic"
            : "Perfect garnish for Gin & Tonic",
          newCocktails: []
        });
      }
      
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