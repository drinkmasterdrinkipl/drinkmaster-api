const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const User = require('../models/User');
const Scan = require('../models/Scan');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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

    // Najpierw znajdź użytkownika aby sprawdzić jego subskrypcję
    const user = await User.findOne({ firebaseUid });
    const isPremium = user && user.subscription && 
                     (user.subscription.type === 'monthly' || user.subscription.type === 'yearly');

    // Przygotuj update object
    const updateObj = {
      $push: { scanHistory: historyEntry },
      $inc: { 'stats.totalScans': 1 },
      lastActive: new Date()
    };

    // Dla premium użytkowników, zwiększ również dailyScans
    if (isPremium) {
      // Sprawdź czy trzeba zresetować daily stats
      const now = new Date();
      const lastReset = user.stats?.lastResetDate ? new Date(user.stats.lastResetDate) : null;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (!lastReset || lastReset < today) {
        console.log('🔄 Resetting daily stats for premium user');
        updateObj.$set = {
          'stats.dailyScans': 1,
          'stats.dailyRecipes': 0,
          'stats.dailyHomeBar': 0,
          'stats.lastResetDate': today
        };
      } else {
        updateObj.$inc['stats.dailyScans'] = 1;
      }
      console.log('💎 Premium user - updating dailyScans');
    }

    const result = await User.findOneAndUpdate(
      { firebaseUid },
      updateObj,
      { upsert: true, new: true }
    );

    if (!result) {
      console.log('❌ User update failed');
      return { success: false, error: 'User update failed' };
    }

    console.log('✅ Scan saved to history for user:', firebaseUid);
    console.log('📊 User now has', result.scanHistory.length, 'scans in history');
    console.log('📊 User stats:', {
      totalScans: result.stats.totalScans,
      dailyScans: result.stats.dailyScans || 0,
      isPremium: isPremium
    });
    
    return { success: true, scanCount: result.scanHistory.length };
  } catch (error) {
    console.error('❌ Error saving scan to history:', error);
    console.error('❌ Error details:', error.message);
    return { success: false, error: error.message };
  }
};

const SCANNER_SYSTEM_PROMPT = `You are a master sommelier and head bartender with 25 years of experience. You are analyzing a photo of an alcohol bottle taken by a smartphone user.

RESPOND WITH PURE JSON ONLY. No markdown, no code fences, no explanation — just the JSON object.

YOUR TASK: Read the label carefully and identify the product with maximum precision.

READING THE LABEL:
- Look for the brand name (usually largest text)
- Look for the product name / expression (e.g. "12 Year", "Double Black", "Blanco")
- Look for the ABV / alcohol % (usually small text, e.g. "40% vol", "40% alc/vol")
- Look for the country of origin
- Look for the distillery or producer name
- If the label is partially obscured or blurry, use your knowledge of the brand to fill in gaps — but reflect uncertainty in the confidence score

CONFIDENCE SCORING:
- 90-100: Label clearly visible, brand and name unambiguous
- 70-89: Most of label readable, minor uncertainty
- 50-69: Partial label, making educated guess based on bottle shape/color/partial text
- 30-49: Very blurry or obscured, mostly guessing from visual clues
- 0-29: Cannot identify at all — use "name": "Nieznana butelka" (pl) or "Unknown bottle" (en)

SPIRIT TYPES — use ONLY these values:
Polish (pl): whisky, wódka, gin, rum, tequila, koniak, likier, brandy, wino, szampan, piwo, inny
English (en): whiskey, vodka, gin, rum, tequila, cognac, liqueur, brandy, wine, champagne, beer, other

DESCRIPTION RULES:
- Write 3-5 sentences covering: flavor profile, aroma, finish, character
- Be specific to THIS product, not generic to the category
- Include tasting notes a bartender would actually use (e.g. "notes of vanilla and oak" not just "tastes like whisky")
- For wine/champagne: mention grape variety, vintage style, region if visible

COCKTAIL SUGGESTIONS:
- Suggest 3 cocktails that ACTUALLY work well with this specific spirit
- Match classic recipes to the spirit style (e.g. smoky Scotch → Penicillin, Rob Roy; NOT Mojito)
- For premium spirits suggest both classic and modern options
- Never suggest cocktails that would mask the spirit's character if it's premium/single malt

SERVING SUGGESTIONS:
- Give 2 practical serving suggestions specific to this product
- Include glass type, temperature, and any food pairing if relevant
- Example: "Neat at room temperature in a Glencairn glass, with a drop of water to open aromas"

FLAVOR PROFILE SCORING (1-10):
- sweetness: sugar/caramel/honey notes
- bitterness: bitter/tannic/herbal notes
- smokiness: peat/smoke/char notes
- fruitiness: fruit/floral notes
- spiciness: pepper/spice/heat notes
- smoothness: how smooth vs harsh on the palate
- intensity: overall strength of flavor
- complexity: how many distinct flavor layers

RETURN ONLY VALID JSON:
{
  "name": "[Full product name including expression/age statement]",
  "brand": "[Brand name only]",
  "type": "[spirit type in requested language from the list above]",
  "country": "[Country of origin in requested language]",
  "alcoholContent": [ABV as number, e.g. 40],
  "description": "[3-5 sentences with rich flavor profile in requested language]",
  "servingSuggestions": ["[specific suggestion 1]", "[specific suggestion 2]"],
  "cocktailSuggestions": ["[cocktail 1]", "[cocktail 2]", "[cocktail 3]"],
  "funFact": "[One genuinely interesting and specific fact about this product in requested language]",
  "confidence": [0-100],
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
      ? `Przeanalizuj zdjęcie tej butelki alkoholu. Odczytaj etykietę dokładnie. WAŻNE: CAŁY tekst odpowiedzi po POLSKU. Typ trunku z listy: whisky, wódka, gin, rum, tequila, koniak, likier, brandy, wino, szampan, piwo, inny. Opisz smak, aromat, charakter tego konkretnego produktu. Zaproponuj 3 koktajle pasujące do tego trunku. Jeśli etykieta nieczytelna — odzwierciedl w polu confidence. Zwróć wyłącznie czysty JSON.`
      : `Analyze this photo of an alcohol bottle. Read the label carefully. ALL text in your response must be in ENGLISH. Spirit type must be one of: whiskey, vodka, gin, rum, tequila, cognac, liqueur, brandy, wine, champagne, beer, other. Describe the flavor, aroma and character of THIS specific product. Suggest 3 cocktails that suit this spirit. If the label is obscured, reflect that in confidence. Return pure JSON only.`;

    console.log('🤖 Calling Claude Vision API...');

    // Extract base64 from data URL if needed
    let imageSource;
    if (image.startsWith('data:')) {
      const [header, base64Data] = image.split(',');
      const mediaType = header.match(/data:([^;]+)/)[1];
      imageSource = { type: 'base64', media_type: mediaType, data: base64Data };
    } else {
      imageSource = { type: 'url', url: image };
    }

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL_VISION || 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SCANNER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: imageSource },
            { type: "text", text: userPrompt }
          ]
        }
      ],
    });

    const aiResponse = response.content[0].text;
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