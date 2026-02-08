import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const MAX_WIDTH = 420; // حداکثر عرض برای موبایل‌های بزرگ

const Index = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem("UserInfo");
        const get = jsonValue ? JSON.parse(jsonValue) : null;

        if (!get) {
          router.replace("/page/Login");
        } else if (get.state === 0) {
          router.replace("/page/Login");
        } else if (get.state === 1) {
          router.replace("/page/SmsScreen");
        } else if (get.state === 2) {
          router.replace("/page/BottomTabNavigator");
        }
      } catch (e) {
        router.replace("/page/Login");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return null; // چون بلافاصله replace می‌کنه
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Index;
