{/* Result Modal */}
<Modal
  visible={showResultModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowResultModal(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Close Button */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => {
            setShowResultModal(false);
            setCapturedImage(null);
            setBottleData(null);
          }}
        >
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>

        {/* Captured Image */}
        {capturedImage && (
          <Image source={{ uri: capturedImage }} style={styles.resultImage} />
        )}

        {/* Bottle Info */}
        {bottleData && (
          <>
            <Text style={styles.bottleName}>{bottleData.name}</Text>
            <Text style={styles.bottleBrand}>{bottleData.brand}</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('scanner.type') || 'Typ'}</Text>
                <Text style={styles.infoValue}>{bottleData.type}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('scanner.country') || 'Kraj'}</Text>
                <Text style={styles.infoValue}>{bottleData.country}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('scanner.abv') || 'Moc'}</Text>
                <Text style={styles.infoValue}>{bottleData.abv}%</Text>
              </View>
            </View>

            {/* Description - Extended */}
            {bottleData.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('scanner.description') || 'Opis'}
                </Text>
                <Text style={styles.description}>{bottleData.description}</Text>
              </View>
            )}

            {/* Flavor Notes - Simple */}
            {bottleData.flavorNotes && (
              <View style={[styles.section, styles.flavorSection]}>
                <Text style={styles.sectionTitle}>
                  {t('scanner.flavorProfile') || 'Charakterystyka smakowa'}
                </Text>
                <Text style={styles.flavorText}>{bottleData.flavorNotes}</Text>
              </View>
            )}

            {/* Fun Fact */}
            {bottleData.funFact && (
              <View style={[styles.section, styles.funFactSection]}>
                <View style={styles.funFactHeader}>
                  <Ionicons name="bulb-outline" size={20} color={COLORS.accent} />
                  <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>
                    {t('scanner.funFact') || 'Ciekawostka'}
                  </Text>
                </View>
                <Text style={styles.funFactText}>{bottleData.funFact}</Text>
              </View>
            )}

            {/* Cocktail Suggestions */}
            {bottleData.cocktailSuggestions && bottleData.cocktailSuggestions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('scanner.cocktailSuggestions') || 'Polecane koktajle'}
                </Text>
                <View style={styles.cocktailGrid}>
                  {bottleData.cocktailSuggestions.map((cocktail, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.cocktailChip}
                      onPress={() => {
                        setShowResultModal(false);
                        navigation.navigate('Recipes', { searchQuery: cocktail });
                      }}
                    >
                      <Text style={styles.cocktailChipText}>{cocktail}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <TouchableOpacity 
              style={styles.addToBarButton}
              onPress={addBottleToBar}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.text} />
              <Text style={styles.addToBarButtonText}>
                {t('scanner.addToBar') || 'Dodaj do mojego baru'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  </View>
</Modal>