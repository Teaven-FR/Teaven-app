// Tab bar custom — navigation principale
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, UtensilsCrossed, ShoppingBag, BookOpen, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { useCartStore } from '@/stores/cartStore';
import { colors, fonts, typography } from '@/constants/theme';

const ICON_SIZE = 20;
const STROKE_WIDTH = 1.6;

const TAB_CONFIG = [
  { name: 'index', label: 'Accueil', Icon: Home },
  { name: 'carte', label: 'Carte', Icon: UtensilsCrossed },
  { name: 'panier', label: 'Panier', Icon: ShoppingBag },
  { name: 'blog', label: 'Blog', Icon: BookOpen },
  { name: 'profil', label: 'Profil', Icon: User },
] as const;

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const totalItems = useCartStore((s) => s.totalItems());

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TAB_CONFIG.map((tab, index) => {
        const isFocused = state.index === index;
        const color = isFocused ? colors.green : colors.textMuted;

        const handlePress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index]?.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(state.routes[index]?.name ?? tab.name);
          }
        };

        return (
          <Pressable
            key={tab.name}
            onPress={handlePress}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={tab.label}
          >
            <View style={styles.iconContainer}>
              <tab.Icon size={ICON_SIZE} color={color} strokeWidth={STROKE_WIDTH} />
              {tab.name === 'panier' && totalItems > 0 && (
                <Badge count={totalItems} />
              )}
            </View>
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(242,241,234,0.92)',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 10,
    height: 78,
    ...Platform.select({
      ios: {
        // Backdrop blur géré nativement sur iOS via BlurView si besoin
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  label: {
    ...typography.navLabel,
  },
});
