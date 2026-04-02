const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const User = require('../models/User');
const Recipe = require('../models/Recipe');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Comprehensive cocktail recipes database
const COCKTAIL_RECIPES = {
  'Whiskey Sour': {
    required: ['whisky', 'lemon', 'sugar'],
    optional: ['egg white'],
    category: 'sour'
  },
  'Mudslide': {
    required: ['vodka', 'kahlua', 'baileys'],
    optional: ['cream'],
    category: 'creamy'
  },
  'B-52': {
    required: ['kahlua', 'baileys', 'grand marnier'],
    optional: [],
    category: 'shot'
  },
  'Brandy Alexander': {
    required: ['cognac', 'creme de cacao', 'cream'],
    optional: [],
    category: 'creamy'
  },
  'French 75': {
    required: ['gin', 'lemon', 'sugar', 'champagne'],
    optional: [],
    category: 'champagne'
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
  'Kamikaze': {
    required: ['vodka', 'triple sec', 'lime'],
    optional: [],
    category: 'shot'
  },
  'Blue Lagoon': {
    required: ['vodka', 'blue curacao', 'lemonade'],
    optional: [],
    category: 'tropical'
  },
  'Salty Dog': {
    required: ['vodka', 'grapefruit'],
    optional: ['salt'],
    category: 'highball'
  },
  'Fuzzy Navel': {
    required: ['vodka', 'peach schnapps', 'orange'],
    optional: [],
    category: 'sweet'
  },
  'Caipiroska': {
    required: ['vodka', 'lime', 'sugar'],
    optional: [],
    category: 'classic'
  },
  'Sidecar': {
    required: ['cognac', 'triple sec', 'lemon'],
    optional: [],
    category: 'classic'
  },
  'Whiskey Coke': {
    required: ['whisky', 'cola'],
    optional: ['lime'],
    category: 'highball'
  },
  'Vodka Sprite': {
    required: ['vodka', 'sprite'],
    optional: ['lime'],
    category: 'highball'
  },
  'Gin Lemonade': {
    required: ['gin', 'lemonade'],
    optional: ['lemon'],
    category: 'highball'
  },
  'Baileys Coffee': {
    required: ['baileys', 'coffee'],
    optional: ['cream'],
    category: 'hot'
  },
  'Irish Coffee': {
    required: ['whisky', 'coffee', 'sugar', 'cream'],
    optional: [],
    category: 'hot'
  },
  'Jager Bomb': {
    required: ['jagermeister', 'energy drink'],
    optional: [],
    category: 'shot'
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

const MYBAR_SYSTEM_PROMPT = `You are an expert head bartender helping a user discover what cocktails they can make from ingredients they have at home.

YOUR JOB:
1. Identify ALL cocktails the user can make RIGHT NOW with their exact ingredients
2. Identify cocktails they're ONE ingredient away from making
3. Suggest max 2 smart purchases that unlock the most new cocktails

INGREDIENT RECOGNITION — BE GENEROUS AND SMART:
Treat these as equivalent (user doesn't need to say "sok z"):
- cytryna / lemon / sok z cytryny / sok cytrynowy → LEMON JUICE ✓
- limonka / lime / sok z limonki / sok limonkowy → LIME JUICE ✓
- cukier / sugar / syrop cukrowy / simple syrup → SUGAR/SYRUP ✓
- pomarańcza / orange / sok pomarańczowy → ORANGE JUICE ✓
- woda gazowana / soda water / sparkling water / woda sodowa → SODA WATER ✓
- tonic / tonik / Kinley / Schweppes → TONIC WATER ✓
- cola / kola / Coca-Cola / Pepsi → COLA ✓
- śmietana / cream / mleko / Baileys → CREAM ✓
- mięta / mint → FRESH MINT ✓
- miód / honey → HONEY ✓
- kawa / espresso / kawa espresso → ESPRESSO ✓
- wermut / vermouth / Martini Rosso / Cinzano → VERMOUTH ✓
- żurawina / cranberry / sok żurawinowy → CRANBERRY JUICE ✓
- grejpfrut / grapefruit / sok grejpfrutowy → GRAPEFRUIT JUICE ✓
- piwo imbirowe / ginger beer / Canada Dry → GINGER BEER ✓

BRAND RECOGNITION:
Any whiskey brand (Jack Daniel's, Jameson, Johnnie Walker, Ballantine's, Jim Beam, Chivas, Maker's Mark) → WHISKEY
Any gin brand (Bombay, Tanqueray, Beefeater, Hendrick's, Gordon's) → GIN
Any vodka brand (Absolut, Grey Goose, Smirnoff, Belvedere, Wyborowa, Finlandia) → VODKA
Any rum brand (Bacardi, Captain Morgan, Havana Club, Kraken) → RUM
Any tequila brand (Jose Cuervo, Patron, Olmeca, Sauza) → TEQUILA
Cointreau / Grand Marnier → TRIPLE SEC
Kahlúa → COFFEE LIQUEUR
Campari → CAMPARI (bitter liqueur)
Aperol → APEROL (aperitif)
Red Bull / Monster / Tiger → ENERGY DRINK
Fanta / Mirinda → ORANGE SODA (usable as orange juice substitute)
Sprite / 7UP → LEMON-LIME SODA (NOT the same as soda water)

COCKTAIL LOGIC:
- Show ALL cocktails that can be made with available ingredients (no artificial limit)
- For "almostPossible": ONLY include cocktails where exactly ONE required ingredient is missing
- The missing ingredient must NOT be optional (bitters, egg white, garnish, salt rim = optional)
- Be thorough — check every classic cocktail, not just the obvious ones
- Include lesser-known options if they genuinely work (e.g. with gin+lemon+sugar → Gin Sour, Bee's Knees hint, Tom Collins if soda available)

SHOPPING LIST LOGIC — THINK CAREFULLY:
Before suggesting any purchase, ask: "With their CURRENT ingredients PLUS this one item, what new cocktails become possible?"
- GOOD example: Has gin + campari → suggest vermouth → unlocks Negroni
- GOOD example: Has rum + cola → suggest lime → unlocks Cuba Libre
- BAD example: Has whisky only → DON'T suggest lemon (also needs sugar for Whiskey Sour)
- NEVER suggest optional ingredients (bitters, egg white, salt, garnishes)
- Maximum 2 suggestions, sorted by how many cocktails they unlock

RECIPE QUALITY:
- Use authentic IBA proportions
- Include correct glassware for each cocktail
- Write complete step-by-step instructions (not "mix ingredients")
- Include garnish and history

RETURN ONLY VALID JSON:
{
  "cocktails": [
    {
      "name": "Cocktail name in requested language",
      "nameEn": "English name",
      "available": true,
      "description": "2-sentence description in requested language",
      "category": "classic|modern|tiki|sour|highball",
      "ingredients": [{"name": "ingredient name", "amount": "50", "unit": "ml"}],
      "instructions": ["Step 1.", "Step 2.", "Step 3.", "Step 4."],
      "glassType": "correct glass in requested language",
      "method": "shaken|stirred|built",
      "ice": "cubed|crushed|none",
      "garnish": "garnish - for Polish use 'garnisz', NEVER 'garnitur' (= suit of clothes!)",
      "history": "1-2 sentences of real history"
    }
  ],
  "almostPossible": [
    {
      "name": "Cocktail name",
      "nameEn": "English name",
      "missingIngredient": "exact ingredient name (ONE only)",
      "description": "Brief description",
      "category": "classic",
      "ingredients": [{"name": "...", "amount": "...", "unit": "..."}],
      "instructions": ["Step 1.", "Step 2.", "Step 3."],
      "glassType": "glass type",
      "method": "shaken|stirred|built",
      "ice": "cubed|crushed|none",
      "garnish": "garnish"
    }
  ],
  "shoppingList": [
    {
      "ingredient": "Item to buy in requested language",
      "unlocksCount": 2,
      "priority": "high|medium|low",
      "reason": "Specific reason in requested language — name the cocktails it unlocks",
      "newCocktails": ["Cocktail 1", "Cocktail 2"]
    }
  ]
}`;

// Helper function to normalize ingredient names
function normalizeIngredient(ing) {
  const lower = ing.toLowerCase().trim();

  // Polish compound phrases — check FIRST (longest match wins)
  const polishPhrases = {
    'sok z cytryny': 'lemon',
    'sok cytrynowy': 'lemon',
    'świeży sok z cytryny': 'lemon',
    'sok z limonki': 'lime',
    'sok limonkowy': 'lime',
    'świeży sok z limonki': 'lime',
    'sok pomarańczowy': 'orange',
    'sok z pomarańczy': 'orange',
    'sok żurawinowy': 'cranberry',
    'sok z żurawiny': 'cranberry',
    'sok grejpfrutowy': 'grapefruit',
    'sok z grejpfruta': 'grapefruit',
    'sok ananasowy': 'pineapple',
    'sok z ananasa': 'pineapple',
    'sok pomidorowy': 'tomato juice',
    'sok z pomidorów': 'tomato juice',
    'syrop cukrowy': 'sugar',
    'syrop z cukru': 'sugar',
    'cukier puder': 'sugar',
    'cukier trzcinowy': 'sugar',
    'śmietanka kremówka': 'cream',
    'śmietana kremówka': 'cream',
    'śmietana 30%': 'cream',
    'śmietana 36%': 'cream',
    'bita śmietana': 'cream',
    'woda gazowana': 'soda water',
    'woda sodowa': 'soda water',
    'woda mineralna gazowana': 'soda water',
    'piwo imbirowe': 'ginger beer',
    'miód pszczeli': 'honey',
    'kawa espresso': 'espresso',
    'podwójne espresso': 'espresso',
    'ekstrakt kawowy': 'espresso',
    'likier kawowy': 'kahlua',
    'likier pomarańczowy': 'triple sec',
    'likieru pomarańczowego': 'triple sec',
    'blue curacao': 'blue curacao',
    'kokosowy krem': 'coconut cream',
    'krem kokosowy': 'coconut cream',
    'mleko kokosowe': 'coconut cream',
  };
  for (const [phrase, mapped] of Object.entries(polishPhrases)) {
    if (lower.includes(phrase)) return mapped;
  }

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

  const aliases = {
    'lemon':       ['lemon', 'cytryna', 'sok z cytryny', 'sok cytrynowy'],
    'lime':        ['lime', 'limonka', 'sok z limonki', 'sok limonkowy'],
    'orange':      ['orange', 'pomarańcza', 'fanta', 'mirinda', 'sok pomarańczowy'],
    'cream':       ['cream', 'baileys', 'milk', 'mleko', 'śmietana', 'śmietanka'],
    'sugar':       ['sugar', 'cukier', 'syrop cukrowy', 'simple syrup'],
    'soda water':  ['soda water', 'sparkling water', 'woda gazowana', 'woda sodowa'],
    'ginger beer': ['ginger beer', 'canada dry', 'piwo imbirowe'],
    'energy drink':['energy drink', 'red bull', 'redbull', 'monster', 'tiger', 'rockstar', 'burn'],
    'triple sec':  ['triple sec', 'cointreau', 'grand marnier', 'orange liqueur'],
    'vermouth':    ['vermouth', 'wermut', 'martini', 'cinzano'],
    'whisky':      ['whisky', 'whiskey', 'bourbon'],
    'rum':         ['rum', 'white rum', 'dark rum', 'biały rum', 'ciemny rum'],
    'tonic':       ['tonic', 'tonik', 'tonic water', 'kinley', 'schweppes'],
    'cola':        ['cola', 'kola', 'coca-cola', 'coke', 'pepsi'],
    'espresso':    ['espresso', 'kawa', 'coffee'],
    'cranberry':   ['cranberry', 'żurawina', 'sok żurawinowy'],
    'tomato juice':['tomato juice', 'sok pomidorowy'],
    'pineapple':   ['pineapple', 'ananas', 'sok ananasowy'],
    'grapefruit':  ['grapefruit', 'grejpfrut', 'sok grejpfrutowy'],
    'coconut cream':['coconut cream', 'krem kokosowy', 'mleko kokosowe'],
    'mint':        ['mint', 'mięta'],
    'basil':       ['basil', 'bazylia'],
    'honey':       ['honey', 'miód'],
    'bitters':     ['bitters', 'bitter', 'angostura'],
  };

  const requiredAliases = aliases[required] || [required];
  return normalizedUser.some(userIng =>
    requiredAliases.some(alias => userIng.includes(alias) || alias.includes(userIng))
  );
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

// Helper function to check daily limits
const checkDailyLimit = async (firebaseUid, limitType = 'mybar') => {
  try {
    // If no firebaseUid provided, allow with generic limits
    if (!firebaseUid) {
      console.log('⚠️ No firebaseUid provided, using default limits');
      return { allowed: true, remaining: 3 };
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      console.log('⚠️ User not found, using default limits');
      return { allowed: true, remaining: 3 };
    }

    // For now, always allow (implement limit logic later)
    return { allowed: true, remaining: 3 };
  } catch (error) {
    console.error('Error checking limits:', error);
    return { allowed: true, remaining: 3 }; // Allow by default if error
  }
};

// Helper function to update user stats - ZWIĘKSZA STATYSTYKI TYLKO RAZ
const updateUserStats = async (firebaseUid) => {
  try {
    if (!firebaseUid) {
      console.log('⚠️ No firebaseUid provided, skipping stats update');
      return;
    }

    // Zwiększ statystyki TYLKO RAZ
    const result = await User.findOneAndUpdate(
      { firebaseUid },
      { 
        $inc: { 
          'stats.totalHomeBarAnalyses': 1,
          'stats.dailyHomeBar': 1
        },
        lastActive: new Date()
      },
      { new: true }
    );
    
    console.log('✅ Updated MyBar stats for user:', firebaseUid);
    console.log('📊 New stats:', {
      totalHomeBarAnalyses: result?.stats?.totalHomeBarAnalyses,
      dailyHomeBar: result?.stats?.dailyHomeBar
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
};

// Main route handler
router.post('/', async (req, res) => {
  try {
    const { ingredients, language = 'en', firebaseUid } = req.body;
    const requestLanguage = language || 'en';
    
    console.log(`🍹 MyBar request - Ingredients: ${ingredients}`);
    console.log(`🌍 Language: ${requestLanguage}`);
    console.log(`👤 FirebaseUid: ${firebaseUid || 'not provided'}`);
    
    // Check rate limit (now optional firebaseUid)
    const limitCheck = await checkDailyLimit(firebaseUid, 'mybar');
    if (!limitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: limitCheck.error || 'Daily limit reached',
        remaining: 0
      });
    }
    
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

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 3000,
      system: MYBAR_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt }
      ],
    });

    const aiResponse = response.content[0].text;
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
      
      // Log what AI returned vs our logic check (for debugging)
      if (suggestions.cocktails) {
        console.log(`🤖 AI found ${suggestions.cocktails.length} cocktails, local logic found: ${canMake.join(', ') || 'none'}`);
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
      
      // Build fallback cocktails from our logic
      const fallbackCocktails = [];
      
      for (const cocktailName of canMake) {
        const recipe = COCKTAIL_RECIPES[cocktailName];
        if (!recipe) continue;
        
        fallbackCocktails.push({
          name: cocktailName,
          nameEn: cocktailName,
          available: true,
          description: requestLanguage === 'pl' ? 'Klasyczny koktajl' : 'Classic cocktail',
          category: recipe.category,
          ingredients: recipe.required.map(ing => ({
            name: requestLanguage === 'pl' ? translateIngredient(ing, 'pl') : ing,
            amount: '50',
            unit: 'ml'
          })),
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
      
      suggestions = {
        cocktails: fallbackCocktails,
        almostPossible: [],
        shoppingList: []
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
    
    // Update user stats - zwiększa statystyki TYLKO RAZ
    if (firebaseUid) {
      await updateUserStats(firebaseUid);
    }

    res.json({ 
      data: responseData,
      usage: {
        remaining: limitCheck.remaining - 1,
        resetAt: new Date().setHours(24, 0, 0, 0)
      }
    });
    
  } catch (error) {
    console.error('MyBar error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get saved bar ingredients
router.get('/saved/:firebaseUid', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return saved ingredients from user preferences
    res.json({
      success: true,
      ingredients: user.preferences.favoriteSpirits || [],
      lastUpdated: user.lastActive
    });

  } catch (error) {
    console.error('Get saved bar error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save bar ingredients
router.post('/save', async (req, res) => {
  try {
    const { firebaseUid, ingredients } = req.body;

    if (!firebaseUid || !ingredients) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { 
        'preferences.favoriteSpirits': ingredients,
        lastActive: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Bar ingredients saved successfully'
    });

  } catch (error) {
    console.error('Save bar error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;