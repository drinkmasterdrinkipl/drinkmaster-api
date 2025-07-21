const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `Jesteś światowej klasy head bartenderem z 20-letnim doświadczeniem. Tworzysz TYLKO sprawdzone, kompletne przepisy według standardów IBA.

ABSOLUTNE ZASADY:

1. NIGDY nie pomijaj kluczowych składników (szczególnie soków cytrusowych!)
2. ZAWSZE podawaj WSZYSTKIE składniki potrzebne do koktajlu
3. Instrukcje muszą być KOMPLETNE - nie urywaj zdań

KLASYCZNE RECEPTURY IBA (DOKŁADNE PROPORCJE):
- Negroni: gin 30ml, Campari 30ml, sweet vermouth 30ml (1:1:1)
- Old Fashioned: bourbon/rye 60ml, cukier trzcinowy 1 kostka, Angostura 2 dash, Orange bitters 1 dash
- Manhattan: rye whiskey 60ml, sweet vermouth 30ml, Angostura 2 dash
- Martini: gin 60ml, dry vermouth 10ml
- Margarita: tequila 50ml, Cointreau 30ml, fresh lime juice 20ml
- Daiquiri: white rum 60ml, fresh lime juice 25ml, simple syrup 15ml
- Whiskey Sour: whiskey 60ml, fresh lemon juice 30ml, simple syrup 20ml, egg white (optional)
- Vodka Sour: vodka 60ml, fresh lemon juice 30ml, simple syrup 15ml, egg white (optional)
- Mojito: white rum 50ml, fresh lime juice 30ml, cukier trzcinowy 2 łyżeczki, fresh mint 10-12 leaves, soda top
- Moscow Mule: vodka 50ml, fresh lime juice 15ml, ginger beer 120ml
- Porn Star Martini: vodka 50ml, passion fruit puree 30ml, vanilla syrup 15ml, fresh lime juice 15ml, Prosecco 60ml (shot on side)
- Espresso Martini: vodka 50ml, coffee liqueur 20ml, fresh espresso 30ml, simple syrup 10ml
- Aperol Spritz: Aperol 60ml, Prosecco 90ml, soda 30ml (2:3:1)
- Cosmopolitan: vodka citron 45ml, Cointreau 15ml, fresh lime juice 15ml, cranberry juice 30ml
- Mai Tai: aged rum 30ml, rhum agricole 30ml, orange curaçao 15ml, orgeat 15ml, fresh lime juice 30ml
- Pisco Sour: pisco 60ml, fresh lime juice 30ml, simple syrup 20ml, egg white, Angostura 3 dash
- Bee's Knees: gin 60ml, fresh lemon juice 25ml, honey syrup 20ml
- Aviation: gin 60ml, maraschino 15ml, fresh lemon juice 25ml, crème de violette 5ml
- Tom Collins: gin 50ml, fresh lemon juice 25ml, simple syrup 15ml, soda top
- Cuba Libre: rum 50ml, cola 120ml, fresh lime juice 10ml
- Paloma: tequila 50ml, fresh grapefruit juice 60ml, fresh lime juice 10ml, soda top

TŁUMACZENIA OBOWIĄZKOWE (język polski):
- mixing glass = "szklanica barmańska"
- bar spoon = "łyżka barmańska"
- muddler = "tłuczek barmański"
- jigger = "miarka barmańska"
- strainer = "sitko barmańskie"
- hawthorne strainer = "sitko sprężynowe"
- wine glass = "kieliszek do wina"
- copper mug = "kubek miedziany"
- shot glass = "kieliszek shot"
- rocks glass = "szklanka rocks"
- highball glass = "szklanka highball"
- coupe glass = "kieliszek coupe"
- martini glass = "kieliszek martini"
- collins glass = "szklanka collins"
- flute glass = "kieliszek flute"
- fresh lime juice = "świeżo wyciśnięty sok z limonki"
- fresh lemon juice = "świeżo wyciśnięty sok z cytryny"
- fresh grapefruit juice = "świeżo wyciśnięty sok z grejpfruta"
- simple syrup = "syrop cukrowy"
- honey syrup = "syrop miodowy"
- egg white = "białko jaja"
- soda water = "woda gazowana"
- ginger beer = "piwo imbirowe"
- garnish = "dekoracja"
- dash = "dash"
- sugar cube = "kostka cukru"
- brown sugar = "cukier trzcinowy"

ZASADY INSTRUKCJI:
1. Minimum 4-7 kroków dla każdego koktajlu
2. PEŁNE zdania, bez urywania
3. Dokładne opisy każdej czynności
4. Dla stirred: zawsze w szklanicy barmańskiej
5. Dla shaken: zawsze mocno wstrząsać 12-15 sekund
6. Dla built: budować w docelowym szkle

FORMATOWANIE:
- method: ZAWSZE po angielsku (shaken/stirred/built/thrown/rolled)
- Wszystkie inne teksty w języku określonym w request
- BEZ emoji, markdown, znaków specjalnych
- Tylko czyste dane

JSON FORMAT:
{
  "name": "[nazwa w języku request]",
  "nameEn": "[nazwa angielska]",
  "category": "classic/modern/tiki/sour/highball",
  "history": "[2-3 zdania prawdziwej historii]",
  "ingredients": [
    {"name": "[składnik]", "amount": "[liczba]", "unit": "ml/dash/kostka/łyżeczka/listki/sztuka"}
  ],
  "glassType": "[typ szkła W JĘZYKU REQUEST]",
  "method": "shaken/stirred/built/thrown/rolled",
  "instructions": [
    "[KOMPLETNE zdanie - krok 1]",
    "[KOMPLETNE zdanie - krok 2]",
    "[KOMPLETNE zdanie - krok 3]",
    "[KOMPLETNE zdanie - krok 4]",
    "[KOMPLETNE zdanie - krok 5]"
  ],
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
      userPrompt = `Stwórz KOMPLETNY przepis na koktajl "${finalCocktailName}" według standardów IBA.

ABSOLUTNIE KRYTYCZNE:
- WSZYSTKIE składniki (nie pomijaj soków!)
- Moscow Mule MUSI mieć sok z limonki
- Porn Star Martini MUSI mieć sok z limonki
- Sour cocktails MUSZĄ mieć sok cytrynowy
- Szkła po POLSKU (kieliszek do wina, NIE wine glass)
- PEŁNE instrukcje bez urywania
- Używaj polskich nazw dla szkła i składników

ZWRÓĆ CZYSTY JSON BEZ MARKDOWN!`;
    } else {
      userPrompt = `Create COMPLETE recipe for "${finalCocktailName}" cocktail following IBA standards.

ABSOLUTELY CRITICAL:
- ALL ingredients (don't skip juices!)
- Moscow Mule MUST have lime juice
- Porn Star Martini MUST have lime juice  
- Sour cocktails MUST have lemon juice
- COMPLETE instructions without cutting off
- Use proper measurements

RETURN PURE JSON WITHOUT MARKDOWN!`;
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
      
      // Remove ice from ingredients
      if (recipe.ingredients) {
        recipe.ingredients = recipe.ingredients.filter(ing => 
          !ing.name.toLowerCase().includes('lód') && 
          !ing.name.toLowerCase().includes('ice') &&
          !ing.name.toLowerCase().includes('led')
        );
      }
      
      // FIX MISSING INGREDIENTS
      const nameLower = finalCocktailName.toLowerCase();
      
      // Fix Moscow Mule
      if (nameLower.includes('moscow mule')) {
        const hasLime = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lime') || 
          i.name.toLowerCase().includes('limonk')
        );
        
        if (!hasLime) {
          recipe.ingredients.splice(1, 0, {
            name: language === 'pl' ? "świeżo wyciśnięty sok z limonki" : "fresh lime juice",
            amount: "15",
            unit: "ml"
          });
        }
      }
      
      // Fix Vodka Sour
      if (nameLower.includes('vodka sour')) {
        const hasLemon = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lemon') || 
          i.name.toLowerCase().includes('cytry')
        );
        
        if (!hasLemon) {
          recipe.ingredients.splice(1, 0, {
            name: language === 'pl' ? "świeżo wyciśnięty sok z cytryny" : "fresh lemon juice",
            amount: "30",
            unit: "ml"
          });
        }
      }
      
      // Fix Whiskey Sour
      if (nameLower.includes('whiskey sour')) {
        const hasLemon = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lemon') || 
          i.name.toLowerCase().includes('cytry')
        );
        
        if (!hasLemon) {
          recipe.ingredients.splice(1, 0, {
            name: language === 'pl' ? "świeżo wyciśnięty sok z cytryny" : "fresh lemon juice",
            amount: "30",
            unit: "ml"
          });
        }
      }
      
      // Fix Porn Star Martini
      if (nameLower.includes('porn star') || nameLower.includes('pornstar')) {
        const hasLime = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lime') || 
          i.name.toLowerCase().includes('limonk')
        );
        
        if (!hasLime) {
          // Find where to insert (after vanilla syrup)
          const vanillaIndex = recipe.ingredients.findIndex(i => 
            i.name.toLowerCase().includes('vanilla') || 
            i.name.toLowerCase().includes('wanili')
          );
          
          recipe.ingredients.splice(vanillaIndex + 1, 0, {
            name: language === 'pl' ? "świeżo wyciśnięty sok z limonki" : "fresh lime juice",
            amount: "15",
            unit: "ml"
          });
        }
      }
      
      // Fix classic cocktails proportions
      if (nameLower.includes('negroni') && recipe.ingredients.length >= 3) {
        recipe.ingredients[0].amount = "30";
        recipe.ingredients[1].amount = "30";
        recipe.ingredients[2].amount = "30";
      }
      
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
          sugar.name = language === 'pl' ? "cukier trzcinowy" : "sugar cube";
        }
      }
      
      // Fix glass translations for Polish
      if (language === 'pl' && recipe.glassType) {
        const glassTranslations = {
          'wine glass': 'kieliszek do wina',
          'wine': 'kieliszek do wina',
          'copper mug': 'kubek miedziany',
          'copper': 'kubek miedziany',
          'shot glass': 'kieliszek shot',
          'shot': 'kieliszek shot',
          'rocks glass': 'szklanka rocks',
          'rocks': 'szklanka rocks',
          'highball glass': 'szklanka highball',
          'highball': 'szklanka highball',
          'coupe glass': 'kieliszek coupe',
          'coupe': 'kieliszek coupe',
          'martini glass': 'kieliszek martini',
          'martini': 'kieliszek martini',
          'collins glass': 'szklanka collins',
          'collins': 'szklanka collins',
          'flute glass': 'kieliszek flute',
          'flute': 'kieliszek flute',
          'champagne flute': 'kieliszek do szampana',
          'old fashioned glass': 'szklanka old fashioned',
          'old fashioned': 'szklanka old fashioned',
          'hurricane glass': 'szklanka hurricane',
          'hurricane': 'szklanka hurricane',
          'nick and nora': 'kieliszek nick & nora',
          'julep cup': 'kubek julep',
          'tiki mug': 'kubek tiki'
        };
        
        const lowerGlass = recipe.glassType.toLowerCase();
        recipe.glassType = glassTranslations[lowerGlass] || recipe.glassType;
      }
      
      // Ensure required fields
      recipe.name = recipe.name || finalCocktailName;
      recipe.nameEn = recipe.nameEn || finalCocktailName;
      recipe.category = recipe.category || "classic";
      recipe.method = recipe.method || "stirred";
      recipe.ice = recipe.ice || (language === 'pl' ? "kostki" : "cubed");
      
      // Ensure instructions are complete (not cut off)
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
    console.log('📊 Ingredients:', response.ingredients.map(i => `${i.name}: ${i.amount}${i.unit}`));
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipe',
      details: error.message 
    });
  }
};