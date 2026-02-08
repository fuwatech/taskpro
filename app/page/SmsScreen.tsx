import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  Image,
  Pressable,
  View,
  TextInput,
  Animated,
  ActivityIndicator,
  Vibration,
} from "react-native";
import AppButton from "../../components/AppButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Spinner from "react-native-loading-spinner-overlay";
import Toast from "react-native-toast-message";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AppBar from "../AppBar";
import { useLinkTo } from "@react-navigation/native";
import Master from "../../components/Master";
import instance from "../../components/axios";
import { router } from "expo-router";

// تابع تبدیل اعداد انگلیسی به فارسی
const toPersianNumbers = (num) => {
  if (num === null || num === undefined) return "";

  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (digit) => persianDigits[digit]);
};

// تابع برای فرمت کردن شماره موبایل با جداکننده
const formatMobileNumber = (mobile) => {
  if (!mobile) return "";

  const persianMobile = toPersianNumbers(mobile);
  if (persianMobile.length <= 4) return persianMobile;

  // فرمت: ۰۹۱۲ ۳۴۵ ۶۷۸۹
  const parts = [
    persianMobile.slice(0, 4),
    persianMobile.slice(4, 7),
    persianMobile.slice(7),
  ].filter((part) => part.length > 0);

  return parts.join(" ");
};

export default function SmsScreen() {
  const [mobile, setMobile] = useState("");
  const [id, setId] = useState("");
  const [spinner, setSpinner] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const inputRefs = useRef([]);
  const linkTo = useLinkTo();
  const animatedScale = useRef(new Animated.Value(0)).current;

  // ذخیره اطلاعات کاربر در AsyncStorage
  const storeData = async (value) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem("UserInfo", jsonValue);
      console.log("User info saved successfully");
    } catch (e) {
      console.error("Error saving data:", e);
      Toast.show({
        type: "error",
        position: "bottom",
        text1: "خطا در ذخیره اطلاعات",
        text2: "لطفا دوباره تلاش کنید",
      });
    }
  };

  // انیمیشن لود شدن تصویر
  const handleImageLoad = () => {
    animatedScale.setValue(0.8);
    Animated.spring(animatedScale, {
      toValue: 1,
      bounciness: 24,
      speed: 20,
      useNativeDriver: true,
    }).start();
  };

  // دریافت اطلاعات کاربر از AsyncStorage
  const getUserInfo = useCallback(async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("UserInfo");
      if (jsonValue) {
        const userInfo = JSON.parse(jsonValue);
        setMobile(userInfo.mobile || "");
        setId(userInfo.ID || 0);
        console.log("User info loaded:", userInfo.mobile);
      }
    } catch (e) {
      console.error("Error reading data:", e);
    }
  }, []);

  // مدیریت تغییر کد OTP - با پشتیبانی از اعداد فارسی
  const handleOtpChange = (text, index) => {
    // تبدیل اعداد فارسی به انگلیسی برای پردازش
    const englishText = text.replace(/[۰-۹]/g, (digit) =>
      "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)
    );

    const numericText = englishText.replace(/[^0-9]/g, "");

    const newOtp = [...otp];

    // اگر کاربر کد را paste کرد (متن طولانی)
    if (numericText.length > 1) {
      const digits = numericText.split("").slice(0, 5);
      digits.forEach((digit, i) => {
        if (i < 5) {
          newOtp[i] = digit;
        }
      });
      setOtp(newOtp);

      const lastFilledIndex = Math.min(digits.length - 1, 4);
      setTimeout(() => {
        inputRefs.current[lastFilledIndex]?.focus();
      }, 10);
      return;
    }

    // اگر کاربر یک رقم وارد کرد
    newOtp[index] = numericText;
    setOtp(newOtp);

    if (numericText !== "" && index < 4) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 10);
    }
  };

  // مدیریت کلید Backspace
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 10);
      } else if (otp[index] !== "") {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const verifyOtp = async () => {
    const otpCode = otp.join("");

    // بررسی اینکه کد کامل وارد شده باشد
    if (otpCode.length !== 5) {
      Toast.show({
        type: "error",
        position: "bottom",
        bottomOffset: 40,
        text1: "کد ناقص است",
        text2: "لطفا کد ۵ رقمی را کامل وارد کنید",
        visibilityTime: 3000,
      });
      return;
    }

    // جلوگیری از درخواست‌های تکراری
    if (isVerifying) return;

    setIsVerifying(true);
    setSpinner(true);

    try {
      const headers = {
        "X-Api-Key": "0E7B02E8-C04F-4940-83A7-FBD869FD93A9",
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      console.log("OTP Code (string):", otpCode);
      console.log("Mobile:", mobile);
      console.log("Request body will be:", `"${otpCode}"`);

      // ارسال کد OTP به صورت رشته JSON خالی
      // "79973" - دقیقاً مثل نمونه در swagger
      const response = await instance.post(
        `/api/auth/login/otp/${mobile}/verify`,
        `"${otpCode}"`, // ارسال به صورت رشته JSON (با دابل کوتیشن)
        { headers }
      );

      console.log("Response data:", response.data);

      setSpinner(false);
      setIsVerifying(false);

      // بررسی پاسخ سرور
      if (response.data && response.data.data?.verified) {
        // کد معتبر است
        Toast.show({
          type: "success",
          position: "top",
          text1: "✅ تایید موفق",
          text2: "ورود با موفقیت انجام شد",
          visibilityTime: 2000,
        });

        const userData = {
          ID: response.data.data?.token || id,
          mobile: mobile,
          state: 2,
        };
        await storeData(userData);

        // هدایت به صفحه خانه بعد از 2 ثانیه
        setTimeout(() => {
          router.replace("/page/BottomTabNavigator");
        }, 2000);

        // ریست کردن تعداد خطاها
        setErrorCount(0);
      } else {
        // کد معتبر نیست
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);

        // ویبره در صورت خطا
        if (Vibration.vibrate) {
          Vibration.vibrate(500);
        }

        let errorMessage = "کد نادرست است";
        let errorDetail = "کد وارد شده صحیح نمی‌باشد.";

        // پیام‌های مختلف بر اساس تعداد خطاها
        if (newErrorCount >= 3) {
          errorDetail = `کد را با دقت وارد کنید. ${toPersianNumbers(
            5 - newErrorCount
          )} تلاش باقی مانده`;
        }

        Toast.show({
          type: "error",
          position: "bottom",
          bottomOffset: 40,
          text1: `❌ ${errorMessage}`,
          text2: errorDetail,
          visibilityTime: 4000,
        });

        // پاک کردن ورودی‌ها و فوکوس روی اولین فیلد
        setOtp(["", "", "", "", ""]);
        setTimeout(() => {
          if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
          }
        }, 100);
      }
    } catch (error) {
      setSpinner(false);
      setIsVerifying(false);
      console.log("Verify Error:", error);
      console.log("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          headers: error.config?.headers,
        },
      });

      // ویبره در صورت خطا
      if (Vibration.vibrate) {
        Vibration.vibrate(500);
      }

      let errorMessage = "خطا در تایید کد";
      let errorDetail = "لطفا مجدد تلاش کنید";

      if (error.response) {
        console.log("Error response data:", error.response.data);

        if (error.response.status === 400) {
          errorMessage = "کد نامعتبر";
          errorDetail = "کد وارد شده صحیح نمی‌باشد یا منقضی شده است";
        } else if (error.response.status === 404) {
          errorMessage = "شماره موبایل یافت نشد";
          errorDetail = "لطفا دوباره شماره خود را وارد کنید";
        } else if (error.response.status === 415) {
          errorMessage = "فرمت داده نادرست";
          errorDetail = "مشکل در فرمت ارسال کد. لطفا با پشتیبانی تماس بگیرید";

          // دیباگ کردن - بررسی دقیق فرمت ارسال
          console.log("Trying alternative formats...");

          // حالت جایگزین 1: بدون کوتیشن (string ساده)
          try {
            console.log("Trying without quotes...");
            const altResponse = await instance.post(
              `/api/auth/login/otp/${mobile}/verify`,
              otpCode,
              { headers }
            );
            console.log("Alternative worked:", altResponse.data);
          } catch (altError) {
            console.log("Alternative failed:", altError.message);
          }

          // حالت جایگزین 2: JSON.stringify
          try {
            console.log("Trying JSON.stringify...");
            const altResponse = await instance.post(
              `/api/auth/login/otp/${mobile}/verify`,
              JSON.stringify(otpCode),
              { headers }
            );
            console.log("JSON.stringify worked:", altResponse.data);
          } catch (altError) {
            console.log("JSON.stringify failed:", altError.message);
          }
        } else if (error.response.status === 429) {
          errorMessage = "تعداد درخواست‌ها بیش از حد";
          errorDetail = "لطفا چند دقیقه دیگر تلاش کنید";
        } else if (error.response.data?.data?.message) {
          errorDetail = error.response.data.data.message;
        }

        Toast.show({
          type: "error",
          position: "bottom",
          bottomOffset: 40,
          text1: `خطا ${toPersianNumbers(error.response.status || "")}`,
          text2: errorDetail,
          visibilityTime: 4000,
        });
      } else if (error.request) {
        Toast.show({
          type: "error",
          position: "bottom",
          bottomOffset: 40,
          text1: "خطای شبکه",
          text2: "ارتباط با سرور برقرار نشد. لطفا اینترنت خود را بررسی کنید",
          visibilityTime: 4000,
        });
      } else {
        Toast.show({
          type: "error",
          position: "bottom",
          bottomOffset: 40,
          text1: "خطا در ارسال درخواست",
          text2: error.message,
          visibilityTime: 3000,
        });
      }

      setOtp(["", "", "", "", ""]);
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    }
  };

  // تغییر شماره موبایل
  const changeMobileNumber = async () => {
    try {
      await AsyncStorage.removeItem("UserInfo");
      router.push("/");
    } catch (error) {
      console.error("Error removing user info:", error);
    }
  };

  // ارسال مجدد کد
  const resendCode = async () => {
    if (isResendDisabled) return;

    setSpinner(true);
    setIsResendDisabled(true);
    setResendTimer(60);

    try {
      const headers = {
        "X-Api-Key": "0E7B02E8-C04F-4940-83A7-FBD869FD93A9",
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // ارسال شماره موبایل به صورت JSON برای درخواست کد جدید
      const requestBody = {
        mobileNumber: mobile,
      };

      const response = await instance.post("/api/auth/login/otp", requestBody, {
        headers,
      });

      setSpinner(false);

      if (response.data && response.data.isSuccess) {
        Toast.show({
          type: "success",
          position: "top",
          text1: "✅ کد جدید ارسال شد",
          text2: `کد جدید به شماره ${toPersianNumbers(`${mobile}`)} ارسال شد`,
          visibilityTime: 3000,
        });

        // ریست کردن فیلدها
        setOtp(["", "", "", "", ""]);
        setErrorCount(0);

        setTimeout(() => {
          if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
          }
        }, 100);
      } else {
        Toast.show({
          type: "error",
          position: "bottom",
          text1: "خطا در ارسال کد",
          text2: response.data.message || "لطفا دوباره تلاش کنید",
          visibilityTime: 3000,
        });
        setIsResendDisabled(false);
      }
    } catch (error) {
      setSpinner(false);
      setIsResendDisabled(false);
      console.log("Resend Error:", error);

      let errorMessage = "خطا در ارسال مجدد کد";
      let errorDetail = "لطفا دوباره تلاش کنید";

      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = "آدرس سرویس یافت نشد";
          errorDetail = "لطفا با پشتیبانی تماس بگیرید";
        } else if (error.response.status === 429) {
          errorMessage = "تعداد درخواست‌ها بیش از حد";
          errorDetail = "لطفا چند دقیقه دیگر تلاش کنید";
        }
      } else if (error.request) {
        errorMessage = "خطای شبکه";
        errorDetail = "اتصال اینترنت را بررسی کنید";
      }

      Toast.show({
        type: "error",
        position: "bottom",
        bottomOffset: 40,
        text1: errorMessage,
        text2: errorDetail,
        visibilityTime: 4000,
      });
    }
  };

  // useEffect برای لود اطلاعات کاربر و فوکوس اولیه
  useEffect(() => {
    getUserInfo();

    // فوکوس خودکار روی اولین فیلد پس از 500 میلی‌ثانیه
    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 500);
  }, [getUserInfo]);

  // useEffect برای تایمر ارسال مجدد
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setIsResendDisabled(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendTimer]);

  // مدیریت کلید Enter
  const handleKeyDown = (e) => {
    if (e.nativeEvent.key === "Enter") {
      verifyOtp();
    }
  };

  // بررسی کامل بودن کد OTP
  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: "#fff", direction: "ltr" }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Master child={0}>
        <AppBar />
        <View style={{ alignContent: "center", marginTop: 10 }}>
          <Animated.View style={[{ transform: [{ scale: animatedScale }] }]}>
            <Image
              onLoad={handleImageLoad}
              style={styles.logo}
              source={require("../../assets/images/logo.png")}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Spinner برای لودینگ */}
        <Spinner
          visible={spinner}
          textContent={""}
          textStyle={styles.spinnerTextStyle}
          overlayColor="rgba(0, 0, 0, 0.7)"
          animation="fade"
        />

        {/* متن راهنما */}
        <Text style={styles.Htitle}>کد فعالسازی به شماره زیر ارسال میشود.</Text>

        {/* نمایش شماره موبایل و دکمه تغییر */}
        <View style={styles.Ntitle}>
          <Text style={styles.Ptitle}>{toPersianNumbers(`${mobile}`)}</Text>
          <Pressable
            onPress={changeMobileNumber}
            style={({ pressed }) => [
              styles.changeButton,
              pressed && styles.changeButtonPressed,
            ]}
          >
            <Text style={styles.Ctitle}>تغییر شماره همراه</Text>
          </Pressable>
        </View>

        <View style={styles.container}>
          {/* کانتینر کد OTP */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit !== "" && styles.otpInputFilled,
                  isVerifying && styles.otpInputDisabled,
                  errorCount > 2 && styles.otpInputError,
                ]}
                value={toPersianNumbers(digit)}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? 5 : 1}
                textAlign="center"
                selectTextOnFocus
                autoFocus={index === 0}
                onKeyDown={handleKeyDown}
                editable={!isVerifying}
                caretHidden={isVerifying}
                placeholder="-"
                placeholderTextColor="#aaa"
              />
            ))}
          </View>

          {/* نمایش تعداد خطاها */}
          {errorCount > 0 && (
            <Text style={styles.errorCountText}>
              تعداد خطا: {toPersianNumbers(errorCount)}
            </Text>
          )}

          {/* دکمه تایید */}
          <View style={styles.Sbutton}>
            <AppButton
              title={isVerifying ? "در حال تایید..." : "تایید و ادامه"}
              onPress={verifyOtp}
              disabled={!isOtpComplete || isVerifying}
              // width="40%"
              loading={isVerifying}
              style={!isOtpComplete && styles.disabledButton}
            />
          </View>

          {/* دکمه ارسال مجدد */}
          <View style={styles.resendContainer}>
            <Pressable
              onPress={resendCode}
              style={({ pressed }) => [
                styles.resendButton,
                isResendDisabled && styles.resendButtonDisabled,
                pressed && styles.resendButtonPressed,
              ]}
              disabled={isResendDisabled}
            >
              <Text
                style={[
                  styles.resendText,
                  isResendDisabled && styles.resendTextDisabled,
                ]}
              >
                {isResendDisabled
                  ? `ارسال مجدد (${toPersianNumbers(resendTimer)})`
                  : "ارسال مجدد کد"}
              </Text>
            </Pressable>

            {isResendDisabled && (
              <Text style={styles.resendNote}>
                تا دریافت کد جدید {toPersianNumbers(resendTimer)} ثانیه باقی
                مانده
              </Text>
            )}
          </View>

          {/* متن راهنمای پایین */}
          <Text style={styles.footerText}>
            در صورت عدم دریافت کد، روی "ارسال مجدد کد" کلیک کنید
          </Text>
        </View>
      </Master>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 30,
    direction: "ltr",
  },
  otpInput: {
    width: 58,
    height: 58,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 12,
    marginHorizontal: 6,
    fontSize: 18,
    fontFamily: "BYekan",
    backgroundColor: "#f8f8f8",
    direction: "ltr",
    textAlign: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  otpInputFilled: {
    borderColor: "#27ae60",
    backgroundColor: "#e8f5e9",
    borderWidth: 2.5,
    elevation: 5,
  },
  otpInputDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
  },
  otpInputError: {
    borderColor: "#ff4444",
    backgroundColor: "#ffebee",
  },
  Ntitle: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginVertical: 15,
    paddingHorizontal: 20,
    width: "100%",
  },
  Ptitle: {
    fontSize: 18,
    fontFamily: "BYekan",

    color: "#333",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  changeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f0f8ff",
  },
  changeButtonPressed: {
    backgroundColor: "#e1f0ff",
  },
  Ctitle: {
    color: "#0066cc",
    fontFamily: "BYekan",
    fontSize: 14,
    fontWeight: "500",
  },
  Htitle: {
    textAlign: "center",
    marginVertical: 25,
    fontFamily: "BYekan",
    fontSize: 15,
    color: "#666",
    paddingHorizontal: 30,
    lineHeight: 24,
  },
  Sbutton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 25,
    paddingHorizontal: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  logo: {
    maxWidth: 160,
    alignSelf: "center",
    marginBottom: 10,
    height: 100,
    width: "65%",
  },
  spinnerTextStyle: {
    color: "#FFF",
    fontFamily: "BYekan",
    fontSize: 16,
  },
  resendContainer: {
    marginTop: 15,
    alignItems: "center",
    width: "100%",
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
    minWidth: 160,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resendButtonDisabled: {
    backgroundColor: "#e9ecef",
  },
  resendButtonPressed: {
    backgroundColor: "#e2e6ea",
  },
  resendText: {
    color: "#0066cc",
    fontFamily: "BYekan",
    fontSize: 15,
    fontWeight: "600",
  },
  resendTextDisabled: {
    color: "#6c757d",
  },
  resendNote: {
    color: "#666",
    fontFamily: "BYekan",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  errorCountText: {
    color: "#ff4444",
    fontFamily: "BYekan",
    fontSize: 12,
    marginTop: 5,
    marginBottom: 10,
  },
  footerText: {
    color: "#888",
    fontFamily: "BYekan",
    fontSize: 12,
    marginTop: 30,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
