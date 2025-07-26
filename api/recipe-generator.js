// master-api/api/recipe-generator.js
const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post('/', async (req, res) => {
  try {
    const { drinkName, cocktailName, ingredients = [], language = 'en', firebaseUid } = req.body;
    
    const cocktailToGenerate = cocktailName || drinkName;
    
    console.log('🍹 Generating recipe for:', cocktailToGenerate);
    console.log('🌍 Language:', language);
    console.log('👤 User:', firebaseUid);
    
    const systemPrompt = language === 'pl' 
      ? `Jesteś doświadczonym barmanem i ekspertem od koktajli. Generuj przepisy w formacie JSON.
         Zawsze zwracaj:
         - name: nazwa koktajlu
         - nameEn: nazwa po angielsku
         - category: classic/modern/tropical/shooter itp
         - ingredients: składniki z dokładnymi proporcjami
         - instructions: instrukcje krok po kroku
         - glassType: typ szklanki
         - method: shaken/stirred/built/blended
         - ice: typ lodu
         - garnish: dekoracja
         - history: historia drinka (2-3 zdania)
         - funFact: ciekawostka
         - abv: przybliżona zawartość alkoholu w %
         - difficulty: easy/medium/hard
         - prepTime: czas przygotowania w minutach
         - servingTemp: temperatura serwowania
         - tips: opcjonalne porady`
      : `You are an experienced bartender and cocktail expert. Generate recipes in JSON format.
         Always return:
         - name: cocktail name
         - nameEn: English name
         - category: classic/modern/tropical/shooter etc
         - ingredients: ingredients with exact proportions
         - instructions: step by step instructions
         - glassType: glass type
         - method: shaken/stirred/built/blended
         - ice: ice type
         - garnish: garnish
         - history: drink history (2-3 sentences)
         - funFact: fun fact
         - abv: approximate alcohol content in %
         - difficulty: easy/medium/hard
         - prepTime: preparation time in minutes
         - servingTemp: serving temperature
         - tips: optional tips`;

    const userPrompt = language === 'pl'
      ? `Podaj mi profesjonalny przepis na koktajl: ${cocktailToGenerate}. 
         Pamiętaj o dokładnych proporcjach (w ml), metodzie przygotowania i wszystkich szczegółach.`
      : `Give me a professional recipe for cocktail: ${cocktailToGenerate}.
         Remember to include exact proportions (in ml), preparation method and all details.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: systemPrompt 
        },
        { 
          role: "user", 
          content: userPrompt 
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500
    });

    const recipeData = JSON.parse(completion.choices[0].message.content);
    
    // Upewnij się, że wszystkie wymagane pola istnieją
    const recipe = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...recipeData,
      // Zapewnij, że składniki są w odpowiednim formacie
      ingredients: recipeData.ingredients?.map(ing => ({
        name: ing.name || ing.ingredient,
        amount: ing.amount || ing.quantity,
        unit: ing.unit || 'ml',
        optional: ing.optional || false
      })) || [],
      // Zapewnij, że instrukcje są tablicą
      instructions: Array.isArray(recipeData.instructions) 
        ? recipeData.instructions 
        : recipeData.instructions?.split('.').filter(s => s.trim()) || [],
      // Wartości domyślne
      method: recipeData.method || 'stirred',
      glassType: recipeData.glassType || (language === 'pl' ? 'szklanka rocks' : 'rocks glass'),
      ice: recipeData.ice || (language === 'pl' ? 'kostki lodu' : 'ice cubes'),
      garnish: recipeData.garnish || (language === 'pl' ? 'brak' : 'none'),
      difficulty: recipeData.difficulty || 'medium',
      prepTime: recipeData.prepTime || 5,
      abv: recipeData.abv || 20,
      servingTemp: recipeData.servingTemp || '5',
      category: recipeData.category || 'classic',
      tags: recipeData.tags || [],
      tips: recipeData.tips || [],
      alcoholContent: recipeData.alcoholContent || 'medium',
      flavor: recipeData.flavor || '',
      occasion: recipeData.occasion || '',
      proTip: recipeData.proTip || ''
    };
    
    console.log('✅ Recipe generated successfully');
    
    res.json(recipe);
  } catch (error) {
    console.error('❌ Recipe generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate recipe',
      message: error.message 
    });
  }
});

module.exports = router;