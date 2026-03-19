// Modal de recherche — plein écran avec résultats en temps réel
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, SearchX } from 'lucide-react-native';
import { mockProducts } from '@/constants/mockData';
import { colors, fonts, spacing, radii } from '@/constants/theme';
import type { Product } from '@/lib/types';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}

export function SearchModal({ visible, onClose, onSelect }: SearchModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Autofocus à l'ouverture
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [visible]);

  // Recherche dans les produits
  const results = query.length >= 1
    ? mockProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Barre de recherche */}
        <View style={styles.header}>
          <View style={styles.inputWrap}>
            <Search size={16} color={colors.textMuted} strokeWidth={1.6} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un produit..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>

        {/* Résultats */}
        {query.length > 0 && results.length === 0 ? (
          <View style={styles.empty}>
            <SearchX size={40} color={colors.textMuted} strokeWidth={1.2} />
            <Text style={styles.emptyTitle}>Aucun résultat pour "{query}"</Text>
            <Text style={styles.emptySubtitle}>
              Essayez avec un autre terme
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={({ pressed }) => [styles.resultItem, pressed && { opacity: 0.7 }]}
              >
                <Image
                  source={{ uri: item.image }}
                  style={styles.resultImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
                <Text style={styles.resultPrice}>{formatPrice(item.price)}</Text>
              </Pressable>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  inputWrap: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.green,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  resultImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  resultDescription: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  resultPrice: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 13,
    color: colors.green,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
