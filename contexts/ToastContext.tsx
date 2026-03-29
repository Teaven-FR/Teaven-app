// Contexte Toast — notifications éphémères slide from top, design Teaven
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, AlertCircle, Info } from 'lucide-react-native';
import { colors, fonts, spacing } from '@/constants/theme';

interface ToastContextType {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info'>('success');
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, t: 'success' | 'error' | 'info' = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setText(msg);
    setType(t);
    setVisible(true);

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

  const iconColor = type === 'error' ? '#C44040' : type === 'info' ? '#5A6F96' : colors.green;
  const bgColor = type === 'error' ? '#FEF0F0' : type === 'info' ? '#F0F4F8' : '#EEF4F0';
  const borderCol = type === 'error' ? '#F5D5D5' : type === 'info' ? '#D8E2EE' : '#D4E5D7';
  const IconComp = type === 'error' ? AlertCircle : type === 'info' ? Info : Check;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toast,
            {
              top: insets.top + 12,
              backgroundColor: bgColor,
              borderColor: borderCol,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
            <IconComp size={16} color={iconColor} strokeWidth={2.5} />
          </View>
          <Text style={styles.text} numberOfLines={2}>{text}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 99999,
    elevation: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#2A2A2A',
    flex: 1,
    lineHeight: 19,
  },
});
