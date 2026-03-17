// Layout des onglets — tab bar custom
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/layout/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="carte" />
      <Tabs.Screen name="panier" />
      <Tabs.Screen name="blog" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
