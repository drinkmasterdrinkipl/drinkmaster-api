const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `Jesteś ekspertem barmana z 20-letnim doświadczeniem w najlepszych barach świata. Tworzysz precyzyjne, profesjonalne przepisy na koktajle z prawdziwą historią i dokładnymi proporcjami używanymi w renomowanych barach.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks
2. ALL text must be in the language specified in request (pl/en)
3. Use REAL historical facts with accurate dates and locations
4. Provide EXACT measurements in ml as used in professional bars (except for ice and herbs)
5. Include DETAILED professional bartending techniques
6. Specify exact glass type
7. NO EMOJIS - use plain text only
8. servingTemp: return NUMBER ONLY without °C (e.g., "5" not "5°C")
9. abv: return NUMBER ONLY without % or ~ (e.g., 25 not "~25%")
10. method: always return in English ("shaken", "stirred", "built", "blended")

POLISH LANGUAGE RULES:
- mixing glass → "szklanica barmańska" (NOT "szklanka mieszająca")
- bar spoon → "łyżka barmańska"
- soda water → "woda gazowana" (NEVER "woda sodowa")
- fresh mint → "świeża mięta"
- mint leaves → "listki" or "listków" (NEVER "leaves")
- simple syrup → "syrop cukrowy"
- sugar → "cukier"
- ice cubes → "kostki lodu"
- crushed ice → "kruszony lód"
- For cocktails served straight up: ice = "brak"

STIRRED DRINKS RULE:
For all stirred cocktails (Negroni, Manhattan, Martini, Old Fashioned, Boulevardier, Vieux Carré):
- ALWAYS use mixing glass (szklanica barmańska) for preparation
- NEVER build directly in serving glass
- Instructions must include: fill mixing glass → add ingredients → stir → strain to serving glass
- Polish: "Napełnij szklanicę barmańską lodem" → "Dodaj składniki" → "Mieszaj łyżką barmańską" → "Przecedź do szklanki"

INGREDIENTS FORMATTING:
- Liquids (alcohol, juices, syrups): exact ml measurements
- Ice: NEVER use ml, use descriptive amounts:
  - Polish: "garść", "do pełna", "kilka kostek", "1 duża kostka"
  - English: "handful", "fill", "few cubes", "1 large cube"
- Herbs (mint, basil): 
  - Polish: "10-12 listków", "gałązka"
  - English: "10-12 leaves", "sprig"
- Garnish items: "1 plasterek", "skórka", "1 slice", "peel"

INSTRUCTIONS LENGTH:
- Simple drinks (Mojito, Cuba Libre, Gin & Tonic): 4-5 steps
- Stirred drinks (Negroni, Manhattan, Old Fashioned): 6-7 steps
- Complex drinks (Ramos Gin Fizz, multilayer): 7-10 steps

OUTPUT FORMAT (EXACT):
{
  "name": "[Cocktail name in requested language]",
  "nameEn": "[English name]",
  "category": "classic/modern/tiki/sour",
  "history": "[2-3 sentences with REAL dates, places, and creator names]",
  "ingredients": [
    {"name": "[ingredient]", "amount": "[number or description]", "unit": "[ml/dash/listków/etc or empty for descriptive]"},
    {"name": "[ingredient]", "amount": "[number or description]", "unit": "[ml/dash/listków/etc or empty for descriptive]"}
  ],
  "glassType": "[glass type - SHORT name]",
  "method": "shaken/stirred/built/blended",
  "instructions": [
    "[Professional step 1]",
    "[Professional step 2]",
    "[Professional step 3]",
    "[Professional step 4]",
    "[Professional step 5]",
    "[Professional step 6 if needed]"
  ],
  "garnish": "[Professional garnish description]",
  "ice": "[Type: kostki/kruszony/duża kostka/brak OR cubed/crushed/large cube/none]",
  "servingTemp": "5",
  "abv": 25,
  "prepTime": 5,
  "difficulty": "easy/medium/hard",
  "flavor": "[Flavor profile description]",
  "occasion": "[When to serve this cocktail]",
  "proTip": "[Professional bartender tip]",
  "tags": ["tag1", "tag2"]
}

EXAMPLE - NEGRONI IN POLISH (STIRRED IN MIXING GLASS):
{
  "name": "Negroni",
  "nameEn": "Negroni",
  "category": "classic",
  "history": "Negroni został stworzony w 1919 roku w Caffè Casoni we Florencji, gdy hrabia Camillo Negroni poprosił o wzmocnienie swojego Americano ginem zamiast wody sodowej.",
  "ingredients": [
    {"name": "gin", "amount": "30", "unit": "ml"},
    {"name": "Campari", "amount": "30", "unit": "ml"},
    {"name": "słodki wermut", "amount": "30", "unit": "ml"},
    {"name": "kostki lodu", "amount": "kilka dużych", "unit": ""}
  ],
  "glassType": "rocks",
  "method": "stirred",
  "instructions": [
    "Napełnij szklanicę barmańską kostkami lodu",
    "Dodaj 30ml ginu, 30ml Campari i 30ml słodkiego wermutu",
    "Mieszaj łyżką barmańską przez 30-40 sekund do schłodzenia",
    "Do szklanki rocks włóż jedną dużą kostkę lodu",
    "Przecedź zawartość szklanicy barmańskiej do szklanki rocks",
    "Wyciśnij olejki ze skórki pomarańczy nad powierzchnią drinka",
    "Przetrzyj skórką krawędź szklanki i wrzuć ją do drinka"
  ],
  "garnish": "skórka pomarańczy",
  "ice": "duża kostka",
  "servingTemp": "6",
  "abv": 24,
  "prepTime": 5,
  "difficulty": "medium",
  "flavor": "Gorzko-słodki, złożony, ziołowy",
  "occasion": "Aperitif, digestif",
  "proTip": "Używaj szklanicy barmańskiej dla lepszego schłodzenia i rozcieńczenia",
  "tags": ["classic", "bitter", "stirred"]
}`;

module.exports = async (req, res) => {
  console.log('🍹 Recipe generator endpoint called');
  console.log('📥 Full request body:', req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { drinkName, cocktailName, ingredients = [], language = 'pl' } = req.body;
    const finalCocktailName = drinkName || cocktailName;
    
    console.log(`📝 Generating recipe for: ${finalCocktailName} in ${language}`);
    
    if (!finalCocktailName) {
      return res.status(400).json({ error: 'Cocktail name is required' });
    }

    let userPrompt;
    
    if (language === 'pl') {
      userPrompt = `Stwórz profesjonalny przepis na koktajl "${finalCocktailName}".
      
KRYTYCZNE WYMAGANIA:
- name: DOKŁADNIE "${finalCocktailName}" (nie zmieniaj nazwy!)
- Wszystkie teksty po polsku (oprócz method)
- method: zawsze po angielsku (shaken/stirred/built/blended)
- Dla koktajli "stirred" (Negroni, Manhattan, Old Fashioned, Martini): ZAWSZE używaj "szklanicy barmańskiej", NIGDY nie buduj bezpośrednio w szkle
- mixing glass = "szklanica barmańska" (NIE "szklanka mieszająca")
- Lód: NIGDY nie używaj "ml" dla lodu - użyj "garść", "do pełna", "kilka kostek"
- Zioła: zawsze "listków" nie "leaves" (np. "10-12 listków")
- Woda gazowana NIE woda sodowa
- Instrukcje: 4-5 kroków dla prostych, 6-7 dla stirred drinks
- servingTemp: tylko liczba (np. 5)
- abv: tylko liczba (np. 15)
- Prawdziwa historia z datami i miejscami

${ingredients.length > 0 ? `Użyj tych składników jeśli pasują: ${ingredients.join(', ')}` : ''}`;
    } else {
      userPrompt = `Create a professional cocktail recipe for "${finalCocktailName}".
      
CRITICAL REQUIREMENTS:
- name: EXACTLY "${finalCocktailName}" (do not change the name!)
- All text in English
- method: in English (shaken/stirred/built/blended)
- For stirred cocktails (Negroni, Manhattan, Old Fashioned, Martini): ALWAYS use mixing glass, NEVER build directly in serving glass
- Ice: NEVER use "ml" for ice - use "handful", "fill", "few cubes"
- Herbs: use "leaves" with number (e.g. "10-12 leaves")
- Instructions: 4-5 steps for simple drinks, 6-7 for stirred drinks
- servingTemp: number only (e.g. 5)
- abv: number only (e.g. 15)
- Real history with dates and places

${ingredients.length > 0 ? `Use these ingredients if appropriate: ${ingredients.join(', ')}` : ''}`;
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
      temperature: 0.3,
      max_tokens: 1500
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('🤖 AI Response received');
    
    // Parse response
    let recipe;
    try {
      const cleanedResponse = aiResponse.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      recipe = JSON.parse(cleanedResponse);
      
      // Clean up data formatting
      if (recipe.servingTemp) {
        recipe.servingTemp = String(recipe.servingTemp).replace(/[°C]/g, '').trim();
      }
      if (recipe.abv) {
        recipe.abv = Number(String(recipe.abv).replace(/[~%]/g, '').trim());
      }
      
      // Ensure name matches request
      recipe.name = recipe.name || finalCocktailName;
      recipe.nameEn = recipe.nameEn || finalCocktailName;
      
      // Add default values if missing
      recipe.servingTemp = recipe.servingTemp || "5";
      recipe.ice = recipe.ice || (language === 'pl' ? "kostki" : "cubed");
      recipe.abv = recipe.abv || 20;
      recipe.prepTime = recipe.prepTime || 5;
      recipe.difficulty = recipe.difficulty || "medium";
      
      // Ensure proper formatting
      if (recipe.ingredients) {
        recipe.ingredients = recipe.ingredients.map(ing => ({
          name: ing.name,
          amount: String(ing.amount),
          unit: ing.unit || ''
        }));
      }
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      // Enhanced fallback recipes
      const fallbackRecipes = {
        'mojito': {
          pl: {
            name: "Mojito",
            nameEn: "Mojito",
            category: "classic",
            history: "Mojito narodziło się na Kubie w XVI wieku. Nazwa pochodzi od afrykańskiego słowa 'mojo' oznaczającego małą magię. Koktajl zyskał popularność w barze La Bodeguita del Medio w Hawanie.",
            ingredients: [
              { name: "świeża mięta", amount: "10-12", unit: "listków" },
              { name: "syrop cukrowy", amount: "20", unit: "ml" },
              { name: "sok z limonki", amount: "30", unit: "ml" },
              { name: "biały rum", amount: "50", unit: "ml" },
              { name: "woda gazowana", amount: "do pełna", unit: "" },
              { name: "kruszony lód", amount: "do pełna", unit: "" }
            ],
            glassType: "highball",
            method: "built",
            instructions: [
              "W szkle highball delikatnie ugniataj miętę z syropem cukrowym",
              "Dodaj sok z limonki i biały rum",
              "Wypełnij szklankę kruszonym lodem",
              "Dolej wodę gazowaną i delikatnie wymieszaj",
              "Udekoruj gałązką mięty i ćwiartką limonki"
            ],
            garnish: "gałązka mięty i ćwiartka limonki",
            ice: "kruszony",
            servingTemp: "2",
            abv: 15,
            prepTime: 5,
            difficulty: "easy",
            flavor: "Orzeźwiający, miętowy, lekko słodki",
            occasion: "Letnie popołudnie, plaża",
            proTip: "Nie miażdż mięty zbyt mocno - delikatne ugniatanie wystarczy",
            tags: ["classic", "refreshing", "rum"]
          },
          en: {
            name: "Mojito",
            nameEn: "Mojito",
            category: "classic",
            history: "Mojito was born in Cuba in the 16th century. The name comes from the African word 'mojo' meaning little magic. The cocktail gained popularity at La Bodeguita del Medio in Havana.",
            ingredients: [
              { name: "fresh mint", amount: "10-12", unit: "leaves" },
              { name: "simple syrup", amount: "20", unit: "ml" },
              { name: "lime juice", amount: "30", unit: "ml" },
              { name: "white rum", amount: "50", unit: "ml" },
              { name: "soda water", amount: "top up", unit: "" },
              { name: "crushed ice", amount: "fill", unit: "" }
            ],
            glassType: "highball",
            method: "built",
            instructions: [
              "In highball glass gently muddle mint with simple syrup",
              "Add lime juice and white rum",
              "Fill glass with crushed ice",
              "Top with soda water and stir gently",
              "Garnish with mint sprig and lime wedge"
            ],
            garnish: "mint sprig and lime wedge",
            ice: "crushed",
            servingTemp: "2",
            abv: 15,
            prepTime: 5,
            difficulty: "easy",
            flavor: "Refreshing, minty, slightly sweet",
            occasion: "Summer afternoon, beach",
            proTip: "Don't over-muddle the mint - gentle pressing is enough",
            tags: ["classic", "refreshing", "rum"]
          }
        },
        'margarita': {
          pl: {
            name: "Margarita",
            nameEn: "Margarita",
            category: "classic",
            history: "Margarita została stworzona w 1938 roku przez Carlosa 'Danny' Herrerę w Tijuanie dla tancerki Marjorie King, która była uczulona na wszystkie alkohole oprócz tequili.",
            ingredients: [
              { name: "tequila blanco", amount: "50", unit: "ml" },
              { name: "Cointreau", amount: "30", unit: "ml" },
              { name: "świeży sok z limonki", amount: "20", unit: "ml" },
              { name: "sól morska", amount: "1", unit: "do rantu" }
            ],
            glassType: "coupe",
            method: "shaken",
            instructions: [
              "Schłódź kieliszek coupe w zamrażarce",
              "Natrzyj połowę rantu kieliszka limonką i oprósz solą",
              "Do shakera dodaj tequilę, Cointreau i sok z limonki",
              "Wypełnij shaker lodem i wstrząsaj energicznie 12-15 sekund",
              "Przecedź do schłodzonego kieliszka"
            ],
            garnish: "kółko limonki na rancie",
            ice: "brak",
            servingTemp: "4",
            abv: 22,
            prepTime: 5,
            difficulty: "medium",
            flavor: "Cytrusowy, orzeźwiający, lekko słony",
            occasion: "Aperitif, impreza",
            proTip: "Używaj tylko świeżo wyciśniętego soku z limonki",
            tags: ["classic", "citrus", "tequila"]
          }
        },
        'negroni': {
          pl: {
            name: "Negroni",
            nameEn: "Negroni",
            category: "classic",
            history: "Negroni został stworzony w 1919 roku w Caffè Casoni we Florencji, gdy hrabia Camillo Negroni poprosił o wzmocnienie swojego Americano ginem zamiast wody sodowej.",
            ingredients: [
              { name: "gin", amount: "30", unit: "ml" },
              { name: "Campari", amount: "30", unit: "ml" },
              { name: "słodki wermut", amount: "30", unit: "ml" },
              { name: "kostki lodu", amount: "kilka dużych", unit: "" }
            ],
            glassType: "rocks",
            method: "stirred",
            instructions: [
              "Napełnij szklanicę barmańską kostkami lodu",
              "Dodaj 30ml ginu, 30ml Campari i 30ml słodkiego wermutu",
              "Mieszaj łyżką barmańską przez 30-40 sekund do schłodzenia",
              "Do szklanki rocks włóż jedną dużą kostkę lodu",
              "Przecedź zawartość szklanicy barmańskiej do szklanki rocks",
              "Wyciśnij olejki ze skórki pomarańczy nad powierzchnią drinka",
              "Przetrzyj skórką krawędź szklanki i wrzuć ją do drinka"
            ],
            garnish: "skórka pomarańczy",
            ice: "duża kostka",
            servingTemp: "6",
            abv: 24,
            prepTime: 5,
            difficulty: "medium",
            flavor: "Gorzko-słodki, złożony, ziołowy",
            occasion: "Aperitif, digestif",
            proTip: "Używaj szklanicy barmańskiej dla lepszego schłodzenia i rozcieńczenia - drink powinien być lodowaty",
            tags: ["classic", "bitter", "stirred"]
          },
          en: {
            name: "Negroni",
            nameEn: "Negroni",
            category: "classic",
            history: "Negroni was created in 1919 at Caffè Casoni in Florence when Count Camillo Negroni asked to strengthen his Americano with gin instead of soda water.",
            ingredients: [
              { name: "gin", amount: "30", unit: "ml" },
              { name: "Campari", amount: "30", unit: "ml" },
              { name: "sweet vermouth", amount: "30", unit: "ml" },
              { name: "ice cubes", amount: "several large", unit: "" }
            ],
            glassType: "rocks",
            method: "stirred",
            instructions: [
              "Fill mixing glass with ice cubes",
              "Add 30ml gin, 30ml Campari and 30ml sweet vermouth",
              "Stir with bar spoon for 30-40 seconds until well chilled",
              "Place one large ice cube in rocks glass",
              "Strain contents of mixing glass into rocks glass",
              "Express orange oils over the drink surface",
              "Rub orange peel on glass rim and drop into drink"
            ],
            garnish: "orange peel",
            ice: "large cube",
            servingTemp: "6",
            abv: 24,
            prepTime: 5,
            difficulty: "medium",
            flavor: "Bittersweet, complex, herbal",
            occasion: "Aperitif, digestif",
            proTip: "Use a mixing glass for better chilling and dilution - the drink should be ice cold",
            tags: ["classic", "bitter", "stirred"]
          }
        },
        'old fashioned': {
          pl: {
            name: "Old Fashioned",
            nameEn: "Old Fashioned",
            category: "classic",
            history: "Old Fashioned powstał w 1880 roku w Pendennis Club w Louisville, Kentucky. Jest uważany za jeden z pierwszych koktajli w historii, a jego nazwa oznacza 'staromodny'.",
            ingredients: [
              { name: "bourbon lub rye whiskey", amount: "60", unit: "ml" },
              { name: "syrop cukrowy demerara", amount: "10", unit: "ml" },
              { name: "Angostura bitters", amount: "2", unit: "dash" },
              { name: "Orange bitters", amount: "1", unit: "dash" },
              { name: "kostki lodu", amount: "kilka", unit: "" },
              { name: "duża kostka lodu", amount: "1", unit: "" }
            ],
            glassType: "rocks",
            method: "stirred",
            instructions: [
              "Do szklanicy barmańskiej dodaj syrop demerara i oba rodzaje bittersów",
              "Dodaj kilka kostek lodu i mieszaj przez 10 sekund",
              "Dodaj 60ml whiskey i dolej więcej lodu",
              "Mieszaj łyżką barmańską przez 30-40 sekund",
              "Do szklanki rocks włóż jedną dużą kostkę lodu lub kulę lodową",
              "Przecedź zawartość szklanicy barmańskiej do szklanki rocks",
              "Wyciśnij olejki ze skórki pomarańczy nad powierzchnią drinka"
            ],
            garnish: "skórka pomarańczy i koktajlowa wisienka",
            ice: "duża kostka",
            servingTemp: "8",
            abv: 35,
            prepTime: 5,
            difficulty: "medium",
            flavor: "Bogaty, słodko-gorzki, dębowy",
            occasion: "Po kolacji, wieczór",
            proTip: "Użyj dużej kostki lodu lub kuli lodowej - wolniej się topi i mniej rozwadnia drinka",
            tags: ["classic", "whiskey", "stirred"]
          },
          en: {
            name: "Old Fashioned",
            nameEn: "Old Fashioned",
            category: "classic",
            history: "Old Fashioned was created in 1880 at the Pendennis Club in Louisville, Kentucky. It's considered one of the first cocktails in history.",
            ingredients: [
              { name: "bourbon or rye whiskey", amount: "60", unit: "ml" },
              { name: "demerara syrup", amount: "10", unit: "ml" },
              { name: "Angostura bitters", amount: "2", unit: "dash" },
              { name: "Orange bitters", amount: "1", unit: "dash" },
              { name: "ice cubes", amount: "several", unit: "" },
              { name: "large ice cube", amount: "1", unit: "" }
            ],
            glassType: "rocks",
            method: "stirred",
            instructions: [
              "Add demerara syrup and both bitters to mixing glass",
              "Add a few ice cubes and stir for 10 seconds",
              "Add 60ml whiskey and more ice",
              "Stir with bar spoon for 30-40 seconds",
              "Place one large ice cube or sphere in rocks glass",
              "Strain contents of mixing glass into rocks glass",
              "Express orange oils over the drink surface"
            ],
            garnish: "orange peel and cocktail cherry",
            ice: "large cube",
            servingTemp: "8",
            abv: 35,
            prepTime: 5,
            difficulty: "medium",
            flavor: "Rich, bittersweet, oaky",
            occasion: "After dinner, evening",
            proTip: "Use a large ice cube or sphere - it melts slower and doesn't dilute the drink",
            tags: ["classic", "whiskey", "stirred"]
          }
        }
      };
      
      // Find matching recipe
      const normalizedName = finalCocktailName.toLowerCase();
      const matchedRecipe = Object.keys(fallbackRecipes).find(key => 
        normalizedName.includes(key)
      );
      
      if (matchedRecipe && fallbackRecipes[matchedRecipe][language]) {
        recipe = fallbackRecipes[matchedRecipe][language];
      } else {
        // Generic fallback
        recipe = {
          name: finalCocktailName,
          nameEn: finalCocktailName,
          category: "classic",
          history: language === 'pl' 
            ? `${finalCocktailName} to klasyczny koktajl o bogatej historii.`
            : `${finalCocktailName} is a classic cocktail with a rich history.`,
          ingredients: [
            { name: language === 'pl' ? "Główny alkohol" : "Base spirit", amount: "60", unit: "ml" },
            { name: language === 'pl' ? "Modyfikator" : "Modifier", amount: "30", unit: "ml" },
            { name: language === 'pl' ? "kostki lodu" : "ice cubes", amount: language === 'pl' ? "kilka" : "few", unit: "" }
          ],
          glassType: "rocks",
          method: "stirred",
          instructions: language === 'pl' 
            ? [
              "Napełnij szklanicę barmańską lodem",
              "Dodaj wszystkie składniki",
              "Mieszaj łyżką barmańską przez 30 sekund",
              "Przecedź do szklanki rocks z lodem"
            ]
            : [
              "Fill mixing glass with ice",
              "Add all ingredients",
              "Stir with bar spoon for 30 seconds",
              "Strain into rocks glass over ice"
            ],
          garnish: language === 'pl' ? "Skórka cytryny" : "Lemon peel",
          ice: language === 'pl' ? "kostki" : "cubed",
          servingTemp: "5",
          abv: 25,
          prepTime: 5,
          difficulty: "medium",
          flavor: language === 'pl' ? "Zbalansowany" : "Balanced",
          occasion: language === 'pl' ? "Wieczór" : "Evening",
          proTip: language === 'pl' 
            ? "Używaj wysokiej jakości składników"
            : "Use high-quality ingredients",
          tags: ["classic"]
        };
      }
    }

    // Format final response to match frontend expectations
    const response = {
      ...recipe,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    console.log('✅ Sending recipe for:', response.name);
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipe',
      details: error.message 
    });
  }
};