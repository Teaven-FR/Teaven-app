// Écran Mes adresses — gestion locale avec add/delete/default
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Home, Briefcase, MapPin, Plus, Trash2, Check } from 'lucide-react-native';
import { colors, fonts, spacing, shadows, radii } from '@/constants/theme';
import type { Address } from '@/lib/types';

// TODO PRE-LAUNCH: charger les adresses depuis Supabase au montage
const INITIAL_ADDRESSES: Address[] = [];

const ICONS: Record<string, typeof Home> = {
  Maison: Home,
  Bureau: Briefcase,
};

export default function AdressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<Address[]>(INITIAL_ADDRESSES);
  const [modalVisible, setModalVisible] = useState(false);

  // Champs du formulaire
  const [formLabel, setFormLabel] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formPostal, setFormPostal] = useState('');
  const [formCity, setFormCity] = useState('');

  const setDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id })),
    );
  };

  const deleteAddress = (id: string) => {
    Alert.alert(
      'Supprimer l\'adresse',
      'Voulez-vous vraiment supprimer cette adresse ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            setAddresses((prev) => {
              const filtered = prev.filter((a) => a.id !== id);
              // Si on supprime la default et qu'il reste des adresses, on met la première en default
              if (prev.find((a) => a.id === id)?.isDefault && filtered.length > 0) {
                filtered[0].isDefault = true;
              }
              return filtered;
            }),
        },
      ],
    );
  };

  const addAddress = () => {
    if (!formLabel.trim() || !formStreet.trim() || !formCity.trim()) return;
    const newAddr: Address = {
      id: Date.now().toString(),
      label: formLabel.trim(),
      street: formStreet.trim(),
      city: formCity.trim(),
      postalCode: formPostal.trim(),
      isDefault: addresses.length === 0,
    };
    setAddresses((prev) => [...prev, newAddr]);
    setModalVisible(false);
    setFormLabel('');
    setFormStreet('');
    setFormPostal('');
    setFormCity('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Mes adresses</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Liste des adresses */}
        {addresses.map((addr) => {
          const Icon = ICONS[addr.label] ?? MapPin;
          return (
            <View key={addr.id} style={styles.addressCard}>
              <View style={styles.addressIconWrap}>
                <Icon size={18} color={colors.green} strokeWidth={1.8} />
              </View>
              <View style={styles.addressContent}>
                <View style={styles.addressLabelRow}>
                  <Text style={styles.addressLabel}>{addr.label}</Text>
                  {addr.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Par défaut</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressText}>
                  {addr.street}, {addr.postalCode} {addr.city}
                </Text>
              </View>
              <View style={styles.addressActions}>
                {!addr.isDefault && (
                  <Pressable
                    onPress={() => setDefault(addr.id)}
                    style={styles.actionBtn}
                    hitSlop={8}
                    accessibilityLabel="Définir par défaut"
                  >
                    <Check size={16} color={colors.green} strokeWidth={2} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => deleteAddress(addr.id)}
                  style={styles.actionBtn}
                  hitSlop={8}
                  accessibilityLabel="Supprimer l'adresse"
                >
                  <Trash2 size={16} color={colors.error} strokeWidth={1.8} />
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Bouton ajouter */}
        <Pressable
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une adresse"
        >
          <Plus size={18} color={colors.green} strokeWidth={2} />
          <Text style={styles.addButtonText}>Ajouter une adresse</Text>
        </Pressable>

        {/* Note livraison */}
        <Text style={styles.note}>
          La livraison à domicile sera disponible prochainement
        </Text>
      </ScrollView>

      {/* Modal ajout adresse */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Nouvelle adresse</Text>

            <TextInput
              style={styles.input}
              placeholder="Libellé (ex: Maison, Bureau…)"
              placeholderTextColor={colors.textMuted}
              value={formLabel}
              onChangeText={setFormLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="Rue et numéro"
              placeholderTextColor={colors.textMuted}
              value={formStreet}
              onChangeText={setFormStreet}
            />
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputPostal]}
                placeholder="Code postal"
                placeholderTextColor={colors.textMuted}
                value={formPostal}
                onChangeText={setFormPostal}
                keyboardType="numeric"
                maxLength={5}
              />
              <TextInput
                style={[styles.input, styles.inputCity]}
                placeholder="Ville"
                placeholderTextColor={colors.textMuted}
                value={formCity}
                onChangeText={setFormCity}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveBtn,
                  (!formLabel || !formStreet || !formCity) && { opacity: 0.5 },
                ]}
                onPress={addAddress}
                disabled={!formLabel || !formStreet || !formCity}
              >
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 100,
    gap: spacing.md,
  },

  // Address cards
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: spacing.md,
    ...shadows.subtle,
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContent: {
    flex: 1,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  addressLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  defaultBadge: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 50,
  },
  defaultBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.green,
  },
  addressText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  addressActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bouton ajouter
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.green,
  },

  // Note
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xxl,
    paddingBottom: 40,
    gap: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  input: {
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputPostal: {
    width: 110,
  },
  inputCity: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
