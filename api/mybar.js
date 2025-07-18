const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  try {
    const { ingredients, language = 'pl' } = req.body;
    console.log('MyBar received ingredients:', ingredients);
    
    const systemPrompt = language === 'pl'
      ? "Jesteś ekspertem barmanem. Analizujesz składniki i sugerujesz koktajle. Zwracaj TYLKO czysty JSON bez markdown, bez komentarzy."
      : "You are an expert bartender. Analyze ingredients and suggest cocktails. Return ONLY pure JSON without markdown or comments.";
    
    const userPrompt = language === 'pl'
      ? `Mam te składniki: ${ingredients}

Zwróć DOKŁADNIE w tym formacie JSON:
{
  "cocktails": [
    {
      "name": "nazwa koktajlu",
      "available": true,
      "description": "krótki opis",
      "difficulty": "easy",
      "ingredients": [
        {"name": "składnik", "amount": "50", "unit": "ml"}
      ],
      "instructions": ["krok 1", "krok 2"],
      "glassType": "typ szkła"
    }
  ],
  "shoppingList": [
    {
      "ingredient": "brakujący składnik",
      "unlocksCount": 3,
      "priority": "high"
    }
  ]
}`
      : `I have these ingredients: ${ingredients}

Return EXACTLY in this JSON format:
{
  "cocktails": [
    {
      "name": "cocktail name",
      "available": true,
      "description": "short description",
      "difficulty": "easy",
      "ingredients": [
        {"name": "ingredient", "amount": "50", "unit": "ml"}
      ],
      "instructions": ["step 1", "step 2"],
      "glassType": "glass type"
    }
  ],
  "shoppingList": [
    {
      "ingredient": "missing ingredient",
      "unlocksCount": 3,
      "priority": "high"
    }
  ]
}`;

    console.log('Sending to OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponse = response.choices[0].message.content;
    console.log('Raw MyBar AI Response:', aiResponse);
    
    // Agresywne czyszczenie odpowiedzi
    let cleanedResponse = aiResponse;
    
    // Usuń wszystkie markdown
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/^\s*json\s*/i, '');
    
    // Znajdź pierwszy { i ostatni }
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    cleanedResponse = cleanedResponse.trim();
    console.log('Cleaned response (first 200 chars):', cleanedResponse.substring(0, 200));
    
    let suggestions;
    try {
      suggestions = JSON.parse(cleanedResponse);
      console.log('Successfully parsed MyBar JSON');
      
      // Walidacja struktury
      if (!suggestions.cocktails || !Array.isArray(suggestions.cocktails)) {
        throw new Error('Invalid structure - missing cocktails array');
      }
    } catch (e) {
      console.error('MyBar parse error:', e);
      console.error('Failed to parse:', cleanedResponse.substring(0, 500));
      
      // Inteligentny fallback bazujący na składnikach
      const ingredientsList = ingredients.toLowerCase();
      let fallbackCocktail = {
        name: "Whisky Sour",
        description: "Klasyczny koktajl z whisky i cytryną",
        difficulty: "easy",
        ingredients: [
          { name: "Whisky", amount: "50", unit: "ml" },
          { name: "Sok z cytryny", amount: "25", unit: "ml" },
          { name: "Syrop cukrowy", amount: "15", unit: "ml" }
        ],
        instructions: [
          "Wstrząśnij wszystkie składniki z lodem",
          "Przecedź do szklanki old-fashioned z lodem",
          "Udekoruj plasterkiem cytryny"
        ],
        glassType: "old-fashioned"
      };
      
      // Dostosuj do składników
      if (ingredientsList.includes('gin') || ingredientsList.includes('wermut')) {
        fallbackCocktail = {
          name: "Martini",
          description: "Elegancki koktajl z ginu i wermutu",
          difficulty: "medium",
          ingredients: [
            { name: "Gin", amount: "60", unit: "ml" },
            { name: "Wermut", amount: "10", unit: "ml" }
          ],
          instructions: [
            "Wymieszaj składniki z lodem",
            "Przecedź do schłodzonego kieliszka",
            "Udekoruj oliwką lub skórką cytryny"
          ],
          glassType: "martini"
        };
      }
      
      suggestions = {
        cocktails: [{
          ...fallbackCocktail,
          available: true
        }],
        shoppingList: [{
          ingredient: ingredientsList.includes('whisky') ? "Angostura bitters" : "Oliwki",
          unlocksCount: 2,
          priority: "medium"
        }]
      };
    }

    const result = {
      data: suggestions
    };

    res.json(result);
  } catch (error) {
    console.error('MyBar error:', error);
    res.status(500).json({ error: error.message });
  }
};
