// Bouton principal réutilisable — scale 0.97 press feedback
import { useRef, useCallback } from 'react';
import { Pressable, Text, Animated, StyleSheet, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { colors, fonts, radii, spacing } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const useNative = Platform.OS !== 'web';

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, damping: 15, stiffness: 300, useNativeDriver: useNative }).start();
  }, [scale, useNative]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 300, useNativeDriver: useNative }).start();
  }, [scale, useNative]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.base,
          styles[variant],
          styles[`size_${size}`],
          disabled && styles.disabled,
          style,
          { transform: [{ scale }] },
        ]}
      >
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
            styles[`textSize_${size}`],
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  primary: {
    backgroundColor: colors.green,
  },
  secondary: {
    backgroundColor: colors.greenLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  size_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  size_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  text_primary: {
    color: '#FFFFFF',
  } as TextStyle,
  text_secondary: {
    color: colors.green,
  } as TextStyle,
  text_outline: {
    color: colors.text,
  } as TextStyle,
  textSize_sm: {
    fontSize: 12,
  },
  textSize_md: {
    fontSize: 14,
  },
  textSize_lg: {
    fontSize: 16,
  },
});
