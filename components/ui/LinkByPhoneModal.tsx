import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Phone, CheckCircle2 } from 'lucide-react-native';
import { colors, fonts, spacing } from '@/constants/theme';
import { useLinkByPhone, LinkByPhoneResult } from '@/hooks/useLinkByPhone';

interface LinkByPhoneModalProps {
  visible: boolean;
  onClose: () => void;
  onLinked: (result: LinkByPhoneResult) => void;
}

export function LinkByPhoneModal({ visible, onClose, onLinked }: LinkByPhoneModalProps) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const { link, loading, error } = useLinkByPhone();

  const handleSubmit = async () => {
    const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
    if (cleaned.length < 10) return;
    const result = await link(cleaned);
    if (result) {
      onLinked(result);
      setPhone('');
      onClose();
    }
  };

  const isValid = phone.replace(/[\s\-\.\(\)]/g, '').length >= 10;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Phone size={24} color={colors.green} />
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.title}>Retrouver mon compte</Text>
          <Text style={styles.subtitle}>
            Entrez le numéro que vous utilisez en boutique. On retrouve votre solde et vos points
            automatiquement.
          </Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Numéro de téléphone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="06 12 34 56 78"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              autoFocus
              maxLength={20}
              editable={!loading}
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={!isValid || loading}
            style={[styles.submitBtn, (!isValid || loading) && styles.submitBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <CheckCircle2 size={18} color="#fff" />
                <Text style={styles.submitText}>Lier mon compte</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.legal}>
            Si aucun compte n'existe avec ce numéro, on en crée un nouveau pour vous.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#991B1B',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.green,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  legal: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
