const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Recipe Generator Endpoint
app.post('/api/recipe-generator', async (req, res) => {
  try {
    const { drinkName, language = 'pl' } = req.body; // Dodajemy language z defaultem 'pl'

    if (!drinkName) {
      return res.status(400).json({ error: 'Drink name is required' });
    }

    // POPRAWIONY PROMPT - DYNAMICZNY JĘZYK
    const systemPrompt = language === 'pl' ? 
      `Jesteś profesjonalnym barmanem z 20-letnim doświadczeniem. Znasz historię każdego klasycznego koktajlu, techniki miksologii i tajniki zawodu. Kiedy użytkownik poda nazwę drinka, wygeneruj KOMPLETNY przepis w formacie JSON.

      WSZYSTKIE odpowiedzi muszą być PO POLSKU.

      Format odpowiedzi:
      {
        "name": "Nazwa drinka PO POLSKU",
        "nameEn": "Nazwa po angielsku",
        "history": "2-3 zdania o historii i pochodzeniu koktajlu PO POLSKU",
        "method": "shaken" | "stirred" | "built" | "blended",
        "glass": "typ szkła PO POLSKU (np. szklanka rocks, kieliszek coupe)",
        "ice": "typ lodu PO POLSKU (np. kostki, kruszony)",
        "garnish": "dekoracja PO POLSKU",
        "ingredients": [
          {
            "name": "nazwa składnika PO POLSKU",
            "amount": "50",
            "unit": "ml"
          }
        ],
        "instructions": [
          "Krok 1 PO POLSKU",
          "Krok 2 PO POLSKU"
        ],
        "proTip": "Profesjonalna porada PO POLSKU",
        "difficulty": "easy" | "medium" | "hard",
        "prepTime": liczba (minuty),
        "servingTemp": "5°C",
        "abv": "~25%",
        "tags": ["klasyczny", "orzeźwiający", etc]
      }

      Używaj POLSKICH nazw składników:
      - rum → rum
      - vodka → wódka
      - gin → gin
      - whiskey → whisky
      - lime juice → sok z limonki
      - lemon juice → sok z cytryny
      - simple syrup → syrop cukrowy
      - sugar syrup → syrop cukrowy
      - egg white → białko jaja
      - orange peel → skórka pomarańczowa
      - mint → mięta
      - ice cubes → kostki lodu
      - crushed ice → kruszony lód`
      : 
      `You are a professional bartender with 20 years of experience. You know the history of every classic cocktail, mixology techniques, and trade secrets. When a user provides a drink name, generate a COMPLETE recipe in JSON format.

      Response format:
      {
        "name": "Drink name",
        "nameEn": "English name",
        "history": "2-3 sentences about the cocktail's history and origin",
        "method": "shaken" | "stirred" | "built" | "blended",
        "glass": "glass type (e.g., rocks glass, coupe glass)",
        "ice": "ice type (e.g., cubed, crushed)",
        "garnish": "garnish description",
        "ingredients": [
          {
            "name": "ingredient name",
            "amount": "50",
            "unit": "ml"
          }
        ],
        "instructions": [
          "Step 1",
          "Step 2"
        ],
        "proTip": "Professional tip",
        "difficulty": "easy" | "medium" | "hard",
        "prepTime": number (minutes),
        "servingTemp": "5°C",
        "abv": "~25%",
        "tags": ["classic", "refreshing", etc]
      }

      Please provide ALL text in English.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a professional cocktail recipe for: ${drinkName}` }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const recipe = JSON.parse(completion.choices[0].message.content);
    res.json(recipe);

  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

// Scanner Endpoint
app.post('/api/scanner', async (req, res) => {
  try {
    const { image, language = 'pl' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // POPRAWIONY PROMPT DLA SKANERA
    const systemPrompt = language === 'pl' ?
      `Jesteś ekspertem od alkoholi. Przeanalizuj etykietę i podaj informacje PO POLSKU w formacie JSON:
      {
        "name": "nazwa produktu",
        "brand": "marka",
        "type": "typ (np. wódka, whisky, rum, gin, likier)",
        "country": "kraj pochodzenia",
        "region": "region (opcjonalnie)",
        "abv": "moc (%)",
        "volume": "pojemność",
        "description": "opis smaku i charakteru PO POLSKU",
        "servingSuggestions": "jak serwować PO POLSKU",
        "cocktailSuggestions": ["lista 3 koktajli"],
        "priceRange": "przedział cenowy (niska/średnia/wysoka/premium)",
        "flavorProfile": ["profil smakowy PO POLSKU"],
        "bottleInfo": "informacje o butelce",
        "funFact": "ciekawostka PO POLSKU",
        "recognitionConfidence": 0.95
      }` 
      :
      `You are an alcohol expert. Analyze the label and provide information in JSON format:
      {
        "name": "product name",
        "brand": "brand",
        "type": "type (e.g., vodka, whiskey, rum, gin, liqueur)",
        "country": "country of origin",
        "region": "region (optional)",
        "abv": "alcohol content (%)",
        "volume": "volume",
        "description": "flavor and character description",
        "servingSuggestions": "serving suggestions",
        "cocktailSuggestions": ["list of 3 cocktails"],
        "priceRange": "price range (budget/mid-range/premium/luxury)",
        "flavorProfile": ["flavor profile"],
        "bottleInfo": "bottle information",
        "funFact": "interesting fact",
        "recognitionConfidence": 0.95
      }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            { type: 'image_url', image_url: { url: image } }
          ]
        }
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);

  } catch (error) {
    console.error('Scanner error:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

// Home Bar Endpoint
app.post('/api/home-bar', async (req, res) => {
  try {
    const { ingredients, language = 'pl' } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Ingredients are required' });
    }

    // POPRAWIONY PROMPT DLA HOME BAR
    const systemPrompt = language === 'pl' ?
      `Jesteś ekspertem od koktajli. Na podstawie podanych składników zasugeruj koktajle. Odpowiedz PO POLSKU w formacie JSON:
      {
        "canMakeNow": [
          {
            "name": "nazwa koktajlu PO POLSKU",
            "missingIngredients": [],
            "difficulty": "easy|medium|hard",
            "description": "krótki opis PO POLSKU",
            "ingredients": ["składnik 1", "składnik 2"],
            "instructions": "krótka instrukcja PO POLSKU"
          }
        ],
        "needOneMore": [
          {
            "name": "nazwa koktajlu PO POLSKU",
            "missingIngredients": ["brakujący składnik PO POLSKU"],
            "difficulty": "easy|medium|hard",
            "description": "krótki opis PO POLSKU",
            "shoppingTip": "porada zakupowa PO POLSKU"
          }
        ],
        "suggestions": {
          "buyNext": "co warto kupić PO POLSKU",
          "versatileIngredient": "uniwersalny składnik PO POLSKU",
          "tip": "porada PO POLSKU"
        }
      }`
      :
      `You are a cocktail expert. Based on the provided ingredients, suggest cocktails. Respond in JSON format:
      {
        "canMakeNow": [
          {
            "name": "cocktail name",
            "missingIngredients": [],
            "difficulty": "easy|medium|hard",
            "description": "brief description",
            "ingredients": ["ingredient 1", "ingredient 2"],
            "instructions": "brief instructions"
          }
        ],
        "needOneMore": [
          {
            "name": "cocktail name",
            "missingIngredients": ["missing ingredient"],
            "difficulty": "easy|medium|hard",
            "description": "brief description",
            "shoppingTip": "shopping tip"
          }
        ],
        "suggestions": {
          "buyNext": "what to buy next",
          "versatileIngredient": "versatile ingredient",
          "tip": "tip"
        }
      }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `I have these ingredients: ${ingredients.join(', ')}` }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const suggestions = JSON.parse(completion.choices[0].message.content);
    res.json(suggestions);

  } catch (error) {
    console.error('Home bar error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});