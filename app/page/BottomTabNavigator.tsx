import React from "react";
import { Image, Text, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Screens
import HomeScreen from "./HomeScreen";
import ProfileScreen from "./ProfileScreen";

// Icons
const icons = {
  Home: require("../../assets/images/home_inactive.png"),
  HomeFocused: require("../../assets/images/home_active.png"),
  Profile: require("../../assets/images/user_inactive.png"),
  ProfileFocused: require("../../assets/images/user_active.png"),
};

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        // ظاهر BottomTab
        tabBarStyle: {
          backgroundColor: "rgb(38, 76, 246)",
          height: Platform.OS === "android" ? 65 + insets.bottom : 80,
          paddingBottom: insets.bottom,
          paddingTop: 10,

          borderTopWidth: 0,
          elevation: 12,
        },

        tabBarLabelStyle: {
          fontFamily: "BYekan",
          fontSize: 12,
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "خانه",
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? icons.HomeFocused : icons.Home}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "پروفایل",
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? icons.ProfileFocused : icons.Profile}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default function AppTabs() {
  return (
    <SafeAreaProvider>
      <MainTabNavigator />
    </SafeAreaProvider>
  );
}
