import * as React from "react";
// import {
//   Extrapolate,
//   interpolate,
//   useAnimatedStyle,
//   useSharedValue,
// } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Image,
  Pressable,
  TouchableHighlight,
  View,
  Animated,
  Alert,
  Platform,
  Linking,
  Keyboard,
} from "react-native";
import Spinner from "react-native-loading-spinner-overlay";

import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
// import { useLinkTo } from "@react-navigation/native";
import { Stack, useNavigation } from "expo-router";
import instance from "../../components/axios";
import {
  Appbar,
  Switch,
  TextInput,
  Text,
  DefaultTheme,
} from "react-native-paper";

import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import AppButton from "../../components/AppButton";
import AppPhoneInput from "../../components/AppPhoneInput";
import Master from "../../components/Master";
import { router } from "expo-router";
export default function Login() {
  var [spinner, setspinner] = React.useState(false);
  const [mobile, onChangeText] = React.useState("");

  console.log("login");
  // const navigation = useNavigation();
  // const linkTo = useLinkTo();
  const storeData = async (value) => {
    try {
      const jsonValue = JSON.stringify(value);
      console.log(jsonValue);
      await AsyncStorage.setItem("UserInfo", jsonValue);
    } catch (e) {
      // saving error
    }
  };
  const NumberChange = (value) => {
    try {
      const numericValue = value.replace(/[^0-9]/g, "");
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, "");
      onChangeText(formattedValue);
      if (mobile.length == 10) {
        Keyboard.dismiss();
        console.log("test");
      }
    } catch (e) {
      // saving error
    }
  };
  const animatedScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedScale.setValue(1);
  }, []);

  const handleImageLoad = () => {
    animatedScale.setValue(0.8);
    Animated.spring(animatedScale, {
      toValue: 1,
      bounciness: 24,
      speed: 20,
      useNativeDriver: true,
    }).start();
  };

  const handleOpenURL = () => {
    const url = "https://test.ir";
    Linking.openURL(url);
  };

  console.log(mobile[0] == 0);

  const loginHandler = async () => {
    // const userData = {
    //   ID: 1,
    //   mobile: mobile,
    //   state: 1,
    // };
    // await storeData(userData);
    // linkTo("/page/SmsScreen");

    if (mobile === null || mobile.length !== 11) {
      Toast.show({
        type: "error",
        position: "bottom",
        bottomOffset: 40,
        text1: "موبایل را کامل وارد کنید",
      });
      return;
    } else {
      Toast.show({
        type: "success",
        position: "top",
        bottomOffset: 20,
        text1: `کد تایید برای شماره  ${mobile} ارسال شد`,
      });

      setspinner(true);

      try {
        // ساخت بدنه درخواست
        const requestBody = {
          mobileNumber: mobile,
        };

        console.log("Request body:", requestBody);

        // تنظیم هدرهای درخواست
        const headers = {
          "X-Api-Key": "0E7B02E8-C04F-4940-83A7-FBD869FD93A9",
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        console.log("Headers:", headers);

        // اگر __DEV__ false است، مستقیماً به سرور اصلی وصل شو
        const useProxy = false; // برای تست اولیه proxy را غیرفعال کنید
        const baseURL =
          useProxy && __DEV__
            ? "http://localhost:8081"
            : "http://194.5.188.40:8042";

        const url = `${baseURL}/api/auth/login/otp`;
        console.log("Request URL:", url);
        console.log("Full request:", {
          url,
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });

        const response = await fetch(url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(requestBody),
        });

        console.log("Response status:", response.status);
        console.log(
          "Response headers:",
          Object.fromEntries(response.headers.entries())
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.log("Error response text:", errorText);
          throw new Error(
            `HTTP error! status: ${response.status}, body: ${errorText}`
          );
        }

        const data = await response.json();

        setspinner(false);
        console.log("Response data:", data);

        if (data && data.data) {
          const userData = {
            ID: "",
            mobile: mobile,
            state: 1,
          };
          await storeData(userData);
          // linkTo("/page/SmsScreen");
          router.replace("/page/SmsScreen");
        } else {
          Toast.show({
            type: "error",
            position: "bottom",
            text1: "پاسخ نامعتبر از سرور",
          });
        }
      } catch (error) {
        setspinner(false);
        console.log("Full error details:", error);
        console.log("Error message:", error.message);
        console.log("Error stack:", error.stack);

        // نمایش خطای دقیق‌تر
        let errorMessage = "خطا در ارتباط";
        let errorDetail = "لطفا دوباره تلاش کنید";

        if (error.message.includes("404")) {
          errorMessage = "آدرس سرویس یافت نشد";
          errorDetail = "لطفا با پشتیبانی تماس بگیرید";
        } else if (
          error.message.includes("network") ||
          error.message.includes("Network")
        ) {
          errorMessage = "خطای شبکه";
          errorDetail = "اتصال اینترنت را بررسی کنید";
        }

        Toast.show({
          type: "error",
          position: "bottom",
          text1: errorMessage,
          text2: errorDetail,
        });
      }
    }
  };
  const handleKeyDown = (e) => {
    if (e.nativeEvent.key == "Enter") {
      loginHandler();
    }
  };
  return (
    <Master child={0}>
      <KeyboardAwareScrollView
        style={{ backgroundColor: "#fff", direction: "rtl" }}
      >
        <SafeAreaView style={styles.container}>
          <Image
            onLoad={handleImageLoad}
            style={styles.image}
            source={require("../../assets/images/logo.png")}
          />
          <Spinner
            visible={spinner}
            textContent={""}
            textStyle={styles.spinnerTextStyle}
          />
          <View>
            <Text style={styles.text}>
              برای ورود و یا ثبت نام در برنامه لطفا شماره موبایل خود را وارد
              نمایید.
            </Text>
            <View style={{ margin: 10 }}></View>

            <View style={styles.loginForm}>
              <AppPhoneInput
                handleKeyDown={handleKeyDown}
                width={"80%"}
                icon={"cellphone"}
                value={mobile}
                placeholder={"09XXXXXXXXX"}
                maxLength={11}
                keyboardType="number-pad"
                onChangeText={(text) => NumberChange(text)}
              />
              <AppButton
                title="ارسال درخواست"
                onPress={loginHandler}
                width="70%"
              ></AppButton>

              {/* <Text style={[{ paddingTop: 10 }, styles.text]}>
                با ورود به برنامه{" "}
                <Pressable onPress={handleOpenURL}>
                  <Text style={styles.hyperlink}>قوانین و مقررات</Text>
                </Pressable>{" "}
                آن را پذیرفته اید.
              </Text> */}
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAwareScrollView>
    </Master>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: "flex",
    padding: 10,

    flexDirection: "column",
    backgroundColor: "#fff",
  },
  headerImage: {
    alignSelf: "flex-start",
    resizeMode: "cover",
    width: "100%",
    height: 200,
  },
  logo: {
    resizeMode: "contain",
    maxWidth: 150,
    alignSelf: "center",
    marginBottom: 10,
    height: 100,
    width: "60%",
  },
  title: {
    fontSize: 27,
    fontWeight: "bold",
    color: "#27ae60",
    fontFamily: "BYekan",
  },
  text: {
    fontSize: 12,
    color: "#a6a6a6",
    textAlign: "center",
    fontFamily: "BYekan",
    direction: "rtl",
    unicodeBidi: "embed",
    writingDirection: "rtl",
  },
  hyperlink: {
    fontSize: 12,
    color: "#f8cc2f",
    textAlign: "center",
    fontFamily: "BYekan",
    direction: "rtl",
    marginBottom: -7,
  },
  loginForm: {
    alignItems: "center",
  },
  input: {
    marginTop: 10,
    fontSize: 12,
    color: "#333",
    fontWeight: "bold",
    textAlign: "right",
    shadowColor: "#000",
    tintColor: "#000",
    borderColor: "#ededed",
    backgroundColor: "#ededed",
    borderWidth: 1,
    margin: 2,
    marginVertical: 10,
    borderBottomWidth: 0,
    paddingLeft: 15,
    fontFamily: "BYekan",
    height: 40,
    width: 250,
    borderRadius: 100,
  },
  inputIcon: {
    zIndex: 1000,
  },
  image: {
    width: "100%",
    height: 300,
    resizeMode: "contain",
  },
  loginButton: {
    backgroundColor: "#27ae60",
    alignItems: "center",
    margin: 10,
    borderRadius: 100,
    width: 250,
    height: 40,
  },
  loginButtonText: {
    fontSize: 20,
    color: "#fff",
    marginTop: 2,
    fontFamily: "BYekan",
  },
  registerButton: {
    backgroundColor: "transparent",
    alignItems: "center",
    margin: 10,
    borderRadius: 100,
    borderWidth: 0,
    borderColor: "#27ae60",
    width: 300,
    height: 40,
  },
  registerButtonText: {
    fontSize: 18,
    color: "#27ae60",
    fontFamily: "BYekan",
  },
  spinnerTextStyle: {
    color: "#FFF",
  },
});
