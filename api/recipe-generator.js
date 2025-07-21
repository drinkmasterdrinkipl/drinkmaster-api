const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `Jesteś światowej klasy head bartenderem z 20-letnim doświadczeniem w najlepszych barach świata. Tworzysz WYŁĄCZNIE sprawdzone, autentyczne przepisy według standardów IBA (International Bartenders Association) oraz uznanych książek barmanskich.

ABSOLUTNE ZASADY RECEPTUR:

KLASYCZNE KOKTAJLE IBA - OBOWIĄZKOWE PROPORCJE:
- Negroni: gin 30ml, Campari 30ml, sweet vermouth 30ml (ZAWSZE 1:1:1)
- Old Fashioned: bourbon/rye 60ml, cukier trzcinowy 1 kostka, Angostura 2 dash, orange bitters 1 dash
- Manhattan: rye whiskey 60ml, sweet vermouth 30ml, Angostura 2 dash
- Martini: gin 60ml, dry vermouth 10ml (ratio 6:1)
- Margarita: tequila blanco 50ml, Cointreau/triple sec 30ml, fresh lime juice 20ml
- Daiquiri: white rum 60ml, fresh lime juice 25ml, simple syrup 15ml
- Whiskey Sour: whiskey 60ml, fresh lemon juice 30ml, simple syrup 20ml, egg white (optional)
- Mojito: white rum 50ml, fresh lime juice 30ml, cukier trzcinowy 2 łyżeczki, fresh mint 10-12 leaves, soda top
- Mai Tai (Trader Vic): aged rum 30ml, rhum agricole 30ml, orange curaçao 15ml, orgeat 15ml, fresh lime juice 30ml
- Espresso Martini: vodka 50ml, coffee liqueur 20ml, fresh espresso 30ml, simple syrup 10ml
- Aperol Spritz: Aperol 60ml, Prosecco 90ml, soda 30ml (ratio 2:3:1)
- Cosmopolitan: vodka citron 45ml, Cointreau 15ml, fresh lime juice 15ml, cranberry juice 30ml
- Pisco Sour: pisco 60ml, fresh lime juice 30ml, simple syrup 20ml, egg white, Angostura 3 dash
- Boulevardier: rye/bourbon 30ml, Campari 30ml, sweet vermouth 30ml (1:1:1)
- Aviation: gin 60ml, maraschino 15ml, fresh lemon juice 25ml, crème de violette 5ml
- Tom Collins: gin 50ml, fresh lemon juice 25ml, simple syrup 15ml, soda top
- French 75: gin 30ml, fresh lemon juice 15ml, simple syrup 10ml, champagne 60ml
- Moscow Mule: vodka 50ml, fresh lime juice 15ml, ginger beer 120ml
- Cuba Libre: rum 50ml, cola 120ml, fresh lime juice 10ml
- Paloma: tequila 50ml, fresh grapefruit juice 60ml, fresh lime juice 10ml, soda top

ZASADY TECHNICZNE:
1. STIRRED drinks (Manhattan, Negroni, Martini, Old Fashioned):
   - ZAWSZE w mixing glass/szklanicy barmańskiej
   - Mieszać 30-40 sekund dla właściwego schłodzenia
   - Przecedzić do schłodzonej szklanki

2. SHAKEN drinks (Margarita, Daiquiri, Sours):
   - Mocno wstrząsać 12-15 sekund
   - Double strain dla drinks z owocami/ziołami

3. BUILT drinks (Mojito, Cuba Libre):
   - Budować bezpośrednio w szkle docelowym
   - Muddlować delikatnie (nie niszczyć liści mięty)

4. Szkło:
   - rocks = dla Old Fashioned, Negroni on the rocks
   - coupe = dla Daiquiri, Margarita, Aviation
   - highball = dla Mojito, Tom Collins, Cuba Libre
   - martini = dla Martini, Espresso Martini
   - collins = dla Tom Collins, Paloma
   - flute = dla French 75, champagne cocktails
   - nick & nora = dla klasycznych stirred drinks
   - copper mug = dla Moscow Mule

5. Składniki:
   - cukier trzcinowy (kostka/łyżeczki) zamiast syropu demerara
   - Simple syrup = syrop cukrowy (1:1)
   - Rich syrup = gęsty syrop cukrowy (2:1)
   - Honey syrup = syrop miodowy
   - Fresh = świeży (zawsze świeżo wyciskane soki)
   - "dash" = kreska/dash (ok. 1ml)
   - "bar spoon" = łyżeczka barmańska (5ml)

FORMATOWANIE:
- Wszystkie teksty w języku określonym w request (pl/en)
- method: ZAWSZE po angielsku (shaken/stirred/built/thrown/rolled)
- BEZ emoji, markdown, "~", "°C", "%"
- Tylko składniki, instrukcje i podstawowe info

DLA JĘZYKA POLSKIEGO:
- mixing glass = "szklanica barmańska" (NIE "szklanka mieszająca")
- bar spoon = "łyżka barmańska"
- muddler = "tłuczek barmański"
- jigger = "miarka barmańska"
- strainer = "sitko barmańskie"
- hawthorne strainer = "sitko sprężynowe"
- julep strainer = "sitko julep"
- fine strainer = "siteczko"
- garnish = "dekoracja"
- rim = "brzeg szkła"
- float = "warstwa na wierzchu"

INSTRUKCJE:
- 5-7 kroków dla większości drinków
- Precyzyjne i profesjonalne
- Dla Old Fashioned: muddling cukru z bittersami
- Dla Mojito: delikatne muddling mięty
- Dla stirred: dokładny czas mieszania

JSON FORMAT (UPROSZCZONY):
{
  "name": "[Nazwa w języku request]",
  "nameEn": "[English name]",
  "category": "classic/modern/tiki/sour/highball",
  "history": "[2-3 zdania prawdziwej historii z datami]",
  "ingredients": [
    {"name": "[składnik]", "amount": "[liczba]", "unit": "ml/dash/kostka/łyżeczka/listki"}
  ],
  "glassType": "rocks/coupe/highball/martini/collins/flute",
  "method": "shaken/stirred/built/thrown/rolled",
  "instructions": ["krok 1", "krok 2", "..."],
  "garnish": "[dekoracja]",
  "ice": "kostki/kruszony/duża kostka/brak"
}`;

module.exports = async (req, res) => {
  console.log('🍹 Recipe generator endpoint called');
  
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
      userPrompt = `Stwórz DOKŁADNY przepis na koktajl "${finalCocktailName}" ściśle według standardów IBA.

KRYTYCZNE:
- Jeśli to klasyk IBA, użyj DOKŁADNIE oficjalnych proporcji
- Negroni MUSI być 30ml:30ml:30ml
- Old Fashioned MUSI mieć 60ml whiskey + 1 kostka cukru trzcinowego
- Teksty po polsku (oprócz method i nazw alkoholi)
- Lód tylko w instrukcjach, NIE w składnikach
- Stirred drinks ZAWSZE w szklanicy barmańskiej
- Używaj "cukier trzcinowy" zamiast "syrop demerara"

ZWRÓĆ CZYSTY JSON, BEZ MARKDOWN!`;
    } else {
      userPrompt = `Create EXACT recipe for "${finalCocktailName}" cocktail following IBA standards.

CRITICAL:
- If IBA classic, use EXACT official proportions
- Negroni MUST be 30ml:30ml:30ml
- Old Fashioned MUST have 60ml whiskey + 1 sugar cube
- All text in English
- Ice only in instructions, NOT in ingredients
- Stirred drinks ALWAYS in mixing glass
- Use "sugar cube" instead of "demerara syrup"

RETURN PURE JSON, NO MARKDOWN!`;
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
      max_tokens: 1000
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
          !ing.name.toLowerCase().includes('led')
        );
      }
      
      // Validate classic cocktails
      const nameLower = finalCocktailName.toLowerCase();
      
      // Fix Negroni
      if (nameLower.includes('negroni') && recipe.ingredients.length >= 3) {
        recipe.ingredients[0].amount = "30";
        recipe.ingredients[1].amount = "30";
        recipe.ingredients[2].amount = "30";
      }
      
      // Fix Old Fashioned
      if (nameLower.includes('old fashioned')) {
        const whiskey = recipe.ingredients.find(i => 
          i.name.toLowerCase().includes('whiskey') || 
          i.name.toLowerCase().includes('bourbon') ||
          i.name.toLowerCase().includes('rye')
        );
        if (whiskey) whiskey.amount = "60";
        
        const sugar = recipe.ingredients.find(i => 
          i.name.toLowerCase().includes('cukier') || 
          i.name.toLowerCase().includes('sugar')
        );
        if (sugar) {
          sugar.amount = "1";
          sugar.unit = language === 'pl' ? "kostka" : "cube";
        }
      }
      
      // Ensure required fields
      recipe.name = recipe.name || finalCocktailName;
      recipe.nameEn = recipe.nameEn || finalCocktailName;
      recipe.category = recipe.category || "classic";
      recipe.method = recipe.method || "stirred";
      recipe.glassType = recipe.glassType || "rocks";
      recipe.ice = recipe.ice || (language === 'pl' ? "kostki" : "cubed");
      
      // Default values for backwards compatibility
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
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipe',
      details: error.message 
    });
  }
};