const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `Jesteś ekspertem barmana z 20-letnim doświadczeniem w najlepszych barach świata. Tworzysz precyzyjne, profesjonalne przepisy na koktajle z prawdziwą historią i dokładnymi proporcjami używanymi w renomowanych barach.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks
2. ALL text must be in the language specified in request (pl/en)
3. Use REAL historical facts with accurate dates and locations
4. Provide EXACT measurements in ml as used in professional bars
5. Include DETAILED professional bartending techniques
6. Specify exact glass type
7. NO EMOJIS - use plain text only
8. servingTemp: return NUMBER ONLY without °C (e.g., "5" not "5°C")
9. abv: return NUMBER ONLY without % or ~ (e.g., 25 not "~25%")
10. method: always return in English ("shaken", "stirred", "built", "blended")
11. For Polish: "soda water" = "woda gazowana", NOT "woda sodowa"
12. For cocktails served straight up (martini, coupe): ice = "brak" or "none"
13. Instructions must be VERY DETAILED with specific techniques and timings

OUTPUT FORMAT (EXACT):
{
  "name": "[Cocktail name in requested language]",
  "nameEn": "[English name]",
  "category": "classic/modern/tiki/sour",
  "history": "[2-3 sentences with REAL dates, places, and creator names]",
  "ingredients": [
    {"name": "[ingredient]", "amount": "[number]", "unit": "ml/dash/barspoon"},
    {"name": "[ingredient]", "amount": "[number]", "unit": "ml/dash/barspoon"}
  ],
  "glassType": "[glass type - SHORT name]",
  "method": "shaken/stirred/built/blended",
  "instructions": [
    "[DETAILED step 1 with technique]",
    "[DETAILED step 2 with timing]",
    "[DETAILED step 3 with specific actions]",
    "[DETAILED step 4]",
    "[DETAILED step 5]",
    "[DETAILED step 6 if needed]"
  ],
  "garnish": "[Professional garnish description]",
  "ice": "[Type of ice or 'brak'/'none' for straight up drinks]",
  "servingTemp": "5",
  "abv": 25,
  "prepTime": 5,
  "difficulty": "easy/medium/hard",
  "flavor": "[Flavor profile description]",
  "occasion": "[When to serve this cocktail]",
  "proTip": "[Professional bartender tip]",
  "tags": ["tag1", "tag2"]
}

POLISH TRANSLATIONS:
- soda water → woda gazowana (NEVER woda sodowa)
- tonic water → tonik
- sparkling water → woda gazowana
- straight up drinks (Martini, Margarita in coupe) → ice: "brak"
- crushed ice → kruszony
- large cube → duża kostka
- cubed ice → kostki
- no ice → brak

DETAILED INSTRUCTIONS EXAMPLES:
For Negroni (PL):
1. "Napełnij szklankę rocks dużymi kostkami lodu aż do góry"
2. "Odmierz dokładnie po 30ml każdego składnika używając jiggera"
3. "Wlej gin, następnie Campari, a na końcu słodki wermut bezpośrednio do szklanki"
4. "Mieszaj łyżką barmańską ruchem okrężnym od dołu do góry przez 30-40 sekund"
5. "Wytnij pasek skórki pomarańczy o wymiarach 5x2cm używając obieraczki"
6. "Wyciśnij olejki ze skórki nad powierzchnią drinka trzymając ją nad szklanką skórką do dołu"
7. "Przetrzyj skórką krawędź szklanki i umieść ją w drinku jako dekorację"

For Margarita (PL):
1. "Schłódź kieliszek coupe w zamrażarce na minimum 5 minut"
2. "Przetnij limonkę na pół i użyj jednej połówki do natarcia połowy krawędzi kieliszka"
3. "Rozsyp sól morską na talerzyku i delikatnie oprósz namoczoną krawędź kieliszka"
4. "Do shakera bostońskiego dodaj dokładnie 50ml tequili blanco 100% agave"
5. "Dodaj 30ml Cointreau (lub innego triple sec wysokiej jakości)"
6. "Wyciśnij 20ml świeżego soku z limonki używając wyciskarki"
7. "Wypełnij shaker kostkami lodu do 3/4 wysokości"
8. "Załóż tin na shaker i uderz dłonią aby szczelnie zamknąć"
9. "Wstrząsaj energicznie przez 12-15 sekund aż shaker będzie zimny na zewnątrz"
10. "Przecedź przez sitko hawthorne do schłodzonego kieliszka"
11. "Udekoruj kółkiem limonki na krawędzi kieliszka"`;

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
      
WAŻNE: 
- Musisz stworzyć przepis na DOKŁADNIE TEN koktajl: ${finalCocktailName}
- NIE TWÓRZ przepisu na inny koktajl!
- name: dokładnie "${finalCocktailName}"

WYMAGANIA:
- Wszystkie teksty PO POLSKU
- method: ZAWSZE po angielsku (shaken/stirred/built/blended)
- glassType: KRÓTKA nazwa (rocks/coupe/highball/martini/collins)
- ice: krótko po polsku (kostki/kruszony/duża kostka/brak)
- Dla drinków w kieliszku coupe/martini bez lodu: ice = "brak"
- Woda sodowa = "woda gazowana" (NIE "woda sodowa")
- Instrukcje BARDZO szczegółowe (minimum 5-6 kroków) z dokładnymi technikami
- Prawdziwa historia koktajlu z konkretnymi datami i twórcami
- Dokładne proporcje składników w ml (standardy IBA jeśli istnieją)
- servingTemp: tylko liczba bez °C
- abv: tylko liczba bez % i bez ~
- NIE UŻYWAJ EMOTEK

${ingredients.length > 0 ? `Użyj tych składników: ${ingredients.join(', ')}` : ''}`;
    } else {
      userPrompt = `Create a professional cocktail recipe for "${finalCocktailName}".
      
IMPORTANT: 
- You must create a recipe for EXACTLY THIS cocktail: ${finalCocktailName}
- DO NOT create a recipe for any other cocktail!
- name: exactly "${finalCocktailName}"

REQUIREMENTS:
- All text in ENGLISH
- method: in English (shaken/stirred/built/blended)
- glassType: SHORT name (rocks/coupe/highball/martini/collins)
- ice: short form (cubed/crushed/large cube/none)
- For straight up drinks in coupe/martini: ice = "none"
- Very DETAILED instructions (minimum 5-6 steps) with exact techniques
- Real cocktail history with specific dates and creators
- Exact ingredient measurements in ml (IBA standards if applicable)
- servingTemp: number only without °C
- abv: number only without % or ~
- NO EMOJIS

${ingredients.length > 0 ? `Use these ingredients: ${ingredients.join(', ')}` : ''}`;
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
          unit: ing.unit || 'ml'
        }));
      }
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      // Enhanced fallback recipes with detailed instructions
      const fallbackRecipes = {
        'Negroni': {
          pl: {
            name: "Negroni",
            nameEn: "Negroni",
            ingredients: [
              { name: "gin", amount: "30", unit: "ml" },
              { name: "Campari", amount: "30", unit: "ml" },
              { name: "słodki wermut", amount: "30", unit: "ml" }
            ],
            method: "stirred",
            glassType: "rocks",
            ice: "duża kostka",
            instructions: [
              "Napełnij szklankę rocks jedną dużą kostką lodu lub kilkoma dużymi kostkami",
              "Odmierz dokładnie po 30ml każdego składnika używając jiggera",
              "Wlej kolejno gin, Campari i słodki wermut bezpośrednio do szklanki",
              "Mieszaj łyżką barmańską ruchem okrężnym przez 30-40 sekund",
              "Wytnij pasek skórki pomarańczy i wyciśnij olejki nad powierzchnią drinka",
              "Przetrzyj skórką krawędź szklanki i wrzuć ją do drinka"
            ],
            history: "Negroni został stworzony w 1919 roku w Caffè Casoni we Florencji, gdy hrabia Camillo Negroni poprosił barmana o wzmocnienie swojego Americano ginem zamiast wody sodowej."
          }
        },
        'Margarita': {
          pl: {
            name: "Margarita",
            nameEn: "Margarita",
            ingredients: [
              { name: "tequila blanco", amount: "50", unit: "ml" },
              { name: "Cointreau", amount: "30", unit: "ml" },
              { name: "świeży sok z limonki", amount: "20", unit: "ml" },
              { name: "sól morska", amount: "1", unit: "do rantu" }
            ],
            method: "shaken",
            glassType: "coupe",
            ice: "brak",
            instructions: [
              "Schłódź kieliszek coupe w zamrażarce na minimum 5 minut",
              "Natrzyj połowę krawędzi kieliszka plasterkiem limonki",
              "Delikatnie oprósz namoczoną krawędź solą morską",
              "Do shakera dodaj 50ml tequili, 30ml Cointreau i 20ml świeżego soku z limonki",
              "Wypełnij shaker kostkami lodu do 3/4 wysokości",
              "Wstrząsaj energicznie przez 12-15 sekund",
              "Przecedź przez sitko do schłodzonego kieliszka",
              "Udekoruj kółkiem limonki na krawędzi"
            ],
            history: "Margarita została stworzona w 1938 roku przez Carlosa 'Danny' Herrerę w Tijuanie dla tancerki Marjorie King, która była uczulona na wszystkie alkohole oprócz tequili."
          }
        }
      };
      
      const normalizedName = finalCocktailName.toLowerCase();
      const fallback = fallbackRecipes[Object.keys(fallbackRecipes).find(key => 
        normalizedName.includes(key.toLowerCase())
      )]?.[language] || {
        name: finalCocktailName,
        nameEn: finalCocktailName,
        ingredients: [
          { name: language === 'pl' ? "Główny alkohol" : "Base spirit", amount: "60", unit: "ml" },
          { name: language === 'pl' ? "Modyfikator" : "Modifier", amount: "30", unit: "ml" }
        ],
        method: "stirred",
        glassType: "rocks",
        ice: language === 'pl' ? "kostki" : "cubed",
        instructions: language === 'pl' 
          ? [
            "Napełnij szklankę lodem",
            "Dodaj wszystkie składniki",
            "Mieszaj łyżką barmańską przez 30 sekund",
            "Podaj od razu"
          ]
          : [
            "Fill glass with ice",
            "Add all ingredients",
            "Stir with bar spoon for 30 seconds",
            "Serve immediately"
          ],
        history: language === 'pl' 
          ? `${finalCocktailName} to klasyczny koktajl o bogatej historii.`
          : `${finalCocktailName} is a classic cocktail with a rich history.`
      };
      
      recipe = {
        ...fallback,
        category: "classic",
        garnish: language === 'pl' ? "Skórka cytryny" : "Lemon peel",
        servingTemp: "5",
        abv: 25,
        prepTime: 5,
        difficulty: "medium",
        flavor: language === 'pl' ? "Zbalansowany" : "Balanced",
        occasion: language === 'pl' ? "Aperitif" : "Aperitif",
        proTip: language === 'pl' 
          ? "Używaj świeżych składników i wysokiej jakości alkoholi"
          : "Use fresh ingredients and high-quality spirits",
        tags: ["classic"]
      };
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