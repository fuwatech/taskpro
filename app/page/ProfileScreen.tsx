import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  ScrollView,
  View,
  StyleSheet,
  Text,
  Image,
  StatusBar,
  ActivityIndicator,
  Platform, // اضافه کردن Platform اینجا
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AppSettingsMenu from "../../components/AppSettingsMenu";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ProfileScreen = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load user name
        const userInfo = await AsyncStorage.getItem("name");
        if (userInfo) {
          const parsedInfo = JSON.parse(userInfo);
          setUserName(parsedInfo.name || "");
        }
        setError(null);
      } catch (error) {
        console.error("Error loading data:", error);
        setError("خطا در بارگذاری اطلاعات");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // انیمیشن‌های ایمن برای اندروید
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [300, 100],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.6],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150, 200],
    outputRange: [1, 0.3, 0],
    extrapolate: "clamp",
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 100, 200],
    outputRange: [1, 0.7, 0.5],
    extrapolate: "clamp",
  });

  const titleTop = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -50],
    extrapolate: "clamp",
  });

  const handleScroll = useCallback(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: false } // مهم: false برای اندروید
    ),
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0059AC" />
        <Text style={styles.loadingText}></Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left", "top"]}>
      <StatusBar backgroundColor="#0059AC" barStyle="light-content" />

      {/* هدر انیمیشنی */}
      <Animated.View
        style={[
          styles.header,
          {
            height: headerHeight,
            opacity: headerOpacity,
          },
        ]}
      >
        <LinearGradient
          style={styles.gradient}
          colors={["#0059AC", "#75B2EA", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.6, 1]}
        >
          <View style={[styles.profileContainer]}>
            <Image
              style={styles.profileImage}
              source={require("../../assets/images/user_active.png")}
              resizeMode="cover"
              // defaultSource={require("../../assets/images/user_inactive.png")}
              onError={(e) =>
                console.log("Profile image error:", e.nativeEvent.error)
              }
            />

            <View style={styles.textContainer}>
              <Text style={[styles.textBase, styles.subtitle]}>routinat</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* محتوای اصلی */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <AppSettingsMenu />

          {/* فضای اضافی برای اسکرول */}
          <View style={styles.spacer} />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#0059AC",
    fontFamily: "BYekan", // حالا Platform در دسترس است
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    paddingHorizontal: 20,
    fontFamily: Platform.OS === "ios" ? "BYekan" : "BYekan",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: "hidden",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: StatusBar.currentHeight || 40,
  },
  profileContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  profileImage: {
    alignItems: "center",
    width: 120,
    height: 120,
    // borderRadius: 60,
    // backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 15,
    marginRight: 10,
    // borderWidth: 3,
    // borderColor: "#FFFFFF",
  },
  textContainer: {
    alignItems: "center",
    // backgroundColor: "rgba(255, 255, 255, 0.9)",
    // paddingHorizontal: 20,
    // paddingVertical: 10,
    // borderRadius: 20,
    // minWidth: 200,
  },
  textBase: {
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "BYekan" : "BYekan",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0059AC",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "400",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 320, // ارتفاع هدر + مقداری فضای اضافه
    minHeight: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  spacer: {
    height: 100, // فضای اضافی برای اسکرول
  },
});

export default ProfileScreen;
