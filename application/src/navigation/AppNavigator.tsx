import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import AddMineScreen from '../screens/AddMineScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HazardReportScreen from '../screens/HazardReportScreen';
import AttendanceCheckInScreen from '../screens/AttendanceCheckInScreen';
import AssignedActionsScreen from '../screens/AssignedActionsScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import { hasValidSession } from '../services/storage';
import { authEvents } from '../services/api';
import colors from '../theme/colors';
import type {
  HomeStackParamList,
  HazardStackParamList,
  MainTabParamList,
  MessagesStackParamList,
  ProfileStackParamList,
  RootStackParamList,
} from '../types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const HazardStack = createNativeStackNavigator<HazardStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();


const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'MineOS' }}
      />
      <HomeStack.Screen
        name="AddMine"
        component={AddMineScreen}
        options={{ title: 'Add Mine' }}
      />
    </HomeStack.Navigator>
  );
}

function HazardStackNavigator() {
  return (
    <HazardStack.Navigator screenOptions={stackScreenOptions}>
      <HazardStack.Screen
        name="HazardReport"
        component={HazardReportScreen}
        options={({ navigation }) => ({
          title: 'Report a Hazard',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to Home tab"
              hitSlop={10}
              onPress={() => navigation.getParent()?.navigate('HomeTab')}
              style={styles.headerBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.white} />
            </Pressable>
          ),
        })}
      />
    </HazardStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="AttendanceCheckIn"
        component={AttendanceCheckInScreen}
        options={{ title: 'Attendance Check-In' }}
      />
    </ProfileStack.Navigator>
  );
}

function MessagesStackNavigator() {
  return (
    <MessagesStack.Navigator screenOptions={stackScreenOptions}>
      <MessagesStack.Screen
        name="AssignedActions"
        component={AssignedActionsScreen}
        options={{ title: 'Assigned Actions' }} // <-- Change this line
      />
      <MessagesStack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Task Details' }}
      />
    </MessagesStack.Navigator>
  );
}

function MainTabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        tabBarShowIcon: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        tabBarIndicatorStyle: { 
          height: 0 
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
          width: '100%', 
          textAlign: 'center',
          textTransform: 'none', 
        },
        tabBarStyle: {
          backgroundColor: colors.navy,
          borderTopColor: colors.navy,
          height: 70, 
          paddingBottom: 10, 
          justifyContent: 'center',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Reels"
        component={HazardStackNavigator}
        options={{
          tabBarLabel: t('tabs.reportHazard'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="warning" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStackNavigator}
        options={{
          tabBarLabel: t('tabs.assignedActions'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="clipboard-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    hasValidSession().then((hasSession) => {
      setIsAuthenticated(hasSession);
      setIsLoading(false);
    });
  }, []);

  // Auto-logout when backend returns 401 (invalid/expired token)
  useEffect(() => {
    const unsub = authEvents.on('unauthorized', () => {
      setIsAuthenticated(false);
    });
    return () => { unsub(); };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
        screenOptions={stackScreenOptions}
      >
        <RootStack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerBackButton: {
    marginRight: 12,
  },
});