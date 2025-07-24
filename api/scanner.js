const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const User = require('../models/User');
const Scan = require('../models/Scan');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCANNER_SYSTEM_PROMPT = `You are a certified sommelier and master bartender analyzing alcohol bottles.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks
2. ALL text must be in the language specified in request (pl/en)
3. Provide rich, detailed descriptions (3-5 sentences)
4. Include flavor characteristics in the description
5. Add one interesting fact about the product
6. Suggest only classic cocktails appropriate for the spirit type

SPIRIT TYPES:
Polish (pl):
- whisky
- wódka
- gin
- rum
- tequila
- koniak
- likier
- brandy
- wino
- szampan
- piwo
- inny

English (en):
- whiskey
- vodka
- gin
- rum
- tequila
- cognac
- liqueur
- brandy
- wine
- champagne
- beer
- other

OUTPUT FORMAT:
{
  "name": "[Full product name]",
  "brand": "[Brand name]", 
  "type": "[spirit type in requested language]",
  "country": "[Country in requested language]",
  "alcoholContent": [number only],
  "description": "[3-5 sentences in requested language with flavor profile]",
  "cocktailSuggestions": ["[cocktail 1]", "[cocktail 2]", "[cocktail 3]"],
  "funFact": "[One interesting fact in requested language]"
}`;

// Main scanner endpoint
router.post('/', async (req, res) => {
  try {
    const { image, language } = req.body;
    const requestLanguage = language || 'en';
    
    console.log(`🔍 Scanner request - Language: ${requestLanguage}`);
    
    const userPrompt = requestLanguage === 'pl' 
      ? `Identify this alcohol bottle. ALL text must be in POLISH. Use Polish spirit types (whisky, wódka, gin, rum, tequila, koniak, likier, brandy, wino, szampan, piwo, inny). Include flavor characteristics in the description.`
      : `Identify this alcohol bottle. ALL text must be in ENGLISH. Use English spirit types. Include flavor characteristics in the description.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system",
          content: SCANNER_SYSTEM_PROMPT
        },
        { 
          role: "user", 
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.2
    });

    const aiResponse = response.choices[0].message.content;
    console.log('🤖 Raw Scanner Response:', aiResponse.substring(0, 200) + '...');
    
    // Clean and parse response
    let cleanedResponse = aiResponse.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
      
      // Ensure alcoholContent is number
      if (typeof parsedData.alcoholContent === 'string') {
        parsedData.alcoholContent = parseFloat(parsedData.alcoholContent.replace('%', '')) || 40;
      }
      
      // Fix cocktail suggestions based on type
      const cocktailMap = {
        pl: {
          'brandy': ['Sidecar', 'Brandy Alexander', 'Stinger'],
          'likier': ['B-52', 'White Russian', 'Espresso Martini'],
          'whisky': ['Old Fashioned', 'Manhattan', 'Whiskey Sour'],
          'wódka': ['Moscow Mule', 'Bloody Mary', 'Cosmopolitan'],
          'gin': ['Gin & Tonic', 'Martini', 'Negroni'],
          'rum': ['Mojito', 'Daiquiri', 'Mai Tai'],
          'tequila': ['Margarita', 'Paloma', 'Tequila Sunrise'],
          'koniak': ['Sidecar', 'French 75', 'Sazerac'],
          'wino': ['Sangria', 'Kir', 'Spritz'],
          'szampan': ['Mimosa', 'Bellini', 'French 75']
        },
        en: {
          'brandy': ['Sidecar', 'Brandy Alexander', 'Stinger'],
          'liqueur': ['B-52', 'White Russian', 'Espresso Martini'],
          'whiskey': ['Old Fashioned', 'Manhattan', 'Whiskey Sour'],
          'vodka': ['Moscow Mule', 'Bloody Mary', 'Cosmopolitan'],
          'gin': ['Gin & Tonic', 'Martini', 'Negroni'],
          'rum': ['Mojito', 'Daiquiri', 'Mai Tai'],
          'tequila': ['Margarita', 'Paloma', 'Tequila Sunrise'],
          'cognac': ['Sidecar', 'French 75', 'Sazerac'],
          'wine': ['Sangria', 'Kir', 'Spritz'],
          'champagne': ['Mimosa', 'Bellini', 'French 75']
        }
      };
      
      // Apply cocktail suggestions if not provided or empty
      if (!parsedData.cocktailSuggestions || parsedData.cocktailSuggestions.length === 0) {
        const map = requestLanguage === 'pl' ? cocktailMap.pl : cocktailMap.en;
        parsedData.cocktailSuggestions = map[parsedData.type] || 
          (requestLanguage === 'pl' ? ['Klasyczne koktajle'] : ['Classic cocktails']);
      }
      
    } catch (e) {
      console.error('Parse error:', e);
      
      // Fallback response
      parsedData = {
        name: requestLanguage === 'pl' ? "Nierozpoznany alkohol" : "Unrecognized alcohol",
        brand: requestLanguage === 'pl' ? "Nieznana marka" : "Unknown brand",
        type: requestLanguage === 'pl' ? "inny" : "other",
        country: requestLanguage === 'pl' ? "Nieznany" : "Unknown",
        alcoholContent: 40,
        description: requestLanguage === 'pl' 
          ? "Nie udało się rozpoznać produktu. Może to być rzadki lub regionalny alkohol. Spróbuj zrobić wyraźniejsze zdjęcie etykiety przy dobrym oświetleniu."
          : "Could not identify the product. This might be a rare or regional alcohol. Try taking a clearer photo with better lighting.",
        cocktailSuggestions: requestLanguage === 'pl'
          ? ["Klasyczne koktajle"]
          : ["Classic cocktails"],
        funFact: requestLanguage === 'pl'
          ? "Każdy alkohol ma swoją unikalną historię i tradycję produkcji."
          : "Every alcohol has its unique history and production tradition."
      };
    }

    res.json({
      data: {
        ...parsedData,
        confidence: 95
      }
    });
    
  } catch (error) {
    console.error('Scanner error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save scan to database
router.post('/save', async (req, res) => {
  try {
    const { firebaseUid, bottleInfo, imageData, aiResponse } = req.body;
    
    // Find user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Create scan
    const scan = await Scan.create({
      userId: user._id,
      firebaseUid,
      bottleInfo,
      imageData: imageData ? imageData.substring(0, 100) + '...' : null, // Zapisz tylko część dla testów
      aiResponse
    });
    
    // Update user stats
    await User.findByIdAndUpdate(user._id, {
      $inc: { 'stats.totalScans': 1 },
      lastActive: new Date()
    });
    
    console.log(`✅ Scan saved for user: ${user.email}`);
    
    res.json({ 
      success: true, 
      scanId: scan._id 
    });
    
  } catch (error) {
    console.error('Save scan error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user's scan history
router.get('/history/:firebaseUid', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const scans = await Scan.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-imageData'); // Nie zwracaj obrazów dla wydajności
    
    const total = await Scan.countDocuments({ userId: user._id });
    
    res.json({ 
      success: true, 
      scans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get single scan
router.get('/scan/:scanId', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.scanId)
      .populate('userId', 'email displayName');
    
    if (!scan) {
      return res.status(404).json({ 
        success: false, 
        error: 'Scan not found' 
      });
    }
    
    res.json({ 
      success: true, 
      scan 
    });
    
  } catch (error) {
    console.error('Get scan error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;