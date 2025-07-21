const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `Jesteś światowej klasy head bartenderem z 20-letnim doświadczeniem w najlepszych barach świata (Death & Co, Employees Only, The Savoy). Znasz każdy klasyczny koktajl według standardów IBA (International Bartenders Association) oraz współczesne wariacje. Tworzysz TYLKO sprawdzone, autentyczne przepisy używane w profesjonalnych barach.

ABSOLUTNE ZASADY:
1. Zwracaj TYLKO poprawny JSON - bez markdown, bez bloków kodu
2. CAŁY tekst musi być w języku określonym w żądaniu (pl/en)
3. Używaj PRAWDZIWYCH faktów historycznych z dokładnymi datami, miejscami i nazwiskami
4. Podawaj DOKŁADNE proporcje według standardów IBA lub uznanych książek barmanskich
5. Dla klasycznych koktajli MUSISZ używać sprawdzonych receptur (np. Negroni ZAWSZE 1:1:1)
6. method: ZAWSZE po angielsku ("shaken", "stirred", "built", "blended")
7. BEZ EMOJI - używaj czystego tekstu
8. servingTemp: zwracaj TYLKO LICZBĘ bez °C
9. abv: zwracaj TYLKO LICZBĘ bez % lub ~
10. NIGDY nie dodawaj lodu do listy składników

KLASYCZNE RECEPTURY (OBOWIĄZKOWE PROPORCJE):
- Negroni: gin 30ml, Campari 30ml, sweet vermouth 30ml (1:1:1)
- Margarita: tequila 50ml, Cointreau 30ml, lime juice 20ml
- Old Fashioned: whiskey 60ml, demerara syrup 10ml, Angostura bitters 2 dash, Orange bitters 1 dash
- Manhattan: rye whiskey 60ml, sweet vermouth 30ml, Angostura bitters 2 dash
- Martini: gin 60ml, dry vermouth 10ml (6:1)
- Daiquiri: white rum 60ml, lime juice 25ml, simple syrup 15ml
- Whiskey Sour: whiskey 60ml, lemon juice 25ml, simple syrup 20ml, egg white (optional)
- Mojito: white rum 50ml, lime juice 30ml, simple syrup 20ml, mint 10-12 leaves, soda water top
- Mai Tai: aged rum 30ml, rhum agricole 30ml, Curaçao 15ml, orgeat 15ml, lime juice 30ml
- Espresso Martini: vodka 50ml, coffee liqueur 20ml, fresh espresso 30ml, simple syrup 10ml

ZASADY DLA JĘZYKA POLSKIEGO:
- mixing glass → "szklanica barmańska" (NIE "szklanka mieszająca")
- bar spoon → "łyżka barmańska"
- soda water → "woda gazowana" (NIGDY "woda sodowa")
- fresh mint → "świeża mięta"
- simple syrup → "syrop cukrowy"
- egg white → "białko jaja"
- Dla koktajli podawanych straight up: ice = "brak"

ZASADY DLA STIRRED DRINKS:
Wszystkie koktajle mieszane (Negroni, Manhattan, Martini, Old Fashioned, Boulevardier):
- ZAWSZE używaj szklanicy barmańskiej do przygotowania
- NIGDY nie buduj bezpośrednio w szklance
- Instrukcje: napełnij szklanicę → dodaj składniki → mieszaj → przecedź

FORMATOWANIE SKŁADNIKÓW:
- Płyny: dokładne miary w ml
- Lód: NIGDY w składnikach, tylko w instrukcjach
- Zioła: "10-12 listków", "gałązka"
- Bittersy: "dash" lub "krople"

DŁUGOŚĆ INSTRUKCJI:
- Proste drinki (Mojito, Gin & Tonic): 4-5 kroków
- Drinki mieszane (Negroni, Manhattan): 6-7 kroków
- Złożone drinki (Ramos Gin Fizz): 7-10 kroków

FORMAT WYJŚCIOWY (DOKŁADNY):
{
  "name": "[Nazwa koktajlu w języku żądania]",
  "nameEn": "[Nazwa angielska]",
  "category": "classic/modern/tiki/sour",
  "history": "[2-3 zdania z PRAWDZIWYMI datami, miejscami i twórcami]",
  "ingredients": [
    {"name": "[składnik]", "amount": "[liczba]", "unit": "[ml/dash/listków/etc]"}
  ],
  "glassType": "[typ szkła - KRÓTKA nazwa]",
  "method": "shaken/stirred/built/blended",
  "instructions": [
    "[Profesjonalny krok 1]",
    "[Profesjonalny krok 2]",
    "[Profesjonalny krok 3]",
    "[Profesjonalny krok 4]",
    "[Profesjonalny krok 5]"
  ],
  "garnish": "[Profesjonalna dekoracja]",
  "ice": "[Typ: kostki/kruszony/duża kostka/brak]",
  "servingTemp": "5",
  "abv": 25,
  "prepTime": 5,
  "difficulty": "easy/medium/hard",
  "flavor": "[Profil smakowy]",
  "occasion": "[Kiedy serwować]",
  "proTip": "[Profesjonalna porada barmana]",
  "tags": ["tag1", "tag2"]
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
      userPrompt = `Jako ekspert barmański, stwórz DOKŁADNY przepis na koktajl "${finalCocktailName}" według standardów IBA lub uznanych książek barmanskich.
      
KRYTYCZNE WYMAGANIA:
- name: DOKŁADNIE "${finalCocktailName}" (zachowaj oryginalną pisownię)
- Jeśli to klasyczny koktajl, użyj OFICJALNEJ receptury IBA
- Wszystkie teksty po polsku (oprócz method i nazw własnych alkoholi)
- method: ZAWSZE po angielsku (shaken/stirred/built/blended)
- NIGDY nie dodawaj lodu do składników
- Dla stirred drinks: ZAWSZE używaj "szklanicy barmańskiej"
- Instrukcje szczegółowe z technikami i czasami
- servingTemp: tylko liczba
- abv: tylko liczba
- Prawdziwa historia z faktami

PRZYKŁADY PRAWIDŁOWYCH RECEPTUR:
- Old Fashioned: bourbon 60ml (NIE 50ml!), syrop demerara 10ml, Angostura 2 dash, Orange bitters 1 dash
- Negroni: gin 30ml, Campari 30ml, słodki wermut 30ml (ZAWSZE 1:1:1)
- Margarita: tequila 50ml, Cointreau 30ml, sok z limonki 20ml

${ingredients.length > 0 ? `Użyj tych składników jeśli pasują: ${ingredients.join(', ')}` : ''}`;
    } else {
      userPrompt = `As an expert bartender, create the EXACT recipe for "${finalCocktailName}" cocktail according to IBA standards or recognized bartending books.
      
CRITICAL REQUIREMENTS:
- name: EXACTLY "${finalCocktailName}" (keep original spelling)
- If it's a classic cocktail, use OFFICIAL IBA recipe
- All text in English
- method: in English (shaken/stirred/built/blended)
- NEVER include ice in ingredients list
- For stirred drinks: ALWAYS use mixing glass
- Detailed instructions with techniques and timing
- servingTemp: number only
- abv: number only
- Real history with facts

EXAMPLES OF CORRECT RECIPES:
- Old Fashioned: bourbon 60ml (NOT 50ml!), demerara syrup 10ml, Angostura 2 dash, Orange bitters 1 dash
- Negroni: gin 30ml, Campari 30ml, sweet vermouth 30ml (ALWAYS 1:1:1)
- Margarita: tequila 50ml, Cointreau 30ml, lime juice 20ml

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
      temperature: 0.2, // Niższa temperatura dla bardziej konsystentnych wyników
      max_tokens: 1500
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('🤖 AI Response received:', aiResponse);
    
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
      
      // Ensure proper formatting and remove ice from ingredients
      if (recipe.ingredients) {
        recipe.ingredients = recipe.ingredients
          .filter(ing => !ing.name.toLowerCase().includes('lód') && !ing.name.toLowerCase().includes('ice'))
          .map(ing => ({
            name: ing.name,
            amount: String(ing.amount),
            unit: ing.unit || ''
          }));
      }
      
      // Validate classic cocktail proportions
      const cocktailNameLower = finalCocktailName.toLowerCase();
      if (cocktailNameLower.includes('old fashioned') && recipe.ingredients[0]?.amount === "50") {
        recipe.ingredients[0].amount = "60"; // Fix bourbon amount
      }
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw AI response:', aiResponse);
      
      // Return error instead of fallback
      return res.status(500).json({ 
        error: 'Failed to parse recipe',
        details: 'AI response was not valid JSON',
        rawResponse: aiResponse
      });
    }

    // Format final response
    const response = {
      ...recipe,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    console.log('✅ Sending recipe for:', response.name);
    console.log('📊 Recipe details:', {
      name: response.name,
      method: response.method,
      ingredients: response.ingredients,
      abv: response.abv
    });
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipe',
      details: error.message 
    });
  }
};