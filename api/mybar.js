const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const User = require('../models/User');
const Recipe = require('../models/Recipe');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Comprehensive cocktail recipes database - ROZSZERZONA BAZA
const COCKTAIL_RECIPES = {
  // WHISKY/WHISKEY COCKTAILS
  'Whiskey Sour': {
    required: ['whisky', 'lemon', 'sugar'],
    optional: ['egg white'],
    category: 'sour'
  },
  'Whiskey Coke': {
    required: ['whisky', 'cola'],
    optional: ['lime'],
    category: 'highball'
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
  'Whiskey Honey': {
    required: ['whisky', 'honey', 'lemon'],
    optional: ['hot water'],
    category: 'classic'
  },
  'Irish Coffee': {
    required: ['whisky', 'coffee', 'sugar', 'cream'],
    optional: [],
    category: 'hot'
  },
  'Whiskey Ginger': {
    required: ['whisky', 'ginger beer'],
    optional: ['lime'],
    category: 'highball'
  },
  'Hot Toddy': {
    required: ['whisky', 'honey', 'hot water'],
    optional: ['lemon', 'cinnamon'],
    category: 'hot'
  },
  'Whiskey Smash': {
    required: ['whisky', 'lemon', 'sugar', 'mint'],
    optional: [],
    category: 'modern'
  },
  'Boulevardier': {
    required: ['whisky', 'campari', 'vermouth'],
    optional: ['orange'],
    category: 'classic'
  },

  // GIN COCKTAILS
  'Gin & Tonic': {
    required: ['gin', 'tonic'],
    optional: ['lime', 'lemon'],
    category: 'highball'
  },
  'Gin Lemonade': {
    required: ['gin', 'lemonade'],
    optional: ['lemon'],
    category: 'highball'
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
  'Gin Fizz': {
    required: ['gin', 'lemon', 'sugar', 'soda water'],
    optional: ['egg white'],
    category: 'fizz'
  },
  'Negroni': {
    required: ['gin', 'campari', 'vermouth'],
    optional: ['orange'],
    category: 'classic'
  },
  'Gin Basil Smash': {
    required: ['gin', 'lemon', 'sugar', 'basil'],
    optional: [],
    category: 'modern'
  },
  'French 75': {
    required: ['gin', 'lemon', 'sugar', 'champagne'],
    optional: [],
    category: 'champagne'
  },
  'Gin & Juice': {
    required: ['gin', 'orange'],
    optional: ['cranberry'],
    category: 'highball'
  },
  'Gin Rickey': {
    required: ['gin', 'lime', 'soda water'],
    optional: [],
    category: 'highball'
  },
  'Aviation': {
    required: ['gin', 'lemon', 'maraschino', 'creme de violette'],
    optional: [],
    category: 'classic'
  },

  // VODKA COCKTAILS
  'Vodka Tonic': {
    required: ['vodka', 'tonic'],
    optional: ['lime'],
    category: 'highball'
  },
  'Vodka Sprite': {
    required: ['vodka', 'sprite'],
    optional: ['lime'],
    category: 'highball'
  },
  'Vodka Red Bull': {
    required: ['vodka', 'energy drink'],
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
  'Moscow Mule': {
    required: ['vodka', 'lime', 'ginger beer'],
    optional: [],
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
  'Cosmopolitan': {
    required: ['vodka', 'triple sec', 'cranberry', 'lime'],
    optional: [],
    category: 'modern'
  },
  'Espresso Martini': {
    required: ['vodka', 'kahlua', 'espresso'],
    optional: [],
    category: 'modern'
  },
  'Bloody Mary': {
    required: ['vodka', 'tomato juice', 'lemon'],
    optional: ['worcestershire', 'tabasco', 'celery'],
    category: 'brunch'
  },
  'Salty Dog': {
    required: ['vodka', 'grapefruit'],
    optional: ['salt'],
    category: 'highball'
  },
  'Sea Breeze': {
    required: ['vodka', 'cranberry', 'grapefruit'],
    optional: [],
    category: 'highball'
  },
  'Bay Breeze': {
    required: ['vodka', 'cranberry', 'pineapple'],
    optional: [],
    category: 'highball'
  },
  'Madras': {
    required: ['vodka', 'cranberry', 'orange'],
    optional: [],
    category: 'highball'
  },
  'Cape Codder': {
    required: ['vodka', 'cranberry'],
    optional: ['lime'],
    category: 'highball'
  },
  'Greyhound': {
    required: ['vodka', 'grapefruit'],
    optional: [],
    category: 'highball'
  },
  'Fuzzy Navel': {
    required: ['vodka', 'peach schnapps', 'orange'],
    optional: [],
    category: 'sweet'
  },
  'Sex on the Beach': {
    required: ['vodka', 'peach schnapps', 'orange', 'cranberry'],
    optional: [],
    category: 'highball'
  },
  'Blue Lagoon': {
    required: ['vodka', 'blue curacao', 'lemonade'],
    optional: [],
    category: 'tropical'
  },
  'Kamikaze': {
    required: ['vodka', 'triple sec', 'lime'],
    optional: [],
    category: 'shot'
  },
  'Caipiroska': {
    required: ['vodka', 'lime', 'sugar'],
    optional: [],
    category: 'classic'
  },

  // RUM COCKTAILS
  'Rum & Coke': {
    required: ['rum', 'cola'],
    optional: ['lime'],
    category: 'highball'
  },
  'Cuba Libre': {
    required: ['rum', 'cola', 'lime'],
    optional: [],
    category: 'highball'
  },
  'Mojito': {
    required: ['rum', 'lime', 'sugar', 'mint', 'soda water'],
    optional: [],
    category: 'highball'
  },
  'Daiquiri': {
    required: ['rum', 'lime', 'sugar'],
    optional: [],
    category: 'classic'
  },
  'Dark & Stormy': {
    required: ['rum', 'ginger beer', 'lime'],
    optional: [],
    category: 'classic'
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
  'Rum Punch': {
    required: ['rum', 'orange', 'pineapple', 'lime', 'sugar'],
    optional: ['grenadine'],
    category: 'tropical'
  },
  'Hurricane': {
    required: ['rum', 'lemon', 'passion fruit syrup'],
    optional: [],
    category: 'tropical'
  },
  'Painkiller': {
    required: ['rum', 'orange', 'pineapple', 'coconut cream'],
    optional: [],
    category: 'tropical'
  },

  // TEQUILA COCKTAILS
  'Margarita': {
    required: ['tequila', 'triple sec', 'lime'],
    optional: ['salt'],
    category: 'classic'
  },
  'Tequila Sunrise': {
    required: ['tequila', 'orange', 'grenadine'],
    optional: [],
    category: 'highball'
  },
  'Paloma': {
    required: ['tequila', 'grapefruit', 'lime', 'soda water'],
    optional: ['salt'],
    category: 'highball'
  },
  'Tequila Sour': {
    required: ['tequila', 'lemon', 'sugar'],
    optional: ['egg white'],
    category: 'sour'
  },
  'Mexican Mule': {
    required: ['tequila', 'lime', 'ginger beer'],
    optional: [],
    category: 'modern'
  },

  // BRANDY/COGNAC COCKTAILS
  'Brandy Alexander': {
    required: ['cognac', 'creme de cacao', 'cream'],
    optional: [],
    category: 'creamy'
  },
  'Sidecar': {
    required: ['cognac', 'triple sec', 'lemon'],
    optional: [],
    category: 'classic'
  },
  'Brandy Sour': {
    required: ['cognac', 'lemon', 'sugar'],
    optional: ['egg white'],
    category: 'sour'
  },

  // LIQUEUR-BASED COCKTAILS
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
  'Baileys Coffee': {
    required: ['baileys', 'coffee'],
    optional: ['cream'],
    category: 'hot'
  },
  'Amaretto Sour': {
    required: ['amaretto', 'lemon', 'sugar'],
    optional: ['egg white'],
    category: 'sour'
  },

  // CHAMPAGNE/PROSECCO COCKTAILS
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
  'Aperol Spritz': {
    required: ['aperol', 'prosecco', 'soda water'],
    optional: ['orange'],
    category: 'aperitif'
  },

  // SPECIALTY COCKTAILS
  'Long Island Iced Tea': {
    required: ['vodka', 'gin', 'rum', 'tequila', 'triple sec', 'lemon', 'cola'],
    optional: [],
    category: 'modern'
  },
  'Jager Bomb': {
    required: ['jagermeister', 'energy drink'],
    optional: [],
    category: 'shot'
  },
  'Jägerbomb': {
    required: ['jagermeister', 'energy drink'],
    optional: [],
    category: 'shot'
  },

  // CACHACA COCKTAILS
  'Caipirinha': {
    required: ['cachaca', 'lime', 'sugar'],
    optional: [],
    category: 'classic'
  },

  // PISCO COCKTAILS
  'Pisco Sour': {
    required: ['pisco', 'lime', 'sugar'],
    optional: ['egg white', 'bitters'],
    category: 'sour'
  }
};

const MYBAR_SYSTEM_PROMPT = `You are a world-class bartender helping users make cocktails with available ingredients. You have deep knowledge of classic cocktails, their authentic recipes, AND brand names.

IMPORTANT: Always check the comprehensive cocktail database!
Use their recipes for accuracy and discover creative combinations based on user's ingredients.

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
6. Check EVERY cocktail thoroughly before suggesting
7. NEVER suggest optional ingredients as purchases (bitters, egg white, garnishes)
8. Show ALL cocktails that can be made (no limit)
9. Include COMPLETE recipe details
10. Be creative and show more options when possible

BRAND RECOGNITION - BE SMART:
Common brands and what they are:
- Jack Daniels / Jack Daniel's = whisky
- Jim Beam = whisky
- Johnnie Walker = whisky (scotch)
- Jameson = whisky (irish)
- Makers Mark = whisky
- Crown Royal = whisky
- Chivas = whisky
- Ballantines = whisky
- Bombay / Bombay Sapphire = gin
- Tanqueray = gin
- Beefeater = gin
- Gordon's = gin
- Hendricks = gin
- Absolut = vodka
- Grey Goose = vodka
- Smirnoff = vodka
- Stolichnaya = vodka
- Belvedere = vodka
- Finlandia = vodka
- Wyborowa = vodka
- Bacardi = rum
- Captain Morgan = rum
- Havana Club = rum
- Malibu = coconut rum
- Kraken = rum
- Jose Cuervo = tequila
- Patron = tequila
- Olmeca = tequila
- Sauza = tequila
- Hennessy = cognac
- Remy Martin = cognac
- Martell = cognac
- Schweppes = tonic water
- Kinley = tonic water
- Coca-Cola / Coke = cola
- Pepsi = cola
- Sprite / 7UP = lemon-lime soda
- Canada Dry = ginger beer
- Baileys = Irish cream (can replace cream)
- Kahlua = coffee liqueur
- Campari = bitter liqueur
- Aperol = aperitif
- Martini / Cinzano = vermouth
- Cointreau = triple sec (premium)
- Grand Marnier = orange liqueur
- Jägermeister = herbal liqueur

SOFT DRINKS & ENERGY DRINKS:
- Red Bull = energy drink
- Monster = energy drink
- Rockstar = energy drink
- Tiger = energy drink
- Burn = energy drink
- Fanta = orange soda (can replace orange juice)
- Mirinda = orange soda
- Mountain Dew = citrus soda
- Dr Pepper = cherry/cola drink
- Ginger Beer = spicy ginger mixer
- Tonic Water = quinine mixer
- Soda Water / Club Soda = carbonated water
- Sparkling Water = carbonated water

INGREDIENT MAPPING:
- "whisky" or "whiskey" or any whiskey brand → has whisky
- "gin" or any gin brand → has gin
- "vodka" or "wódka" or any vodka brand → has vodka
- "rum" or any rum brand → has rum
- "tequila" or any tequila brand → has tequila
- "cognac" or "brandy" or any cognac brand → has cognac
- "tonic" or "tonik" or "Kinley" → has tonic water
- "wermut" or "vermouth" or "Martini" or "Cinzano" → has vermouth
- "campari" → has Campari
- "baileys" → has Irish cream (can work as cream)
- "kahlua" or "kahlúa" → has coffee liqueur
- "triple sec" or "cointreau" → has triple sec
- "miód" or "honey" → has honey
- "cytryna" or "lemon" → has lemon juice
- "limonka" or "lime" → has lime juice
- "cukier" or "sugar" → has simple syrup
- "miÄ™ta" or "mint" → has fresh mint
- "bazylia" or "basil" → has fresh basil
- "mleko" or "milk" or "śmietana" or "cream" → has cream/milk
- "woda gazowana" or "soda water" → has soda water
- "bitter" or "bitters" or "angostura" → has bitters
- "red bull" or "monster" or "tiger" → has energy drink
- "fanta" or "mirinda" → has orange soda (can work as orange juice)
- "sprite" or "7up" → has lemon-lime soda
- "ginger beer" or "canada dry" → has ginger beer
- "pomarańcza" or "orange" → has orange juice
- "żurawina" or "cranberry" → has cranberry juice
- "grejpfrut" or "grapefruit" → has grapefruit juice

CRITICAL COCKTAIL REQUIREMENTS:
Check ALL ingredients before suggesting any cocktail or shopping item!
NEVER suggest optional ingredients like bitters, egg white, garnishes as shopping items.

SHOPPING LOGIC - BE EXTREMELY CAREFUL:
1. NEVER suggest an ingredient if user is missing multiple other ingredients for that cocktail
2. Only suggest ingredients that unlock cocktails with CURRENT ingredients
3. Check the COMPLETE recipe before any suggestion
4. Maximum 3 shopping suggestions (increased from 2)
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
- Maximum 3 shopping suggestions
- Show MORE cocktail options when possible`;

// Helper function to normalize ingredient names - POPRAWIONA
function normalizeIngredient(ing) {
  const lower = ing.toLowerCase().trim();
  
  // Brand to ingredient mapping - ROZSZERZONA
  const brandMap = {
    // Whiskey brands
    'jack daniels': 'whisky',
    'jack daniel\'s': 'whisky',
    'jim beam': 'whisky',
    'johnnie walker': 'whisky',
    'jameson': 'whisky',
    'makers mark': 'whisky',
    'maker\'s mark': 'whisky',
    'crown royal': 'whisky',
    'chivas': 'whisky',
    'chivas regal': 'whisky',
    'ballantines': 'whisky',
    'glenfiddich': 'whisky',
    'glenlivet': 'whisky',
    'macallan': 'whisky',
    'laphroaig': 'whisky',
    'lagavulin': 'whisky',
    'ardbeg': 'whisky',
    'highland park': 'whisky',
    'tullamore dew': 'whisky',
    'bushmills': 'whisky',
    'redbreast': 'whisky',
    'green spot': 'whisky',
    'four roses': 'whisky',
    'wild turkey': 'whisky',
    'buffalo trace': 'whisky',
    'woodford reserve': 'whisky',
    'angel\'s envy': 'whisky',
    'angels envy': 'whisky',
    
    // Gin brands
    'bombay': 'gin',
    'bombay sapphire': 'gin',
    'tanqueray': 'gin',
    'beefeater': 'gin',
    'gordon\'s': 'gin',
    'gordons': 'gin',
    'hendricks': 'gin',
    'hendrick\'s': 'gin',
    'the botanist': 'gin',
    'botanist': 'gin',
    'sipsmith': 'gin',
    'monkey 47': 'gin',
    'plymouth': 'gin',
    'aviation': 'gin',
    'roku': 'gin',
    'malfy': 'gin',
    'citadelle': 'gin',
    'broker\'s': 'gin',
    'brokers': 'gin',
    
    // Vodka brands
    'absolut': 'vodka',
    'grey goose': 'vodka',
    'smirnoff': 'vodka',
    'stolichnaya': 'vodka',
    'stoli': 'vodka',
    'belvedere': 'vodka',
    'finlandia': 'vodka',
    'wyborowa': 'vodka',
    'tito\'s': 'vodka',
    'titos': 'vodka',
    'ketel one': 'vodka',
    'kettel one': 'vodka',
    'chopin': 'vodka',
    'zubrowka': 'vodka',
    'żubrówka': 'vodka',
    'russian standard': 'vodka',
    'skyy': 'vodka',
    'ciroc': 'vodka',
    'crystal head': 'vodka',
    'beluga': 'vodka',
    'ultimat': 'vodka',
    
    // Rum brands
    'bacardi': 'rum',
    'captain morgan': 'rum',
    'havana club': 'rum',
    'malibu': 'coconut rum',
    'kraken': 'rum',
    'mount gay': 'rum',
    'appleton': 'rum',
    'plantation': 'rum',
    'diplomatico': 'rum',
    'zacapa': 'rum',
    'el dorado': 'rum',
    'flor de cana': 'rum',
    'ron barcelo': 'rum',
    'brugal': 'rum',
    'angostura': 'rum',
    'myers': 'rum',
    'sailor jerry': 'rum',
    'goslings': 'rum',
    'bumbu': 'rum',
    
    // Tequila brands
    'jose cuervo': 'tequila',
    'patron': 'tequila',
    'olmeca': 'tequila',
    'sauza': 'tequila',
    'don julio': 'tequila',
    'herradura': 'tequila',
    'cazadores': 'tequila',
    'espolon': 'tequila',
    'clase azul': 'tequila',
    'casamigos': 'tequila',
    'avion': 'tequila',
    'fortaleza': 'tequila',
    'el tesoro': 'tequila',
    
    // Cognac/Brandy brands
    'hennessy': 'cognac',
    'remy martin': 'cognac',
    'rémy martin': 'cognac',
    'martell': 'cognac',
    'courvoisier': 'cognac',
    'hine': 'cognac',
    'camus': 'cognac',
    'otard': 'cognac',
    'delamain': 'cognac',
    'frapin': 'cognac',
    
    // Mixers
    'kinley': 'tonic',
    'schweppes': 'tonic',
    'fever tree': 'tonic',
    'fever-tree': 'tonic',
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
    'schweppes ginger ale': 'ginger beer',
    'bundaberg': 'ginger beer',
    
    // Energy drinks
    'red bull': 'energy drink',
    'redbull': 'energy drink',
    'monster': 'energy drink',
    'rockstar': 'energy drink',
    'tiger': 'energy drink',
    'burn': 'energy drink',
    'relentless': 'energy drink',
    'rockstar energy': 'energy drink',
    'monster energy': 'energy drink',
    
    // Liqueurs
    'baileys': 'cream',
    'bailey\'s': 'cream',
    'kahlua': 'kahlua',
    'kahlúa': 'kahlua',
    'cointreau': 'triple sec',
    'grand marnier': 'triple sec',
    'martini': 'vermouth',
    'cinzano': 'vermouth',
    'noilly prat': 'vermouth',
    'dolin': 'vermouth',
    'cocchi': 'vermouth',
    'jägermeister': 'jagermeister',
    'jagermeister': 'jagermeister',
    'jäger': 'jagermeister',
    'jager': 'jagermeister',
    'amaretto disaronno': 'amaretto',
    'disaronno': 'amaretto',
    'frangelico': 'hazelnut liqueur',
    'chambord': 'raspberry liqueur',
    'st germain': 'elderflower',
    'aperol': 'aperol',
    'campari': 'campari',
    'cynar': 'artichoke liqueur',
    'chartreuse': 'herbal liqueur',
    'benedictine': 'herbal liqueur',
    'drambuie': 'honey liqueur',
    'galliano': 'vanilla liqueur',
    'sambuca': 'anise liqueur',
    'ouzo': 'anise liqueur',
    'pastis': 'anise liqueur',
    'absinthe': 'absinthe',
    'midori': 'melon liqueur',
    'blue curacao': 'blue curacao',
    'curacao': 'orange liqueur',
    'triple sec': 'triple sec',
    'limoncello': 'lemon liqueur',
    
    // Polish typos and variations
    'whisky': 'whisky',
    'whiskey': 'whisky',
    'łiski': 'whisky',
    'wisky': 'whisky',
    'wiskey': 'whisky',
    'dzin': 'gin',
    'dżin': 'gin',
    'vodka': 'vodka',
    'wódka': 'vodka',
    'wodka': 'vodka',
    'limonka': 'lime',
    'liomka': 'lime',
    'cytryna': 'lemon',
    'cytyna': 'lemon',
    'cukier': 'sugar',
    'cukir': 'sugar',
    'miÄ™ta': 'mint',
    'mieta': 'mint',
    'minta': 'mint',
    'ogurek': 'cucumber',
    'ogórek': 'cucumber',
    'bazylia': 'basil',
    'bazylka': 'basil',
    'kola': 'cola',
    'tonik': 'tonic',
    'rum': 'rum',
    'tequila': 'tequila',
    'tekila': 'tequila',
    'koniak': 'cognac',
    'brandy': 'cognac'
  };
  
  // Check if it's a known brand
  for (const [brand, ingredient] of Object.entries(brandMap)) {
    if (lower.includes(brand)) {
      return ingredient;
    }
  }
  
  // Direct ingredient mapping - POPRAWIONE POLSKIE ZNAKI
  const ingredientMap = {
    'cytryna': 'lemon',
    'limonka': 'lime',
    'cukier': 'sugar',
    'syrop cukrowy': 'sugar',
    'woda gazowana': 'soda water',
    'miÄ™ta': 'mint',
    'mieta': 'mint',
    'mięta': 'mint',
    'bazylia': 'basil',
    'mleko': 'cream',
    'śmietana': 'cream',
    'śmietanka': 'cream',
    'smietana': 'cream',
    'smietanka': 'cream',
    'miód': 'honey',
    'miod': 'honey',
    'wermut': 'vermouth',
    'bitter': 'bitters',
    'angostura': 'bitters',
    'żurawina': 'cranberry',
    'zurawina': 'cranberry',
    'sok żurawinowy': 'cranberry',
    'sok zurawinowy': 'cranberry',
    'espresso': 'espresso',
    'kawa': 'espresso',
    'prosecco': 'prosecco',
    'szampan': 'champagne',
    'pomarańcza': 'orange',
    'pomarancza': 'orange',
    'sok pomarańczowy': 'orange',
    'sok pomaranczowy': 'orange',
    'grejpfrut': 'grapefruit',
    'sok grejpfrutowy': 'grapefruit',
    'ananas': 'pineapple',
    'sok ananasowy': 'pineapple',
    'brzoskwinia': 'peach',
    'pomidory': 'tomato juice',
    'sok pomidorowy': 'tomato juice',
    'piwo imbirowe': 'ginger beer',
    'imbir': 'ginger',
    'kokos': 'coconut',
    'mleko kokosowe': 'coconut cream',
    'kremówka kokosowa': 'coconut cream',
    'kremowka kokosowa': 'coconut cream',
    'woda': 'water',
    'gorąca woda': 'hot water',
    'goraca woda': 'hot water',
    'lód': 'ice',
    'lod': 'ice',
    'kostki lodu': 'ice',
    'crushed ice': 'crushed ice',
    'lemonade': 'lemonade',
    'lemonada': 'lemonade',
    'cola': 'cola',
    'tonik': 'tonic',
    'sprite': 'sprite',
    'energy drink': 'energy drink',
    'napój energetyczny': 'energy drink',
    'napoj energetyczny': 'energy drink',
    'pepsi': 'cola',
    'fanta': 'orange',
    'mirinda': 'orange'
  };
  
  return ingredientMap[lower] || lower;
}

// Helper function to check if user has an ingredient - POPRAWIONA
function hasIngredient(userIngredients, required) {
  const normalizedUser = userIngredients.map(ing => normalizeIngredient(ing));
  
  // Special cases - POPRAWIONE POLSKIE ZNAKI
  if (required === 'cream') {
    return normalizedUser.includes('cream') || 
           normalizedUser.includes('baileys') || 
           normalizedUser.includes('milk') ||
           normalizedUser.includes('śmietana') ||
           normalizedUser.includes('smietana') ||
           normalizedUser.includes('śmietanka') ||
           normalizedUser.includes('smietanka') ||
           normalizedUser.includes('mleko');
  }
  
  if (required === 'soda water') {
    return normalizedUser.includes('soda water') || 
           normalizedUser.includes('sparkling water') ||
           normalizedUser.includes('woda gazowana');
  }
  
  if (required === 'energy drink') {
    return normalizedUser.includes('energy drink') || 
           normalizedUser.includes('red bull') || 
           normalizedUser.includes('monster') ||
           normalizedUser.includes('tiger') ||
           normalizedUser.includes('rockstar') ||
           normalizedUser.includes('burn') ||
           normalizedUser.includes('napój energetyczny') ||
           normalizedUser.includes('napoj energetyczny');
  }
  
  if (required === 'orange') {
    return normalizedUser.includes('orange') || 
           normalizedUser.includes('fanta') || 
           normalizedUser.includes('mirinda') ||
           normalizedUser.includes('pomarańcza') ||
           normalizedUser.includes('pomarancza') ||
           normalizedUser.includes('sok pomarańczowy') ||
           normalizedUser.includes('sok pomaranczowy');
  }
  
  if (required === 'ginger beer') {
    return normalizedUser.includes('ginger beer') || 
           normalizedUser.includes('canada dry') ||
           normalizedUser.includes('piwo imbirowe') ||
           normalizedUser.includes('bundaberg');
  }
  
  if (required === 'whisky') {
    return normalizedUser.includes('whisky') || 
           normalizedUser.includes('whiskey') ||
           normalizedUser.includes('wisky') ||
           normalizedUser.includes('wiskey');
  }
  
  if (required === 'lime') {
    return normalizedUser.includes('lime') || 
           normalizedUser.includes('limonka') ||
           normalizedUser.includes('liomka');
  }
  
  if (required === 'lemon') {
    return normalizedUser.includes('lemon') || 
           normalizedUser.includes('cytryna') ||
           normalizedUser.includes('cytyna');
  }
  
  if (required === 'sugar') {
    return normalizedUser.includes('sugar') || 
           normalizedUser.includes('cukier') ||
           normalizedUser.includes('cukir') ||
           normalizedUser.includes('syrop cukrowy');
  }
  
  if (required === 'mint') {
    return normalizedUser.includes('mint') || 
           normalizedUser.includes('miÄ™ta') ||
           normalizedUser.includes('mięta') ||
           normalizedUser.includes('mieta') ||
           normalizedUser.includes('minta');
  }
  
  if (required === 'tonic') {
    return normalizedUser.includes('tonic') || 
           normalizedUser.includes('tonik');
  }
  
  if (required === 'cola') {
    return normalizedUser.includes('cola') || 
           normalizedUser.includes('kola') ||
           normalizedUser.includes('coca-cola') ||
           normalizedUser.includes('coke') ||
           normalizedUser.includes('pepsi');
  }
  
  if (required === 'cranberry') {
    return normalizedUser.includes('cranberry') || 
           normalizedUser.includes('żurawina') ||
           normalizedUser.includes('zurawina') ||
           normalizedUser.includes('sok żurawinowy') ||
           normalizedUser.includes('sok zurawinowy');
  }
  
  if (required === 'grapefruit') {
    return normalizedUser.includes('grapefruit') || 
           normalizedUser.includes('grejpfrut') ||
           normalizedUser.includes('sok grejpfrutowy');
  }
  
  if (required === 'pineapple') {
    return normalizedUser.includes('pineapple') || 
           normalizedUser.includes('ananas') ||
           normalizedUser.includes('sok ananasowy');
  }
  
  if (required === 'tomato juice') {
    return normalizedUser.includes('tomato juice') || 
           normalizedUser.includes('pomidory') ||
           normalizedUser.includes('sok pomidorowy');
  }
  
  if (required === 'champagne') {
    return normalizedUser.includes('champagne') || 
           normalizedUser.includes('prosecco') ||
           normalizedUser.includes('szampan');
  }
  
  if (required === 'lemonade') {
    return normalizedUser.includes('lemonade') || 
           normalizedUser.includes('lemonada');
  }
  
  if (required === 'sprite') {
    return normalizedUser.includes('sprite') || 
           normalizedUser.includes('7up') ||
           normalizedUser.includes('lemon-lime soda');
  }
  
  if (required === 'honey') {
    return normalizedUser.includes('honey') || 
           normalizedUser.includes('miód') ||
           normalizedUser.includes('miod');
  }
  
  return normalizedUser.includes(required);
}

// Check what cocktails can be made - POPRAWIONA LOGIKA
function checkCocktails(userIngredients) {
  const canMake = [];
  const almostCanMake = [];
  const couldMakeMissing2 = []; // Nowa kategoria dla koktajli z 2 brakującymi składnikami
  
  console.log('🔍 Checking cocktails with ingredients:', userIngredients.map(ing => normalizeIngredient(ing)));
  
  for (const [cocktailName, recipe] of Object.entries(COCKTAIL_RECIPES)) {
    const missingRequired = [];
    
    // Check all required ingredients
    for (const req of recipe.required) {
      if (!hasIngredient(userIngredients, req)) {
        missingRequired.push(req);
      }
    }
    
    console.log(`🍸 ${cocktailName}: missing ${missingRequired.length} ingredients:`, missingRequired);
    
    if (missingRequired.length === 0) {
      canMake.push(cocktailName);
    } else if (missingRequired.length === 1) {
      almostCanMake.push({
        cocktail: cocktailName,
        missing: missingRequired[0]
      });
    } else if (missingRequired.length === 2) {
      // Dodajemy koktajle z 2 brakującymi składnikami do rozważenia w sugestiach zakupów
      couldMakeMissing2.push({
        cocktail: cocktailName,
        missing: missingRequired
      });
    }
    // If missing 3+ ingredients, don't include
  }
  
  console.log(`📊 Results: Can make ${canMake.length}, Almost ${almostCanMake.length}, Missing 2: ${couldMakeMissing2.length}`);
  
  return { canMake, almostCanMake, couldMakeMissing2 };
}

// Generate smart shopping suggestions - POPRAWIONA
function generateShoppingSuggestions(userIngredients, almostCanMake, couldMakeMissing2) {
  const suggestions = [];
  const ingredientCount = {};
  
  // Count how many cocktails each missing ingredient would unlock
  for (const item of almostCanMake) {
    const ing = item.missing;
    if (!ingredientCount[ing]) {
      ingredientCount[ing] = {
        count: 0,
        cocktails: [],
        priority: 'high' // Koktajle z 1 brakującym składnikiem mają wysoką wagę
      };
    }
    ingredientCount[ing].count++;
    ingredientCount[ing].cocktails.push(item.cocktail);
  }
  
  // Dodajemy składniki z koktajli gdzie brakuje 2 składników, ale z niższą wagą
  for (const item of couldMakeMissing2) {
    for (const ing of item.missing) {
      if (!ingredientCount[ing]) {
        ingredientCount[ing] = {
          count: 0,
          cocktails: [],
          priority: 'medium' // Niższa waga dla składników z koktajli z 2 brakującymi
        };
      }
      ingredientCount[ing].count += 0.5; // Połowa wagi dla składników z koktajli z 2 brakującymi
      if (!ingredientCount[ing].cocktails.includes(item.cocktail)) {
        ingredientCount[ing].cocktails.push(item.cocktail);
      }
    }
  }
  
  // Sort by unlock count and priority
  const sorted = Object.entries(ingredientCount)
    .sort((a, b) => {
      // Najpierw sortuj po priorytecie (high > medium)
      if (a[1].priority !== b[1].priority) {
        return a[1].priority === 'high' ? -1 : 1;
      }
      // Potem po liczbie odblokowywanych koktajli
      return b[1].count - a[1].count;
    })
    .slice(0, 3); // Max 3 suggestions (zwiększone z 2)
  
  for (const [ingredient, data] of sorted) {
    suggestions.push({
      ingredient,
      unlocksCount: Math.floor(data.count),
      cocktails: data.cocktails,
      priority: data.priority
    });
  }
  
  return suggestions;
}

// Helper function to translate ingredients - POPRAWIONE POLSKIE ZNAKI
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
    'prosecco': 'prosecco',
    'champagne': 'szampan',
    'orange': 'pomarańcza',
    'grapefruit': 'grejpfrut',
    'pineapple': 'ananas',
    'tomato juice': 'sok pomidorowy',
    'coconut cream': 'mleko kokosowe',
    'peach': 'brzoskwinia',
    'energy drink': 'napój energetyczny',
    'cola': 'cola',
    'sprite': 'sprite',
    'lemonade': 'lemonada',
    'hot water': 'gorąca woda',
    'coffee': 'kawa',
    'whisky': 'whisky',
    'gin': 'gin',
    'vodka': 'wódka',
    'rum': 'rum',
    'tequila': 'tequila',
    'cognac': 'koniak',
    'kahlua': 'kahlua',
    'baileys': 'baileys',
    'campari': 'campari',
    'aperol': 'aperol',
    'amaretto': 'amaretto'
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

// Helper function to get Polish cocktail names
function getPolishCocktailName(englishName) {
  const cocktailTranslations = {
    'Gin & Tonic': 'Gin z Tonikiem',
    'Gin Lemonade': 'Gin z Lemonadą',
    'Whiskey Coke': 'Whisky z Colą',
    'Whiskey Sour': 'Whisky Sour',
    'Old Fashioned': 'Old Fashioned',
    'Manhattan': 'Manhattan',
    'Vodka Tonic': 'Wódka z Tonikiem',
    'Vodka Red Bull': 'Wódka z Red Bullem',
    'Moscow Mule': 'Moscow Mule',
    'White Russian': 'Biały Rosjanin',
    'Black Russian': 'Czarny Rosjanin',
    'Bloody Mary': 'Krwawa Mary',
    'Screwdriver': 'Śrubokręt',
    'Rum & Coke': 'Rum z Colą',
    'Cuba Libre': 'Cuba Libre',
    'Mojito': 'Mojito',
    'Daiquiri': 'Daiquiri',
    'Margarita': 'Margarita',
    'Tequila Sunrise': 'Tequila Sunrise',
    'Cosmopolitan': 'Cosmopolitan',
    'Espresso Martini': 'Espresso Martini',
    'Negroni': 'Negroni',
    'Aperol Spritz': 'Aperol Spritz',
    'Mimosa': 'Mimosa',
    'Bellini': 'Bellini',
    'French 75': 'French 75',
    'Tom Collins': 'Tom Collins',
    'Gin Fizz': 'Gin Fizz',
    'Piña Colada': 'Piña Colada',
    'Mai Tai': 'Mai Tai',
    'Long Island Iced Tea': 'Long Island Iced Tea',
    'Irish Coffee': 'Irlandzka Kawa',
    'Baileys Coffee': 'Kawa z Baileys',
    'Hot Toddy': 'Gorący Toddy',
    'Whiskey Honey': 'Whisky z Miodem',
    'Gin Basil Smash': 'Gin Basil Smash',
    'Amaretto Sour': 'Amaretto Sour',
    'Brandy Alexander': 'Brandy Alexander',
    'Sidecar': 'Sidecar',
    'B-52': 'B-52',
    'Mudslide': 'Mudslide',
    'Sex on the Beach': 'Sex on the Beach',
    'Blue Lagoon': 'Błękitna Laguna',
    'Fuzzy Navel': 'Fuzzy Navel',
    'Sea Breeze': 'Morska Bryza',
    'Bay Breeze': 'Zatokowa Bryza',
    'Cape Codder': 'Cape Codder',
    'Greyhound': 'Chart',
    'Salty Dog': 'Słony Pies',
    'Kamikaze': 'Kamikaze',
    'Jager Bomb': 'Jager Bomb',
    'Dark & Stormy': 'Dark & Stormy',
    'Paloma': 'Paloma',
    'Mexican Mule': 'Meksykański Muł',
    'Caipirinha': 'Caipirinha',
    'Caipiroska': 'Caipiroska',
    'Pisco Sour': 'Pisco Sour'
  };
  
  return cocktailTranslations[englishName] || englishName;
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

// Helper function to update user stats
const updateUserStats = async (firebaseUid) => {
  try {
    if (!firebaseUid) {
      console.log('⚠️ No firebaseUid provided, skipping stats update');
      return;
    }

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

// Main route handler - POPRAWIONY
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
    const { canMake, almostCanMake, couldMakeMissing2 } = checkCocktails(ingredients);
    const shoppingSuggestions = generateShoppingSuggestions(ingredients, almostCanMake, couldMakeMissing2);
    
    console.log(`📊 Logic check - Can make: ${canMake.length}, Almost: ${almostCanMake.length}, Missing 2: ${couldMakeMissing2.length}`);
    
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
6. Pokaż WIĘCEJ opcji koktajli jeśli to możliwe

Składniki które MAM:
${ingredients.join(', ')}

ROZPOZNAWAJ MARKI I SKŁADNIKI:
- Bombay = gin
- Jack Daniels = whisky
- Kinley = tonic
- Baileys = śmietanka/irish cream
- Kahlua = likier kawowy
- whisky = whiskey (to samo)
- cytryna = lemon juice
- limonka = lime juice
- cukier = simple syrup
- miÄ™ta = mint
- itd.

Podaj WSZYSTKIE koktajle które mogę zrobić.
Maksymalnie 3 sugestie zakupów.
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
6. Show MORE cocktail options when possible

Ingredients I HAVE:
${ingredients.join(', ')}

RECOGNIZE BRANDS AND INGREDIENTS:
- Bombay = gin
- Jack Daniels = whiskey
- Kinley = tonic
- Baileys = cream/irish cream
- Kahlua = coffee liqueur
- whisky = whiskey (same thing)
- cytryna = lemon juice
- limonka = lime juice
- cukier = simple syrup
- miÄ™ta = mint
- etc.

List ALL cocktails I can make.
Maximum 3 shopping suggestions.
All text in English.

RETURN ONLY VALID JSON!`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MYBAR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000, // Zwiększone dla większej liczby koktajli
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
        // Double-check each cocktail - POPRAWIONA WALIDACJA
        suggestions.cocktails = suggestions.cocktails.filter(cocktail => {
          const cocktailName = cocktail.nameEn || cocktail.name;
          const isValid = canMake.includes(cocktailName) || 
                         canMake.some(name => {
                           const normalizedCocktail = cocktailName.toLowerCase().replace(/[^a-z0-9]/g, '');
                           const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                           return normalizedCocktail.includes(normalizedName) || 
                                  normalizedName.includes(normalizedCocktail);
                         });
          
          if (!isValid) {
            console.log(`❌ Removing invalid cocktail: ${cocktailName}`);
          }
          
          return isValid;
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
      
      // Build fallback cocktails from our logic - POPRAWIONY FALLBACK
      const fallbackCocktails = [];
      
      for (const cocktailName of canMake) {
        const recipe = COCKTAIL_RECIPES[cocktailName];
        if (!recipe) continue;
        
        // Podstawowe ilości dla różnych typów składników
        const getAmount = (ingredient) => {
          if (['whisky', 'gin', 'vodka', 'rum', 'tequila', 'cognac'].includes(ingredient)) {
            return '50';
          }
          if (['triple sec', 'kahlua', 'amaretto', 'vermouth'].includes(ingredient)) {
            return '25';
          }
          if (['lemon', 'lime'].includes(ingredient)) {
            return '25';
          }
          if (['sugar', 'honey'].includes(ingredient)) {
            return '15';
          }
          if (['tonic', 'soda water', 'ginger beer', 'cola'].includes(ingredient)) {
            return '100';
          }
          return '30';
        };
        
        fallbackCocktails.push({
          name: requestLanguage === 'pl' ? getPolishCocktailName(cocktailName) : cocktailName,
          nameEn: cocktailName,
          available: true,
          description: requestLanguage === 'pl' ? 'Klasyczny koktajl' : 'Classic cocktail',
          category: recipe.category,
          ingredients: recipe.required.map(ing => ({
            name: requestLanguage === 'pl' ? translateIngredient(ing, 'pl') : ing,
            amount: getAmount(ing),
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
    
    // Update user stats
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