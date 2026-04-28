// Contexte Toast + Célébration — notifications éphémères + modales full-screen
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Modal, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Check, AlertCircle, Info, Star, Gift, Trophy, Sparkles } from 'lucide-react-native';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { colors, fonts, spacing } from '@/constants/theme';

interface CelebrationData {
  title: string;
  subtitle: string;
  description?: string;
  type?: 'level_up' | 'challenge_complete' | 'first_order' | 'first_topup' | 'gift_received';
}

interface ToastContextType {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  showCelebration: (data: CelebrationData) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {}, showCelebration: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const CELEBRATION_ICONS: Record<string, typeof Star> = {
  level_up: Trophy,
  challenge_complete: Star,
  first_order: Sparkles,
  first_topup: Sparkles,
  gift_received: Gift,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  // ── Toast state ──
  const [text, setText] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info'>('success');
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Celebration state ──
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showContinueBtn, setShowContinueBtn] = useState(false);
  const celebScale = useRef(new Animated.Value(0)).current;
  const celebOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((msg: string, t: 'success' | 'error' | 'info' = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setText(msg);
    setType(t);
    setVisible(true);

    if (t === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (t === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    translateY.setValue(-100);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 15, stiffness: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(() => setVisible(false));
    }, 2500);
  }, [translateY, opacity]);

  const showCelebrationFn = useCallback((data: CelebrationData) => {
    setCelebration(data);
    setCelebrationVisible(true);
    setShowConfetti(true);
    setShowContinueBtn(false);

    celebScale.setValue(0);
    celebOpacity.setValue(0);
    btnOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(celebScale, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(celebOpacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    // Afficher le bouton "Continuer" après 2s
    setTimeout(() => {
      setShowContinueBtn(true);
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start();
    }, 2000);
  }, [celebScale, celebOpacity, btnOpacity]);

  const closeCelebration = useCallback(() => {
    setShowConfetti(false);
    setCelebrationVisible(false);
    setCelebration(null);
    setShowContinueBtn(false);
  }, []);

  const bgColor = type === 'error' ? '#C44040' : type === 'info' ? '#4A6B82' : '#75967F';
  const IconComp = type === 'error' ? AlertCircle : type === 'info' ? Info : Check;
  const CelebIcon = celebration ? (CELEBRATION_ICONS[celebration.type ?? 'first_order'] ?? Sparkles) : Sparkles;

  return (
    <ToastContext.Provider value={{ showToast, showCelebration: showCelebrationFn }}>
      {children}

      {/* ── Toast ── */}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              top: insets.top + 12,
              backgroundColor: bgColor,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View style={styles.iconWrap}>
            <IconComp size={16} color="#F0F0E5" strokeWidth={2.5} />
          </View>
          <Text style={styles.text} numberOfLines={2}>{text}</Text>
        </Animated.View>
      )}

      {/* ── Celebration Modal ── */}
      <Modal visible={celebrationVisible} transparent animationType="fade">
        <View style={styles.celebOverlay}>
          <ConfettiOverlay visible={showConfetti} onComplete={() => setShowConfetti(false)} />
          <Animated.View style={[
            styles.celebCard,
            { transform: [{ scale: celebScale }], opacity: celebOpacity },
          ]}>
            <View style={styles.celebIconCircle}>
              <CelebIcon size={32} color={colors.green} strokeWidth={1.5} />
            </View>
            <Text style={styles.celebTitle}>{celebration?.title}</Text>
            <Text style={styles.celebSubtitle}>{celebration?.subtitle}</Text>
            {celebration?.description && (
              <Text style={styles.celebDesc}>{celebration.description}</Text>
            )}
            {showContinueBtn && (
              <Animated.View style={{ opacity: btnOpacity, width: '100%' }}>
                <Pressable style={styles.celebBtn} onPress={closeCelebration}>
                  <Text style={styles.celebBtnText}>Continuer</Text>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  // Toast
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 99999,
    elevation: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#F0F0E5',
    flex: 1,
    lineHeight: 19,
  },

  // Celebration
  celebOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  celebCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  celebIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  celebTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  celebSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  celebDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  celebBtn: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  celebBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
