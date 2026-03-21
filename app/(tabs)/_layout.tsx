import { Tabs, useRouter } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fontSizes, fontWeights, shadows } from '../../src/constants/theme';
import { useMissionsStore, selectNextMission } from '../../src/store/missionsStore';
import { FUN_RUN_ID } from '../../src/constants/missions';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TAB_SLOTS: Array<{ route: string; label: string; icon: MaterialIconName } | 'run'> = [
  { route: 'index', label: 'HOME', icon: 'home' },
  { route: 'journey', label: 'JOURNEY', icon: 'map' },
  'run',
  { route: 'stats', label: 'STATS', icon: 'bar-chart' },
  { route: 'profile', label: 'PROFILE', icon: 'person' },
];

function WastelandTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const nextMission = useMissionsStore(selectNextMission);

  const tabRoutes = state.routes;

  function handleRunPress() {
    const id = nextMission ? nextMission.id : FUN_RUN_ID;
    router.push(`/run/${id}` as any);
  }

  function handleTabPress(routeName: string) {
    const routeIndex = tabRoutes.findIndex((r) => r.name === routeName);
    if (routeIndex === -1) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: tabRoutes[routeIndex].key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  return (
    <View style={styles.tabBarContainer}>
      {/* Top edge line */}
      <View style={styles.topLine} />

      <View style={styles.tabBar}>
        {TAB_SLOTS.map((slot, idx) => {
          if (slot === 'run') {
            const isFreeRun = !nextMission;
            return (
              <View key="run" style={styles.runSlot}>
                <TouchableOpacity
                  onPress={handleRunPress}
                  activeOpacity={0.8}
                  style={[styles.runBtn, isFreeRun && styles.runBtnFreeRun]}
                >
                  <MaterialIcons name="directions-run" size={30} color={colors.textInverse} />
                </TouchableOpacity>
                <Text style={styles.runLabel}>{isFreeRun ? 'FREE RUN' : 'RUN'}</Text>
              </View>
            );
          }

          const { route, label, icon } = slot;
          const routeIndex = tabRoutes.findIndex((r) => r.name === route);
          const focused = routeIndex !== -1 && state.index === routeIndex;

          return (
            <TouchableOpacity
              key={route}
              style={styles.tabSlot}
              onPress={() => handleTabPress(route)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={icon}
                size={22}
                color={focused ? colors.tabActive : colors.tabInactive}
              />
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <WastelandTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="journey" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 82 : 68;
const RUN_BTN_SIZE = 62;

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: colors.background,
  } as ViewStyle,
  topLine: {
    height: 1,
    backgroundColor: colors.border,
  } as ViewStyle,
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.background,
    height: TAB_BAR_HEIGHT,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    paddingTop: 6,
    paddingHorizontal: 4,
  } as ViewStyle,

  // Regular tab slot
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  } as ViewStyle,
  tabLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.tabInactive,
    letterSpacing: 0.5,
  } as TextStyle,
  tabLabelActive: {
    color: colors.tabActive,
  } as TextStyle,

  // Center RUN button slot
  runSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    // Extra space for the elevated circle
    marginBottom: -4,
  } as ViewStyle,
  runBtn: {
    width: RUN_BTN_SIZE,
    height: RUN_BTN_SIZE,
    borderRadius: RUN_BTN_SIZE / 2,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 3,
    borderColor: colors.background,
    ...shadows.md,
  } as ViewStyle,
  runBtnFreeRun: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  runLabel: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 1,
  } as TextStyle,
});
