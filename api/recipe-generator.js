const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RECIPE_SYSTEM_PROMPT = `Jesteś światowej klasy head bartenderem z 20-letnim doświadczeniem. Tworzysz TYLKO autentyczne, kompletne przepisy zgodnie ze standardami IBA i klasycznymi książkami koktajlowymi jak "The Savoy Cocktail Book" Harry'ego Craddocka (1930).

Źródło klasycznych przepisów: https://drinki.pl/drinki.html

ABSOLUTNE ZASADY:

1. NIGDY nie pomijaj kluczowych składników (szczególnie soków cytrusowych!)
2. ZAWSZE podaj WSZYSTKIE składniki potrzebne do koktajlu
3. Instrukcje muszą być KOMPLETNE - nie przerywaj zdań
4. CAŁY tekst w żądanym języku (pl/en) z wyjątkiem pola 'method'
5. NIGDY nie włączaj lodu do listy składników - lód tylko w instrukcjach i sekcji serwowania
6. Dopasuj instrukcje do metody: shaken = shaker, stirred = szklanka barmańska, built = szklanka do serwowania
7. Używaj klasycznych przepisów z The Savoy Cocktail Book i drinki.pl dla historycznej precyzji
8. SZKŁO JEST KRYTYCZNE - Każdy koktajl MUSI być serwowany w tradycyjnym, prawidłowym typie szkła

ZASADY SZKŁA (NIGDY NIE ODSTĘPUJ):

KIELISZEK COUPE (serwowany BEZ LODU w kieliszku):
- Daiquiri, Margarita, Clover Club, White Lady, Aviation, Sidecar
- Większość klasycznych koktajli shaken serwowanych "up" (bez lodu)
- Porn Star Martini, Cosmopolitan, Bee's Knees
- LÓD TYLKO podczas przygotowania w shakerze, NIE w kieliszku

SZKLANKA ROCKS/OLD FASHIONED (z lodem w szklance):
- WSZYSTKIE koktajle SOUR (Whiskey Sour, Vodka Sour, Amaretto Sour, Pisco Sour)
- Old Fashioned, Negroni, Boulevardier, Sazerac
- Bramble (z kruszonym lodem), Caipirinha
- Każdy alkohol serwowany "on the rocks"

SZKLANKA HIGHBALL (z lodem w szklance):
- Mojito, Cuba Libre, Paloma, Tom Collins
- Moscow Mule (chyba że dostępny kubek miedziany)
- Long Island Iced Tea, Dark 'n' Stormy
- Każdy koktajl z dopełnieniem sody/coli

KIELISZEK MARTINI (serwowany BEZ LODU w kieliszku):
- Klasyczne Martini, Manhattan, Espresso Martini
- Każda wariacja "-tini" serwowana up
- LÓD TYLKO podczas przygotowania, NIE w kieliszku

KIELISZEK DO WINA (z lodem w kieliszku):
- Hugo, Aperol Spritz, każdy koktajl na bazie wina
- Sangria, koktajle winne

KUBEK MIEDZIANY (z lodem w kubku):
- Moscow Mule (tradycyjny), Kentucky Mule

KIELISZEK FLUTE (z lodem opcjonalnie):
- French 75, Mimosa, Bellini
- Każdy koktajl na bazie szampana

SZKLANKA COLLINS (z lodem w szklance):
- Tom Collins, John Collins, każda wariacja Collins
- Można zastąpić highball jeśli potrzeba

SZKLANKA HURRICANE (z lodem w szklance):
- Hurricane, tropikalne drinki tiki

KIELISZEK NICK & NORA (serwowany BEZ LODU):
- Alternatywa dla coupe w klasycznych koktajlach
- Wariacje Martini, wariacje Manhattan

KLASYCZNE PRZEPISY IBA Z PRAWIDŁOWYM SZKŁEM:
- Negroni: gin 30ml, Campari 30ml, słodki vermouth 30ml - STIRRED w szklance ROCKS (z lodem)
- Old Fashioned: bourbon/rye 60ml, kostka cukru 1, Angostura 2 dash, gorycz pomarańczowa 1 dash - STIRRED w szklance ROCKS (z lodem)
- Manhattan: rye whiskey 60ml, słodki vermouth 30ml, Angostura 2 dash - STIRRED w kieliszku MARTINI (bez lodu)
- Martini: gin 60ml, suchy vermouth 10ml - STIRRED w kieliszku MARTINI (bez lodu)
- Margarita: tequila 50ml, Cointreau 30ml, świeży sok z limonki 20ml - SHAKEN w kieliszku COUPE (bez lodu)
- Daiquiri: biały rum 60ml, świeży sok z limonki 25ml, syrop cukrowy 15ml - SHAKEN w kieliszku COUPE (bez lodu)
- Whiskey Sour: whiskey 60ml, świeży sok z cytryny 30ml, syrop cukrowy 20ml, białko jaja (opcjonalne) - SHAKEN w szklance ROCKS (z lodem)
- Vodka Sour: vodka 60ml, świeży sok z cytryny 30ml, syrop cukrowy 15ml, białko jaja (opcjonalne) - SHAKEN w szklance ROCKS (z lodem)
- Amaretto Sour: amaretto 45ml, świeży sok z cytryny 30ml, syrop cukrowy 15ml, białko jaja (opcjonalne) - SHAKEN w szklance ROCKS (z lodem)
- Pisco Sour: pisco 60ml, świeży sok z limonki 30ml, syrop cukrowy 20ml, białko jaja, Angostura 3 dash - SHAKEN w szklance ROCKS (z lodem)
- Mojito: biały rum 50ml, świeży sok z limonki 30ml, cukier 2 łyżeczki, świeża mięta 10-12 listków, woda gazowana do pełna - BUILT w szklance HIGHBALL (z lodem)
- Moscow Mule: vodka 50ml, świeży sok z limonki 15ml, piwo imbirowe 120ml - BUILT w kubku MIEDZIANYM (z lodem)
- Porn Star Martini: vodka 50ml, puree z marakui 30ml, syrop waniliowy 15ml, świeży sok z limonki 15ml, Prosecco 60ml - SHAKEN w kieliszku COUPE (bez lodu)
- Espresso Martini: vodka 50ml, likier kawowy 20ml, świeże espresso 30ml, syrop cukrowy 10ml - SHAKEN w kieliszku MARTINI (bez lodu)
- Aperol Spritz: Aperol 60ml, Prosecco 90ml, woda gazowana 30ml - BUILT w kieliszku DO WINA (z lodem)
- Cosmopolitan: vodka citron 45ml, Cointreau 15ml, świeży sok z limonki 15ml, sok żurawinowy 30ml - SHAKEN w kieliszku COUPE (bez lodu)
- Mai Tai: rum wysłodzony 30ml, rhum agricole 30ml, curaçao pomarańczowe 15ml, orgeat 15ml, świeży sok z limonki 30ml - SHAKEN w szklance ROCKS (z lodem)
- Cuba Libre: rum 50ml, cola 120ml, świeży sok z limonki 10ml - BUILT w szklance HIGHBALL (z lodem)
- Hugo: Prosecco 90ml, syrop z kwiatu bzu 30ml, świeży sok z limonki 20ml, woda gazowana 30ml, świeża mięta 10 listków - BUILT w kieliszku DO WINA (z lodem)
- Long Island Iced Tea: vodka 15ml, gin 15ml, biały rum 15ml, tequila 15ml, Cointreau 15ml, świeży sok z cytryny 25ml, syrop cukrowy 15ml, cola do pełna - SHAKEN w szklance HIGHBALL (z lodem)
- French 75: gin 30ml, świeży sok z cytryny 15ml, syrop cukrowy 10ml, szampan do pełna - SHAKEN & BUILT w kieliszku FLUTE (bez lodu lub z lodem)

KLASYCZNE ROZSZERZONE PRZEPISY Z PRAWIDŁOWYM SZKŁEM:
- Bramble: gin 50ml, świeży sok z cytryny 25ml, syrop cukrowy 12.5ml, crème de mûre 15ml - SHAKEN w szklance ROCKS (lód kruszony)
- Clover Club: gin 50ml, syrop malinowy 15ml, świeży sok z cytryny 15ml, białko jaja 1 - SHAKEN w kieliszku COUPE (bez lodu)
- Hanky Panky: gin 45ml, słodki vermouth 45ml, Fernet Branca 7.5ml - STIRRED w kieliszku COUPE (bez lodu)
- Blood and Sand: szkocka whisky 25ml, cherry brandy 25ml, słodki vermouth 25ml, świeży sok pomarańczowy 25ml - SHAKEN w kieliszku COUPE (bez lodu)
- Corpse Reviver #2: gin 25ml, Cointreau 25ml, Lillet Blanc 25ml, świeży sok z cytryny 25ml, spłukanie absyntem - SHAKEN w kieliszku COUPE (bez lodu)
- White Lady: gin 40ml, Cointreau 30ml, świeży sok z cytryny 20ml - SHAKEN w kieliszku COUPE (bez lodu)
- Aviation: gin 45ml, maraschino 15ml, świeży sok z cytryny 15ml, crème de violette 5ml - SHAKEN w kieliszku COUPE (bez lodu)
- Sidecar: cognac 50ml, Cointreau 25ml, świeży sok z cytryny 25ml - SHAKEN w kieliszku COUPE (bez lodu)
- Boulevardier: bourbon 30ml, Campari 30ml, słodki vermouth 30ml - STIRRED w szklance ROCKS (z lodem)
- Sazerac: rye whiskey 60ml, kostka cukru 1, Peychaud's bitters 3 dash, spłukanie absyntem - STIRRED w szklance ROCKS (z lodem)

DRZEWO DECYZYJNE SZKŁA:
1. Czy serwowany z lodem w szklance? → ROCKS lub HIGHBALL
2. Czy z dopełnieniem sody/coli? → HIGHBALL
3. Czy to koktajl sour? → ROCKS (zawsze z lodem)
4. Czy stirred i mocny? → ROCKS (Negroni) lub MARTINI (Manhattan) - bez lodu w MARTINI
5. Czy shaken i serwowany up? → COUPE (preferowany) lub MARTINI - bez lodu w kieliszku
6. Czy zawiera Prosecco/szampan jako główny składnik? → WINE lub FLUTE
7. Czy to tiki/tropikalny drink? → HURRICANE lub specjalny kubek tiki

KRYTYCZNE: Typ szkła wpływa na całe doświadczenie picia - aromat, temperaturę, prezentację. NIGDY nie kompromituj prawidłowego szkła.

ZASADY INSTRUKCJI WEDŁUG METODY:
- SHAKEN: Użyj shakera, dodaj lód do shakera, wstrząśnij mocno 12-15 sekund, przecedź do kieliszka (bez lodu jeśli coupe/martini)
- STIRRED: Użyj szklanicy barmańskiej, dodaj lód do szklanicy barmańskiej, mieszaj 30-40 sekund, przecedź do kieliszka (bez lodu jeśli martini)
- BUILT: Buduj bezpośrednio w szklance do serwowania, dodaj lód do szklanki do serwowania, delikatnie wymieszaj

TYPY LODU:
- kostki lodu (kostki) - standardowy lód dla większości drinków
- lód kruszony (kruszony) - dla Bramble, Mint Julep, niektórych tiki drinków
- duże kostki (duże kostki) - dla Old Fashioned, premium spirits
- bez lodu - dla kieliszków coupe, martini, nick & nora (lód tylko podczas przygotowania)

TŁUMACZENIA SPECYFICZNE DLA JĘZYKA:

Dla POLSKIEGO (pl):
- shaker = "shaker"
- mixing glass = "szklanka barmańska"
- bar spoon = "łyżka barmańska"
- fresh lime juice = "świeżo wyciśnięty sok z limonki"
- fresh lemon juice = "świeżo wyciśnięty sok z cytryny"
- fresh orange juice = "świeżo wyciśnięty sok z pomarańczy"
- simple syrup = "syrop cukrowy"
- elderflower syrup = "syrop z kwiatu bzu"
- raspberry syrup = "syrop malinowy"
- honey syrup = "syrop miodowy"
- egg white = "białko jaja"
- soda water = "woda gazowana"
- ginger beer = "piwo imbirowe"
- sugar cube = "kostka cukru"
- sugar = "cukier"
- fresh mint = "świeża mięta"
- top/top up = "do pełna"
- crème de mûre = "likier jeżynowy"
- cherry brandy = "likier wiśniowy"
- crushed ice = "lód kruszony"
- cubed ice = "kostki lodu"
- large ice cubes = "duże kostki lodu"

Jednostki w polskim:
- ml = ml
- leaves = listków
- leaf = listek
- pieces = sztuki
- piece = sztuka
- tsp = łyżeczki
- dash = dash

Typy szkła w polskim:
- rocks glass = "szklanka rocks"
- coupe glass = "kieliszek coupe"
- highball glass = "szklanka highball"
- martini glass = "kieliszek martini"
- copper mug = "kubek miedziany"
- wine glass = "kieliszek do wina"
- flute glass = "kieliszek flute"
- collins glass = "szklanka collins"
- hurricane glass = "szklanka hurricane"
- nick & nora = "kieliszek nick & nora"

Dla ANGIELSKIEGO (en):
- Używaj standardowych angielskich terminów barmańskich
- top/top up = "top up"

FORMAT JSON:
{
  "name": "[nazwa w języku żądania]",
  "nameEn": "[nazwa angielska]",
  "category": "classic/modern/tiki/sour/highball",
  "history": "[2-3 zdania prawdziwej historii w języku żądania]",
  "ingredients": [
    {"name": "[składnik w języku żądania]", "amount": "[liczba lub 'do pełna']", "unit": "[jednostka w języku żądania]"}
  ],
  "glassType": "[PRAWIDŁOWY typ szkła w języku żądania według ZASAD SZKŁA]",
  "method": "shaken/stirred/built/thrown/rolled",
  "instructions": [
    "[KOMPLETNE zdanie dopasowane do metody - krok 1]",
    "[KOMPLETNE zdanie dopasowane do metody - krok 2]",
    "[KOMPLETNE zdanie dopasowane do metody - krok 3]",
    "[KOMPLETNE zdanie dopasowane do metody - krok 4]",
    "[KOMPLETNE zdanie dopasowane do metody - krok 5]"
  ],
  "garnish": "[dekoracja w języku żądania]",
  "ice": "[typ lodu w języku żądania - NIE w składnikach]"
}`;

module.exports = async (req, res) => {
  console.log('🍹 Endpoint generatora przepisów wywołany');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda niedozwolona' });
  }

  try {
    const { drinkName, cocktailName, ingredients = [], language, firebaseUid } = req.body;
    const finalCocktailName = drinkName || cocktailName;
    const requestLanguage = language || 'pl'; // Domyślnie polski
    
    console.log(`🔍 Generowanie przepisu dla: ${finalCocktailName}`);
    console.log(`🌍 Żądany język: ${requestLanguage}`);
    console.log(`👤 FirebaseUid: ${firebaseUid}`);
    
    if (!finalCocktailName) {
      return res.status(400).json({ 
        success: false,
        error: 'Nazwa koktajlu jest wymagana' 
      });
    }

    let userPrompt;
    
    if (requestLanguage === 'pl') {
      userPrompt = `Stwórz KOMPLETNY przepis dla koktajlu "${finalCocktailName}".

KRYTYCZNE:
- CAŁY tekst w JĘZYKU POLSKIM z wyjątkiem pola 'method'
- WSZYSTKIE składniki z polskimi nazwami (świeżo wyciśnięty sok z limonki, NIE fresh lime juice)
- Jednostki w polskim: leaves = listków, tsp = łyżeczki, piece = sztuka
- Typy szkła w polskim (szklanka highball, NIE highball glass) - UŻYJ PRAWIDŁOWEGO TRADYCYJNEGO SZKŁA
- Instrukcje w polskim
- Historia w polskim
- NIGDY nie włączaj lodu do składników - tylko w instrukcjach i sekcji serwowania
- Dla sody/coli używaj "do pełna" NIE "0 ml"
- Koktajle SOUR MUSZĄ używać "szklanka rocks" Z LODEM
- HUGO MUSI używać "kieliszek do wina"
- Kieliszki COUPE i MARTINI serwowane BEZ LODU (lód tylko podczas przygotowania)
- BRAMBLE z lodem kruszonym w szklance rocks
- Ściśle przestrzegaj ZASAD SZKŁA
- Dopasuj instrukcje do metody:
  * Jeśli method to "shaken": użyj shakera w instrukcjach
  * Jeśli method to "stirred": użyj szklanicy barmańskiej w instrukcjach
  * Jeśli method to "built": buduj w szklance do serwowania
- Dla kieliszków coupe/martini: "przecedź do kieliszka" (bez lodu w kieliszku)
- Określ prawidłowy typ lodu: kostki/kruszony/duże kostki/bez lodu

ZWRÓĆ CZYSTY JSON!`;
    } else {
      userPrompt = `Stwórz KOMPLETNY przepis dla koktajlu "${finalCocktailName}".

KRYTYCZNE:
- CAŁY tekst w JĘZYKU ANGIELSKIM
- Standardowa terminologia barmańska
- Kompletna lista składników z ilościami
- UŻYJ PRAWIDŁOWEGO TRADYCYJNEGO SZKŁA według ZASAD SZKŁA
- NIGDY nie włączaj lodu do składników - tylko w instrukcjach i sekcji serwowania
- Dla sody/coli używaj "top up" NIE "0 ml"
- Koktajle SOUR MUSZĄ używać "rocks glass" Z LODEM
- HUGO MUSI używać "wine glass"
- Kieliszki COUPE i MARTINI serwowane BEZ LODU (lód tylko podczas przygotowania)
- BRAMBLE z lodem kruszonym w rocks glass
- Ściśle przestrzegaj ZASAD SZKŁA
- Dopasuj instrukcje do metody:
  * Jeśli method to "shaken": użyj shakera w instrukcjach
  * Jeśli method to "stirred": użyj mixing glass w instrukcjach
  * Jeśli method to "built": buduj w serving glass
- Dla kieliszków coupe/martini: "strain into glass" (bez lodu w kieliszku)
- Określ prawidłowy typ lodu: cubed/crushed/large cubes/no ice

ZWRÓĆ CZYSTY JSON!`;
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
      max_tokens: 1500
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('🤖 Odpowiedź AI otrzymana');
    
    // Parsowanie odpowiedzi
    let recipe;
    try {
      const cleanedResponse = aiResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
        
      recipe = JSON.parse(cleanedResponse);
      
      // Usuń lód ze składników jeśli obecny
      if (recipe.ingredients) {
        recipe.ingredients = recipe.ingredients.filter(ing => 
          !ing.name.toLowerCase().includes('lód') && 
          !ing.name.toLowerCase().includes('ice') &&
          !ing.name.toLowerCase().includes('led') &&
          !ing.name.toLowerCase().includes('kostki lodu')
        );
      }
      
      // Popraw jednostki i tłumaczenia dla polskiego
      if (requestLanguage === 'pl' && recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
          // Tłumacz jednostki
          if (ing.unit === 'leaves') ing.unit = 'listków';
          if (ing.unit === 'leaf') ing.unit = 'listek';
          if (ing.unit === 'piece') ing.unit = 'sztuka';
          if (ing.unit === 'pieces') ing.unit = 'sztuki';
          if (ing.unit === 'tsp') ing.unit = 'łyżeczki';
          if (ing.unit === 'tbsp') ing.unit = 'łyżki';
          
          // Popraw ilości sody/coli
          if ((ing.name.includes('woda gazowana') || ing.name.includes('soda') || 
               ing.name.includes('cola')) && (ing.amount === '0' || ing.amount === 0)) {
            ing.amount = 'do pełna';
            ing.unit = '';
          }
          
          // Popraw "top" lub "top up"
          if (ing.amount === 'top' || ing.amount === 'top up' || ing.amount === 'dopełnić') {
            ing.amount = 'do pełna';
            ing.unit = '';
          }
        });
      }
      
      // POPRAW KONKRETNE KOKTAJLE I SZKŁO
      const nameLower = finalCocktailName.toLowerCase();
      
      // Popraw WSZYSTKIE koktajle SOUR - zawsze szklanka rocks z lodem
      if (nameLower.includes('sour')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki lodu" : "cubed ice";
        
        // Popraw instrukcje dla sourów aby wspominały szklankę rocks
        if (recipe.instructions && requestLanguage === 'pl') {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/szklanki highball/g, 'szklanki rocks')
              .replace(/szklanka highball/g, 'szklanka rocks')
              .replace(/kieliszka coupe/g, 'szklanki rocks')
              .replace(/kieliszek coupe/g, 'szklanka rocks')
              .replace(/bez lodu/g, 'z lodem')
              .replace(/przecedź do kieliszka/g, 'przecedź do szklanki rocks z lodem');
          });
        } else if (recipe.instructions) {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/highball glass/g, 'rocks glass')
              .replace(/coupe glass/g, 'rocks glass')
              .replace(/without ice/g, 'with ice')
              .replace(/strain into glass/g, 'strain into rocks glass with ice');
          });
        }
        
        // Upewnij się, że sour ma sok cytrynowy
        const hasLemon = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lemon') || 
          i.name.toLowerCase().includes('cytry')
        );
        
        if (!hasLemon) {
          recipe.ingredients.splice(1, 0, {
            name: requestLanguage === 'pl' ? "świeżo wyciśnięty sok z cytryny" : "fresh lemon juice",
            amount: "30",
            unit: "ml"
          });
        }
      }
      
      // Popraw szkło dla klasycznych koktajli
      if (nameLower.includes('daiquiri') || nameLower.includes('margarita') || 
          nameLower.includes('clover club') || nameLower.includes('white lady') ||
          nameLower.includes('aviation') || nameLower.includes('sidecar')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek coupe" : "coupe glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      if (nameLower.includes('martini') && !nameLower.includes('porn star') && !nameLower.includes('espresso')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek martini" : "martini glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      if (nameLower.includes('manhattan')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek martini" : "martini glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      if (nameLower.includes('negroni') || nameLower.includes('boulevardier') || 
          nameLower.includes('old fashioned') || nameLower.includes('sazerac')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki lodu" : "cubed ice";
      }
      
      if (nameLower.includes('mojito') || nameLower.includes('cuba libre') || 
          nameLower.includes('tom collins') || nameLower.includes('paloma')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka highball" : "highball glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki lodu" : "cubed ice";
      }
      
      if (nameLower.includes('spritz') || nameLower.includes('hugo')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek do wina" : "wine glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki lodu" : "cubed ice";
      }
      
      if (nameLower.includes('french 75') || nameLower.includes('mimosa') || 
          nameLower.includes('bellini')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek flute" : "flute glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      // Popraw HUGO - zawsze kieliszek do wina
      if (nameLower.includes('hugo')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek do wina" : "wine glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki lodu" : "cubed ice";
        
        // Popraw instrukcje dla Hugo aby wspominały kieliszek do wina
        if (recipe.instructions && requestLanguage === 'pl') {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/szklanki highball/g, 'kieliszka do wina')
              .replace(/szklanka highball/g, 'kieliszek do wina')
              .replace(/szkle highball/g, 'kieliszku do wina');
          });
        } else if (recipe.instructions) {
          recipe.instructions = recipe.instructions.map(inst => {
            return inst
              .replace(/highball glass/g, 'wine glass')
              .replace(/highball/g, 'wine glass');
          });
        }
      }
      
      // Popraw BRAMBLE - zawsze szklanka rocks z kruszonym lodem
      if (nameLower.includes('bramble')) {
        recipe.glassType = requestLanguage === 'pl' ? "szklanka rocks" : "rocks glass";
        recipe.ice = requestLanguage === 'pl' ? "lód kruszony" : "crushed ice";
      }
      
      // Popraw COSMOPOLITAN - kieliszek coupe bez lodu
      if (nameLower.includes('cosmopolitan')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek coupe" : "coupe glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      // Popraw PORN STAR MARTINI - kieliszek coupe bez lodu
      if (nameLower.includes('porn star martini')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek coupe" : "coupe glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      // Popraw ESPRESSO MARTINI - kieliszek martini bez lodu
      if (nameLower.includes('espresso martini')) {
        recipe.glassType = requestLanguage === 'pl' ? "kieliszek martini" : "martini glass";
        recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
      }
      
      // Long Island Iced Tea specjalna obsługa
      if (nameLower.includes('long island')) {
        // Upewnij się, że jest shaken
        recipe.method = 'shaken';
        recipe.glassType = requestLanguage === 'pl' ? "szklanka highball" : "highball glass";
        recipe.ice = requestLanguage === 'pl' ? "kostki lodu" : "cubed ice";
        
        // Upewnij się, że ma colę
        const hasCola = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('cola') || 
          i.name.toLowerCase().includes('coli')
        );
        
        if (!hasCola) {
          recipe.ingredients.push({
            name: requestLanguage === 'pl' ? "cola" : "cola",
            amount: requestLanguage === 'pl' ? "do pełna" : "top up",
            unit: ""
          });
        }
        
        // Popraw instrukcje jeśli wspominają szklankę barmańską
        if (recipe.instructions && requestLanguage === 'pl') {
          recipe.instructions = recipe.instructions.map(inst => 
            inst.replace(/szklanicy barmańskiej/g, 'shakera')
                .replace(/szklankę barmańską/g, 'shaker')
                .replace(/mieszaj/g, 'wstrząśnij')
                .replace(/Mieszaj/g, 'Wstrząśnij')
          );
        }
      }
      
      // Moscow Mule - kubek miedziany preferowany
      if (nameLower.includes('moscow mule')) {
        recipe.glassType = requestLanguage === 'pl' ? "kubek miedziany" : "copper mug";
        recipe.ice = requestLanguage === 'pl' ? "kostki lodu" : "cubed ice";
        
        const hasLime = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lime') || 
          i.name.toLowerCase().includes('limonk')
        );
        
        if (!hasLime) {
          recipe.ingredients.splice(1, 0, {
            name: requestLanguage === 'pl' ? "świeżo wyciśnięty sok z limonki" : "fresh lime juice",
            amount: "15",
            unit: "ml"
          });
        }
      }
      
      // Mojito musi mieć wodę gazowaną
      if (nameLower.includes('mojito')) {
        const hasSoda = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('soda') || 
          i.name.toLowerCase().includes('woda gazowana')
        );
        
        if (!hasSoda) {
          recipe.ingredients.push({
            name: requestLanguage === 'pl' ? "woda gazowana" : "soda water",
            amount: requestLanguage === 'pl' ? "do pełna" : "top up",
            unit: ""
          });
        }
      }
      
      // Cuba Libre musi mieć sok z limonki
      if (nameLower.includes('cuba libre')) {
        const hasLime = recipe.ingredients.some(i => 
          i.name.toLowerCase().includes('lime') || 
          i.name.toLowerCase().includes('limonk')
        );
        
        if (!hasLime) {
          recipe.ingredients.splice(2, 0, {
            name: requestLanguage === 'pl' ? "świeżo wyciśnięty sok z limonki" : "fresh lime juice",
            amount: "10",
            unit: "ml"
          });
        }
      }
      
      // Upewnij się o prawidłowe proporcje dla klasycznych
      if (nameLower.includes('negroni') && recipe.ingredients.length >= 3) {
        recipe.ingredients[0].amount = "30";
        recipe.ingredients[1].amount = "30";
        recipe.ingredients[2].amount = "30";
      }
      
      // Popraw instrukcje dla kieliszków coupe/martini - bez lodu w kieliszku
      if ((recipe.glassType.includes('coupe') || recipe.glassType.includes('martini')) && 
          !recipe.glassType.includes('rocks') && !recipe.glassType.includes('highball')) {
        
        if (recipe.instructions && requestLanguage === 'pl') {
          recipe.instructions = recipe.instructions.map(inst => {
            if (inst.includes('przecedź')) {
              return inst.replace(/z lodem/g, '').replace(/z kostkami lodu/g, '');
            }
            return inst;
          });
          
          // Dodaj instrukcję o braku lodu w kieliszku jeśli potrzeba
          const lastInstruction = recipe.instructions[recipe.instructions.length - 1];
          if (!lastInstruction.includes('bez lodu')) {
            recipe.instructions[recipe.instructions.length - 1] = lastInstruction + ' Serwuj bez lodu w kieliszku.';
          }
        }
      }
      
      // Popraw dekoracje dla Long Island Iced Tea
      if (nameLower.includes('long island') && requestLanguage === 'pl') {
        recipe.garnish = recipe.garnish || "ćwiartka limonki";
      }
      
      // Popraw dekoracje dla sourów
      if (nameLower.includes('sour') && requestLanguage === 'pl') {
        recipe.garnish = recipe.garnish || "plasterek cytryny lub wiśnia koktajlowa";
      }
      
      // Upewnij się o wymagane pola
      recipe.name = recipe.name || finalCocktailName;
      recipe.nameEn = recipe.nameEn || finalCocktailName;
      recipe.category = recipe.category || "classic";
      recipe.method = recipe.method || "stirred";
      
      // Ustaw domyślny lód jeśli nie określono
      if (!recipe.ice) {
        if (recipe.glassType.includes('coupe') || recipe.glassType.includes('martini')) {
          recipe.ice = requestLanguage === 'pl' ? "bez lodu" : "no ice";
        } else {
          recipe.ice = requestLanguage === 'pl' ? "kostki lodu" : "cubed ice";
        }
      }
      
      // Upewnij się, że instrukcje są kompletne
      if (recipe.instructions && recipe.instructions.length > 0) {
        recipe.instructions = recipe.instructions.filter(inst => 
          inst && inst.length > 10 && !inst.endsWith('...')
        );
      }
      
      // Domyślne wartości dla kompatybilności z aplikacją
      recipe.difficulty = "medium";
      recipe.prepTime = 5;
      recipe.abv = 25;
      recipe.servingTemp = "5";
      recipe.flavor = "";
      recipe.occasion = "";
      recipe.proTip = "";
      recipe.tags = [];
      recipe.tips = "";
      recipe.funFact = recipe.history || "";
      recipe.alcoholContent = "medium";
      
    } catch (parseError) {
      console.error('Błąd parsowania:', parseError);
      console.error('Surowa odpowiedź:', aiResponse);
      return res.status(500).json({ 
        success: false,
        error: 'Nie udało się sparsować przepisu',
        message: 'Nieprawidłowa odpowiedź JSON'
      });
    }

    // Formatuj końcową odpowiedź
    const response = {
      ...recipe,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };

    console.log('✅ Przepis utworzony:', response.name);
    console.log('🌍 Język:', requestLanguage);
    console.log('🥃 Typ szkła:', response.glassType);
    console.log('🧊 Lód:', response.ice);
    console.log('📊 Składniki:', response.ingredients.map(i => `${i.name}: ${i.amount}${i.unit}`));
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Błąd generowania przepisu:', error);
    res.status(500).json({ 
      success: false,
      error: 'Nie udało się wygenerować przepisu',
      message: error.message 
    });
  }
};