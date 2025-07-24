const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const User = require('../models/User');
const Scan = require('../models/Scan');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🆕 Helper function to save scan to history
const saveScanToHistory = async (firebaseUid, bottleInfo, imageData, aiResponse) => {
  try {
    if (!firebaseUid) {
      console.log('⚠️ No firebaseUid provided, skipping history save');
      return { success: false, error: 'No firebaseUid' };
    }

    console.log('📝 Saving scan to history for user:', firebaseUid);
    console.log('📝 Bottle info type:', typeof bottleInfo);
    console.log('📝 Bottle info:', JSON.stringify(bottleInfo).substring(0, 200) + '...');

    const historyEntry = {
      timestamp: new Date(),
      bottleInfo: bottleInfo, // Zapisujemy cały obiekt
      imageData: null, // NIE ZAPISUJEMY OBRAZU - za duże!
      aiResponse: {
        name: aiResponse.name || bottleInfo.name,
        type: aiResponse.type || bottleInfo.type,
        confidence: aiResponse.confidence || bottleInfo.confidence
      }, // Tylko podstawowe dane
      confidence: aiResponse.confidence || bottleInfo.confidence || 50
    };

    console.log('📝 History entry prepared');

    const result = await User.findOneAndUpdate(
      { firebaseUid },
      { 
        $push: { scanHistory: historyEntry },
        $inc: { 'stats.totalScans': 1 },
        lastActive: new Date()
      },
      { upsert: true, new: true }
    );

    if (!result) {
      console.log('❌ User update failed');
      return { success: false, error: 'User update failed' };
    }

    console.log('✅ Scan saved to history for user:', firebaseUid);
    console.log('📊 User now has', result.scanHistory.length, 'scans in history');
    console.log('📊 User stats:', result.stats);
    
    return { success: true, scanCount: result.scanHistory.length };
  } catch (error) {
    console.error('❌ Error saving scan to history:', error);
    console.error('❌ Error details:', error.message);
    return { success: false, error: error.message };
  }
};

const SCANNER_SYSTEM_PROMPT = `You are a certified sommelier and master bartender analyzing alcohol bottles.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks
2. ALL text must be in the language specified in request (pl/en)
3. Provide rich, detailed descriptions (3-5 sentences)
4. Include flavor characteristics in the description
5. Add one interesting fact about the product
6. Suggest only classic cocktails appropriate for the spirit type
7. Provide serving suggestions for the spirit

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
  "servingSuggestions": ["[suggestion 1]", "[suggestion 2]"],
  "cocktailSuggestions": ["[cocktail 1]", "[cocktail 2]", "[cocktail 3]"],
  "funFact": "[One interesting fact in requested language]",
  "confidence": [0-100 number representing recognition confidence],
  "flavorProfile": {
    "sweetness": [1-10],
    "bitterness": [1-10],
    "smokiness": [1-10],
    "fruitiness": [1-10],
    "spiciness": [1-10],
    "smoothness": [1-10],
    "intensity": [1-10],
    "complexity": [1-10]
  }
}`;

// Main scanner endpoint
router.post('/', async (req, res) => {
  try {
    const { image, language = 'pl', firebaseUid } = req.body;
    
    console.log('🔍 Scanner request received');
    console.log('📸 Image provided:', !!image);
    console.log('🌍 Language:', language);
    console.log('👤 FirebaseUid:', firebaseUid || 'not provided');

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image is required'
      });
    }
    
    const userPrompt = language === 'pl' 
      ? `Identify this alcohol bottle. ALL text must be in POLISH. Use Polish spirit types (whisky, wódka, gin, rum, tequila, koniak, likier, brandy, wino, szampan, piwo, inny). Include flavor characteristics, serving suggestions, and confidence level.`
      : `Identify this alcohol bottle. ALL text must be in ENGLISH. Use English spirit types. Include flavor characteristics, serving suggestions, and confidence level.`;

    console.log('🤖 Calling OpenAI Vision API...');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
      max_tokens: 1000,
      temperature: 0.3
    });

    const aiResponse = response.choices[0].message.content;
    console.log('🤖 AI Response received:', aiResponse.substring(0, 200) + '...');
    
    // Clean and parse response
    let cleanedResponse = aiResponse;
    cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/gi, '');
    cleanedResponse = cleanedResponse.trim();

    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    let bottleData;
    try {
      bottleData = JSON.parse(cleanedResponse);
      console.log('✅ AI response parsed successfully');
      
      // Ensure alcoholContent is number
      if (typeof bottleData.alcoholContent === 'string') {
        bottleData.alcoholContent = parseFloat(bottleData.alcoholContent.replace('%', '')) || 40;
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
      if (!bottleData.cocktailSuggestions || bottleData.cocktailSuggestions.length === 0) {
        const map = language === 'pl' ? cocktailMap.pl : cocktailMap.en;
        bottleData.cocktailSuggestions = map[bottleData.type] || 
          (language === 'pl' ? ['Klasyczne koktajle'] : ['Classic cocktails']);
      }
      
      // Add serving suggestions if not provided
      if (!bottleData.servingSuggestions || bottleData.servingSuggestions.length === 0) {
        const servingMap = {
          pl: {
            'whisky': ['Z kostkami lodu', 'Z odrobiną wody'],
            'wódka': ['Schłodzona, czysta', 'W shotach'],
            'gin': ['Z tonikiem i cytryną', 'W koktajlach'],
            'rum': ['Z colą i limonką', 'W koktajlach tropikalnych'],
            'tequila': ['Z solą i limonką', 'W shotach'],
            'koniak': ['W kieliszku balonowym', 'Lekko podgrzany'],
            'likier': ['Na lodzie', 'Jako digestif'],
            'wino': ['W odpowiedniej temperaturze', 'W kieliszku do wina'],
            'szampan': ['Dobrze schłodzony', 'W kieliszku flute']
          },
          en: {
            'whiskey': ['On the rocks', 'With a splash of water'],
            'vodka': ['Chilled, neat', 'In shots'],
            'gin': ['With tonic and lime', 'In cocktails'],
            'rum': ['With cola and lime', 'In tropical cocktails'],
            'tequila': ['With salt and lime', 'In shots'],
            'cognac': ['In a snifter', 'Slightly warmed'],
            'liqueur': ['On ice', 'As digestif'],
            'wine': ['At proper temperature', 'In wine glass'],
            'champagne': ['Well chilled', 'In flute glass']
          }
        };
        
        const map = language === 'pl' ? servingMap.pl : servingMap.en;
        bottleData.servingSuggestions = map[bottleData.type] || 
          (language === 'pl' ? ['Według preferencji'] : ['According to preference']);
      }
      
    } catch (parseError) {
      console.error('❌ Parse error, using fallback:', parseError);
      
      // Fallback response
      bottleData = {
        name: language === 'pl' ? "Nierozpoznana butelka" : "Unknown Bottle",
        brand: language === 'pl' ? "Nieznana" : "Unknown",
        type: language === 'pl' ? "alkohol" : "alcohol",
        country: language === 'pl' ? "Nieznany" : "Unknown",
        alcoholContent: 40,
        description: language === 'pl' 
          ? "Nie udało się rozpoznać produktu. Spróbuj zrobić wyraźniejsze zdjęcie etykiety."
          : "Could not recognize the product. Try taking a clearer photo of the label.",
        servingSuggestions: [],
        cocktailSuggestions: [],
        funFact: "",
        confidence: 10,
        flavorProfile: {
          sweetness: 5, bitterness: 5, smokiness: 5, fruitiness: 5,
          spiciness: 5, smoothness: 5, intensity: 5, complexity: 5
        }
      };
    }

    // Ensure required fields exist
    bottleData.confidence = bottleData.confidence || 50;
    bottleData.flavorProfile = bottleData.flavorProfile || {
      sweetness: 5, bitterness: 5, smokiness: 5, fruitiness: 5,
      spiciness: 5, smoothness: 5, intensity: 5, complexity: 5
    };

    // 🆕 Save scan to history automatically
    const saveResult = await saveScanToHistory(firebaseUid, bottleData, image, bottleData);
    console.log('📤 Save result:', saveResult);

    console.log('📤 Sending response to client');

    res.json({
      success: true,
      data: bottleData
    });

  } catch (error) {
    console.error('❌ Scanner error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Legacy save endpoint - DISABLED to prevent double saves
router.post('/save', async (req, res) => {
  console.log('⚠️ Legacy save endpoint called - ignoring to prevent duplicates');
  res.json({
    success: true,
    message: 'Scan already saved by main endpoint'
  });
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
    
    // Get scans from scanHistory array
    const allScans = user.scanHistory || [];
    const sortedScans = allScans.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Paginate
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedScans = sortedScans.slice(startIndex, endIndex);
    
    res.json({ 
      success: true, 
      scans: paginatedScans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allScans.length,
        pages: Math.ceil(allScans.length / parseInt(limit))
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