// Contexte Toast — notifications éphémères slide from top, design Teaven
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, AlertCircle, Info } from 'lucide-react-native';
import { colors, fonts, spacing } from '@/constants/theme';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const counterRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (text: string, type: 'success' | 'error' | 'info' = 'success') => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      counterRef.current += 1;
      setToast({ id: counterRef.current, text, type });

      // Slide down from top
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 18,
          stiffness: 180,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      // Disparaître après 2.5s
      timeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -120,
            duration: 300,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start(() => setToast(null));
      }, 2500);
    },
    [slideAnim, opacityAnim],
  );

  const getIcon = (type: string) => {
    if (type === 'error') return AlertCircle;
    if (type === 'info') return Info;
    return Check;
  };

  const getColors = (type: string) => {
    if (type === 'error') return { bg: '#FEF0F0', icon: '#C44040', border: '#F5D5D5' };
    if (type === 'info') return { bg: '#F0F4F8', icon: '#5A6F96', border: '#D8E2EE' };
    return { bg: '#FFFFFF', icon: colors.green, border: '#E8EDE9' };
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (() => {
        const Icon = getIcon(toast.type);
        const c = getColors(toast.type);
        return (
          <Animated.View
            style={[
              styles.toast,
              {
                top: insets.top + 10,
                backgroundColor: c.bg,
                borderColor: c.border,
                transform: [{ translateY: slideAnim }],
                opacity: opacityAnim,
              },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
              <Icon size={15} color={c.icon} strokeWidth={2.5} />
            </View>
            <Text style={styles.text} numberOfLines={2}>{toast.text}</Text>
          </Animated.View>
        );
      })()}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
});
