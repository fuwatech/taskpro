import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useFonts } from "expo-font";
import { View, I18nManager, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";

// export const unstable_settings = {
//   anchor: "index",
// };
// Ensure RTL is enabled for the entire app. This must be set before rendering
// so layout direction and left/right swapping are applied consistently.
try {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // Swap left/right styling (useful for icons, paddings, margins)
  I18nManager.swapLeftAndRightInRTL(true);
} catch {
  // In some dev environments changing RTL may require a full reload/rebuild.
}

// For web, also set the HTML dir attribute so the browser layout and scroll
// direction match RTL. This avoids relying on react-native-web to infer it.
if (Platform.OS === "web" && typeof document !== "undefined") {
  try {
    document.documentElement.setAttribute("dir", "rtl");
    document.body.setAttribute("dir", "rtl");
  } catch {
    /** ignore in environments where document isn't writable */
  }
}

SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const [loaded] = useFonts({
    IRANSansXVF: require("../assets/fonts/IRANSans.ttf"),
    BYekan: require("../assets/fonts/B_Yekan.ttf"),
    Mont: require("../assets/fonts/Mont.otf"),
  });
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }
  // const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <View style={{ alignItems: "center", flex: 1 }}>
        <View
          style={{
            maxWidth: 420,

            flex: 1,

            width: "100%",
          }}
        >
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="page/Login" options={{ headerShown: false }} />
            <Stack.Screen
              name="page/BottomTabNavigator"
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="page/SmsScreen"
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="page/HomeScreen"
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="add-device"
              options={{ headerTitle: "اضافه کردن دستگاه" }}
            />
            <Stack.Screen name="relay" options={{ headerTitle: "رله" }} />
            <Stack.Screen
              name="contacts"
              options={{ headerTitle: "شماره تلفن" }}
            />
            <Stack.Screen name="device" options={{ headerTitle: "دستگاه" }} />
            <Stack.Screen
              name="edit-device"
              options={{ headerTitle: "ویرایش دستگاه" }}
            />
            <Stack.Screen
              name="settings"
              options={{ headerTitle: "تنظیمات" }}
            />
            <Stack.Screen name="ajir" options={{ headerTitle: "آژیر" }} />

            {/* <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} /> */}
          </Stack>
        </View>

        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
  );
}
