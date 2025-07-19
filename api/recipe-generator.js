const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `You are an IBA-certified master bartender creating authentic cocktail recipes.

CRITICAL RULES:
1. Use ONLY authentic IBA recipes or classic cocktail standards
2. Return ONLY valid JSON - no markdown, no extra text
3. ALL text in the language specified (pl/en)
4. Use exact measurements and proper ice types
5. Professional bartending terminology

ICE TYPES & USAGE:
- Crushed ice (lód kruszony) - for Mojito, Mint Julep, Bramble
- Ice cubes (kostki lodu) - for most cocktails  
- Large ice cube (duża kostka) - for Old Fashioned, Negroni
- No ice measurement in ml/g - use "do pełna" or descriptive amount

POLISH TRANSLATIONS (EXACT):
- ml = ml
- pieces = sztuki (1 sztuka, 2-4 sztuki, 5+ sztuk)
- dashes = krople (1 kropla, 2-4 krople, 5+ kropli)
- bar spoon = łyżka barmańska
- leaves = listki
- slice = plasterek
- wedge = ćwiartka
- wheel = krążek
- sprig = gałązka
- muddled = rozgniecione
- crushed ice = lód kruszony
- ice cubes = kostki lodu
- fill with = do pełna

GLASSWARE POLISH:
- old-fashioned glass = szklanka old-fashioned
- highball glass = szklanka highball
- coupe glass = kieliszek coupe
- martini glass = kieliszek martini
- collins glass = szklanka collins
- wine glass = kieliszek do wina
- flute = kieliszek flute
- mug = kubek

OUTPUT FORMAT:
{
  "name": "[Cocktail name]",
  "category": "classic|modern|tiki|shot",
  "difficulty": "easy|medium|hard",
  "prepTime": [number],
  "history": "[2-3 sentences about origin]",
  "ingredients": [
    {"name": "[ingredient]", "amount": "[amount]", "unit": "[unit or empty for ice]"}
  ],
  "glassType": "[glass type]",
  "method": "shaken|stirred|built|thrown|blended|layered",
  "instructions": [
    "[Step 1]",
    "[Step 2]"
  ],
  "garnish": "[Garnish description]",
  "tips": "[Pro tip]",
  "funFact": "[Interesting fact]",
  "alcoholContent": "low|medium|high",
  "tags": ["tag1", "tag2", "tag3"]
}`;

module.exports = async (req, res) => {
  try {
    const { alcoholName, language = 'pl' } = req.body;
    console.log(`Recipe request - Cocktail: ${alcoholName}, Language: ${language}`);
    
    const userPrompt = language === 'pl'
      ? `Stwórz autentyczny przepis na koktajl "${alcoholName}". 
      
WYMAGANIA:
- Klasyczna receptura IBA lub uznany standard
- Dokładne proporcje w ml
- Rodzaj lodu odpowiedni do koktajlu (lód kruszony dla Mojito/Julep, kostki dla większości)
- Wszystko po polsku, włącznie z nazwami szklanek
- Profesjonalne kroki przygotowania`
      : `Create authentic recipe for "${alcoholName}" cocktail.

REQUIREMENTS:
- Classic IBA recipe or recognized standard
- Exact proportions in ml
- Appropriate ice type for the cocktail
- Professional preparation steps`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: RECIPE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const aiResponse = response.choices[0].message.content;
    console.log('Raw Recipe AI Response:', aiResponse.substring(0, 200) + '...');
    
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
    
    let cocktailData;
    try {
      cocktailData = JSON.parse(cleanedResponse);
      console.log('Successfully parsed recipe data');
      
      // Fix common issues
      if (cocktailData.ingredients) {
        cocktailData.ingredients.forEach(ing => {
          // Fix ice - never use ml or grams
          if (ing.name.toLowerCase().includes('lód') || ing.name.toLowerCase().includes('ice')) {
            ing.unit = ""; // No unit for ice
            
            // Determine ice amount based on cocktail type
            const cocktailName = alcoholName.toLowerCase();
            if (cocktailName.includes('mojito') || cocktailName.includes('julep')) {
              ing.name = language === 'pl' ? 'Lód kruszony' : 'Crushed ice';
              ing.amount = language === 'pl' ? 'do pełna' : 'fill with';
            } else if (cocktailName.includes('old fashioned') || cocktailName.includes('negroni')) {
              ing.name = language === 'pl' ? 'Duża kostka lodu' : 'Large ice cube';
              ing.amount = "1";
            } else {
              ing.name = language === 'pl' ? 'Kostki lodu' : 'Ice cubes';
              ing.amount = language === 'pl' ? 'do pełna' : 'fill with';
            }
          }
          
          // Fix Polish units
          if (language === 'pl' && ing.unit) {
            const amount = parseInt(ing.amount) || 1;
            
            if (ing.unit.toLowerCase().includes('piece') || ing.unit === 'sztuka') {
              ing.unit = amount === 1 ? 'sztuka' : amount < 5 ? 'sztuki' : 'sztuk';
            } else if (ing.unit.toLowerCase().includes('dash') || ing.unit === 'kropla') {
              ing.unit = amount === 1 ? 'kropla' : amount < 5 ? 'krople' : 'kropli';
            } else if (ing.unit.toLowerCase().includes('leaf') || ing.unit.toLowerCase().includes('leaves')) {
              ing.unit = 'listki';
            } else if (ing.unit === 'tsp' || ing.unit.toLowerCase().includes('teaspoon')) {
              ing.unit = 'łyżeczki';
            }
          }
        });
      }
      
      // Ensure prepTime is number
      cocktailData.prepTime = parseInt(cocktailData.prepTime) || 5;
      
    } catch (e) {
      console.error('Recipe parse error:', e);
      
      // Professional fallback
      cocktailData = {
        name: alcoholName,
        category: "classic",
        difficulty: "medium",
        prepTime: 5,
        history: language === 'pl' 
          ? `${alcoholName} to klasyczny koktajl ceniony przez koneserów na całym świecie.`
          : `${alcoholName} is a classic cocktail appreciated by connoisseurs worldwide.`,
        ingredients: [
          { name: language === 'pl' ? "Baza alkoholowa" : "Spirit base", amount: "60", unit: "ml" },
          { name: language === 'pl' ? "Kostki lodu" : "Ice cubes", amount: language === 'pl' ? "do pełna" : "fill with", unit: "" }
        ],
        glassType: language === 'pl' ? "szklanka old-fashioned" : "old-fashioned glass",
        method: "stirred",
        instructions: language === 'pl'
          ? ["Napełnij szklankę lodem", "Dodaj alkohol", "Mieszaj 30 sekund", "Podaj"]
          : ["Fill glass with ice", "Add spirit", "Stir for 30 seconds", "Serve"],
        garnish: language === 'pl' ? "Według uznania" : "As preferred",
        tips: language === 'pl' ? "Używaj wysokiej jakości składników" : "Use high quality ingredients",
        funFact: language === 'pl' ? "Każdy barman ma swoją interpretację" : "Every bartender has their interpretation",
        alcoholContent: "medium",
        tags: language === 'pl' ? ["klasyczny"] : ["classic"]
      };
    }

    res.json({
      data: {
        cocktails: [cocktailData]
      }
    });
    
  } catch (error) {
    console.error('Recipe error:', error);
    res.status(500).json({ error: error.message });
  }
};