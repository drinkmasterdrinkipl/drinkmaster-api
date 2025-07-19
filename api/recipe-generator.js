const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `You are an IBA-certified master bartender creating only authentic, classic cocktail recipes.

LANGUAGE: Respond in the requested language (pl/en).

CRITICAL RULES:
1. Use ONLY official IBA recipes or well-documented classic recipes
2. EXACT measurements - no approximations
3. Correct glassware for each cocktail
4. Professional techniques (shake, stir, build, throw, blend)
5. Return ONLY valid JSON

POLISH TRANSLATIONS (EXACT):
- piece/pieces = sztuka/sztuki/sztuk (1 sztuka, 2-4 sztuki, 5+ sztuk)
- dash/dashes = kropla/krople/kropli (1 kropla, 2-4 krople, 5+ kropli)
- bar spoon = łyżka barmańska
- leaves = listki
- slice = plasterek
- wedge = ćwiartka
- twist = skórka (spiralna)
- wheel = krążek
- muddled = rozgniecione
- crushed ice = lód kruszony (NOT "kruszon")
- cubes = kostki lodu
- large cube = duża kostka
- cracked ice = lód krakowany

GLASSWARE POLISH:
- coupe = kieliszek coupe
- martini = kieliszek martini
- old-fashioned/rocks = szklanka old-fashioned
- highball = szklanka highball
- collins = szklanka collins
- hurricane = szklanka hurricane
- nick & nora = kieliszek nick & nora
- flute = kieliszek flute

OUTPUT FORMAT:
{
  "name": "[Official cocktail name]",
  "category": "classic|modern|tiki|shot",
  "difficulty": "easy|medium|hard",
  "prepTime": [realistic minutes],
  "history": "[Accurate historical information]",
  "ingredients": [
    {"name": "[exact ingredient]", "amount": "[exact]", "unit": "[ml|sztuki|krople|etc]"}
  ],
  "glassType": "[correct glass]",
  "method": "shaken|stirred|built|thrown|blended",
  "instructions": [
    "[Professional step with details]"
  ],
  "garnish": "[Traditional garnish]",
  "tips": "[Professional bartender tip]",
  "funFact": "[True historical fact]",
  "alcoholContent": "low|medium|high",
  "tags": ["relevant", "tags"]
}`;

module.exports = async (req, res) => {
  try {
    const { alcoholName, language = 'pl' } = req.body;
    console.log(`Recipe request - Cocktail: ${alcoholName}, Language: ${language}`);
    
    const userPrompt = language === 'pl'
      ? `Stwórz KLASYCZNY przepis na koktajl "${alcoholName}".

WYMAGANIA PROFESJONALNEGO BARMANA:
1. Użyj TYLKO oryginalnej, klasycznej receptury (IBA jeśli istnieje)
2. Dokładne proporcje w ml
3. Lód kruszony = "lód kruszony" (NIE "kruszon")
4. Profesjonalne instrukcje krok po kroku
5. Prawidłowa nazwa szkła po polsku

Zwróć kompletny przepis w JSON.`
      : `Create CLASSIC recipe for "${alcoholName}" cocktail.

PROFESSIONAL BARTENDER REQUIREMENTS:
1. Use ONLY original, classic recipe (IBA if exists)
2. Exact proportions in ml
3. Professional step-by-step instructions
4. Correct glassware

Return complete recipe in JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: RECIPE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3, // Niska dla dokładności
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
      
      // Validate and fix data
      if (cocktailData.ingredients) {
        cocktailData.ingredients.forEach(ing => {
          // Fix ice
          if (ing.name.toLowerCase().includes('lód') || ing.name.toLowerCase().includes('ice')) {
            if (ing.unit === 'ml' || ing.unit === 'kruszon') {
              if (ing.name.toLowerCase().includes('krusz') || ing.name.toLowerCase().includes('crush')) {
                ing.name = language === 'pl' ? 'Lód kruszony' : 'Crushed ice';
                ing.unit = '';
                ing.amount = language === 'pl' ? 'do pełna' : 'fill with';
              } else {
                ing.name = language === 'pl' ? 'Lód' : 'Ice';
                ing.unit = language === 'pl' ? 'kostki' : 'cubes';
                if (parseInt(ing.amount) > 100) {
                  ing.amount = language === 'pl' ? 'do pełna' : 'fill with';
                }
              }
            }
          }
          
          // Fix Polish units
          if (language === 'pl' && ing.unit) {
            const amount = parseInt(ing.amount) || 1;
            
            if (ing.unit === 'piece' || ing.unit === 'pieces' || ing.unit === 'sztuka') {
              ing.unit = amount === 1 ? 'sztuka' : amount < 5 ? 'sztuki' : 'sztuk';
            } else if (ing.unit === 'dash' || ing.unit === 'dashes' || ing.unit === 'kropla') {
              ing.unit = amount === 1 ? 'kropla' : amount < 5 ? 'krople' : 'kropli';
            } else if (ing.unit === 'leaf' || ing.unit === 'leaves') {
              ing.unit = 'listki';
            }
          }
        });
      }
      
      // Ensure prepTime is number
      if (typeof cocktailData.prepTime === 'string') {
        cocktailData.prepTime = parseInt(cocktailData.prepTime) || 5;
      }
      
    } catch (e) {
      console.error('Recipe parse error:', e);
      
      // Professional fallback for common cocktails
      const cocktailLower = alcoholName.toLowerCase();
      
      if (cocktailLower.includes('mojito')) {
        cocktailData = {
          name: "Mojito",
          category: "classic",
          difficulty: "medium",
          prepTime: 5,
          history: language === 'pl' 
            ? "Mojito pochodzi z Kuby, gdzie powstało w XVI wieku. Pierwotnie było napojem leczniczym dla marynarzy."
            : "Mojito originates from Cuba, created in the 16th century. Originally a medicinal drink for sailors.",
          ingredients: [
            { name: language === 'pl' ? "Biały rum" : "White rum", amount: "45", unit: "ml" },
            { name: language === 'pl' ? "Sok z limonki" : "Lime juice", amount: "20", unit: "ml" },
            { name: language === 'pl' ? "Cukier biały" : "White sugar", amount: "2", unit: language === 'pl' ? "łyżeczki" : "tsp" },
            { name: language === 'pl' ? "Świeża mięta" : "Fresh mint", amount: "6", unit: language === 'pl' ? "listki" : "leaves" },
            { name: language === 'pl' ? "Woda sodowa" : "Soda water", amount: "do pełna", unit: "" },
            { name: language === 'pl' ? "Lód kruszony" : "Crushed ice", amount: "do pełna", unit: "" }
          ],
          glassType: language === 'pl' ? "szklanka highball" : "highball glass",
          method: "built",
          instructions: language === 'pl'
            ? [
                "Umieść liście mięty i cukier w szklance highball",
                "Delikatnie rozgnieć muddlerem, nie rozdrabniaj liści",
                "Dodaj sok z limonki i wymieszaj",
                "Napełnij szklankę lodem kruszonym",
                "Wlej rum i wymieszaj łyżką barmańską",
                "Dopełnij wodą sodową",
                "Dekoruj gałązką mięty i ćwiartką limonki"
              ]
            : [
                "Place mint leaves and sugar in highball glass",
                "Gently muddle, don't shred the leaves",
                "Add lime juice and stir",
                "Fill glass with crushed ice",
                "Pour rum and stir with bar spoon",
                "Top with soda water",
                "Garnish with mint sprig and lime wedge"
              ],
          garnish: language === 'pl' ? "Gałązka mięty i ćwiartka limonki" : "Mint sprig and lime wedge",
          tips: language === 'pl' 
            ? "Nie rozdrabniaj mięty zbyt mocno - uwolnisz goryczne olejki"
            : "Don't over-muddle mint - it releases bitter oils",
          funFact: language === 'pl'
            ? "Ernest Hemingway regularnie pił Mojito w La Bodeguita del Medio w Hawanie"
            : "Ernest Hemingway regularly drank Mojitos at La Bodeguita del Medio in Havana",
          alcoholContent: "medium",
          tags: language === 'pl' ? ["klasyczny", "kubański", "orzeźwiający"] : ["classic", "cuban", "refreshing"]
        };
      } else {
        // Generic professional fallback
        cocktailData = {
          name: alcoholName,
          category: "classic",
          difficulty: "medium",
          prepTime: 5,
          history: language === 'pl' 
            ? `${alcoholName} to uznany koktajl w świecie barmańskim.`
            : `${alcoholName} is a recognized cocktail in the bartending world.`,
          ingredients: [
            { name: language === 'pl' ? "Baza alkoholowa" : "Spirit base", amount: "50", unit: "ml" },
            { name: language === 'pl' ? "Lód" : "Ice", amount: language === 'pl' ? "do pełna" : "fill with", unit: language === 'pl' ? "kostki" : "cubes" }
          ],
          glassType: language === 'pl' ? "odpowiedni kieliszek" : "appropriate glass",
          method: "stirred",
          instructions: language === 'pl'
            ? ["Napełnij mixing glass lodem", "Dodaj składniki", "Mieszaj 30 sekund", "Przecedź do schłodzonego kieliszka"]
            : ["Fill mixing glass with ice", "Add ingredients", "Stir for 30 seconds", "Strain into chilled glass"],
          garnish: language === 'pl' ? "Klasyczna dekoracja" : "Classic garnish",
          tips: language === 'pl' ? "Używaj wysokiej jakości składników" : "Use high quality ingredients",
          funFact: language === 'pl' ? "Każdy klasyczny koktajl ma swoją historię" : "Every classic cocktail has its story",
          alcoholContent: "medium",
          tags: language === 'pl' ? ["klasyczny"] : ["classic"]
        };
      }
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