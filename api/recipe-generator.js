// src/screens/main/RecipeGeneratorScreen.tsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { ThemeContext } from '../../context/ThemeContext';
import { LanguageContext } from '../../context/LanguageContext';
import { AuthContext } from '../../context/AuthContext';
import { SubscriptionContext } from '../../context/SubscriptionContext';
import { getDrinkRecipe } from '../../services/api/openai';
import { globalStyles } from '../../styles/globalStyles';
import { addToFavorites, removeFromFavorites, isFavorite } from '../../services/storage/favorites';

const RecipeGeneratorScreen = ({ route }: any) => {
  const navigation = useNavigation();
  const { COLORS } = useContext(ThemeContext);
  const { t, language } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const subscriptionContext = useContext(SubscriptionContext);
  
  // Zabezpieczenie przed undefined
  const checkLimit = subscriptionContext?.checkLimit || (async () => true);
  const incrementUsage = subscriptionContext?.incrementUsage || (async () => {});
  
  const [drinkName, setDrinkName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [isFav, setIsFav] = useState(false);
  const lastProcessedCocktail = useRef<string>('');
  const isProcessing = useRef(false);

  // Funkcje pomocnicze do tłumaczenia
  const translateMethod = (method: string): string => {
    if (language !== 'pl') return method;
    
    const methodTranslations: { [key: string]: string } = {
      'shaken': 'wstrząsany',
      'stirred': 'mieszany łyżką barmańską',
      'built': 'budowany',
      'blended': 'blendowany',
      'thrown': 'rzucany',
      'rolled': 'toczony',
      'muddled': 'ugniatany',
    };
    
    return methodTranslations[method?.toLowerCase()] || method;
  };

  const translateGlass = (glassType: string): string => {
    if (language !== 'pl') return glassType;
    
    const glassTranslations: { [key: string]: string } = {
      'rocks': 'szklanka rocks',
      'coupe': 'kieliszek coupe',
      'highball': 'szklanka highball',
      'martini': 'kieliszek martini',
      'collins': 'szklanka collins',
      'hurricane': 'szklanka hurricane',
      'flute': 'kieliszek flute',
      'shot': 'kieliszek shot',
      'wine': 'kieliszek do wina',
      'old fashioned': 'szklanka old fashioned',
      'nick and nora': 'kieliszek nick & nora',
      'copper mug': 'kubek miedziany',
      'tiki': 'kubek tiki',
      'julep cup': 'kubek julep',
      'champagne': 'kieliszek do szampana',
      'glass': 'szklanka',
    };
    
    return glassTranslations[glassType?.toLowerCase()] || glassType;
  };

  // Sprawdź czy przepis jest w ulubionych
  const checkFavorite = async () => {
    if (user && generatedRecipe) {
      const fav = await isFavorite(user.uid, generatedRecipe.id);
      setIsFav(fav);
    }
  };

  useEffect(() => {
    checkFavorite();
  }, [generatedRecipe, user]);

  // Funkcja dodawania do ulubionych
  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert(
        t('common.error') || 'Błąd',
        'Zaloguj się, aby zapisywać ulubione przepisy'
      );
      return;
    }

    if (!generatedRecipe) return;

    try {
      if (isFav) {
        await removeFromFavorites(user.uid, generatedRecipe.id);
        setIsFav(false);
        Alert.alert(
          t('common.success') || 'Sukces',
          'Usunięto z ulubionych'
        );
      } else {
        await addToFavorites(user.uid, generatedRecipe);
        setIsFav(true);
        Alert.alert(
          t('common.success') || 'Sukces',
          'Dodano do ulubionych!'
        );
      }
    } catch (error) {
      Alert.alert(
        t('common.error') || 'Błąd',
        t('recipes.favoriteError') || 'Nie udało się zapisać'
      );
    }
  };

  // Obsługa parametrów nawigacji
  useFocusEffect(
    React.useCallback(() => {
      const autoGenerate = route?.params?.autoGenerate;
      const cocktailName = route?.params?.cocktailName;
      
      if (autoGenerate && cocktailName && cocktailName !== lastProcessedCocktail.current && !isProcessing.current) {
        console.log('🚀 Processing new cocktail:', cocktailName);
        lastProcessedCocktail.current = cocktailName;
        isProcessing.current = true;
        
        // Ustaw nazwę w input
        setDrinkName(cocktailName);
        
        // Zamknij poprzedni modal jeśli jest otwarty
        if (showRecipeModal) {
          setShowRecipeModal(false);
          setGeneratedRecipe(null);
        }
        
        // Wygeneruj nowy przepis
        setTimeout(() => {
          generateRecipe(cocktailName).finally(() => {
            isProcessing.current = false;
          });
        }, 300);
      }
      
      return () => {};
    }, [route?.params?.cocktailName, route?.params?.autoGenerate])
  );

  // Check usage limits
  const checkUsageLimit = async () => {
    if (!user) return false;
    
    const canGenerate = await checkLimit('recipes');
    
    if (!canGenerate) {
      Alert.alert(
        t('limits.reached') || 'Limit osiągnięty',
        t('limits.upgradePrompt') || 'Ulepsz do Premium dla nieograniczonych przepisów',
        [
          { text: t('common.cancel') || 'Anuluj', style: 'cancel' },
          { 
            text: t('subscription.title') || 'Ulepsz', 
            onPress: () => navigation.navigate('Subscription' as never) 
          }
        ]
      );
      return false;
    }
    return true;
  };

  const generateRecipe = async (overrideName?: string) => {
    // Użyj przekazanej nazwy lub aktualnej wartości input
    const cocktailToGenerate = overrideName || drinkName;
    
    if (!cocktailToGenerate.trim()) {
      Alert.alert(
        t('common.error') || 'Błąd',
        t('recipes.enterDrinkName') || 'Wpisz nazwę koktajlu'
      );
      return;
    }

    const canGenerate = await checkUsageLimit();
    if (!canGenerate) return;

    setIsGenerating(true);
    try {
      console.log('🍹 Generating professional recipe for:', cocktailToGenerate);
      
      const recipe = await getDrinkRecipe(cocktailToGenerate, [], language);
      
      console.log('📖 Professional recipe generated:', recipe);
      
      setGeneratedRecipe(recipe);
      setShowRecipeModal(true);
      setIsFav(false); // Reset favorite status for new recipe
      
      // Increment usage
      await incrementUsage('recipes');
      
      // Clear the input only if manually generated
      if (!overrideName) {
        setDrinkName('');
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      Alert.alert(
        t('common.error') || 'Błąd',
        t('recipes.generateError') || 'Nie udało się wygenerować przepisu'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModalClose = () => {
    setShowRecipeModal(false);
    setGeneratedRecipe(null);
    setIsFav(false);
    if (route?.params?.autoGenerate) {
      setDrinkName('');
      lastProcessedCocktail.current = '';
    }
  };

  // Ikona metody przygotowania
  const getMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'shaken': return 'flash';
      case 'stirred': return 'sync';
      case 'built': return 'layers';
      case 'blended': return 'nutrition';
      default: return 'wine';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              {t('recipes.title') || 'Generator przepisów'}
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>
              {t('recipes.enterNameAndGenerate') || 'Profesjonalne przepisy z prawdziwą historią'}
            </Text>
          </View>

          {/* Input Field */}
          <View style={[styles.inputContainer, globalStyles.stableCard, { backgroundColor: COLORS.surface }]}>
            <Ionicons name="wine" size={24} color={COLORS.textSecondary} />
            <TextInput
              style={[styles.input, { color: COLORS.text }]}
              placeholder={t('recipes.drinkNamePlaceholder') || 'np. Mojito, Margarita...'}
              placeholderTextColor={COLORS.textSecondary}
              value={drinkName}
              onChangeText={setDrinkName}
              returnKeyType="go"
              onSubmitEditing={() => generateRecipe()}
              autoCapitalize="words"
            />
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.generateButton, globalStyles.stableCard]}
            onPress={() => generateRecipe()}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primary + 'CC']}
              style={styles.generateGradient}
            >
              {isGenerating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={24} color="#000" />
                  <Text style={styles.generateText}>
                    {t('recipes.generate') || 'Generuj przepis'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Suggestions */}
          <View style={styles.suggestionsSection}>
            <Text style={[styles.suggestionTitle, { color: COLORS.textSecondary }]}>
              {t('recipes.tryThese') || 'Klasyki barowe:'}
            </Text>
            <View style={styles.suggestionsList}>
              {['Mojito', 'Margarita', 'Negroni', 'Old Fashioned', 'Manhattan', 'Daiquiri', 'Cuba Libre', 'Whisky Sour', 'Aperol Spritz', 'Espresso Martini', 'Cosmopolitan', 'Mai Tai'].map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={[styles.suggestionChip, globalStyles.stableCard, { backgroundColor: COLORS.surface }]}
                  onPress={() => setDrinkName(suggestion)}
                >
                  <Text style={[styles.suggestionText, { color: COLORS.text }]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Professional Recipe Modal */}
      <Modal
        visible={showRecipeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.surface }]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={[styles.modalTitle, { color: COLORS.text }]}>
                    {generatedRecipe?.name?.toUpperCase() || 'COCKTAIL'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleModalClose}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {generatedRecipe && (
                <>
                  {/* Historia */}
                  {generatedRecipe.history && (
                    <View style={[styles.historySection, globalStyles.stableCard, { backgroundColor: COLORS.background }]}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="book-outline" size={20} color={COLORS.primary} />
                        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
                          {t('recipes.history') || 'HISTORIA'}
                        </Text>
                      </View>
                      <Text style={[styles.historyText, { color: COLORS.textSecondary }]}>
                        {generatedRecipe.history}
                      </Text>
                    </View>
                  )}

                  {/* Professional Info Bar - BEZ TEMPERATURY */}
                  <View style={styles.infoBar}>
                    <View style={[styles.infoBox, globalStyles.stableCard, { backgroundColor: COLORS.background }]}>
                      <Ionicons name={getMethodIcon(generatedRecipe.method)} size={20} color={COLORS.primary} />
                      <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>
                        {t('recipes.method') || 'Metoda'}
                      </Text>
                      <Text style={[styles.infoValue, { color: COLORS.text }]} numberOfLines={2} adjustsFontSizeToFit>
                        {translateMethod(generatedRecipe.method)}
                      </Text>
                    </View>
                    
                    <View style={[styles.infoBox, globalStyles.stableCard, { backgroundColor: COLORS.background }]}>
                      <Ionicons name="wine" size={20} color={COLORS.primary} />
                      <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>
                        {t('recipes.glass') || 'Szkło'}
                      </Text>
                      <Text style={[styles.infoValue, { color: COLORS.text }]} numberOfLines={2} adjustsFontSizeToFit>
                        {translateGlass(generatedRecipe.glassType)}
                      </Text>
                    </View>
                    
                    <View style={[styles.infoBox, globalStyles.stableCard, { backgroundColor: COLORS.background }]}>
                      <Ionicons name="water" size={20} color={COLORS.primary} />
                      <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>
                        ABV
                      </Text>
                      <Text style={[styles.infoValue, { color: COLORS.text }]}>
                        {generatedRecipe.abv}%
                      </Text>
                    </View>
                  </View>

                  {/* Składniki */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="flask-outline" size={20} color={COLORS.primary} />
                      <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
                        {t('recipes.ingredients') || 'SKŁADNIKI'}
                      </Text>
                    </View>
                    {generatedRecipe.ingredients.map((ing: any, index: number) => (
                      <View key={index} style={[styles.ingredientRow, { borderBottomColor: COLORS.border }]}>
                        <Text style={[styles.ingredientName, { color: COLORS.text }]}>
                          {ing.name}
                        </Text>
                        <View style={styles.ingredientMeasure}>
                          <Text style={[styles.ingredientAmount, { color: COLORS.primary }]}>
                            {ing.amount}
                          </Text>
                          <Text style={[styles.ingredientUnit, { color: COLORS.textSecondary }]}>
                            {ing.unit}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Przygotowanie */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="construct-outline" size={20} color={COLORS.primary} />
                      <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
                        {t('recipes.instructions') || 'PRZYGOTOWANIE'}
                      </Text>
                    </View>
                    {generatedRecipe.instructions.map((step: string, index: number) => (
                      <View key={index} style={styles.instructionStep}>
                        <View style={[styles.stepNumber, { backgroundColor: COLORS.primary }]}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.instructionText, { color: COLORS.text }]}>
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Serwowanie */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="wine-outline" size={20} color={COLORS.primary} />
                      <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
                        {t('recipes.serving') || 'SERWOWANIE'}
                      </Text>
                    </View>
                    <View style={[styles.servingInfo, globalStyles.stableCard, { backgroundColor: COLORS.background }]}>
                      {generatedRecipe.ice && (
                        <View style={styles.servingItem}>
                          <Ionicons name="snow" size={18} color={COLORS.primary} />
                          <Text style={[styles.servingText, { color: COLORS.text }]}>
                            {generatedRecipe.ice === 'brak' || generatedRecipe.ice === 'none' 
                              ? t('recipes.noIce') || 'Brak lodu'
                              : `${t('recipes.ice') || 'Lód'}: ${generatedRecipe.ice}`}
                          </Text>
                        </View>
                      )}
                      {generatedRecipe.garnish && (
                        <View style={styles.servingItem}>
                          <Ionicons name="leaf" size={18} color={COLORS.primary} />
                          <Text style={[styles.servingText, { color: COLORS.text }]}>
                            {generatedRecipe.garnish}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Pro Tip */}
                  {generatedRecipe.proTip && (
                    <View style={[styles.proTipSection, globalStyles.stableCard, { backgroundColor: COLORS.accent + '20' }]}>
                      <View style={styles.proTipHeader}>
                        <Ionicons name="bulb" size={20} color={COLORS.accent} />
                        <Text style={[styles.proTipTitle, { color: COLORS.accent }]}>
                          {t('recipes.proTip') || 'PRO TIP'}
                        </Text>
                      </View>
                      <Text style={[styles.proTipText, { color: COLORS.text }]}>
                        {generatedRecipe.proTip}
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons - TYLKO SERDUSZKO I NOWY PRZEPIS */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, globalStyles.stableCard, { backgroundColor: COLORS.primary }]}
                      onPress={toggleFavorite}
                    >
                      <Ionicons 
                        name={isFav ? "heart" : "heart-outline"} 
                        size={20} 
                        color="#000" 
                      />
                      <Text style={styles.actionButtonText}>
                        {isFav ? 'Zapisano' : 'Dodaj do ulubionych'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.secondaryButton, globalStyles.stableCard, { borderColor: COLORS.primary }]}
                      onPress={() => {
                        handleModalClose();
                        setDrinkName('');
                      }}
                    >
                      <Ionicons name="refresh" size={20} color={COLORS.primary} />
                      <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
                        {t('recipes.generateNew') || 'Nowy przepis'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    borderRadius: 16,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontSize: 18,
    marginLeft: 12,
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  generateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  suggestionsSection: {
    alignItems: 'center',
  },
  suggestionTitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  suggestionChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  historySection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  historyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoBar: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 10,
  },
  infoBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minHeight: 90,
  },
  infoLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  section: {
    marginBottom: 24,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ingredientName: {
    fontSize: 16,
    flex: 1,
  },
  ingredientMeasure: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  ingredientAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  ingredientUnit: {
    fontSize: 14,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  servingInfo: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  servingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  servingText: {
    fontSize: 15,
    flex: 1,
  },
  proTipSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  proTipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  proTipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default RecipeGeneratorScreen;