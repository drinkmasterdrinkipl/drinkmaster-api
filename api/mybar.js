const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Comprehensive cocktail recipes database
const COCKTAIL_RECIPES = {
  'Whiskey Sour': {
    required: ['whisky', 'lemon', 'sugar'],
    optional: ['egg white'],
    category: 'sour'
  },
  'Gin Sour': {
    required: ['gin', 'lemon', 'sugar'],
    optional: ['egg white'],
    category: 'sour'
  },
  'Tom Collins': {
    required: ['gin', 'lemon', 'sugar', 'soda water'],
    optional: [],
    category: 'collins'
  },
  'Gin & Tonic': {
    required: ['gin', 'tonic'],
    optional: ['lime', 'lemon'],
    category: 'highball'
  },
  'Cuba Libre': {
    required: ['rum', 'cola', 'lime'],
    optional: [],
    category: 'highball'
  },
  'Rum & Coke': {
    required: ['rum', 'cola'],
    optional: ['lime'],
    category: 'highball'
  },
  'Vodka Red Bull': {
    required: ['vodka', 'energy drink'],
    optional: [],
    category: 'modern'
  },
  'Jägerbomb': {
    required: ['jagermeister', 'energy drink'],
    optional: [],
    category: 'shot'
  },
  'Mojito': {
    required: ['rum', 'lime', 'sugar', 'mint', 'soda water'],
    optional: [],
    category: 'highball'
  },
  'Margarita': {
    required: ['tequila', 'triple sec', 'lime'],
    optional: ['salt'],
    category: 'classic'
  },
  'Negroni': {
    required: ['gin', 'campari', 'vermouth'],
    optional: ['orange'],
    category: 'classic'
  },
  'White Russian': {
    required: ['vodka', 'kahlua', 'cream'],
    optional: [],
    category: 'classic'
  },
  'Black Russian': {
    required: ['vodka', 'kahlua'],
    optional: [],
    category: 'classic'
  },
  'Gin Basil Smash': {
    required: ['gin', 'lemon', 'sugar', 'basil'],
    optional: [],
    category: 'modern'
  },
  'Whiskey Honey': {
    required: ['whisky', 'honey', 'lemon'],
    optional: ['hot water'],
    category: 'classic'
  },
  'Old Fashioned': {
    required: ['whisky', 'sugar'],
    optional: ['bitters', 'orange'],
    category: 'classic'
  },
  'Manhattan': {
    required: ['whisky', 'vermouth'],
    optional: ['bitters', 'cherry'],
    category: 'classic'
  },
  'Daiquiri': {
    required: ['rum', 'lime', 'sugar'],
    optional: [],
    category: 'classic'
  },
  'Cosmopolitan': {
    required: ['vodka', 'triple sec', 'cranberry', 'lime'],
    optional: [],
    category: 'modern'
  },
  'Moscow Mule': {
    required: ['vodka', 'lime', 'ginger beer'],
    optional: [],
    category: 'classic'
  },
  'Dark & Stormy': {
    required: ['rum', 'ginger beer', 'lime'],
    optional: [],
    category: 'classic'
  },
  'Long Island Iced Tea': {
    required: ['vodka', 'gin', 'rum', 'tequila', 'triple sec', 'lemon', 'cola'],
    optional: [],
    category: 'modern'
  },
  'Aperol Spritz': {
    required: ['aperol', 'prosecco', 'soda water'],
    optional: ['orange'],
    category: 'aperitif'
  },
  'Espresso Martini': {
    required: ['vodka', 'kahlua', 'espresso'],
    optional: [],
    category: 'modern'
  },
  'Vodka Cranberry': {
    required: ['vodka', 'cranberry'],
    optional: ['lime'],
    category: 'highball'
  },
  'Vodka Orange': {
    required: ['vodka', 'orange'],
    optional: [],
    category: 'highball'
  },
  'Screwdriver': {
    required: ['vodka', 'orange'],
    optional: [],
    category: 'highball'
  },
  'Tequila Sunrise': {
    required: ['tequila', 'orange', 'grenadine'],
    optional: [],
    category: 'highball'
  },
  'Sex on the Beach': {
    required: ['vodka', 'peach schnapps', 'orange', 'cranberry'],
    optional: [],
    category: 'highball'
  },
  'Piña Colada': {
    required: ['rum', 'coconut cream', 'pineapple'],
    optional: [],
    category: 'tiki'
  },
  'Mai Tai': {
    required: ['rum', 'orange liqueur', 'lime', 'orgeat'],
    optional: [],
    category: 'tiki'
  },
  'Whiskey Coke': {
    required: ['whisky', 'cola'],
    optional: ['lime'],
    category: 'highball'
  },
  'Gin Fizz': {
    required: ['gin', 'lemon', 'sugar', 'soda water'],
    optional: ['egg white'],
    category: 'fizz'
  },
  'Paloma': {
    required: ['tequila', 'grapefruit', 'lime', 'soda water'],
    optional: ['salt'],
    category: 'highball'
  },
  'Bloody Mary': {
    required: ['vodka', 'tomato juice', 'lemon'],
    optional: ['worcestershire', 'tabasco', 'celery'],
    category: 'brunch'
  },
  'Mimosa': {
    required: ['champagne', 'orange'],
    optional: [],
    category: 'brunch'
  },
  'Bellini': {
    required: ['prosecco', 'peach'],
    optional: [],
    category: 'brunch'
  },
  'Kir Royale': {
    required: ['champagne', 'cassis'],
    optional: [],
    category: 'aperitif'
  },
  'Caipirinha': {
    required: ['cachaca', 'lime', 'sugar'],
    optional: [],
    category: 'classic'
  },
  'Pisco Sour': {
    required: ['pisco', 'lime', 'sugar'],
    optional: ['egg white', 'bitters'],
    category: 'sour'
  },
  'Vodka Tonic': {
    required: ['vodka', 'tonic'],
    optional: ['lime'],
    category: 'highball'
  },
  'Amaretto Sour': {
    required: ['amaretto', 'lemon', 'sugar'],
    optional: ['egg white'],
    category: 'sour'
  }
};

const MYBAR_SYSTEM_PROMPT = `You are a world-class bartender helping users make cocktails with available ingredients. You have deep knowledge of classic cocktails, their authentic recipes, AND brand names.

CRITICAL RULES:
1. Use ONLY authentic classic recipes with correct proportions
2. Return ONLY valid JSON - no markdown, no extra text
3. ALL text in requested language (pl/en)
4. Never return empty ingredients arrays
5. BE INTUITIVE - understand what users mean:
   - "cytryna" = user HAS lemon juice (sok z cytryny)
   - "limonka" = user HAS lime juice (sok z limonki)
   - "cukier" = user HAS simple syrup (syrop cukrowy)
   - Users don't need to specify "sok z" - assume juice is available
6. ONLY suggest cocktails where user has ALL MAIN ingredients
7. For shopping suggestions, ONLY suggest ingredients that will unlock cocktails with CURRENT ingredients
8. Show ALL cocktails that can be made (no limit)
9. Include COMPLETE recipe details
10. Check EVERY cocktail thoroughly before suggesting

BRAND RECOGNITION - BE SMART:
Common brands and what they are:
- Jack Daniels / Jack Daniel's = whiskey
- Jim Beam = whiskey
- Johnnie Walker = whisky (scotch)
- Jameson = whiskey (irish)
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
- Schweppes = tonic water (unless specified otherwise)
- Kinley = tonic water
- Coca-Cola / Coke = cola
- Pepsi = cola
- Sprite / 7UP = lemon-lime soda (NOT soda water)
- Canada Dry = ginger ale
- Baileys = Irish cream (can replace cream in some cocktails)
- Kahlua = coffee liqueur
- Campari = bitter liqueur
- Aperol = aperitif
- Martini / Cinzano = vermouth
- Cointreau = triple sec (premium)
- Grand Marnier = orange liqueur (can replace triple sec)

SOFT DRINKS & ENERGY DRINKS:
- Red Bull = energy drink (can use for vodka red bull)
- Monster = energy drink
- Rockstar = energy drink
- Tiger = energy drink
- Burn = energy drink
- Fanta = orange soda (can replace orange juice in some cocktails)
- Mirinda = orange soda
- Mountain Dew = citrus soda
- Dr Pepper = cherry/cola drink
- Ginger Beer = spicy ginger mixer (for Moscow Mule, Dark & Stormy)
- Tonic Water = quinine mixer (for Gin & Tonic, Vodka Tonic)
- Soda Water / Club Soda = carbonated water
- Sparkling Water = carbonated water
- Juice brands: Tymbark, Hortex, Cappy, Tropicana = various juices

INGREDIENT MAPPING:
- "whisky" or any whiskey brand → has whiskey
- "gin" or any gin brand → has gin
- "vodka" or "wódka" or any vodka brand → has vodka
- "rum" or any rum brand → has rum
- "tonic" or "tonik" or "Kinley" → has tonic water
- "wermut" or "vermouth" or "Martini" or "Cinzano" → has vermouth
- "campari" → has Campari
- "baileys" → has Irish cream (can work as cream)
- "kahlua" or "kahluá" → has coffee liqueur
- "triple sec" or "cointreau" → has triple sec
- "miód" or "honey" → has honey
- "cytryna" or "lemon" → has lemon juice
- "limonka" or "lime" → has lime juice
- "cukier" or "sugar" → has simple syrup
- "mięta" or "mint" → has fresh mint
- "bazylia" or "basil" → has fresh basil
- "mleko" or "milk" or "śmietana" or "cream" → has cream/milk
- "woda gazowana" or "soda water" → has soda water
- "bitter" or "bitters" or "angostura" → has bitters
- "red bull" or "monster" or "tiger" → has energy drink
- "fanta" or "mirinda" → has orange soda (can work as orange juice)
- "sprite" or "7up" → has lemon-lime soda
- "ginger beer" or "canada dry" → has ginger beer
- "pomarańcza" or "orange" or "sok pomarańczowy" → has orange juice
- "żurawina" or "cranberry" → has cranberry juice
- "grejpfrut" or "grapefruit" → has grapefruit juice

CRITICAL COCKTAIL REQUIREMENTS:
Check ALL ingredients before suggesting any cocktail or shopping item!
NEVER suggest optional ingredients like bitters, egg white, garnishes as shopping items.

SHOPPING LOGIC - BE EXTREMELY CAREFUL:
1. NEVER suggest an ingredient if user is missing multiple other ingredients for that cocktail
2. Only suggest ingredients that unlock cocktails with CURRENT ingredients
3. Check the COMPLETE recipe before any suggestion
4. Maximum 2 shopping suggestions
5. NEVER suggest optional ingredients (bitters, egg white, salt rim, garnishes)

Example checks:
- Has cola only → DON'T suggest rum (also needs lime for Cuba Libre)
- Has rum + cola → DO suggest lime (completes Cuba Libre)
- Has gin + lemon + sugar → DO suggest basil (completes Gin Basil Smash)
- Has gin + campari → DO suggest vermouth (completes Negroni)
- Has vodka + kahlua → DO suggest cream/milk (completes White Russian)

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
      "missingIngredient": "What's missing (only if ONE ingredient missing)",
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
      "newCocktails": ["cocktail1", "cocktail2"]
    }
  ]
}

REMEMBER: 
- Check EVERY ingredient requirement
- NEVER suggest ingredients that won't unlock anything
- Be honest about what can be made
- Maximum 2 shopping suggestions`;

// Helper function to normalize ingredient names
function normalizeIngredient(ing) {
  const lower = ing.toLowerCase().trim();
  
  // Brand to ingredient mapping
  const brandMap = {
    // Whiskey brands
    'jack daniels': 'whisky',
    'jack daniel\'s': 'whisky',
    'jim beam': 'whisky',
    'johnnie walker': 'whisky',
    'jameson': 'whisky',
    'makers mark': 'whisky',
    'crown royal': 'whisky',
    'chivas': 'whisky',
    'ballantines': 'whisky',
    
    // Gin brands
    'bombay': 'gin',
    'bombay sapphire': 'gin',
    'tanqueray': 'gin',
    'beefeater': 'gin',
    'gordon\'s': 'gin',
    'gordons': 'gin',
    'hendricks': 'gin',
    'hendrick\'s': 'gin',
    
    // Vodka brands
    'absolut': 'vodka',
    'grey goose': 'vodka',
    'smirnoff': 'vodka',
    'stolichnaya': 'vodka',
    'belvedere': 'vodka',
    'finlandia': 'vodka',
    'wyborowa': 'vodka',
    
    // Rum brands
    'bacardi': 'rum',
    'captain morgan': 'rum',
    'havana club': 'rum',
    'malibu': 'coconut rum',
    'kraken': 'rum',
    
    // Tequila brands
    'jose cuervo': 'tequila',
    'patron': 'tequila',
    'olmeca': 'tequila',
    'sauza': 'tequila',
    
    // Mixers
    'kinley': 'tonic',
    'schweppes': 'tonic',
    'coca-cola': 'cola',
    'coca cola': 'cola',
    'coke': 'cola',
    'pepsi': 'cola',
    'sprite': 'lemon-lime soda',
    '7up': 'lemon-lime soda',
    '7 up': 'lemon-lime soda',
    'canada dry': 'ginger beer',
    'fanta': 'orange',
    'mirinda': 'orange',
    'mountain dew': 'citrus soda',
    'dr pepper': 'cola',
    
    // Energy drinks
    'red bull': 'energy drink',
    'redbull': 'energy drink',
    'monster': 'energy drink',
    'rockstar': 'energy drink',
    'tiger': 'energy drink',
    'burn': 'energy drink',
    
    // Liqueurs
    'baileys': 'cream',
    'kahlua': 'kahlua',
    'kahluá': 'kahlua',
    'cointreau': 'triple sec',
    'grand marnier': 'triple sec',
    'martini': 'vermouth',
    'cinzano': 'vermouth',
    'jägermeister': 'jagermeister',
    'jagermeister': 'jagermeister',
    
    // Polish typos
    'łiski': 'whisky',
    'wisky': 'whisky',
    'wiskey': 'whisky',
    'dzin': 'gin',
    'dżin': 'gin',
    'wodka': 'vodka',
    'wódka': 'vodka',
    'liomka': 'lime',
    'cytyna': 'lemon',
    'cukir': 'sugar',
    'minta': 'mint',
    'mieta': 'mint',
    'ogurek': 'cucumber',
    'bazylka': 'basil',
    'kola': 'cola',
    'tonik': 'tonic'
  };
  
  // Check if it's a known brand
  for (const [brand, ingredient] of Object.entries(brandMap)) {
    if (lower.includes(brand)) {
      return ingredient;
    }
  }
  
  // Direct ingredient mapping
  const ingredientMap = {
    'cytryna': 'lemon',
    'limonka': 'lime',
    'cukier': 'sugar',
    'woda gazowana': 'soda water',
    'mięta': 'mint',
    'bazylia': 'basil',
    'mleko': 'cream',
    'śmietana': 'cream',
    'śmietanka': 'cream',
    'miód': 'honey',
    'wermut': 'vermouth',
    'bitter': 'bitters',
    'angostura': 'bitters',
    'żurawina': 'cranberry',
    'espresso': 'espresso',
    'kawa': 'espresso',
    'prosecco': 'prosecco',
    'szampan': 'prosecco'
  };
  
  return ingredientMap[lower] || lower;
}

// Helper function to check if user has an ingredient
function hasIngredient(userIngredients, required) {
  const normalizedUser = userIngredients.map(ing => normalizeIngredient(ing));
  
  // Special cases
  if (required === 'cream') {
    return normalizedUser.includes('cream') || 
           normalizedUser.includes('baileys') || 
           normalizedUser.includes('milk');
  }
  
  if (required === 'soda water') {
    return normalizedUser.includes('soda water') || 
           normalizedUser.includes('sparkling water');
  }
  
  if (required === 'energy drink') {
    return normalizedUser.includes('energy drink') || 
           normalizedUser.includes('red bull') || 
           normalizedUser.includes('monster') ||
           normalizedUser.includes('tiger') ||
           normalizedUser.includes('rockstar') ||
           normalizedUser.includes('burn');
  }
  
  if (required === 'orange') {
    return normalizedUser.includes('orange') || 
           normalizedUser.includes('fanta') || 
           normalizedUser.includes('mirinda');
  }
  
  if (required === 'ginger beer') {
    return normalizedUser.includes('ginger beer') || 
           normalizedUser.includes('canada dry');
  }
  
  return normalizedUser.includes(required);
}

// Check what cocktails can be made
function checkCocktails(userIngredients) {
  const canMake = [];
  const almostCanMake = [];
  
  for (const [cocktailName, recipe] of Object.entries(COCKTAIL_RECIPES)) {
    const missingRequired = [];
    
    // Check all required ingredients
    for (const req of recipe.required) {
      if (!hasIngredient(userIngredients, req)) {
        missingRequired.push(req);
      // Check for Vodka Red Bull
      if (hasVodka && hasEnergyDrink) {
        fallbackCocktails.push({
          name: "Vodka Red Bull",
          nameEn: "Vodka Red Bull",
          available: true,
          description: requestLanguage === 'pl' ? "Energetyzujący drink" : "Energy cocktail",
          category: "modern",
          ingredients: [
            {name: requestLanguage === 'pl' ? "Wódka" : "Vodka", amount: "50", unit: "ml"},
            {name: "Red Bull", amount: "250", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Napełnij szklankę lodem", "Dodaj wódkę", "Dopełnij Red Bullem"]
            : ["Fill glass with ice", "Add vodka", "Top with Red Bull"],
          glassType: "highball",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: "",
          history: ""
        });
      }
      
      // Check for Rum & Coke (easier than Cuba Libre - no lime needed)
      if (hasRum && hasCola) {
        fallbackCocktails.push({
          name: "Rum & Coke",
          nameEn: "Rum & Coke",
          available: true,
          description: requestLanguage === 'pl' ? "Prosty klasyk" : "Simple classic",
          category: "highball",
          ingredients: [
            {name: requestLanguage === 'pl' ? "Rum" : "Rum", amount: "50", unit: "ml"},
            {name: "Cola", amount: "150", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Napełnij szklankę lodem", "Dodaj rum", "Dopełnij colą"]
            : ["Fill glass with ice", "Add rum", "Top with cola"],
          glassType: "highball",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: requestLanguage === 'pl' ? "Opcjonalnie: limonka" : "Optional: lime",
          history: ""
        });
      }
      
      // Check for Vodka Orange/Screwdriver
      if (hasVodka && hasOrange) {
        fallbackCocktails.push({
          name: "Screwdriver",
          nameEn: "Screwdriver",
          available: true,
          description: requestLanguage === 'pl' ? "Klasyczny drink śniadaniowy" : "Classic brunch cocktail",
          category: "highball",
          ingredients: [
            {name: requestLanguage === 'pl' ? "Wódka" : "Vodka", amount: "50", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Sok pomarańczowy" : "Orange juice", amount: "150", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Napełnij szklankę lodem", "Dodaj wódkę", "Dopełnij sokiem pomarańczowym", "Zamieszaj"]
            : ["Fill glass with ice", "Add vodka", "Top with orange juice", "Stir"],
          glassType: "highball",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: requestLanguage === 'pl' ? "Plasterek pomarańczy" : "Orange slice",
          history: ""
        });
      }
      
      // Check for Vodka Cranberry
      if (hasVodka && hasCranberry) {
        fallbackCocktails.push({
          name: "Vodka Cranberry",
          nameEn: "Vodka Cranberry",
          available: true,
          description: requestLanguage === 'pl' ? "Orzeźwiający i owocowy" : "Refreshing and fruity",
          category: "highball",
          ingredients: [
            {name: requestLanguage === 'pl' ? "Wódka" : "Vodka", amount: "50", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Sok żurawinowy" : "Cranberry juice", amount: "150", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Napełnij szklankę lodem", "Dodaj wódkę", "Dopełnij sokiem żurawinowym", "Zamieszaj"]
            : ["Fill glass with ice", "Add vodka", "Top with cranberry juice", "Stir"],
          glassType: "highball",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: requestLanguage === 'pl' ? "Limonka" : "Lime wedge",
          history: ""
        });
      }
      
      // Check for Moscow Mule
      if (hasVodka && hasLime && hasGingerBeer) {
        fallbackCocktails.push({
          name: "Moscow Mule",
          nameEn: "Moscow Mule",
          available: true,
          description: requestLanguage === 'pl' ? "Orzeźwiający z imbirem" : "Refreshing with ginger",
          category: "classic",
          ingredients: [
            {name: requestLanguage === 'pl' ? "Wódka" : "Vodka", amount: "50", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Sok z limonki" : "Lime juice", amount: "15", unit: "ml"},
            {name: requestLanguage === 'pl' ? "Piwo imbirowe" : "Ginger beer", amount: "120", unit: "ml"}
          ],
          instructions: requestLanguage === 'pl' 
            ? ["Napełnij kubek miedzą lub szklankę lodem", "Dodaj wódkę i sok z limonki", "Dopełnij piwem imbirowym", "Delikatnie zamieszaj"]
            : ["Fill copper mug or glass with ice", "Add vodka and lime juice", "Top with ginger beer", "Stir gently"],
          glassType: requestLanguage === 'pl' ? "kubek miedziany" : "copper mug",
          method: requestLanguage === 'pl' ? "budowany" : "built",
          ice: requestLanguage === 'pl' ? "kostki" : "cubed",
          garnish: requestLanguage === 'pl' ? "Ćwiartka limonki" : "Lime wedge",
          history: ""
        });
      }
    }
    
    if (missingRequired.length === 0) {
      canMake.push(cocktailName);
    } else if (missingRequired.length === 1) {
      almostCanMake.push({
        cocktail: cocktailName,
        missing: missingRequired[0]
      });
    }
    // If missing 2+ ingredients, don't include
  }
  
  return { canMake, almostCanMake };
}

// Generate smart shopping suggestions
function generateShoppingSuggestions(userIngredients, almostCanMake) {
  const suggestions = [];
  const ingredientCount = {};
  
  // Count how many cocktails each missing ingredient would unlock
  for (const item of almostCanMake) {
    const ing = item.missing;
    if (!ingredientCount[ing]) {
      ingredientCount[ing] = {
        count: 0,
        cocktails: []
      };
    }
    ingredientCount[ing].count++;
    ingredientCount[ing].cocktails.push(item.cocktail);
  }
  
  // Sort by unlock count
  const sorted = Object.entries(ingredientCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 2); // Max 2 suggestions
  
  for (const [ingredient, data] of sorted) {
    suggestions.push({
      ingredient,
      unlocksCount: data.count,
      cocktails: data.cocktails
    });
  }
  
  return suggestions;
}

module.exports = async (req, res) => {
  try {
    const { ingredients, language } = req.body;
    const requestLanguage = language || 'en';
    
    console.log(`🍹 MyBar request - Ingredients: ${ingredients}`);
    console.log(`🌍 Language: ${requestLanguage}`);
    
    // First, use our logic to check what's possible
    const { canMake, almostCanMake } = checkCocktails(ingredients);
    const shoppingSuggestions = generateShoppingSuggestions(ingredients, almostCanMake);
    
    console.log(`📊 Logic check - Can make: ${canMake.length}, Almost: ${almostCanMake.length}`);
    
    // Build context for AI
    const contextInfo = {
      canMake: canMake.join(', '),
      almostInfo: almostCanMake.map(item => `${item.cocktail} (needs ${item.missing})`).join(', '),
      shopping: shoppingSuggestions.map(s => `${s.ingredient} (unlocks ${s.cocktails.join(', ')})`).join(', ')
    };
    
    const userPrompt = requestLanguage === 'pl'
      ? `Mam te składniki: ${ingredients.join(', ')}

KONTEKST (użyj tej wiedzy):
- Mogę zrobić: ${contextInfo.canMake || 'nic'}
- Prawie mogę (brakuje 1): ${contextInfo.almostInfo || 'nic'}
- Sugestie zakupów: ${contextInfo.shopping || 'brak'}

KRYTYCZNE ZASADY:
1. Pokazuj TYLKO koktajle które NAPRAWDĘ można zrobić (mam WSZYSTKIE składniki)
2. W sekcji "prawie możliwe" tylko gdy brakuje JEDNEGO składnika
3. NIE pokazuj koktajli gdzie brakuje 2+ składników
4. Sugestie zakupów - TYLKO składniki które odblokują koktajle z obecnymi składnikami
5. Sprawdź DOKŁADNIE każdy koktajl przed dodaniem

Składniki które MAM:
${ingredients.join(', ')}

ROZPOZNAWAJ MARKI:
- Bombay = gin
- Jack Daniels = whisky
- Kinley = tonic
- Baileys = śmietanka/irish cream
- Kahlua = likier kawowy
- itd.

Podaj WSZYSTKIE koktajle które mogę zrobić.
Maksymalnie 2 sugestie zakupów.
Wszystkie teksty po polsku.

RETURN ONLY VALID JSON!`
      : `I have these ingredients: ${ingredients.join(', ')}

CONTEXT (use this knowledge):
- Can make: ${contextInfo.canMake || 'nothing'}
- Almost can make (missing 1): ${contextInfo.almostInfo || 'nothing'}
- Shopping suggestions: ${contextInfo.shopping || 'none'}

CRITICAL RULES:
1. Show ONLY cocktails I can ACTUALLY make (have ALL ingredients)
2. In "almost possible" section only when missing ONE ingredient
3. DON'T show cocktails missing 2+ ingredients
4. Shopping suggestions - ONLY ingredients that unlock cocktails with current ingredients
5. Check THOROUGHLY each cocktail before adding

Ingredients I HAVE:
${ingredients.join(', ')}

RECOGNIZE BRANDS:
- Bombay = gin
- Jack Daniels = whiskey
- Kinley = tonic
- Baileys = cream/irish cream
- Kahlua = coffee liqueur
- etc.

List ALL cocktails I can make.
Maximum 2 shopping suggestions.
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
      
      // Validate AI response against our logic
      if (suggestions.cocktails) {
        // Double-check each cocktail
        suggestions.cocktails = suggestions.cocktails.filter(cocktail => {
          const cocktailName = cocktail.nameEn || cocktail.name;
          return canMake.includes(cocktailName) || 
                 canMake.some(name => cocktailName.toLowerCase().includes(name.toLowerCase()));
        });
      }
      
      // Process and ensure all fields
      if (suggestions.cocktails) {
        suggestions.cocktails = suggestions.cocktails.map(cocktail => ({
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
        }));
      }
      
    } catch (e) {
      console.error('MyBar parse error, using fallback:', e);
      
      // Complete fallback logic
      const fallbackCocktails = [];
      const fallbackAlmostPossible = [];
      const fallbackShoppingList = [];
      
      // Build cocktails from our logic
      for (const cocktailName of canMake) {
        const recipe = COCKTAIL_RECIPES[cocktailName];
        if (!recipe) continue;
        
        // Build proper cocktail object based on recipe
        fallbackCocktails.push({
          name: cocktailName,
          nameEn: cocktailName,
          available: true,
          description: requestLanguage === 'pl' ? 'Klasyczny koktajl' : 'Classic cocktail',
          category: recipe.category,
          ingredients: [], // Would need full recipe details
          instructions: [
            requestLanguage === 'pl' ? 'Przygotuj według klasycznego przepisu' : 'Prepare according to classic recipe'
          ],
          glassType: requestLanguage === 'pl' ? 'odpowiednia szklanka' : 'appropriate glass',
          method: 'stirred',
          ice: requestLanguage === 'pl' ? 'kostki' : 'cubed',
          garnish: '',
          history: ''
        });
      }
      
      // Build almost possible
      for (const item of almostCanMake) {
        fallbackAlmostPossible.push({
          name: item.cocktail,
          nameEn: item.cocktail,
          missingIngredient: requestLanguage === 'pl' 
            ? translateIngredient(item.missing, 'pl')
            : item.missing,
          description: requestLanguage === 'pl' ? 'Klasyczny koktajl' : 'Classic cocktail',
          category: 'classic',
          ingredients: [],
          instructions: [],
          glassType: requestLanguage === 'pl' ? 'szklanka' : 'glass',
          method: 'stirred',
          ice: requestLanguage === 'pl' ? 'kostki' : 'cubed',
          garnish: ''
        });
      }
      
      // Build shopping list
      for (const suggestion of shoppingSuggestions) {
        fallbackShoppingList.push({
          ingredient: requestLanguage === 'pl' 
            ? translateIngredient(suggestion.ingredient, 'pl')
            : suggestion.ingredient,
          unlocksCount: suggestion.unlocksCount,
          priority: suggestion.unlocksCount > 1 ? 'high' : 'medium',
          reason: requestLanguage === 'pl'
            ? `Odblokuje ${suggestion.cocktails.join(', ')}`
            : `Unlocks ${suggestion.cocktails.join(', ')}`,
          newCocktails: suggestion.cocktails
        });
      }
      
      suggestions = {
        cocktails: fallbackCocktails,
        almostPossible: fallbackAlmostPossible,
        shoppingList: fallbackShoppingList
      };
    }

    // Final response formatting
    const responseData = {
      possibleDrinks: suggestions.cocktails || [],
      missingOneIngredient: (suggestions.almostPossible || [])
        .filter(item => item && item.ingredients)
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

    res.json({ data: responseData });
    
  } catch (error) {
    console.error('MyBar error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to translate ingredients
function translateIngredient(ingredient, language) {
  const translations = {
    'lemon': 'cytryna',
    'lime': 'limonka',
    'sugar': 'cukier',
    'mint': 'mięta',
    'basil': 'bazylia',
    'soda water': 'woda gazowana',
    'tonic': 'tonik',
    'cream': 'śmietanka',
    'milk': 'mleko',
    'honey': 'miód',
    'vermouth': 'wermut',
    'bitters': 'bitter',
    'cranberry': 'żurawina',
    'ginger beer': 'piwo imbirowe',
    'triple sec': 'triple sec',
    'espresso': 'espresso',
    'prosecco': 'prosecco'
  };
  
  if (language === 'pl') {
    return translations[ingredient] || ingredient;
  }
  
  // Reverse translation for en
  const reverseTranslations = Object.fromEntries(
    Object.entries(translations).map(([k, v]) => [v, k])
  );
  
  return reverseTranslations[ingredient] || ingredient;
}