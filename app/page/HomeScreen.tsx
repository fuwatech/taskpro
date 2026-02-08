import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  Image,
  AppState,
  StatusBar,
  Animated,
  Pressable,
  PanResponder,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomModal from "@/components/CustomModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import AlarmModal from "@/components/AlarmModal";
import ScheduleModal from "@/components/ScheduleModal";
import Constants from "expo-constants";
import instance from "../../components/axios";
import Spinner from "react-native-loading-spinner-overlay";
import { router, useFocusEffect } from "expo-router";
import CustomSlider from "@/components/CustomSlider";
import EditableColumnInput from "@/components/EditableColumnInput";
import { LinearGradient } from "expo-linear-gradient";
import {
  getCellStatus as helperGetCellStatus,
  getStatusColor as helperGetStatusColor,
  shouldShowRed as helperShouldShowRed,
  getStatusIcon as helperGetStatusIcon,
  getStatusIconColor as helperGetStatusIconColor,
} from "@/utils/taskHelpers";
import NetInfo from "@react-native-community/netinfo";
import * as Progress from "react-native-progress";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const STORAGE_KEY = "app_saved_data";
const BACKGROUND_FETCH_TASK = "check-alarms-background-fetch";

// Manager for sound configurations
const soundConfig = {
  0: {
    name: "آهنگ ۱",
    fileName: "alarm1.mp3",
    androidChannel: "alarm_channel_1",
    iosSound: "alarm1.mp3",
  },
  1: {
    name: "آهنگ ۲",
    fileName: "alarm2.mp3",
    androidChannel: "alarm_channel_2",
    iosSound: "alarm2.mp3",
  },
  2: {
    name: "آهنگ ۳",
    fileName: "alarm3.mp3",
    androidChannel: "alarm_channel_۳",
    iosSound: "alarm3.mp3",
  },
};

const getSoundConfig = (soundIndex) => {
  return soundConfig[soundIndex] || soundConfig[0];
};

const setupNotificationChannels = async () => {
  if (Platform.OS === "android") {
    try {
      // Default channel
      await Notifications.setNotificationChannelAsync("default", {
        name: "یادآوری‌ها",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [250, 250, 250, 250],
        lightColor: "#2196F3",
        sound: "alarm1.mp3",
        enableVibrate: true,
        showBadge: true,
      });

      // Additional channels for each sound
      Object.values(soundConfig).forEach((sound, index) => {
        Notifications.setNotificationChannelAsync(sound.androidChannel, {
          name: sound.name,
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [250, 250, 250, 250],
          lightColor: "#2196F3",
          sound: sound.fileName,
          enableVibrate: true,
          showBadge: true,
        });
      });
    } catch (error) {
      console.error("Error setting up notification channels:", error);
    }
  }
};

const playAlarmSoundInBackground = async (soundIndex) => {
  try {
    console.log(`Playing alarm sound ${soundIndex} in background`);

    // پخش صدا با expo-av
    let soundFile;
    switch (soundIndex) {
      case 0:
        soundFile = require("../../assets/sounds/alarm1.mp3");
        break;
      case 1:
        soundFile = require("../../assets/sounds/alarm2.mp3");
        break;
      case 2:
        soundFile = require("../../assets/sounds/alarm3.mp3");
        break;
      default:
        soundFile = require("../../assets/sounds/alarm1.mp3");
    }

    const { sound: alarmSound } = await Audio.Sound.createAsync(soundFile, {
      shouldPlay: true,
      volume: 1.0,
      isLooping: false,
    });

    // پس از 30 ثانیه صدا را متوقف کن
    setTimeout(async () => {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
    }, 30000);

    return true;
  } catch (error) {
    console.error("Error playing alarm sound in background:", error);
    return false;
  }
};

const toPersianNumbers = (num) => {
  if (num === undefined || num === null) return "";
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
};

const gregorianToJalali = (gy, gm, gd) => {
  let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    parseInt((gy2 + 3) / 4) -
    parseInt((gy2 + 99) / 100) +
    parseInt((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * parseInt(days / 12053);
  days %= 12053;
  jy += 4 * parseInt(days / 1461);
  days %= 1461;
  jy += parseInt((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  let jm =
    days < 186 ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
  let jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
};

const jalaliToGregorian = (jy, jm, jd) => {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    parseInt(jy / 33) * 8 +
    parseInt(((jy % 33) + 3) / 4) +
    jd;
  if (jm < 7) {
    days += (jm - 1) * 31;
  } else {
    days += (jm - 7) * 30 + 186;
  }
  let gy = 400 * parseInt(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * parseInt(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * parseInt(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  let gm;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return [gy, gm, gd];
};

const showToast = (type, title, message) => {
  Toast.show({
    type: type,
    text1: title,
    text2: message,
    position: "top",
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 30,
    bottomOffset: 40,
  });
};

const fetchTasksFromServer = async () => {
  try {
    // بررسی وضعیت اینترنت
    const netInfoState = await NetInfo.fetch();
    const isConnected =
      netInfoState.isConnected && netInfoState.isInternetReachable;

    if (!isConnected) {
      return {
        success: false,
        message: "خطای شبکه",
        detail: "اتصال اینترنت را بررسی کنید",
        isNetworkError: true,
        data: [],
      };
    }

    const userInfoJson = await AsyncStorage.getItem("UserInfo");
    if (!userInfoJson) {
      throw new Error("User information not found");
    }

    const userInfo = JSON.parse(userInfoJson);
    const token = userInfo.ID;

    const headers = {
      "X-Api-Key": "0E7B02E8-C04F-4940-83A7-FBD869FD93A9",
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    console.log("Fetching tasks from server...", token);

    const response = await instance.get("/api/tasks/work-items/GetAll", {
      headers,
    });

    console.log("Tasks fetched successfully:", response.data);

    if (response.data && response.data.isSuccess) {
      return {
        success: true,
        data: response.data.data || [],
        message: "داده‌ها با موفقیت دریافت شدند",
      };
    } else {
      return {
        success: false,
        message: response.data.errorMessage || "خطا در دریافت داده‌ها",
        data: [],
      };
    }
  } catch (error) {
    console.error("Error fetching tasks from server:", error);

    let errorMessage = "خطا در دریافت داده‌ها";
    let errorDetail = "لطفا دوباره تلاش کنید";
    let isNetworkError = false;

    if (error.response) {
      console.error("Error response:", {
        status: error.response.status,
        data: error.response.data,
      });

      if (error.response.status === 401) {
        errorMessage = "احراز هویت ناموفق";
        errorDetail = "لطفا مجدد وارد شوید";
        await handleUnauthorizedError();
      } else if (error.response.status === 404) {
        errorMessage = "آدرس سرویس یافت نشد";
        errorDetail = "لطفا با پشتیبانی تماس بگیرید";
      } else if (error.response.status === 500) {
        errorMessage = "خطای سرور";
        errorDetail = "لطفا بعدا تلاش کنید";
      }
    } else if (error.request) {
      errorMessage = "خطای شبکه";
      errorDetail = "اتصال اینترنت را بررسی کنید";
      isNetworkError = true;
    }

    return {
      success: false,
      message: errorMessage,
      detail: errorDetail,
      isNetworkError: isNetworkError,
      error: error,
      data: [],
    };
  }
};

const handleUnauthorizedError = async () => {
  try {
    await AsyncStorage.removeItem("UserInfo");
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("داده‌ها به دلیل خطای 401 پاک شدند");
    router.replace("/page/Login");
  } catch (error) {
    console.error("Error clearing data on 401:", error);
  }
};

const sendSetAlarmRequest = async (businessKey, alarmTime) => {
  try {
    const userInfoJson = await AsyncStorage.getItem("UserInfo");
    if (!userInfoJson) {
      throw new Error("User information not found");
    }

    const userInfo = JSON.parse(userInfoJson);
    const token = userInfo.ID;

    const headers = {
      "X-Api-Key": "0E7B02E8-C04F-4940-83A7-FBD869FD93A9",
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    console.log("Received alarmTime parameter in sendSetAlarmRequest:", {
      businessKey,
      alarmTime,
      type: typeof alarmTime,
      length: alarmTime.length,
      rawValue: alarmTime,
    });

    let alarmDate;

    if (alarmTime && alarmTime.includes("T") && alarmTime.includes("Z")) {
      console.log("Alarm time is already in ISO format");
      alarmDate = new Date(alarmTime);
    } else if (alarmTime && alarmTime.includes(":")) {
      console.log("Alarm time is in HH:MM format, converting to ISO");
      const [hoursStr, minutesStr] = alarmTime.split(":");
      const hours = parseInt(hoursStr.trim(), 10);
      const minutes = parseInt(minutesStr.trim(), 10);

      console.log("Parsed time components:", {
        hoursStr,
        minutesStr,
        hours,
        minutes,
        isNaNHours: isNaN(hours),
        isNaNMinutes: isNaN(minutes),
      });

      const now = new Date();
      alarmDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0,
      );

      console.log("Created alarm date - DETAILED LOG:", {
        originalTime: alarmTime,
        parsedHours: hours,
        parsedMinutes: minutes,
        alarmDateFull: alarmDate.toString(),
        alarmDateISO: alarmDate.toISOString(),
        alarmDateLocal: alarmDate.toLocaleString("fa-IR"),
        alarmDateUTC: alarmDate.toUTCString(),
        alarmHours: alarmDate.getHours(),
        alarmMinutes: alarmDate.getMinutes(),
        alarmDateGetUTCHours: alarmDate.getUTCHours(),
        nowTime: now.toString(),
        nowHours: now.getHours(),
      });

      const nowTime = now.getTime();
      const alarmTimeValue = alarmDate.getTime();

      console.log("Time comparison:", {
        nowTime,
        alarmTimeValue,
        difference: alarmTimeValue - nowTime,
        isPast: alarmTimeValue <= nowTime,
      });

      if (alarmTimeValue <= nowTime) {
        alarmDate.setDate(alarmDate.getDate() + 1);
        console.log("Alarm is in past, moved to tomorrow:", {
          newDate: alarmDate.toString(),
          newHours: alarmDate.getHours(),
          newMinutes: alarmDate.getMinutes(),
          newISO: alarmDate.toISOString(),
        });
      }
    } else {
      console.log("Invalid alarmTime format, using default time (08:00)");
      const now = new Date();
      alarmDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        8,
        0,
        0,
        0,
      );

      if (alarmDate.getTime() <= now.getTime()) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }
    }

    const alarmTimeISO = alarmDate.toISOString();

    console.log("Final alarm time conversion:", {
      input: alarmTime,
      output: alarmTimeISO,
      localTime: alarmDate.toLocaleString("fa-IR"),
      hours24: alarmDate.getHours(),
      hoursUTC: alarmDate.getUTCHours(),
      minutes: alarmDate.getMinutes(),
    });

    const requestBody = `"${alarmTimeISO}"`;

    console.log("Sending set alarm request to server:", {
      url: `/api/tasks/work-items/${businessKey}/alarm/set`,
      body: requestBody,
      businessKey,
      alarmTimeISO,
      displayTime: `${String(alarmDate.getHours()).padStart(2, "0")}:${String(
        alarmDate.getMinutes(),
      ).padStart(2, "0")}`,
    });

    const response = await instance.post(
      `/api/tasks/work-items/${businessKey}/alarm/set`,
      requestBody,
      {
        headers,
        transformRequest: [(data) => data],
      },
    );

    console.log("Set alarm response from server:", {
      status: response.status,
      data: response.data,
      isSuccess: response.data?.isSuccess,
    });

    if (response.data && response.data.isSuccess) {
      const displayDate = new Date(alarmTimeISO);
      const displayHours = displayDate.getHours();
      const displayMinutes = displayDate.getMinutes();

      const alarmTimeDisplay = `${String(displayHours).padStart(
        2,
        "0",
      )}:${String(displayMinutes).padStart(2, "0")}`;

      console.log("Alarm display time calculated:", {
        iso: alarmTimeISO,
        displayDate: displayDate.toString(),
        displayHours,
        displayMinutes,
        alarmTimeDisplay,
      });

      return {
        success: true,
        data: response.data.data,
        message: "آلارم با موفقیت در سرور تنظیم شد",
        alarmTimeISO: alarmTimeISO,
        alarmTimeDisplay: alarmTimeDisplay,
      };
    } else {
      return {
        success: false,
        message: response.data?.errorMessage || "خطا در تنظیم آلارم در سرور",
      };
    }
  } catch (error) {
    console.error("Error sending set alarm request:", error);

    let errorMessage = "خطا در تنظیم آلارم در سرور";
    let errorDetail = "لطفا دوباره تلاش کنید";

    if (error.response) {
      console.error("Error response details:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      });

      if (error.response.status === 400) {
        console.error("Bad request - likely format issue");
        errorMessage = "فرمت زمان نامعتبر است";
        errorDetail = "لطفا زمان را به درستی وارد کنید";
      } else if (error.response.status === 401) {
        errorMessage = "احراز هویت ناموفق";
        errorDetail = "لطفا مجدد وارد شوید";
        await handleUnauthorizedError();
      }
    } else if (error.message) {
      console.error("Error message:", error.message);
    }

    return {
      success: false,
      message: errorMessage,
      detail: errorDetail,
      error: error.message,
    };
  }
};

const sendClearAlarmRequest = async (businessKey) => {
  try {
    const userInfoJson = await AsyncStorage.getItem("UserInfo");
    if (!userInfoJson) {
      throw new Error("User information not found");
    }

    const userInfo = JSON.parse(userInfoJson);
    const token = userInfo.ID;

    const headers = {
      "X-Api-Key": "0E7B02E8-C04F-4940-83A7-FBD869FD93A9",
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    console.log("Sending clear alarm request to server:", {
      businessKey,
    });

    const response = await instance.post(
      `/api/tasks/work-items/${businessKey}/alarm/clear`,
      {},
      { headers },
    );

    console.log("Clear alarm response:", response.data);

    if (response.data && response.data.isSuccess) {
      return {
        success: true,
        data: response.data.data,
        message: "آلارم با موفقیت از سرور حذف شد",
      };
    } else {
      return {
        success: false,
        message: response.data.errorMessage || "خطا در حذف آلارم از سرور",
      };
    }
  } catch (error) {
    console.error("Error sending clear alarm request:", error);

    let errorMessage = "خطا در حذف آلارم از سرور";
    let errorDetail = "لطفا دوباره تلاش کنید";

    if (error.response) {
      console.error("Error response:", {
        status: error.response.status,
        data: error.response.data,
      });

      if (error.response.status === 401) {
        errorMessage = "احراز هویت ناموفق";
        errorDetail = "لطفا مجدد وارد شوید";
        await handleUnauthorizedError();
      }
    } else if (error.request) {
      errorMessage = "خطای شبکه";
      errorDetail = "اتصال اینترنت را بررسی کنید";
    }

    return {
      success: false,
      message: errorMessage,
      detail: errorDetail,
      error: error,
    };
  }
};

const convertISODateToPersianDisplay = (isoDate) => {
  try {
    const date = new Date(isoDate);
    const [jy, jm, jd] = gregorianToJalali(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );

    const persianDate = `${jy}/${String(jm).padStart(2, "0")}/${String(
      jd,
    ).padStart(2, "0")}`;

    const dayOfWeek = date.getDay();
    const persianDays = [
      "یکشنبه",
      "دوشنبه",
      "سه‌شنبه",
      "چهارشنبه",
      "پنجشنبه",
      "جمعه",
      "شنبه",
    ];
    const persianDayIndex = (dayOfWeek + 1) % 7;
    const dayName = persianDays[persianDayIndex];

    const today = new Date();
    const [todayJy, todayJm, todayJd] = gregorianToJalali(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate(),
    );

    const isToday = jy === todayJy && jm === todayJm && jd === todayJd;
    const isPast =
      jy < todayJy ||
      (jy === todayJy && (jm < todayJm || (jm === todayJm && jd < todayJd)));
    const isFuture =
      jy > todayJy ||
      (jy === todayJy && (jm > todayJm || (jm === todayJm && jd > todayJd)));

    return {
      displayDate: persianDate,
      displayName: dayName,
      isToday: isToday,
      isPast: isPast,
      isFuture: isFuture,
    };
  } catch (error) {
    console.error("Error converting ISO date:", error);
    return {
      displayDate: "",
      displayName: "",
      isToday: false,
      isPast: false,
      isFuture: false,
    };
  }
};

const getPersianWeekInfo = (persianDate) => {
  const [jy, jm, jd] = persianDate.split("/").map(Number);
  const weekInMonth = Math.ceil(jd / 7);
  const persianMonths = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];

  const monthName = persianMonths[jm - 1];

  return {
    weekNumber: weekInMonth,
    monthName: monthName,
    displayTitle: `هفته ${toPersianNumbers(weekInMonth)} ${monthName}`,
  };
};

const sendScheduleDates = async (
  columnTitle,
  recurrenceType,
  scheduleDates,
) => {
  try {
    console.log("Sending");
    const userInfoJson = await AsyncStorage.getItem("UserInfo");
    if (!userInfoJson) {
      throw new Error("User information not found");
    }

    const userInfo = JSON.parse(userInfoJson);
    const token = userInfo.ID;

    const headers = {
      "X-Api-Key": "0E7B02E8-C04F-4940-83A7-FBD869FD93A9",
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    const requestBody = {
      title: columnTitle,
      recurrenceType: recurrenceType,
      scheduleDates: scheduleDates,
    };

    console.log("Sending schedule data:", {
      url: "/api/tasks/work-items",
      headers: headers,
      body: requestBody,
    });

    const response = await instance.post("/api/tasks/work-items", requestBody, {
      headers,
    });

    console.log("Schedule data sent successfully:", response.data);

    if (response.data && response.data.isSuccess) {
      return {
        success: true,
        data: response.data,
        message: "برنامه با موفقیت ذخیره شد",
      };
    } else {
      return {
        success: false,
        message: response.data.message || "خطا در ذخیره برنامه",
      };
    }
  } catch (error) {
    console.error("Error sending schedule data:", error);

    let errorMessage = "خطا در ذخیره برنامه";
    let errorDetail = "لطفا دوباره تلاش کنید";

    if (error.response) {
      console.error("Error response:", {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });

      if (error.response.status === 401) {
        errorMessage = "احراز هویت ناموفق";
        errorDetail = "لطفا مجدد وارد شوید";
        await handleUnauthorizedError();
      } else if (error.response.status === 400) {
        errorMessage = "داده‌های نامعتبر";
        errorDetail = "لطفا اطلاعات را بررسی کنید";
      } else if (error.response.status === 500) {
        errorMessage = "خطای سرور";
        errorDetail = "لطفا بعدا تلاش کنید";
      }
    } else if (error.request) {
      errorMessage = "خطای شبکه";
      errorDetail = "اتصال اینترنت را بررسی کنید";
    }

    return {
      success: false,
      message: errorMessage,
      detail: errorDetail,
      error: error,
    };
  }
};

const convertPersianDateToISO = (persianDate) => {
  try {
    const parts = persianDate.split("/");
    if (parts.length !== 3) {
      throw new Error("Invalid date format");
    }

    const jy = parseInt(parts[0]);
    const jm = parseInt(parts[1]);
    const jd = parseInt(parts[2]);

    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
    const gregorianDate = new Date(gy, gm - 1, gd);
    gregorianDate.setHours(8, 0, 0, 0);

    return gregorianDate.toISOString();
  } catch (error) {
    console.error("Error converting Persian date:", error);
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    return today.toISOString();
  }
};

const getWeekStartDateISO = (weekIndex) => {
  try {
    const today = new Date();
    const daysToAdd = weekIndex * 7;
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() + daysToAdd);

    const dayOfWeek = weekStartDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStartDate.setDate(weekStartDate.getDate() + diff);
    weekStartDate.setHours(8, 0, 0, 0);

    return weekStartDate.toISOString();
  } catch (error) {
    console.error("Error calculating week start date:", error);
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    return today.toISOString();
  }
};

const finalizeColumnWithAPI = async (
  columnId,
  columnTitle,
  activeTab,
  days,
) => {
  try {
    console.log("Sending");
    let selectedDates = [];
    let recurrenceType = 1;

    days.forEach((day) => {
      const isSelected =
        day.completed[columnId] === "future" ||
        day.completed[columnId] === "completed" ||
        day.scheduled[columnId] === true;

      if (isSelected && !day.isPast) {
        try {
          const isoDate = convertPersianDateToISO(day.displayDate);
          selectedDates.push(isoDate);

          console.log(`Added date for day ${day.displayDate}:`, {
            persianDate: day.displayDate,
            isoDate: isoDate,
            displayName: day.displayName,
            isToday: day.isToday,
          });
        } catch (error) {
          console.error(`Error converting date ${day.displayDate}:`, error);
        }
      }
    });

    if (selectedDates.length === 0) {
      return {
        success: false,
        message: "هیچ تاریخی انتخاب نشده است",
      };
    }

    console.log("Selected dates for column:", {
      columnId,
      columnTitle,
      recurrenceType,
      datesCount: selectedDates.length,
      dates: selectedDates,
    });

    const result = await sendScheduleDates(
      columnTitle,
      recurrenceType,
      selectedDates,
    );

    if (result.success) {
      return {
        success: true,
        message: `برنامه با ${selectedDates.length} تاریخ در سرور ذخیره شد`,
        data: result.data,
        datesCount: selectedDates.length,
      };
    } else {
      return {
        success: false,
        message: result.message || "خطا در ذخیره برنامه در سرور",
        datesCount: selectedDates.length,
      };
    }
  } catch (error) {
    console.error("Error in finalizeColumnWithAPI:", error);
    return {
      success: false,
      message: "خطای داخلی در پردازش تاریخ‌ها",
      error: error.message,
    };
  }
};

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  console.log("Background fetch executed at:", new Date().toISOString());
  try {
    const savedData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      console.log("No saved data found");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const parsedData = JSON.parse(savedData);
    const allColumns = parsedData.dailyColumns || [];

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    console.log(
      "Background check - Current time:",
      `${currentHour}:${currentMinute}`,
    );

    for (const column of allColumns) {
      if (column.alarmTime && column.alarmSound !== undefined) {
        const [alarmHour, alarmMinute] = column.alarmTime
          .split(":")
          .map(Number);

        console.log(
          `Checking column "${column.name}": Alarm at ${alarmHour}:${alarmMinute}`,
        );

        if (currentHour === alarmHour && currentMinute === alarmMinute) {
          console.log(`ALARM TRIGGERED for "${column.name}"`);

          const soundConfig = getSoundConfig(column.alarmSound || 0);

          await Notifications.scheduleNotificationAsync({
            content: {
              title: "⏰ زمان انجام تسک!",
              body: `تسک "${column.name}" باید انجام شود`,
              data: {
                columnId: column.id,
                columnName: column.name,
                soundIndex: column.alarmSound || 0,
              },
              sound: Platform.OS === "ios" ? soundConfig.iosSound : true,
            },
            trigger: null,
          });

          await playAlarmSoundInBackground(column.alarmSound || 0);
        }
      }
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Error in background fetch:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

const getPersianDayName = (dayIndex) => {
  const days = [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
  ];
  return days[dayIndex];
};

const getPersianDayIndexFromGregorian = (gregorianDayIndex) => {
  if (gregorianDayIndex === 6) return 0;
  return gregorianDayIndex + 1;
};

const getPersianDayNameFromDate = (date) => {
  const dayIndex = date.getDay();
  const persianDayIndex = getPersianDayIndexFromGregorian(dayIndex);
  return getPersianDayName(persianDayIndex);
};

const markTaskAsDoneOnServer = async (
  workItemBusinessKey,
  scheduleBusinessKey,
) => {
  try {
    const userInfoJson = await AsyncStorage.getItem("UserInfo");
    if (!userInfoJson) {
      throw new Error("User information not found");
    }

    const userInfo = JSON.parse(userInfoJson);
    const token = userInfo.ID;

    const headers = {
      "X-Api-Key": "0E7B02E8-C04F-4940-83A7-FBD869FD93A9",
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    console.log("Marking task schedule as done on server:", {
      workItemBusinessKey,
      scheduleBusinessKey,
    });

    const requestBody = scheduleBusinessKey;
    const businessKey = workItemBusinessKey;

    const response = await instance.post(
      `/api/tasks/work-items/${businessKey}/done`,
      `"${scheduleBusinessKey}"`,
      { headers },
    );

    console.log("Task schedule marked as done successfully:", response.data);

    if (response.data && response.data.isSuccess) {
      return {
        success: true,
        data: response.data.data,
        message: "تسک با موفقیت انجام شده ثبت شد",
      };
    } else {
      return {
        success: false,
        message: response.data.errorMessage || "خطا در ثبت انجام تسک",
      };
    }
  } catch (error) {
    console.error("Error marking task schedule as done:", error);

    let errorMessage = "خطا در ثبت انجام تسک";
    let errorDetail = "لطفا دوباره تلاش کنید";

    if (error.response) {
      console.error("Error response:", {
        status: error.response.status,
        data: error.response.data,
      });

      if (error.response.status === 401) {
        errorMessage = "احراز هویت ناموفق";
        errorDetail = "لطفا مجدد وارد شوید";
        await handleUnauthorizedError();
      } else if (error.response.status === 404) {
        errorMessage = "تسک یافت نشد";
        errorDetail = "لطفا با پشتیبانی تماس بگیرید";
      } else if (error.response.status === 500) {
        errorMessage = "خطای سرور";
        errorDetail = "لطفا بعدا تلاش کنید";
      }
    } else if (error.request) {
      errorMessage = "خطای شبکه";
      errorDetail = "اتصال اینترنت را بررسی کنید";
    }

    return {
      success: false,
      message: errorMessage,
      detail: errorDetail,
      error: error,
    };
  }
};

const extractTimeFromAlarmTime = (alarmTime) => {
  if (!alarmTime || alarmTime.trim() === "") {
    console.log("No alarm time provided, using default 8:00");
    return { hours: 8, minutes: 0 };
  }

  try {
    console.log("🔍 extractTimeFromAlarmTime INPUT:", {
      alarmTime,
      type: typeof alarmTime,
      length: alarmTime.length,
    });

    if (alarmTime.includes("T") && alarmTime.includes("Z")) {
      console.log("📅 Detected ISO format");
      const date = new Date(alarmTime);

      if (isNaN(date.getTime())) {
        console.error("❌ Invalid ISO date:", alarmTime);
        return { hours: 8, minutes: 0 };
      }

      const hours = date.getHours();
      const minutes = date.getMinutes();

      console.log("✅ ISO time extracted:", {
        input: alarmTime,
        dateString: date.toString(),
        hoursLocal: hours,
        minutes: minutes,
        hoursUTC: date.getUTCHours(),
        difference: hours - date.getUTCHours(),
        formatted: `${String(hours).padStart(2, "0")}:${String(
          minutes,
        ).padStart(2, "0")}`,
      });

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error("❌ Invalid time extracted from ISO:", {
          hours,
          minutes,
        });
        return { hours: 8, minutes: 0 };
      }

      return { hours, minutes };
    }

    if (alarmTime.includes(":")) {
      console.log("⏰ Detected HH:MM format");
      const parts = alarmTime.split(":");

      if (parts.length !== 2) {
        console.error("❌ Invalid HH:MM format - expected 2 parts:", parts);
        return { hours: 8, minutes: 0 };
      }

      let hoursStr = parts[0].trim();
      let minutesStr = parts[1].trim();

      console.log("🔢 Split parts:", {
        hoursStr,
        minutesStr,
        hoursStrRaw: hoursStr,
        minutesStrRaw: minutesStr,
      });

      const convertPersianToLatin = (str) => {
        if (!str) return "0";

        const persianToLatinMap = {
          "۰": "0",
          "٠": "0",
          "۰": "0",
          "۱": "1",
          "١": "1",
          "۱": "1",
          "۲": "2",
          "٢": "2",
          "۲": "2",
          "۳": "3",
          "٣": "3",
          "۳": "3",
          "۴": "4",
          "٤": "4",
          "۴": "4",
          "۵": "5",
          "٥": "5",
          "۵": "5",
          "۶": "6",
          "٦": "6",
          "۶": "6",
          "۷": "7",
          "٧": "7",
          "۷": "7",
          "۸": "8",
          "٨": "8",
          "۸": "8",
          "۹": "9",
          "٩": "9",
          "۹": "9",
        };

        let result = "";
        for (let char of str) {
          if (persianToLatinMap[char]) {
            result += persianToLatinMap[char];
          } else if (char >= "0" && char <= "9") {
            result += char;
          }
        }

        return result || "0";
      };

      const hasPersianNumbers = /[۰-۹٠-٩]/.test(hoursStr + minutesStr);

      if (hasPersianNumbers) {
        console.log("🔤 Persian/Arabic numbers detected, converting...");
        hoursStr = convertPersianToLatin(hoursStr);
        minutesStr = convertPersianToLatin(minutesStr);

        console.log("🔄 Converted to Latin:", {
          persianHours: parts[0],
          persianMinutes: parts[1],
          latinHours: hoursStr,
          latinMinutes: minutesStr,
        });
      }

      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      console.log("🧮 Parsed numbers:", {
        hours,
        minutes,
        isNaNHours: isNaN(hours),
        isNaNMinutes: isNaN(minutes),
      });

      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        console.error("❌ Invalid time values:", { hours, minutes });
        return { hours: 8, minutes: 0 };
      }

      console.log("✅ HH:MM time extracted:", {
        input: alarmTime,
        hours,
        minutes,
        formatted24h: `${String(hours).padStart(2, "0")}:${String(
          minutes,
        ).padStart(2, "0")}`,
      });

      return { hours, minutes };
    }

    const num = parseInt(alarmTime, 10);
    if (!isNaN(num) && num > 0) {
      const date = new Date(num);
      const hours = date.getHours();
      const minutes = date.getMinutes();

      console.log("⏱️ Timestamp extracted:", {
        timestamp: num,
        date: date.toString(),
        hours,
        minutes,
        formatted: `${String(hours).padStart(2, "0")}:${String(
          minutes,
        ).padStart(2, "0")}`,
      });

      return { hours, minutes };
    }

    console.error("❌ Unknown time format, cannot extract:", alarmTime);
    return { hours: 8, minutes: 0 };
  } catch (error) {
    console.error("💥 Error in extractTimeFromAlarmTime:", {
      error: error.message,
      alarmTime,
      stack: error.stack,
    });
    return { hours: 8, minutes: 0 };
  }
};

const saveAlarmSettings = async (columnId, alarmData) => {
  try {
    const settingsKey = `alarm_settings_${columnId}`;
    await AsyncStorage.setItem(settingsKey, JSON.stringify(alarmData));

    console.log(`Alarm settings saved for column ${columnId}:`, alarmData);
  } catch (error) {
    console.error("Error saving alarm settings:", error);
  }
};

const loadAlarmSettings = async (columnId) => {
  try {
    const settingsKey = `alarm_settings_${columnId}`;
    const settings = await AsyncStorage.getItem(settingsKey);

    if (settings) {
      const parsedSettings = JSON.parse(settings);
      return parsedSettings;
    }

    return null;
  } catch (error) {
    console.error("Error loading alarm settings:", error);
    return null;
  }
};

const loadAllAlarmSettings = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const alarmKeys = allKeys.filter((key) =>
      key.startsWith("alarm_settings_"),
    );

    const settings = {};

    for (const key of alarmKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const columnId = key.replace("alarm_settings_", "");
        settings[columnId] = JSON.parse(value);
      }
    }

    console.log("All alarm settings loaded:", settings);
    return settings;
  } catch (error) {
    console.error("Error loading all alarm settings:", error);
    return {};
  }
};

const removeAlarmSettings = async (columnId) => {
  try {
    const settingsKey = `alarm_settings_${columnId}`;
    await AsyncStorage.removeItem(settingsKey);

    console.log(`Alarm settings removed for column ${columnId}`);
  } catch (error) {
    console.error("Error removing alarm settings:", error);
  }
};

const gregorianToPersianDate = (gregorianDate) => {
  try {
    const date = new Date(gregorianDate);
    const [jy, jm, jd] = gregorianToJalali(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );
    return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(
      2,
      "0",
    )}`;
  } catch (error) {
    console.error("Error converting gregorian to persian:", error);
    return "";
  }
};

const HomeScreen = () => {
  const [days, setDays] = useState([]);
  const [dailyColumns, setDailyColumns] = useState([]);
  const [scale, setScale] = useState(0.75);
  const [lastScale, setLastScale] = useState(0.75);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingColumn, setEditingColumn] = useState(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedColumnForSchedule, setSelectedColumnForSchedule] =
    useState(null);
  const [alarmModalVisible, setAlarmModalVisible] = useState(false);
  const [selectedColumnForAlarm, setSelectedColumnForAlarm] = useState(null);
  const [selectedAlarmSound, setSelectedAlarmSound] = useState(null);
  const [alarmHours, setAlarmHours] = useState(8);
  const [alarmMinutes, setAlarmMinutes] = useState(0);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [alarmTimes, setAlarmTimes] = useState({
    0: { hours: 8, minutes: 0 },
    1: { hours: 14, minutes: 0 },
    2: { hours: 20, minutes: 0 },
  });
  const [selectWarningVisible, setSelectWarningVisible] = useState(false);
  const [confirmFinalizeVisible, setConfirmFinalizeVisible] = useState(false);
  const [confirmFinalizeColumnId, setConfirmFinalizeColumnId] = useState(null);
  const [spinner, setSpinner] = useState(false);
  const [loadingFromServer, setLoadingFromServer] = useState(false);
  const [spinnerMessage, setSpinnerMessage] = useState("");

  const [showTutorial, setShowTutorial] = useState({
    tabTutorial: false,
    scheduleTutorial: false,
    confirmTutorial: false,
    alarmTutorial: false,
  });

  const [tutorialPosition, setTutorialPosition] = useState({ x: 0, y: 0 });
  const [currentTutorial, setCurrentTutorial] = useState(null);
  const [tutorialColumnId, setTutorialColumnId] = useState(null);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [alarmSettings, setAlarmSettings] = useState({});

  const [mobileNumber, setMobileNumber] = useState("");
  const [gemCount, setGemCount] = useState(20);

  // Stateهای جدید برای مدیریت خطای اینترنت
  const [isConnected, setIsConnected] = useState(true);
  const [showNetworkError, setShowNetworkError] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef(null);
  const lastScrollY = useRef(0);
  const headerVisible = useRef(true);
  const headerAnimatedValue = useRef(new Animated.Value(0)).current;
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(180);
  const [dailyTabHeaderHeight, setDailyTabHeaderHeight] = useState(60);
  const contentAnimatedValue = useRef(new Animated.Value(0)).current;

  const appState = useRef(AppState.currentState);

  const tabContainerRef = useRef(null);
  const tabAddButtonRef = useRef(null);

  const scheduleButtonRefs = useRef({});
  const confirmButtonRefs = useRef({});
  const alarmButtonRefs = useRef({});

  const todayRowRef = useRef(null);
  const [hasScrolledToToday, setHasScrolledToToday] = useState(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  const isMinZoom = scale === 0.45;

  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [hasShownGemWelcome, setHasShownGemWelcome] = useState(false);

  // تابع محاسبه میانگین درصد کل (فقط روزهای گذشته)
  const calculateOverallPercentage = useCallback(() => {
    if (days.length === 0 || dailyColumns.length === 0) return 0;

    let totalCompleted = 0;
    let totalScheduled = 0;

    const finalizedColumns = dailyColumns.filter((col) => col.finalized);

    if (finalizedColumns.length === 0) return 0;

    const pastDays = days.filter((day) => day.isPast);

    pastDays.forEach((day) => {
      finalizedColumns.forEach((column) => {
        const isScheduled = day.scheduled[column.id] === true;
        const status = day.completed[column.id];
        const isFuture = status === "future";

        if (isScheduled || isFuture) {
          totalScheduled++;

          let isCompleted = false;

          if (column.isFromServer) {
            if (day.serverIsDone && typeof day.serverIsDone === "object") {
              if (day.serverIsDone[column.id] === true) {
                isCompleted = true;
              }
            }
            if (!isCompleted && status === "completed") {
              isCompleted = true;
            }
          } else {
            if (status === "completed") {
              isCompleted = true;
            }
          }

          if (isCompleted) {
            totalCompleted++;
          }
        }
      });
    });

    if (totalScheduled === 0) return 0;

    const percentage = (totalCompleted / totalScheduled) * 100;
    return Math.round(percentage);
  }, [days, dailyColumns]);

  const calculatePastDaysPercentage = () => {
    if (days.length === 0 || dailyColumns.length === 0) return 0;

    let totalCompleted = 0;
    let totalScheduled = 0;

    const finalizedColumns = dailyColumns.filter((col) => col.finalized);
    const pastDays = days.filter((day) => day.isPast);

    pastDays.forEach((day) => {
      finalizedColumns.forEach((column) => {
        const status = day.completed[column.id];
        const isScheduled = day.scheduled[column.id] === true;

        if (isScheduled || status === "future" || status === "completed") {
          totalScheduled++;

          if (column.isFromServer) {
            if (
              day.serverIsDone &&
              typeof day.serverIsDone === "object" &&
              day.serverIsDone[column.id] === true
            ) {
              totalCompleted++;
            } else if (status === "completed") {
              totalCompleted++;
            }
          } else if (status === "completed") {
            totalCompleted++;
          }
        }
      });
    });

    if (totalScheduled === 0) return 0;
    return Math.round((totalCompleted / totalScheduled) * 100);
  };

  const loadUserInfo = async () => {
    try {
      const userInfoJson = await AsyncStorage.getItem("UserInfo");
      if (userInfoJson) {
        const userInfo = JSON.parse(userInfoJson);
        setMobileNumber(userInfo.mobile || userInfo.Phone || "");

        const savedGemCount = await AsyncStorage.getItem("gem_count");
        if (savedGemCount) {
          setGemCount(parseInt(savedGemCount));
        } else {
          setGemCount(20);
          await AsyncStorage.setItem("gem_count", "20");
        }
      }
    } catch (error) {
      console.error("Error loading user info:", error);
      setGemCount(20);
      try {
        await AsyncStorage.setItem("gem_count", "20");
      } catch (e) {
        console.error("Error saving default gem count:", e);
      }
    }
  };

  const checkAndShowGemWelcome = async () => {
    try {
      const hasShown = await AsyncStorage.getItem("has_shown_gem_welcome");
      if (!hasShown) {
        setShowWelcomeMessage(true);
        setHasShownGemWelcome(true);
        await AsyncStorage.setItem("has_shown_gem_welcome", "true");
      }
    } catch (error) {
      console.error("Error checking gem welcome:", error);
    }
  };

  const increaseGemCount = async (amount = 1) => {
    try {
      const newCount = gemCount + amount;
      setGemCount(newCount);
      await AsyncStorage.setItem("gem_count", newCount.toString());

      showToast(
        "success",
        "تبریک!",
        `${toPersianNumbers(amount)} gem دریافت کردید`,
      );
    } catch (error) {
      console.error("Error increasing gem count:", error);
    }
  };

  const decreaseGemCount = async (amount = 1) => {
    try {
      if (gemCount >= amount) {
        const newCount = gemCount - amount;
        setGemCount(newCount);
        await AsyncStorage.setItem("gem_count", newCount.toString());
        return true;
      } else {
        showToast("error", "خطا", "gem کافی ندارید");
        return false;
      }
    } catch (error) {
      console.error("Error decreasing gem count:", error);
      return false;
    }
  };

  // تابع بررسی وضعیت اینترنت
  const checkInternetConnection = useCallback(async () => {
    try {
      const netInfoState = await NetInfo.fetch();
      const connected =
        netInfoState.isConnected && netInfoState.isInternetReachable;
      setIsConnected(connected);

      if (!connected) {
        setShowNetworkError(true);
      }

      return connected;
    } catch (error) {
      console.error("Error checking internet connection:", error);
      setIsConnected(false);
      setShowNetworkError(true);
      return false;
    }
  }, []);

  // تابع رفرش دستی
  const handleRefresh = useCallback(async () => {
    const connected = await checkInternetConnection();

    if (connected) {
      setShowNetworkError(false);
      loadDataFromServer();
      showToast(
        "success",
        "اتصال برقرار شد",
        "داده‌ها در حال به‌روزرسانی هستند",
      );
    } else {
      showToast("error", "خطا", "اتصال اینترنت برقرار نیست");
    }
  }, [checkInternetConnection, loadDataFromServer]);

  const handleScroll = useCallback(
    (event) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const scrollDirection =
        currentScrollY > lastScrollY.current ? "down" : "up";

      const SCROLL_THRESHOLD = 5;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);

      if (initialScrollDone) {
        if (scrollDelta < SCROLL_THRESHOLD) return;

        lastScrollY.current = currentScrollY;

        // وقتی به قسمت صفر رسید بچسبد
        if (currentScrollY > 0) {
          if (!isHeaderSticky) {
            setIsHeaderSticky(true);
          }

          if (scrollDirection === "down") {
            if (headerVisible.current) {
              headerVisible.current = false;
              Animated.timing(headerAnimatedValue, {
                toValue: -headerHeight,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }
          }
        }

        // وقتی به بالا برگشت
        if (currentScrollY <= 10) {
          if (isHeaderSticky) {
            setIsHeaderSticky(false);
          }

          if (!headerVisible.current) {
            headerVisible.current = true;
            Animated.timing(headerAnimatedValue, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }
        }
      } else {
        lastScrollY.current = currentScrollY;
      }
    },
    [headerHeight, initialScrollDone, isHeaderSticky],
  );

  const syncScroll = useCallback((offset) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: offset, animated: false });
    }
  }, []);

  const handleHeaderLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    setHeaderHeight(height);
  };

  const handleDailyTabHeaderLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    setDailyTabHeaderHeight(height);
  };

  const scrollToToday = useCallback(() => {
    if (days.length === 0 || !scrollViewRef.current) return;

    const todayIndex = days.findIndex((day) => day.isToday);

    if (todayIndex !== -1) {
      const targetPosition = Math.max(0, todayIndex * 80 * scale - 250);

      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: targetPosition,
            animated: true,
          });

          setTimeout(() => {
            setInitialScrollDone(true);
          }, 500);
        }
      }, 500);
    } else {
      setInitialScrollDone(true);
    }
  }, [days, scale]);

  const focusOnToday = () => {
    scrollToToday();
  };

  const registerBackgroundFetch = async () => {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_FETCH_TASK,
      );

      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: 60,
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log("Background fetch registered successfully");
      }

      const status = await BackgroundFetch.getStatusAsync();
      console.log("Background fetch status:", status);
    } catch (error) {
      console.log("Failed to register background fetch:", error);
    }
  };

  const setupNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowShowInCar: true,
          allowCriticalAlerts: true,
        },
      });

      if (status !== "granted") {
        showToast(
          "error",
          "خطا",
          "برای آلارم‌ها نیاز به مجوز نوتیفیکیشن دارید",
        );
        return;
      }

      await setupNotificationChannels();

      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const soundIndex = notification.request.content.data?.soundIndex;
          const config = getSoundConfig(soundIndex || 0);

          if (soundIndex !== undefined) {
            playAlarmSoundInBackground(soundIndex);
          }

          return {
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            sound: Platform.OS === "ios" ? config.iosSound : true,
          };
        },
      });

      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;

        if (!projectId) {
          console.warn(
            "Project ID not found. Push tokens may not work correctly.",
          );
        } else {
          const token = (
            await Notifications.getExpoPushTokenAsync({
              projectId,
            })
          ).data;
          console.log("Expo Push Token:", token);
          await AsyncStorage.setItem("expoPushToken", token);
        }
      } catch (tokenError) {
        console.error("Error getting Expo push token:", tokenError);
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
      showToast("error", "خطا", "مشکلی در تنظیم نوتیفیکیشن‌ها پیش آمده است");
    }
  };

  const saveAlarmSettingsToState = (columnId, alarmData) => {
    setAlarmSettings((prev) => ({
      ...prev,
      [columnId]: alarmData,
    }));
  };

  const loadAllAlarmSettingsFromStorage = async () => {
    try {
      const settings = await loadAllAlarmSettings();
      setAlarmSettings(settings);
      console.log("All alarm settings loaded to state:", settings);
    } catch (error) {
      console.error("Error loading alarm settings to state:", error);
    }
  };

  const removeAlarmSettingsFromState = (columnId) => {
    setAlarmSettings((prev) => {
      const newSettings = { ...prev };
      delete newSettings[columnId];
      return newSettings;
    });
  };

  const loadDataFromServer = async () => {
    try {
      setLoadingFromServer(true);

      // بررسی اینترنت قبل از فراخوانی
      const connected = await checkInternetConnection();
      if (!connected) {
        setShowNetworkError(true);
        setLoadingFromServer(false);
        return;
      }

      console.log("Loading data from server...");

      const result = await fetchTasksFromServer();

      if (result.success && result.data.length > 0) {
        console.log(`Received ${result.data.length} tasks from server`);

        const processedData = processServerData(result.data);
        applyServerDataToState(processedData);

        showToast("success", "موفقیت", "داده‌ها از سرور دریافت شدند");

        setTimeout(() => {
          scrollToToday();
        }, 1000);
      } else if (result.success && result.data.length === 0) {
        console.log("No tasks found on server");
        loadSavedData();

        setTimeout(() => {
          scrollToToday();
        }, 1000);
      } else if (result.isNetworkError) {
        // خطای شبکه
        setShowNetworkError(true);
        showToast("error", "خطا", "اتصال اینترنت را بررسی کنید");
        loadSavedData();

        setTimeout(() => {
          scrollToToday();
        }, 1000);
      } else {
        console.log("Failed to load from server, using local data");
        showToast("warning", "توجه", "استفاده از داده‌های محلی");
        loadSavedData();

        setTimeout(() => {
          scrollToToday();
        }, 1000);
      }
    } catch (error) {
      console.error("Error loading data from server:", error);
      showToast("error", "خطا", "مشکلی در دریافت داده‌ها پیش آمده است");
      loadSavedData();

      setTimeout(() => {
        scrollToToday();
      }, 1000);
    } finally {
      setLoadingFromServer(false);
    }
  };

  const processServerData = (serverTasks) => {
    const processedData = {
      dailyColumns: [],
      dailyDays: [],
    };

    const initialDays = createPersianDays(30);

    serverTasks.forEach((task) => {
      const columnId = `server_${task.id}`;
      const recurrenceType = task.recurrenceType;
      const columnTitle = task.title;
      const hasAlarm = task.hasAlarm;
      const alarmTimeISO = task.alarmTime;
      const schedules = task.schedules || [];

      let alarmTimeDisplay = "";
      if (alarmTimeISO) {
        try {
          const alarmDate = new Date(alarmTimeISO);
          const hours = alarmDate.getHours().toString().padStart(2, "0");
          const minutes = alarmDate.getMinutes().toString().padStart(2, "0");
          alarmTimeDisplay = `${hours}:${minutes}`;
        } catch (error) {
          alarmTimeDisplay = "08:00";
        }
      }

      const newColumn = {
        id: columnId,
        name: columnTitle,
        type: "task",
        editable: false,
        finalized: true,
        scheduleType: "all",
        alarmSound: hasAlarm ? 0 : undefined,
        alarmTime: alarmTimeDisplay,
        alarmTimeISO: alarmTimeISO,
        isFromServer: true,
        serverId: task.id,
        businessKey: task.businessKey,
        hasAlarm: hasAlarm,
      };

      if (recurrenceType === 1) {
        processedData.dailyColumns.push(newColumn);

        if (processedData.dailyDays.length === 0) {
          processedData.dailyDays = initialDays.map((day) => ({
            ...day,
            completed: {},
            scheduled: {},
            taskTime: {},
            serverIsDone: {},
            scheduleBusinessKeys: {},
          }));
        }

        schedules.forEach((schedule) => {
          try {
            const scheduleDate = new Date(schedule.scheduledDate);
            const persianDate = gregorianToPersianDate(scheduleDate);

            const targetDayIndex = processedData.dailyDays.findIndex(
              (day) => day.displayDate === persianDate,
            );

            if (targetDayIndex !== -1) {
              const today = new Date();
              const isPastSchedule = scheduleDate < today;
              const isDone = schedule.isDone;

              let status;
              if (isDone) {
                status = "completed";
              } else if (isPastSchedule) {
                status = "not-completed";
              } else {
                status = "future";
              }

              processedData.dailyDays[targetDayIndex] = {
                ...processedData.dailyDays[targetDayIndex],
                completed: {
                  ...processedData.dailyDays[targetDayIndex].completed,
                  [columnId]: status,
                },
                scheduled: {
                  ...processedData.dailyDays[targetDayIndex].scheduled,
                  [columnId]: true,
                },
                serverIsDone: {
                  ...processedData.dailyDays[targetDayIndex].serverIsDone,
                  [columnId]: isDone,
                },
                scheduleBusinessKeys: {
                  ...processedData.dailyDays[targetDayIndex]
                    .scheduleBusinessKeys,
                  [columnId]: schedule.businessKey,
                },
              };
            }
          } catch (error) {
            console.error("Error processing schedule:", error);
          }
        });

        processedData.dailyDays.forEach((day, index) => {
          if (day.completed[columnId] === undefined) {
            processedData.dailyDays[index] = {
              ...day,
              completed: {
                ...day.completed,
                [columnId]: "not-started",
              },
              scheduled: {
                ...day.scheduled,
                [columnId]: false,
              },
              serverIsDone: {
                ...day.serverIsDone,
                [columnId]: false,
              },
            };
          }
        });
      }
    });

    return processedData;
  };

  const applyServerDataToState = (processedData) => {
    if (processedData.dailyColumns.length > 0) {
      setDailyColumns(processedData.dailyColumns);
      if (processedData.dailyDays.length > 0) {
        setDays(processedData.dailyDays);
      }
    }
  };

  const scheduleLocalNotification = async (columnId, hours, minutes) => {
    try {
      const column = dailyColumns.find((col) => col.id === columnId);
      if (!column) {
        console.error("Column not found:", columnId);
        return false;
      }

      // Cancel previously scheduled notification for this column if exists
      const savedNotificationKey = `notification_id_${columnId}`;
      try {
        const existingId = await AsyncStorage.getItem(savedNotificationKey);
        if (existingId) {
          await Notifications.cancelScheduledNotificationAsync(existingId);
          await AsyncStorage.removeItem(savedNotificationKey);
        }
      } catch (e) {
        console.warn("Could not cancel existing notification:", e);
      }

      const now = new Date();
      let alarmDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0,
      );

      if (alarmDate.getTime() <= now.getTime()) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }

      const soundConfig = getSoundConfig(column.alarmSound || 0);

      console.log(
        `Setting alarm for column "${column.name}" at ${hours}:${minutes} with sound: ${soundConfig.fileName}`,
      );

      const notificationConfig = {
        identifier: notificationId,
        content: {
          title: "⏰ زمان انجام تسک!",
          body: `تسک "${column.name}" باید انجام شود`,
          data: {
            columnId: column.id,
            soundIndex: column.alarmSound || 0,
            columnName: column.name,
            alarmTime: `${hours}:${minutes}`,
            playSoundInBackground: true,
          },
          sound: Platform.OS === "ios" ? soundConfig.iosSound : true,
          priority: "high",
          autoDismiss: true,
          sticky: true,
        },
        trigger: {
          type: "daily",
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      };

      if (Platform.OS === "android") {
        notificationConfig.trigger.channelId = soundConfig.androidChannel;
      }

      const scheduledId = await Notifications.scheduleNotificationAsync(
        notificationConfig,
      );

      // save scheduled id for future cancellation
      try {
        await AsyncStorage.setItem(savedNotificationKey, scheduledId);
      } catch (e) {
        console.warn("Could not save scheduled notification id:", e);
      }

      console.log("Notification scheduled successfully", scheduledId);
      return true;
    } catch (error) {
      console.error("Error scheduling notification:", error);

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏰ زمان انجام تسک!",
            body: `تسک "${column?.name || "نامشخص"}" باید انجام شود`,
            sound: true,
          },
          trigger: null,
        });
        console.log("Fallback notification scheduled");
      } catch (fallbackError) {
        console.error("Fallback notification error:", fallbackError);
      }

      return false;
    }
  };

  const saveZoomSettings = async (zoomLevel) => {
    try {
      await AsyncStorage.setItem("zoom_level", zoomLevel.toString());
    } catch (error) {
      console.error("Error saving zoom settings:", error);
    }
  };

  const loadZoomSettings = async () => {
    try {
      const savedZoom = await AsyncStorage.getItem("zoom_level");
      if (savedZoom) {
        setScale(parseFloat(savedZoom));
      } else {
        setScale(0.75);
      }
    } catch (error) {
      console.error("Error loading zoom settings:", error);
      setScale(0.75);
    }
  };

  // تغییر ۲: پن‌رسپاندر برای کشیدن با دست
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        // برای کشیدن افقی با دست
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx } = gestureState;

        // اگر کشیدن از سمت راست به چپ باشد (dx منفی)
        if (dx < -50) {
          // زوم این - به scale کوچکتر
          const newScale = Math.max(0.45, Math.min(scale - 0.05, 0.75));
          if (newScale !== scale) {
            setScale(newScale);
            saveZoomSettings(newScale);
          }
        }
        // اگر کشیدن از سمت چپ به راست باشد (dx مثبت)
        else if (dx > 50) {
          // زوم اوت - به scale بزرگتر
          const newScale = Math.max(0.45, Math.min(scale + 0.05, 0.75));
          if (newScale !== scale) {
            setScale(newScale);
            saveZoomSettings(newScale);
          }
        }
      },
      onPanResponderRelease: () => {
        // بعد از رها کردن، مقدار scale را به نزدیک‌ترین مرحله گرد می‌کنیم
        const snapPoints = [0.45, 0.6, 0.75];
        let closest = snapPoints[0];
        let minDiff = Math.abs(scale - closest);

        snapPoints.forEach((point) => {
          const diff = Math.abs(scale - point);
          if (diff < minDiff) {
            minDiff = diff;
            closest = point;
          }
        });

        if (closest !== scale) {
          setScale(closest);
          saveZoomSettings(closest);
        }
      },
    }),
  ).current;

  useEffect(() => {
    initializeData();
    loadTutorialStatus();
    loadUserInfo();
    loadZoomSettings();
    loadDataFromServer();
    loadAllAlarmSettingsFromStorage();
    setupNotifications();
    registerBackgroundFetch();
    setIsAppLoaded(true);

    // تغییر ۴: نمایش پیام هدیه gem
    checkAndShowGemWelcome();

    // بررسی اولیه وضعیت اینترنت
    checkInternetConnection();

    // گوش دادن به تغییرات وضعیت اینترنت
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);

      if (connected) {
        setShowNetworkError(false);
        // اگر اینترنت وصل شد، داده‌ها را رفرش کنید
        if (!loadingFromServer) {
          loadDataFromServer();
        }
      } else {
        setShowNetworkError(true);
      }
    });

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log("App state changed:", nextAppState);

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        registerBackgroundFetch();
        // بررسی اینترنت هنگام بازگشت به برنامه
        checkInternetConnection();
      }
      appState.current = nextAppState;
    });

    const notificationListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        console.log("Notification received:", notification);
        console.log(
          "Notification sound data:",
          notification.request.content.data?.soundIndex,
        );

        const soundIndex = notification.request.content.data?.soundIndex;
        if (soundIndex !== undefined) {
          await playAlarmSoundInBackground(soundIndex);
        }
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          console.log("Notification response:", response);

          const soundIndex =
            response.notification.request.content.data?.soundIndex;
          if (soundIndex !== undefined) {
            // await playAlarmSoundInBackground(soundIndex);
          }
        },
      );

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      subscription.remove();
      notificationListener.remove();
      responseListener.remove();
      unsubscribe();
    };
  }, []);

  // تغییر ۳: وقتی دکمه i زده شد، راهنماها به ترتیب اجرا شوند
  const handleInfoButtonPress = () => {
    const tutorialKeys = [
      "tabTutorial",
      "scheduleTutorial",
      "confirmTutorial",
      "alarmTutorial",
    ];
    let currentIndex = 0;

    const showNextTutorial = () => {
      if (currentIndex < tutorialKeys.length) {
        const key = tutorialKeys[currentIndex];
        setCurrentTutorial(key);
        setShowTutorial((prev) => ({
          ...prev,
          [key]: true,
        }));

        // موقعیت نمایش
        setTimeout(() => {
          if (tabAddButtonRef.current && key === "tabTutorial") {
            tabAddButtonRef.current.measure((fx, fy, width, height, px, py) => {
              setTutorialPosition({ x: px + width / 2, y: py + height / 2 });
            });
          } else if (key === "scheduleTutorial") {
            // موقعیت پیش‌فرض برای زمان‌بندی
            setTutorialPosition({ x: screenWidth / 2, y: screenHeight / 2 });
          } else if (key === "confirmTutorial") {
            setTutorialPosition({ x: screenWidth / 2, y: screenHeight / 2 });
          } else if (key === "alarmTutorial") {
            setTutorialPosition({ x: screenWidth / 2, y: screenHeight / 2 });
          }
        }, 100);

        currentIndex++;
      }
    };

    showNextTutorial();
  };

  // تغییر ۳: وقتی tutorial بسته شد، بعدی را نشان بده
  const handleCloseTutorial = () => {
    if (currentTutorial) {
      saveTutorialStatus(currentTutorial);

      const tutorialKeys = [
        "tabTutorial",
        "scheduleTutorial",
        "confirmTutorial",
        "alarmTutorial",
      ];
      const currentIndex = tutorialKeys.indexOf(currentTutorial);

      if (currentIndex !== -1 && currentIndex < tutorialKeys.length - 1) {
        // اگر tutorial فعلی بسته شد و tutorial بعدی وجود دارد، آن را نشان بده
        const nextKey = tutorialKeys[currentIndex + 1];
        setTimeout(() => {
          setCurrentTutorial(nextKey);
          setShowTutorial((prev) => ({
            ...prev,
            [nextKey]: true,
          }));

          // موقعیت نمایش برای tutorial بعدی
          setTimeout(() => {
            if (nextKey === "scheduleTutorial") {
              // پیدا کردن اولین ستون برای نشان دادن tutorial زمان‌بندی
              const firstColumn = dailyColumns.find((col) => !col.isFromServer);
              if (firstColumn) {
                setTutorialColumnId(firstColumn.id);
                if (scheduleButtonRefs.current[firstColumn.id]) {
                  scheduleButtonRefs.current[firstColumn.id].measure(
                    (fx, fy, width, height, px, py) => {
                      setTutorialPosition({
                        x: px + width / 2,
                        y: py + height / 2,
                      });
                    },
                  );
                }
              }
            } else if (nextKey === "confirmTutorial") {
              const firstColumn = dailyColumns.find((col) => !col.isFromServer);
              if (firstColumn) {
                setTutorialColumnId(firstColumn.id);
                if (confirmButtonRefs.current[firstColumn.id]) {
                  confirmButtonRefs.current[firstColumn.id].measure(
                    (fx, fy, width, height, px, py) => {
                      setTutorialPosition({
                        x: px + width / 2,
                        y: py + height / 2,
                      });
                    },
                  );
                }
              }
            } else if (nextKey === "alarmTutorial") {
              const firstColumn = dailyColumns.find(
                (col) => !col.isFromServer && col.finalized,
              );
              if (firstColumn) {
                setTutorialColumnId(firstColumn.id);
                if (alarmButtonRefs.current[firstColumn.id]) {
                  alarmButtonRefs.current[firstColumn.id].measure(
                    (fx, fy, width, height, px, py) => {
                      setTutorialPosition({
                        x: px + width / 2,
                        y: py + height / 2,
                      });
                    },
                  );
                }
              }
            }
          }, 100);
        }, 300);
      } else {
        // اگر tutorial آخر بود، فقط ببند
        setCurrentTutorial(null);
      }
    }
  };

  // استفاده از useFocusEffect برای بررسی اینترنت هنگام بازگشت به صفحه
  useFocusEffect(
    useCallback(() => {
      checkInternetConnection();
    }, [checkInternetConnection]),
  );

  useEffect(() => {
    if (isAppLoaded) {
      saveData();
    }
  }, [dailyColumns, days, alarmTimes]);

  useEffect(() => {
    if (isFirstLoad && showTutorial.tabTutorial) {
      const timer = setTimeout(() => {
        showTabTutorial();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFirstLoad, showTutorial.tabTutorial]);

  useEffect(() => {
    if (days.length > 0 && !hasScrolledToToday && !initialScrollDone) {
      setTimeout(() => {
        scrollToToday();
        setHasScrolledToToday(true);
      }, 800);
    }
  }, [days, hasScrolledToToday, initialScrollDone, scrollToToday]);

  const checkAlarms = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (!savedData) return;

      const parsedData = JSON.parse(savedData);
      const allColumns = parsedData.dailyColumns || [];

      for (const column of allColumns) {
        if (column.alarmTime && column.alarmSound !== undefined) {
          const [alarmHour, alarmMinute] = column.alarmTime
            .split(":")
            .map(Number);

          if (
            currentHour === alarmHour &&
            currentMinute >= alarmMinute &&
            currentMinute <= alarmMinute + 5
          ) {
            console.log(
              `Alarm check: ${column.name} at ${alarmHour}:${alarmMinute} with sound: ${column.alarmSound}`,
            );

            await playAlarmSoundInBackground(column.alarmSound);
          }
        }
      }
    } catch (error) {
      console.error("Error checking alarms:", error);
    }
  };

  const loadTutorialStatus = async () => {
    try {
      const savedStatus = await AsyncStorage.getItem("tutorialStatus");
      if (savedStatus) {
        setShowTutorial(JSON.parse(savedStatus));
      } else {
        setShowTutorial({
          tabTutorial: true,
          scheduleTutorial: true,
          confirmTutorial: true,
          alarmTutorial: true,
        });
      }
    } catch (error) {
      console.error("Error loading tutorial status:", error);
      setShowTutorial({
        tabTutorial: true,
        scheduleTutorial: true,
        confirmTutorial: true,
        alarmTutorial: true,
      });
    }
  };

  const extractDailyActivities = () => {
    const activities = {};
    days.forEach((day) => {
      activities[day.id] = {
        completed: day.completed,
        taskTime: day.taskTime,
        scheduled: day.scheduled,
      };
    });
    return activities;
  };

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);

        if (parsedData.dailyColumns) setDailyColumns(parsedData.dailyColumns);
        if (parsedData.alarmTimes) setAlarmTimes(parsedData.alarmTimes);
        if (parsedData.dailyActivities)
          restoreDailyActivities(parsedData.dailyActivities);
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
      showToast("error", "خطا", "مشکلی در بارگذاری داده‌ها پیش آمده است");
    }
  };

  const restoreDailyActivities = (savedActivities) => {
    setDays((prevDays) =>
      prevDays.map((day) => ({
        ...day,
        completed: savedActivities[day.id]?.completed || {},
        taskTime: savedActivities[day.id]?.taskTime || {},
        scheduled: savedActivities[day.id]?.scheduled || {},
      })),
    );
  };

  const saveData = async () => {
    try {
      const dataToSave = {
        dailyColumns: dailyColumns.map((col) => ({
          id: col.id,
          name: col.name,
          type: col.type,
          editable: col.editable,
          finalized: col.finalized,
          scheduleType: col.scheduleType,
          alarmSound: col.alarmSound,
          alarmTime: col.alarmTime,
          isFromServer: col.isFromServer || false,
          serverId: col.serverId,
          businessKey: col.businessKey,
          hasAlarm: col.hasAlarm || false,
        })),
        dailyActivities: extractDailyActivities(),
        alarmTimes,
        lastSaved: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Error saving data:", error);
      showToast("error", "خطا", "مشکلی در ذخیره داده‌ها پیش آمده است");
    }
  };

  const saveTutorialStatus = async (tutorialKey) => {
    try {
      const updatedStatus = {
        ...showTutorial,
        [tutorialKey]: false,
      };
      setShowTutorial(updatedStatus);
      await AsyncStorage.setItem(
        "tutorialStatus",
        JSON.stringify(updatedStatus),
      );
    } catch (error) {
      console.error("Error saving tutorial status:", error);
    }
  };

  const showTabTutorial = () => {
    if (!showTutorial.tabTutorial) return;

    if (tabAddButtonRef.current) {
      tabAddButtonRef.current.measure((fx, fy, width, height, px, py) => {
        const x = px + width / 2;
        const y = py + height / 2;
        setTutorialPosition({ x, y });
        setCurrentTutorial("tabTutorial");
      });
    } else if (tabContainerRef.current) {
      tabContainerRef.current.measure((fx, fy, width, height, px, py) => {
        const x = px + width / 2;
        const y = py + height / 2;
        setTutorialPosition({ x, y });
        setCurrentTutorial("tabTutorial");
      });
    }
  };

  const showScheduleTutorial = (columnId) => {
    if (!showTutorial.scheduleTutorial) return;
    setCurrentTutorial("scheduleTutorial");
    setTutorialColumnId(columnId);
  };

  const showConfirmTutorial = (columnId) => {
    if (!showTutorial.confirmTutorial) return;
    setCurrentTutorial("confirmTutorial");
    setTutorialColumnId(columnId);
  };

  const showAlarmTutorial = (columnId) => {
    if (!showTutorial.alarmTutorial) return;
    setCurrentTutorial("alarmTutorial");
    setTutorialColumnId(columnId);
  };

  const getCurrentPersianDate = () => {
    const today = new Date();
    const [jy, jm, jd] = gregorianToJalali(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate(),
    );
    return [jy, jm, jd];
  };

  const fetchDayNamesFromAPI = async () => {
    try {
      return [
        "یکشنبه",
        "دوشنبه",
        "سه‌شنبه",
        "چهارشنبه",
        "پنجشنبه",
        "جمعه",
        "شنبه",
      ];
    } catch (error) {
      console.error("Error fetching day names from API:", error);
      return [
        "یکشنبه",
        "دوشنبه",
        "سه‌شنبه",
        "چهارشنبه",
        "پنجشنبه",
        "جمعه",
        "شنبه",
      ];
    }
  };

  const createPersianDays = (count) => {
    const initialDays = [];
    const [currentYear, currentMonth, currentDay] = getCurrentPersianDate();

    const firstDayOfMonth = 1;
    const todayNumeric =
      parseInt(currentYear) * 10000 +
      parseInt(currentMonth) * 100 +
      parseInt(currentDay);

    const today = new Date();

    console.log(
      `ایجاد ${count} روز فارسی از اول ماه: ${currentYear}/${currentMonth}`,
    );

    const todayGregorianDayIndex = today.getDay();
    const todayPersianDayIndex = getPersianDayIndexFromGregorian(
      todayGregorianDayIndex,
    );

    const firstDayOffset = 1 - currentDay;

    const firstDayGregorian = new Date(today);
    firstDayGregorian.setDate(today.getDate() + firstDayOffset);
    const firstDayGregorianIndex = firstDayGregorian.getDay();
    const firstDayPersianIndex = getPersianDayIndexFromGregorian(
      firstDayGregorianIndex,
    );

    for (let i = 0; i < count; i++) {
      const dayOfMonth = firstDayOfMonth + i;
      const jm = parseInt(currentMonth);
      const jy = parseInt(currentYear);

      const currentDayGregorian = new Date(firstDayGregorian);
      currentDayGregorian.setDate(firstDayGregorian.getDate() + i);

      const dayGregorianIndex = currentDayGregorian.getDay();
      const dayPersianIndex =
        getPersianDayIndexFromGregorian(dayGregorianIndex);
      const dayName = getPersianDayName(dayPersianIndex);

      const persianDate = `${jy}/${String(jm).padStart(2, "0")}/${String(
        dayOfMonth,
      ).padStart(2, "0")}`;

      const currentDateNumeric = jy * 10000 + jm * 100 + dayOfMonth;
      const isToday = currentDateNumeric === todayNumeric;
      const isPast = currentDateNumeric < todayNumeric;
      const isFuture = currentDateNumeric > todayNumeric;

      initialDays.push({
        id: i,
        displayName: dayName,
        displayDate: persianDate,
        dayOfMonth: dayOfMonth,
        isToday,
        isPast,
        isFuture,
        completed: {},
        taskTime: {},
        scheduled: {},
        serverIsDone: false,
      });
    }

    return initialDays;
  };

  const initializeData = () => {
    const initialDays = createPersianDays(30);
    const initialColumns = [];

    if (days.length === 0) setDays(initialDays);
    if (dailyColumns.length === 0) setDailyColumns(initialColumns);
  };

  const playSound = async (soundIndex) => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      let soundFile;
      switch (soundIndex) {
        case 0:
          soundFile = require("../../assets/sounds/alarm1.mp3");
          break;
        case 1:
          soundFile = require("../../assets/sounds/alarm2.mp3");
          break;
        case 2:
          soundFile = require("../../assets/sounds/alarm3.mp3");
          break;
        default:
          soundFile = require("../../assets/sounds/alarm1.mp3");
      }

      const { sound: newSound } = await Audio.Sound.createAsync(soundFile, {
        shouldPlay: true,
        volume: 1.0,
      });
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error("Error playing sound:", error);
      setIsPlaying(false);
      showToast("error", "خطا", "مشکلی در پخش صدا پیش آمده است");
    }
  };

  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
  };

  const updateAlarmTime = (soundIndex, hours, minutes) => {
    setAlarmTimes((prev) => ({
      ...prev,
      [soundIndex]: { hours, minutes },
    }));
  };

  const handleAlarmSelection = (soundIndex) => {
    setSelectedAlarmSound(soundIndex);
  };

  const removeAlarm = async () => {
    if (!selectedColumnForAlarm) return;

    try {
      const savedNotificationKey = `notification_id_${selectedColumnForAlarm}`;
      await removeAlarmSettings(selectedColumnForAlarm);
      removeAlarmSettingsFromState(selectedColumnForAlarm);

      const column = dailyColumns.find(
        (col) => col.id === selectedColumnForAlarm,
      );

      if (!column) {
        showToast("error", "خطا", "ستون یافت نشد");
        return;
      }

      if (column.isFromServer && column.businessKey) {
        setSpinner(true);
        setSpinnerMessage("");

        try {
          const result = await sendClearAlarmRequest(column.businessKey);

          if (result.success) {
            const scheduledNotifications =
              await Notifications.getAllScheduledNotificationsAsync();
            for (const notification of scheduledNotifications) {
              if (
                notification.content.data?.columnId === selectedColumnForAlarm
              ) {
                await Notifications.cancelScheduledNotificationAsync(
                  notification.identifier,
                );
              }
            }

            try {
              await AsyncStorage.removeItem(savedNotificationKey);
            } catch (e) {
              console.warn("Could not remove saved notification id:", e);
            }

            setDailyColumns(
              dailyColumns.map((col) =>
                col.id === selectedColumnForAlarm
                  ? {
                      ...col,
                      alarmSound: undefined,
                      alarmTime: undefined,
                      hasAlarm: false,
                    }
                  : col,
              ),
            );

            setAlarmModalVisible(false);
            showToast("success", "موفقیت", "آلارم با موفقیت حذف شد");
          } else {
            showToast("error", "خطا", result.message || "خطا در حذف آلارم");
          }
        } catch (error) {
          console.error("Error in removeAlarm for server column:", error);
          showToast("error", "خطا", "مشکلی در حذف آلارم پیش آمده است");
        } finally {
          setSpinner(false);
          setSpinnerMessage("");
        }
      } else {
        const scheduledNotifications =
          await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduledNotifications) {
          if (notification.content.data?.columnId === selectedColumnForAlarm) {
            await Notifications.cancelScheduledNotificationAsync(
              notification.identifier,
            );
          }
        }

        try {
          await AsyncStorage.removeItem(savedNotificationKey);
        } catch (e) {
          console.warn("Could not remove saved notification id:", e);
        }

        setDailyColumns(
          dailyColumns.map((col) =>
            col.id === selectedColumnForAlarm
              ? {
                  ...col,
                  alarmSound: undefined,
                  alarmTime: undefined,
                  hasAlarm: false,
                }
              : col,
          ),
        );

        setAlarmModalVisible(false);
        showToast("success", "موفقیت", "آلارم با موفقیت حذف شد");
      }
    } catch (error) {
      console.error("Error removing alarm:", error);
      showToast("error", "خطا", "مشکلی در حذف آلارم پیش آمده است");
    }
  };

  const addNewColumn = () => {
    const newColumn = {
      id: Date.now().toString(),
      name: "برنامه جدید",
      type: "task",
      editable: true,
      finalized: false,
      scheduleType: null,
      alarmSound: undefined,
      alarmTime: undefined,
      hasAlarm: false,
      isFromServer: false,
    };

    setDailyColumns([newColumn, ...dailyColumns]);

    if (showTutorial.scheduleTutorial) {
      setTimeout(() => {
        showScheduleTutorial(newColumn.id);
      }, 500);
    }

    showToast("success", "موفقیت", "ستون جدید با موفقیت ایجاد شد");
  };

  const finalizeColumn = (columnId) => {
    const column = dailyColumns.find((col) => col.id === columnId);

    if (column && column.isFromServer) {
      showToast(
        "info",
        "توجه",
        "این ستون از سرور دریافت شده و قابل نهایی‌سازی نیست",
      );
      return;
    }

    if (showTutorial.confirmTutorial) {
      showConfirmTutorial(columnId);
      return;
    }

    let hasSelection = false;
    hasSelection = days.some((d) => {
      const scheduled = d.scheduled && d.scheduled[columnId];
      const completed = d.completed && d.completed[columnId];
      return (
        scheduled === true ||
        completed === "future" ||
        completed === "completed"
      );
    });

    if (!hasSelection) {
      setSelectWarningVisible(true);
      return;
    }

    setConfirmFinalizeColumnId(columnId);
    setConfirmFinalizeVisible(true);
  };

  const confirmFinalize = async () => {
    if (!confirmFinalizeColumnId) return;
    const columnId = confirmFinalizeColumnId;
    console.log("Sending");
    const column = dailyColumns.find((col) => col.id === columnId);

    if (!column) {
      showToast("error", "خطا", "ستون یافت نشد");
      return;
    }

    setDailyColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, finalized: true } : col,
      ),
    );

    setSpinner(true);
    setSpinnerMessage("");

    try {
      const result = await finalizeColumnWithAPI(
        columnId,
        column.name,
        "daily",
        days,
      );

      if (result.success) {
        showToast(
          "success",
          "موفقیت",
          `${result.message} (${toPersianNumbers(result.datesCount)} تاریخ)`,
        );

        if (showTutorial.alarmTutorial) {
          setTimeout(() => {
            showAlarmTutorial(columnId);
          }, 300);
        }
      } else {
        showToast("error", "خطا", result.message);

        if (result.message.includes("سرور")) {
          setDailyColumns((prev) =>
            prev.map((col) =>
              col.id === columnId ? { ...col, finalized: false } : col,
            ),
          );
        }
      }
    } catch (error) {
      console.error("Error in confirmFinalize:", error);
      showToast("error", "خطا", "مشکلی در ارتباط با سرور پیش آمده است");

      setDailyColumns((prev) =>
        prev.map((col) =>
          col.id === columnId ? { ...col, finalized: false } : col,
        ),
      );
    } finally {
      setSpinner(false);
      setSpinnerMessage("");
      setConfirmFinalizeVisible(false);
      setConfirmFinalizeColumnId(null);
    }
  };

  const openAlarmModalDirectly = async (columnId) => {
    const column = dailyColumns.find((col) => col.id === columnId);
    setSelectedColumnForAlarm(columnId);

    const savedSettings = await loadAlarmSettings(columnId);

    if (savedSettings) {
      setSelectedAlarmSound(savedSettings.alarmSound || 0);
      setAlarmHours(savedSettings.alarmHours || 8);
      setAlarmMinutes(savedSettings.alarmMinutes || 0);
      updateAlarmTime(
        savedSettings.alarmSound || 0,
        savedSettings.alarmHours || 8,
        savedSettings.alarmMinutes || 0,
      );

      console.log("Loaded saved alarm settings:", savedSettings);
    } else if (column && column.hasAlarm) {
      setSelectedAlarmSound(column.alarmSound || 0);
      if (column.alarmTime) {
        const time = extractTimeFromAlarmTime(column.alarmTime);
        setAlarmHours(time.hours);
        setAlarmMinutes(time.minutes);
        updateAlarmTime(column.alarmSound || 0, time.hours, time.minutes);
      }
    } else if (column && column.alarmSound !== undefined) {
      setSelectedAlarmSound(column.alarmSound);
      if (column.alarmTime) {
        const [hours, minutes] = column.alarmTime.split(":");
        setAlarmHours(parseInt(hours));
        setAlarmMinutes(parseInt(minutes));
        updateAlarmTime(column.alarmSound, parseInt(hours), parseInt(minutes));
      }
    } else {
      setSelectedAlarmSound(0);
      setAlarmHours(alarmTimes[0].hours);
      setAlarmMinutes(alarmTimes[0].minutes);
    }

    setAlarmModalVisible(true);
  };

  const openAlarmModal = (columnId) => {
    const column = dailyColumns.find((col) => col.id === columnId);

    if (column && column.isFromServer && !column.hasAlarm) {
      showToast("info", "توجه", "می‌توانید برای این تسک آلارم تنظیم کنید");
    }

    if (showTutorial.alarmTutorial) {
      showAlarmTutorial(columnId);
      return;
    }

    openAlarmModalDirectly(columnId);
  };

  const setAlarm = async () => {
    if (!selectedColumnForAlarm || selectedAlarmSound === null) {
      showToast("error", "خطا", "لطفاً یک صدای آلارم انتخاب کنید");
      return;
    }

    const alarmTime = `${String(alarmHours).padStart(2, "0")}:${String(
      alarmMinutes,
    ).padStart(2, "0")}`;

    const alarmData = {
      alarmTime: alarmTime,
      alarmHours: alarmHours,
      alarmMinutes: alarmMinutes,
      alarmSound: selectedAlarmSound,
      setAt: new Date().toISOString(),
      columnName: column?.name || "نامشخص",
      columnId: selectedColumnForAlarm,
    };

    await saveAlarmSettings(selectedColumnForAlarm, alarmData);
    saveAlarmSettingsToState(selectedColumnForAlarm, alarmData);

    console.log("Alarm data saved locally:", alarmData);

    updateAlarmTime(selectedAlarmSound, alarmHours, alarmMinutes);

    const column = dailyColumns.find(
      (col) => col.id === selectedColumnForAlarm,
    );

    if (!column) {
      showToast("error", "خطا", "ستون یافت نشد");
      return;
    }

    setSpinner(true);
    setSpinnerMessage("");

    try {
      if (column.isFromServer && column.businessKey) {
        console.log("Sending alarm to server for column:", {
          businessKey: column.businessKey,
          alarmTime: alarmTime,
          columnName: column.name,
        });

        const result = await sendSetAlarmRequest(column.businessKey, alarmTime);

        if (result.success) {
          alarmData.alarmTimeISO = result.alarmTimeISO;
          alarmData.alarmTimeDisplay = result.alarmTimeDisplay;

          await saveAlarmSettings(selectedColumnForAlarm, alarmData);
          saveAlarmSettingsToState(selectedColumnForAlarm, alarmData);

          await scheduleLocalNotification(
            selectedColumnForAlarm,
            alarmHours,
            alarmMinutes,
          );

          setDailyColumns(
            dailyColumns.map((col) =>
              col.id === selectedColumnForAlarm
                ? {
                    ...col,
                    alarmSound: selectedAlarmSound,
                    alarmTime: alarmTime,
                    alarmTimeISO: result.alarmTimeISO,
                    hasAlarm: true,
                  }
                : col,
            ),
          );

          setAlarmModalVisible(false);

          const persianHours = toPersianNumbers(
            String(alarmHours).padStart(2, "0"),
          );
          const persianMinutes = toPersianNumbers(
            String(alarmMinutes).padStart(2, "0"),
          );

          showToast(
            "success",
            "موفقیت",
            `آلارم برای ساعت ${persianHours}:${persianMinutes} تنظیم شد`,
          );
        } else {
          showToast("error", "خطا", result.message || "خطا در تنظیم آلارم");
        }
      } else {
        const success = await scheduleLocalNotification(
          selectedColumnForAlarm,
          alarmHours,
          alarmMinutes,
        );

        if (success) {
          setDailyColumns(
            dailyColumns.map((col) =>
              col.id === selectedColumnForAlarm
                ? {
                    ...col,
                    alarmSound: selectedAlarmSound,
                    alarmTime: alarmTime,
                    hasAlarm: true,
                  }
                : col,
            ),
          );

          setAlarmModalVisible(false);

          const persianHours = toPersianNumbers(
            String(alarmHours).padStart(2, "0"),
          );
          const persianMinutes = toPersianNumbers(
            String(alarmMinutes).padStart(2, "0"),
          );

          showToast(
            "success",
            "موفقیت",
            `آلارم برای ساعت ${persianHours}:${persianMinutes} تنظیم شد`,
          );
        } else {
          showToast("error", "خطا", "مشکلی در تنظیم آلارم پیش آمده است");
        }
      }
    } catch (error) {
      console.error("Error in setAlarm:", error);
      showToast("error", "خطا", "مشکلی در تنظیم آلارم پیش آمده است");
    } finally {
      setSpinner(false);
      setSpinnerMessage("");
    }
  };

  const updateColumnName = (columnId, newName, isFinal = false) => {
    const column = dailyColumns.find((col) => col.id === columnId);

    if (column && column.isFromServer) {
      showToast(
        "info",
        "توجه",
        "نام این ستون از سرور دریافت شده و قابل تغییر نیست",
      );
      return;
    }

    // محدودیت ۱۰ کاراکتر
    if (newName.length > 10) {
      newName = newName.substring(0, 10);
      showToast("warning", "توجه", "حداکثر ۱۰ کاراکتر مجاز است");
    }

    if (newName.trim() === "" && isFinal) {
      showToast("error", "خطا", "نام نمی‌تواند خالی باشد");
      newName = "عنوان جدید";
    }

    setDailyColumns(
      dailyColumns.map((col) =>
        col.id === columnId ? { ...col, name: newName } : col,
      ),
    );

    if (isFinal) {
      setEditingColumn(null);
      showToast("success", "موفقیت", "نام با موفقیت تغییر یافت");
    }
  };

  const handleScheduleSelection = (columnId, scheduleType) => {
    const column = dailyColumns.find((col) => col.id === columnId);

    if (column && column.isFromServer) {
      showToast(
        "info",
        "توجه",
        "زمان‌بندی این ستون از سرور دریافت شده و قابل تغییر نیست",
      );
      setScheduleModalVisible(false);
      return;
    }

    setDailyColumns(
      dailyColumns.map((col) =>
        col.id === columnId ? { ...col, scheduleType } : col,
      ),
    );

    const [currentYear, currentMonth, currentDay] = getCurrentPersianDate();
    const todayNumeric = currentYear * 10000 + currentMonth * 100 + currentDay;

    setDays(
      days.map((day) => {
        const dateParts = day.displayDate.split("/");
        if (dateParts.length !== 3) return day;

        const dayYear = parseInt(dateParts[0]);
        const dayMonth = parseInt(dateParts[1]);
        const dayDay = parseInt(dateParts[2]);
        const dayNumeric = dayYear * 10000 + dayMonth * 100 + dayDay;

        const isFromTodayOnward = dayNumeric >= todayNumeric;

        let shouldBeScheduled = false;

        if (isFromTodayOnward) {
          switch (scheduleType) {
            case "all":
              shouldBeScheduled = true;
              break;
            case "even":
              shouldBeScheduled = dayDay % 2 === 0;
              break;
            case "alternate":
              shouldBeScheduled = dayDay % 2 === 1;
              break;
            default:
              shouldBeScheduled = false;
          }
        }

        if (shouldBeScheduled) {
          return {
            ...day,
            scheduled: {
              ...day.scheduled,
              [columnId]: true,
            },
            completed: {
              ...day.completed,
              [columnId]: "future",
            },
          };
        } else {
          return {
            ...day,
            scheduled: {
              ...day.scheduled,
              [columnId]: false,
            },
            completed: {
              ...day.completed,
              [columnId]: "not-started",
            },
          };
        }
      }),
    );

    setScheduleModalVisible(false);
    setSelectedColumnForSchedule(null);

    if (showTutorial.confirmTutorial && columnId) {
      setTimeout(() => {
        showConfirmTutorial(columnId);
      }, 500);
    }

    showToast("success", "موفقیت", "زمان‌بندی با موفقیت اعمال شد");
  };

  const getPercentageColor = (percentage) => {
    if (percentage >= 75) return "#4CAF50";
    if (percentage >= 50) return "#8BC34A";
    if (percentage >= 25) return "#f58780ff";
    if (percentage > 0) return "#F44336";
    return "#E0E0E0";
  };

  const handleZoomSlider = (value) => {
    const newScale = Math.max(0.45, Math.min(value, 0.75));
    setScale(newScale);

    saveZoomSettings(newScale);
  };

  const getFontSize = (baseSize) => {
    if (scale === 0.45) {
      const minSize = baseSize * 0.8;
      const scaledSize = baseSize * scale;
      return Math.max(minSize, scaledSize * 1.2);
    }

    const minSize = baseSize * 0.6;
    const scaledSize = baseSize * scale;
    return Math.max(minSize, scaledSize);
  };

  const handleCellPress = (itemId, columnId, isDisabled) => {
    if (isDisabled) {
      return;
    }

    const column = dailyColumns.find((col) => col.id === columnId);

    if (column && !column.editable && !column.isFromServer) return;

    const day = days.find((d) => d.id === itemId);

    if (day.isPast) {
      return;
    }

    if (column && column.finalized) {
      const cellStatus = day.completed[columnId] || "not-started";
      if (day.isToday && cellStatus === "future") {
        setSelectedCell({ itemId, columnId });
        setModalVisible(true);
      }
      return;
    }

    if (day.isFuture || day.isToday) {
      setDays(
        days.map((d) => {
          if (d.id === itemId) {
            const newStatus =
              d.completed[columnId] === "future" ? "not-started" : "future";
            return {
              ...d,
              completed: {
                ...d.completed,
                [columnId]: newStatus,
              },
              scheduled: {
                ...d.scheduled,
                [columnId]: newStatus === "future",
              },
            };
          }
          return d;
        }),
      );
      return;
    }

    setSelectedCell({ itemId, columnId });
    setModalVisible(true);
  };

  const handleTaskCompletion = async (status) => {
    if (!selectedCell) return;

    const { itemId, columnId, isWeekly } = selectedCell;

    const columns = dailyColumns;
    const column = columns.find((col) => col.id === columnId);

    if (status === "completed") {
      if (column && column.isFromServer && column.businessKey) {
        let scheduleBusinessKey = null;

        const day = days.find((d) => d.id === itemId);
        if (day && day.scheduleBusinessKeys) {
          scheduleBusinessKey = day.scheduleBusinessKeys[columnId];
        }

        if (scheduleBusinessKey) {
          setSpinner(true);
          setSpinnerMessage("");

          const result = await markTaskAsDoneOnServer(
            column.businessKey,
            scheduleBusinessKey,
          );

          setSpinner(false);

          if (result.success) {
            setDays(
              days.map((day) => {
                if (day.id === itemId) {
                  return {
                    ...day,
                    completed: {
                      ...day.completed,
                      [columnId]: status,
                    },
                    serverIsDone: {
                      ...(typeof day.serverIsDone === "object"
                        ? day.serverIsDone
                        : {}),
                      [columnId]: true,
                    },
                  };
                }
                return day;
              }),
            );
            showToast("success", "موفقیت", "تسک با موفقیت انجام شده ثبت شد");
          } else {
            showToast("error", "خطا", result.message || "خطا در ثبت انجام تسک");
            return;
          }
        } else {
          showToast("error", "خطا", "کلید schedule یافت نشد");
          return;
        }
      } else {
        setDays(
          days.map((day) => {
            if (day.id === itemId) {
              return {
                ...day,
                completed: {
                  ...day.completed,
                  [columnId]: status,
                },
              };
            }
            return day;
          }),
        );
      }
    } else {
      setDays(
        days.map((day) => {
          if (day.id === itemId) {
            return {
              ...day,
              completed: {
                ...day.completed,
                [columnId]: status,
              },
            };
          }
          return day;
        }),
      );
    }

    setModalVisible(false);
    setSelectedCell(null);
  };

  const updateCellStatusSafely = useCallback((itemId, columnId, status) => {
    console.log("Updating cell status:", {
      itemId,
      columnId,
      status,
    });

    try {
      setDays((prevDays) =>
        prevDays.map((day) => {
          if (day.id === itemId) {
            return {
              ...day,
              completed: {
                ...day.completed,
                [columnId]: status,
              },
            };
          }
          return day;
        }),
      );

      console.log("Cell status updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating cell status:", error);
      return false;
    }
  }, []);

  const getTutorialContent = () => {
    switch (currentTutorial) {
      case "tabTutorial":
        return {
          title: "آموزش شروع کار",
          description:
            "برای ایجاد برنامه جدید، روی دکمه + در تب‌ها کلیک کنید. این دکمه در تب فعال ظاهر می‌شود.",
          icon: require("../../assets/images/plus.png"),
        };
      case "scheduleTutorial":
        return {
          title: "آموزش زمان‌بندی",
          description:
            "برای تنظیم الگوی تکرار برنامه، روی دکمه زمان‌بندی کلیک کنید. می‌توانید برنامه را برای روزهای زوج، فرد یا همه روزها تنظیم کنید.",
          icon: require("../../assets/images/schedule-tutorial.png"),
        };
      case "confirmTutorial":
        return {
          title: "آموزش نهایی‌سازی",
          description:
            "بعد از انتخاب روزهای مورد نظر، روی دکمه تایید کلیک کنید تا ستون برنامه نهایی شود. پس از نهایی‌سازی می‌توانید آلارم تنظیم کنید.",
          icon: require("../../assets/images/confirm-tutorial.png"),
        };
      case "alarmTutorial":
        return {
          title: "آموزش تنظیم آلارم",
          description:
            "برای تنظیم یادآوری و آلارم برای این برنامه، روی آیکون آلارم کلیک کنید. می‌توانید زمان و صدای هشدار را شخصی‌سازی کنید.",
          icon: require("../../assets/images/alarm2.png"),
        };
      default:
        return { title: "", description: "", icon: null };
    }
  };

  const getVisibleColumnsCount = () => {
    return Math.min(dailyColumns.length, 15);
  };

  const getVisibleColumns = () => {
    const visibleCount = getVisibleColumnsCount();
    return dailyColumns.slice(0, visibleCount);
  };

  const calculateDailyPercentage = (day) => {
    const visibleTaskColumns = visibleColumns.filter(
      (col) => col.type === "task" && col.finalized,
    );

    if (visibleTaskColumns.length === 0) return 0;

    let completedCount = 0;
    let totalCount = 0;

    visibleTaskColumns.forEach((col) => {
      const status = day.completed[col.id];
      const isScheduled = day.scheduled[col.id];

      if (
        isScheduled === true ||
        status === "future" ||
        status === "completed"
      ) {
        totalCount++;

        if (col.isFromServer) {
          if (typeof day.serverIsDone === "object") {
            if (day.serverIsDone[col.id] === true) {
              completedCount++;
            } else if (status === "completed") {
              completedCount++;
            }
          } else if (day.serverIsDone === true) {
            completedCount++;
          } else if (status === "completed") {
            completedCount++;
          }
        } else if (status === "completed") {
          completedCount++;
        }
      }
    });

    if (totalCount === 0) return 0;

    const percentage = Math.round((completedCount / totalCount) * 100);

    return percentage;
  };

  // Use shared helpers from app/utils/taskHelpers
  const getCellStatus = helperGetCellStatus;
  const getStatusColor = helperGetStatusColor;
  const shouldShowRed = helperShouldShowRed;
  const getStatusIcon = helperGetStatusIcon;
  const getStatusIconColor = helperGetStatusIconColor;

  const getColumnHeaderWidth = () => {
    const baseSize = 120;
    return baseSize * scale;
  };

  const handleOutsidePress = useCallback(() => {
    if (editingColumn) {
      const column = dailyColumns.find((col) => col.id === editingColumn);
      if (column) {
        if (column.name.trim() === "") {
          updateColumnName(editingColumn, "عنوان جدید", true);
        } else {
          updateColumnName(editingColumn, column.name, true);
        }
      }
      setEditingColumn(null);
    }
  }, [editingColumn, dailyColumns, updateColumnName]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>هیچ برنامه‌ای ایجاد نشده است</Text>
      <Text style={styles.emptyStateSubText}>
        برای ایجاد برنامه جدید، روی دکمه + در تب‌ها کلیک کنید
      </Text>
    </View>
  );

  const handleTaskCellPress = (dayId, columnId, isDisabled) => {
    handleCellPress(dayId, columnId, isDisabled);
  };

  const visibleColumns = getVisibleColumns();
  const columnWidth = getColumnHeaderWidth();
  const baseSquareSize = 50;
  const scaledSquareSize = baseSquareSize * scale;

  const tutorialContent = getTutorialContent();

  const rowHeight = 80 * scale;

  // کامپوننت NetworkErrorModal
  const NetworkErrorModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showNetworkError}
      onRequestClose={() => setShowNetworkError(false)}
    >
      <View style={styles.networkErrorOverlay}>
        <View style={styles.networkErrorContent}>
          <View style={styles.networkErrorIconContainer}>
            <Ionicons name="wifi-outline" size={60} color="#F44336" />
          </View>

          <Text style={styles.networkErrorTitle}>اتصال اینترنت قطع است</Text>

          <Text style={styles.networkErrorMessage}>
            لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش کنید.
          </Text>

          <View style={styles.networkErrorButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.networkErrorButton,
                styles.networkErrorRetryButton,
              ]}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <Ionicons
                name="refresh"
                size={20}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
              <Text style={styles.networkErrorButtonText}>تلاش مجدد</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.networkErrorButton,
                styles.networkErrorCancelButton,
              ]}
              onPress={() => setShowNetworkError(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.networkErrorButtonText, { color: "#666" }]}>
                استفاده آفلاین
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Welcome Modal برای هدیه gem
  const GemWelcomeModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showWelcomeMessage}
      onRequestClose={() => setShowWelcomeMessage(false)}
    >
      <View style={styles.welcomeOverlay}>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeIconContainer}>
            <Image
              source={require("../../assets/images/gem.png")}
              style={styles.welcomeGemImage}
            />
            <Ionicons name="gift" size={40} color="#FFD700" />
          </View>

          <Text style={styles.welcomeTitle}>تبریک! هدیه دریافت کردید</Text>

          <Text style={styles.welcomeMessage}>
            به پاس عضویت شما، <Text style={styles.gemHighlight}>۲۰ gem</Text>{" "}
            هدیه گرفتید!
          </Text>

          <Text style={styles.welcomeSubMessage}>
            از gemها برای ویژگی‌های ویژه برنامه استفاده کنید.
          </Text>

          <TouchableOpacity
            style={styles.welcomeButton}
            onPress={() => setShowWelcomeMessage(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.welcomeButtonText}>متوجه شدم</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDayCell = (day) => {
    return (
      <View
        style={[
          styles.cell,
          styles.dayCell,
          {
            minWidth: isMinZoom
              ? Math.max(70, 100 * scale)
              : Math.max(80, 120 * scale),
            marginStart: 8,
            marginEnd: 8,
            padding: Math.max(2, 4 * scale),
          },
        ]}
      >
        <View
          style={[
            styles.titleOval,
            day.isToday && styles.istitleOval,
            day.isPast && styles.pastDayOval,
            {
              paddingHorizontal: Math.max(8, 12 * scale),
              paddingVertical: Math.max(4, 6 * scale),
              minHeight: isMinZoom ? 35 * scale : 40 * scale,
            },
          ]}
        >
          {!isMinZoom ? (
            <>
              <Text
                style={[
                  styles.dayText,
                  day.isPast && styles.pastDayText,
                  {
                    fontSize: getFontSize(11),
                    fontFamily: "BYekan",
                  },
                ]}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {day.displayName}
              </Text>
              <Text
                style={[
                  styles.dateText,
                  day.isToday && styles.todayText,
                  day.isPast && styles.pastDateText,
                  {
                    fontSize: getFontSize(9),
                    fontFamily: "BYekan",
                  },
                ]}
              >
                {toPersianNumbers(day.displayDate)}
              </Text>
            </>
          ) : (
            <Text
              style={[
                styles.dateOnly,
                day.isToday && styles.todayText,
                day.isPast && styles.pastDateText,
                {
                  fontSize: getFontSize(11),
                  fontFamily: "BYekan",
                  fontWeight: "500",
                  textAlign: "center",
                },
              ]}
            >
              {toPersianNumbers(day.displayDate)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderDayHeaderCell = () => {
    return (
      <View
        style={[
          styles.dayHeaderCell,
          {
            minWidth: isMinZoom
              ? Math.max(70, 100 * scale)
              : Math.max(80, 120 * scale),
            marginStart: 8,
            marginEnd: 8,
          },
        ]}
      >
        <View
          style={[
            styles.titleOval,
            {
              paddingHorizontal: Math.max(8, 12 * scale),
              paddingVertical: Math.max(4, 6 * scale),
              minHeight: isMinZoom ? 35 * scale : 40 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.dayText,
              {
                fontSize: getFontSize(isMinZoom ? 10 : 11),
                fontFamily: "BYekan",
              },
            ]}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            {isMinZoom ? "تاریخ" : "روزهای ماه"}
          </Text>
        </View>
      </View>
    );
  };

  const renderMatrix = () => {
    const columnWidth = getColumnHeaderWidth();
    const scaledSquareSize = 50 * scale;
    const rowHeight = isMinZoom ? 95 * scale : 80 * scale;

    return (
      <View style={styles.matrixContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          ref={mainScrollRef}
          style={styles.matrixHorizontalScrollView}
          contentContainerStyle={{
            flexDirection: "row-reverse",
          }}
          scrollEventThrottle={16}
          decelerationRate="fast"
          overScrollMode="always"
          bounces={true}
          alwaysBounceHorizontal={true}
          persistentScrollbar={true}
        >
          <View style={styles.matrixContent}>
            <View
              style={[
                styles.headerRow,
                {
                  height: 110, // ارتفاع ثابت برای کل ردیف هدر
                  marginBottom: isMinZoom ? 25 : 8,
                  paddingBottom: isMinZoom ? 4 : 2,
                  alignItems: "center", // برای تراز عمودی
                },
              ]}
            >
              <View
                style={[
                  styles.titleOval3,
                  {
                    paddingStart: Math.max(4, 6 * scale),
                    paddingEnd: Math.max(4, 6 * scale),
                    marginStart: Math.max(10, 20 * scale),
                    marginEnd: 8,
                    minWidth: Math.max(60, 100 * scale),
                    height: 70 * scale, // ارتفاع متناسب با scale
                    justifyContent: "center",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.headerText,
                    {
                      fontSize: getFontSize(11),
                      fontFamily: "BYekan",
                      textAlign: "center",
                    },
                  ]}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                  numberOfLines={2} // حداکثر دو خط
                >
                  درصد روزانه
                </Text>
              </View>

              {visibleColumns.map((column) => {
                const scaledSize = columnWidth;

                return (
                  <View
                    key={column.id}
                    style={[
                      styles.headerCell,
                      {
                        direction: "rtl",
                        minWidth: scaledSize,
                        width: scaledSize,
                        marginLeft: 4,
                        marginRight: 4,
                        height: 70 * scale, // ارتفاع یکسان
                      },
                    ]}
                  >
                    {editingColumn === column.id && column.editable ? (
                      <View
                        style={[
                          styles.columnInputContainer,
                          {
                            width: scaledSize,
                            height: "100%",
                          },
                        ]}
                      >
                        <EditableColumnInput
                          value={column.name}
                          onChangeText={(text) => {
                            // محدودیت ۱۰ کاراکتر
                            if (text.length <= 10) {
                              updateColumnName(column.id, text);
                            }
                          }}
                          maxLength={10} // محدودیت ۱۰ کاراکتر
                          onSubmitEditing={() => {
                            updateColumnName(column.id, column.name, true);
                            setEditingColumn(null);
                          }}
                          onEndEditing={() => {
                            if (column.name.trim() === "") {
                              updateColumnName(column.id, "عنوان جدید", true);
                            } else {
                              updateColumnName(column.id, column.name, true);
                            }
                            setEditingColumn(null);
                          }}
                          onBlur={() => {
                            if (column.name.trim() === "") {
                              updateColumnName(column.id, "عنوان جدید", true);
                            } else {
                              updateColumnName(column.id, column.name, true);
                            }
                            setEditingColumn(null);
                          }}
                          autoFocus={true}
                          scale={scale}
                          customStyle={[
                            styles.columnInput,
                            {
                              textAlign: "center",
                              fontSize: getFontSize(10),
                              width: "100%",
                              height: "100%",
                              fontFamily: "BYekan",
                            },
                          ]}
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.columnHeaderContainer,
                          {
                            direction: "rtl",
                            height: "100%",
                          },
                        ]}
                      >
                        <Pressable
                          style={[
                            styles.columnHeader,
                            {
                              width: scaledSize,
                              height: "100%",
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.titleOval2,
                              {
                                paddingHorizontal: Math.max(6, 8 * scale),
                                width: "100%",
                                height: "100%", // پر کردن کامل ارتفاع
                                justifyContent: "space-between", // توزیع فضای بین متن و دکمه‌ها
                              },
                            ]}
                          >
                            <Pressable
                              style={styles.columnNameRow}
                              onPress={() =>
                                column.editable &&
                                !column.finalized &&
                                setEditingColumn(column.id)
                              }
                            >
                              <Text
                                style={[
                                  styles.headerText,
                                  {
                                    textAlign: "center",
                                    fontSize: getFontSize(9),
                                    fontFamily: "BYekan",
                                    width: "100%",
                                  },
                                ]}
                                numberOfLines={2} // حداکثر دو خط
                                ellipsizeMode="tail"
                                adjustsFontSizeToFit={true}
                                minimumFontScale={0.7}
                              >
                                {column.name}
                              </Text>
                            </Pressable>

                            <View style={styles.columnActionsRow}>
                              <View
                                style={[
                                  styles.columnActions,
                                  {
                                    flexDirection: "row",
                                    justifyContent: "center",
                                  },
                                ]}
                              >
                                {!column.finalized ? (
                                  <>
                                    <TouchableOpacity
                                      ref={(ref) =>
                                        (confirmButtonRefs.current[column.id] =
                                          ref)
                                      }
                                      style={[
                                        styles.finalizeButton,
                                        {
                                          marginHorizontal: Math.max(
                                            4,
                                            6 * scale,
                                          ),
                                          transform: [
                                            { scale: Math.max(1, scale * 0.8) },
                                          ],
                                          padding: Math.max(4, 6 * scale),
                                          minWidth: Math.max(28, 35 * scale),
                                          minHeight: Math.max(28, 35 * scale),
                                          justifyContent: "center",
                                          alignItems: "center",
                                        },
                                      ]}
                                      onPress={() => finalizeColumn(column.id)}
                                    >
                                      <Ionicons
                                        name="checkmark-circle"
                                        size={Math.max(18, 22 * scale)}
                                        color="#4CAF50"
                                      />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      ref={(ref) =>
                                        (scheduleButtonRefs.current[column.id] =
                                          ref)
                                      }
                                      style={[
                                        styles.scheduleButton,
                                        {
                                          marginHorizontal: Math.max(
                                            4,
                                            6 * scale,
                                          ),
                                          transform: [
                                            { scale: Math.max(1, scale * 0.8) },
                                          ],
                                          padding: Math.max(4, 6 * scale),
                                          minWidth: Math.max(28, 35 * scale),
                                          minHeight: Math.max(28, 35 * scale),
                                          justifyContent: "center",
                                          alignItems: "center",
                                        },
                                      ]}
                                      onPress={() => {
                                        if (
                                          showTutorial &&
                                          showTutorial.scheduleTutorial
                                        ) {
                                          showScheduleTutorial(column.id);
                                        } else {
                                          setSelectedColumnForSchedule(
                                            column.id,
                                          );
                                          setScheduleModalVisible(true);
                                        }
                                      }}
                                    >
                                      <Ionicons
                                        name="time"
                                        size={Math.max(18, 22 * scale)}
                                        color="#2196F3"
                                      />
                                    </TouchableOpacity>
                                  </>
                                ) : (
                                  <TouchableOpacity
                                    ref={(ref) =>
                                      (alarmButtonRefs.current[column.id] = ref)
                                    }
                                    style={[
                                      styles.finalizedIndicator,
                                      {
                                        transform: [
                                          { scale: Math.max(1, scale * 0.8) },
                                        ],
                                        padding: Math.max(4, 6 * scale),
                                        minWidth: Math.max(28, 35 * scale),
                                        minHeight: Math.max(28, 35 * scale),
                                        justifyContent: "center",
                                        alignItems: "center",
                                      },
                                    ]}
                                    onPress={() => openAlarmModal(column.id)}
                                  >
                                    <Image
                                      source={
                                        column.alarmTime
                                          ? require("@/assets/images/alarm1.png")
                                          : require("@/assets/images/alarm2.png")
                                      }
                                      style={{
                                        width: Math.max(18, 22 * scale),
                                        height: Math.max(18, 22 * scale),
                                      }}
                                    />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}

              {renderDayHeaderCell()}
            </View>

            {days.map((day) => {
              const dailyPercentage = calculateDailyPercentage(day);
              const percentageColor = getPercentageColor(dailyPercentage);

              return (
                <View
                  key={day.id}
                  style={[
                    styles.row,
                    {
                      height: rowHeight,
                      paddingVertical: isMinZoom
                        ? Math.max(2, 4 * scale)
                        : Math.max(6, 8 * scale),
                      minHeight: isMinZoom
                        ? Math.max(40, 60 * scale)
                        : Math.max(60, 80 * scale),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.cell,
                      styles.percentageCell,
                      {
                        minWidth: Math.max(60, 100 * scale),
                        marginStart: Math.max(10, 20 * scale),
                        marginEnd: 8,
                        padding: Math.max(2, 4 * scale),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.circleContainer,
                        {
                          width: scaledSquareSize,
                          height: scaledSquareSize,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.circleOutline,
                          {
                            borderColor: percentageColor,
                            width: "100%",
                            height: "100%",
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.circleProgressBorder,
                          {
                            borderTopColor: percentageColor,
                            borderRightColor: percentageColor,
                            borderLeftColor: percentageColor,
                            transform: [
                              { rotate: `${dailyPercentage * 3.6}deg` },
                            ],
                            width: "100%",
                            height: "100%",
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.percentageText,
                          {
                            fontSize: getFontSize(10),
                            color: percentageColor,
                            fontFamily: "BYekan",
                          },
                        ]}
                      >
                        {toPersianNumbers(dailyPercentage)}%
                      </Text>
                    </View>
                  </View>

                  {visibleColumns.map((column) => {
                    const status = getCellStatus(day, column.id, column);
                    const taskTime = day.taskTime[column.id];
                    const isColumnFinalized = column.finalized;
                    const isPastDay = day.isPast;
                    const shouldBeRed = shouldShowRed(day, column.id, column);
                    const statusColor = getStatusColor(
                      status,
                      day,
                      column.id,
                      column,
                    );

                    const isDisabled = column.isFromServer
                      ? false
                      : (isColumnFinalized && !day.isToday) || isPastDay;

                    return (
                      <View
                        key={column.id}
                        style={[
                          styles.cell,
                          styles.taskCell,
                          {
                            minWidth: columnWidth,
                            width: columnWidth,
                            marginLeft: 4,
                            marginRight: 4,
                            padding: Math.max(2, 4 * scale),
                          },
                        ]}
                      >
                        <Pressable
                          style={[
                            styles.squareContainer,
                            {
                              backgroundColor: statusColor,
                              borderWidth:
                                status === "future" && !shouldBeRed ? 2 : 0,
                              borderColor:
                                status === "future" && !shouldBeRed
                                  ? "#1976D2"
                                  : "transparent",
                              opacity: isDisabled ? 0.5 : 1,
                              width: columnWidth - 20,
                              height: scaledSquareSize,
                            },
                          ]}
                          onPress={() =>
                            handleTaskCellPress(day.id, column.id, isDisabled)
                          }
                          disabled={isDisabled}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Text
                            style={[
                              styles.statusIcon,
                              {
                                color: getStatusIconColor(
                                  status,
                                  shouldBeRed,
                                  isPastDay,
                                ),
                                fontSize: Math.max(16, 20 * scale),
                                fontFamily: "BYekan",
                              },
                            ]}
                          >
                            {getStatusIcon(status, shouldBeRed)}
                          </Text>

                          <View style={styles.bottomRightContainer}>
                            {taskTime && (
                              <Text
                                style={[
                                  styles.timeText,
                                  {
                                    color: isPastDay ? "#666666" : "#FFFFFF",
                                    fontSize: getFontSize(8),
                                    fontFamily: "BYekan",
                                  },
                                ]}
                              >
                                {toPersianNumbers(taskTime)}
                              </Text>
                            )}
                            <Ionicons
                              name="bulb"
                              size={getFontSize(10)}
                              color={isPastDay ? "#666666" : "#FFFFFF"}
                              style={styles.bulbIcon}
                            />
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}

                  {renderDayCell(day)}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const dynamicStyles = useMemo(
    () => ({
      headerContainer: {
        paddingVertical: Math.max(10, 12 * scale),
      },
      circle: {
        width: Math.max(60, 70 * scale),
        height: Math.max(60, 70 * scale),
        borderRadius: Math.max(30, 35 * scale),
        borderWidth: Math.max(2, 3 * scale),
      },
      dailyProgramIcon: {
        width: 20 * scale,
        height: 20 * scale,
      },
    }),
    [scale],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar
          backgroundColor="rgba(234, 244, 254, 1)"
          barStyle="dark-content"
        />

        <Spinner
          visible={spinner || loadingFromServer}
          textContent={loadingFromServer ? "" : spinnerMessage || ""}
          textStyle={styles.spinnerTextStyle}
          overlayColor="rgba(0, 0, 0, 0.7)"
          animation="fade"
        />

        {/* Network Error Modal */}
        <NetworkErrorModal />

        {/* Gem Welcome Modal */}
        <GemWelcomeModal />

        <Animated.View
          style={[
            styles.headerWrapper,
            {
              transform: [
                {
                  translateY: headerAnimatedValue,
                },
              ],
              opacity: headerAnimatedValue.interpolate({
                inputRange: [-headerHeight, 0],
                outputRange: [0, 1],
              }),
              position: "absolute", // تغییر به absolute برای چسبندگی
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
            },
          ]}
          onLayout={handleHeaderLayout}
        >
          <View style={styles.topRowFixed}>
            <View style={styles.leftSection}>
              <TouchableOpacity
                style={styles.gemCompact}
                activeOpacity={0.7}
                onPress={() => {
                  showToast(
                    "success",
                    "موجودی",
                    `${toPersianNumbers(gemCount)} gem`,
                  );
                }}
              >
                <View style={styles.gemIconSmall}>
                  <Image
                    source={require("../../assets/images/gem.png")}
                    style={styles.gemIconImage}
                  />
                </View>
                <Text style={styles.gemCountCompact}>
                  {toPersianNumbers(gemCount)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.centerSection}>
              <View style={styles.sliderCompact}>
                <CustomSlider
                  minimumValue={0.45}
                  maximumValue={0.75}
                  value={scale}
                  onValueChange={handleZoomSlider}
                  step={0.25}
                  minimumTrackTintColor="#0059ac"
                  maximumTrackTintColor="#e6f0ff"
                  thumbTintColor="#0059ac"
                  showValue={false}
                  leftIcon="remove-outline"
                  rightIcon="add-outline"
                  iconSize={15}
                  iconColor="#0059ac"
                  style={{ height: 10 }}
                />
              </View>
            </View>

            <View style={styles.rightSection}>
              <TouchableOpacity
                style={styles.helpCompact}
                activeOpacity={0.7}
                onPress={handleInfoButtonPress}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={26}
                  color="#2196F3"
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.middleRow}>
            <Text style={styles.mainText}>
              {mobileNumber ? `خوش آمدید کاربر ${mobileNumber}` : "خوش آمدید"}
            </Text>
          </View>
          <View style={styles.middleRow}>
            <Text style={styles.subText}>پیگیر کارهای روزمره ات باش </Text>
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.progressContainer}>
              <Progress.Circle
                size={100}
                progress={calculateOverallPercentage() / 100}
                thickness={12}
                color="#2196F3"
                unfilledColor="#515151"
                borderWidth={1}
                borderColor="#7c7c7c"
                showsText={true}
                formatText={(p) => `${Math.round(p * 100)}%`}
                textStyle={{
                  fontSize: 22,
                  fontFamily: "BYekan",
                  color: "#2196F3",
                }}
              />
            </View>
          </View>
        </Animated.View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.contentContainer}
          contentContainerStyle={{
            paddingTop: headerHeight + 20, // افزایش padding برای فضای هدر
            minHeight: screenHeight * 1.5,
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={false}
        >
          <View style={styles.tableContainer}>
            <View style={styles.tableContainerInner}>
              {dailyColumns.length === 0 ? (
                renderEmptyState()
              ) : (
                <View style={styles.fullWidthContainer}>{renderMatrix()}</View>
              )}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => {
            addNewColumn();
          }}
        >
          <Image
            source={require("../../assets/images/cloud.png")}
            style={styles.floatingButtonIcon}
          />
        </TouchableOpacity>
        <CustomModal
          visible={!!currentTutorial}
          onClose={handleCloseTutorial}
          title={tutorialContent.title}
          description={tutorialContent.description}
          clickPosition={tutorialPosition}
          buttonText="متوجه شدم"
          icon={tutorialContent.icon}
        />

        <ScheduleModal
          visible={scheduleModalVisible}
          onClose={() => setScheduleModalVisible(false)}
          activeTab="daily"
          selectedColumnForSchedule={selectedColumnForSchedule}
          handleScheduleSelection={handleScheduleSelection}
        />

        <AlarmModal
          visible={alarmModalVisible}
          onClose={() => {
            stopSound();
            setAlarmModalVisible(false);
          }}
          selectedColumnForAlarm={selectedColumnForAlarm}
          columns={dailyColumns}
          selectedAlarmSound={selectedAlarmSound}
          alarmHours={alarmHours}
          alarmMinutes={alarmMinutes}
          isPlaying={isPlaying}
          handleAlarmSelection={handleAlarmSelection}
          setAlarmHours={setAlarmHours}
          setAlarmMinutes={setAlarmMinutes}
          playSound={playSound}
          stopSound={stopSound}
          setAlarm={setAlarm}
          removeAlarm={removeAlarm}
          toPersianNumbers={toPersianNumbers}
          alarmSettings={alarmSettings}
        />

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { direction: "rtl" }]}>
              <TouchableOpacity
                style={[styles.modalCloseButton, { left: "auto", right: 8 }]}
                onPress={() => setModalVisible(false)}
                accessibilityLabel="بستن"
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>آیا این تسک انجام شده است؟</Text>

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.completedButton]}
                  onPress={() => handleTaskCompletion("completed")}
                >
                  <Text style={styles.modalButtonText}>بله، انجام شده</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>انصراف</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent={true}
          visible={confirmFinalizeVisible}
          onRequestClose={() => setConfirmFinalizeVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { direction: "rtl" }]}>
              <TouchableOpacity
                style={[styles.modalCloseButton, { left: "auto", right: 8 }]}
                onPress={() => setConfirmFinalizeVisible(false)}
                accessibilityLabel="بستن"
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                آیا مطمئن هستید می‌خواهید این ستون را نهایی کنید؟
              </Text>

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setConfirmFinalizeVisible(false)}
                >
                  <Text style={styles.modalButtonText}>انصراف</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmFinalize}
                >
                  <Text style={styles.modalButtonText}>تأیید و نهایی</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent={true}
          visible={selectWarningVisible}
          onRequestClose={() => setSelectWarningVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { direction: "rtl" }]}>
              <TouchableOpacity
                style={[styles.modalCloseButton, { left: "auto", right: 8 }]}
                onPress={() => setSelectWarningVisible(false)}
                accessibilityLabel="بستن"
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                لطفاً حداقل یک روز را انتخاب کنید
              </Text>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setSelectWarningVisible(false)}
              >
                <Text style={styles.modalButtonText}>باشه</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  topRowFixed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8f4fe",
    height: 70,
    width: "100%",
  },

  leftSection: {
    width: "25%",
    alignItems: "flex-start",
  },

  centerSection: {
    width: "50%",
    alignItems: "center",
    justifyContent: "center",
  },

  rightSection: {
    width: "25%",
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  gemCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff9e6",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#ffd666",
  },

  gemIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffd666",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },

  gemIconImage: {
    width: 16,
    height: 16,
    tintColor: "#fff",
  },

  gemCountCompact: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#e67700",
    fontFamily: "BYekan",
    minWidth: 25,
    textAlign: "center",
  },

  sliderCompact: {
    // width: "100%",
  },

  helpCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1ecff",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0f0ff",
    height: 75,
    width: "100%",
  },

  helpSection: {
    width: "15%",
    alignItems: "flex-end",
    justifyContent: "center",
  },

  helpIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1ecff",
  },

  sliderWrapper: {
    width: "60%",
    paddingHorizontal: 8,
    justifyContent: "center",
  },

  gemSection: {
    width: "25%",
    alignItems: "flex-start",
    justifyContent: "center",
  },

  gemButton: {
    backgroundColor: "#fff9e6",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#ffd666",
    shadowColor: "#ffd666",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 70,
  },

  gemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  gemImage: {
    width: 24,
    height: 24,
    marginRight: 6,
  },

  gemText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fa8c16",
    fontFamily: "BYekan",
    flex: 1,
    textAlign: "center",
  },

  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerWrapper: {
    backgroundColor: "rgba(234, 244, 254, 1)",
    borderBottomWidth: 1,
    borderBottomColor: "#d0e7ff",
    paddingTop: Constants.statusBarHeight,
  },

  headerContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(234, 244, 254, 1)",
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  dailyProgramButton: {
    flex: 1,
    alignItems: "flex-end",
  },
  tableContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 4,
  },
  tableContainerInner: {
    flex: 1,
  },
  fullWidthContainer: {
    flex: 1,
    minWidth: screenWidth - 16,
  },
  matrixContainer: {
    flex: 1,
  },
  matrixHorizontalScrollView: {
    flex: 1,
  },
  matrixContent: {
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row-reverse",
    zIndex: 10,
    paddingHorizontal: 4,
    backgroundColor: "#fff",
    // borderBottomWidth: 1,
    // borderBottomColor: "#e0e0e0",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 4,
    // borderBottomWidth: 1,
    // borderBottomColor: "#f0f0f0",
  },
  tasksHeaderScrollView: {
    flex: 1,
  },
  tasksHeaderContainer: {
    flexDirection: "row-reverse",
    flex: 1,
    justifyContent: "flex-start",
  },
  tasksContentScrollView: {
    flex: 1,
  },
  tasksContentContainer: {
    flexDirection: "row-reverse",
    flex: 1,
    justifyContent: "flex-start",
  },
  headerCell: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 4,
  },
  dayHeaderCell: {
    height: "100%",
    justifyContent: "center",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
  },
  dayCell: {
    height: "100%",
    justifyContent: "center",
  },
  percentageCell: {
    height: "100%",
    justifyContent: "center",
  },
  taskCell: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  columnHeaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  columnHeader: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  columnInputContainer: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  columnInput: {
    borderWidth: 1,
    borderColor: "#1976D2",
    borderRadius: 8,
    textAlign: "center",
    backgroundColor: "#FFFFFF",
    fontFamily: "BYekan",
    paddingVertical: 4,
  },
  titleOval2: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    minHeight: 50,
  },
  titleOval3: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    minHeight: 50,
  },
  columnNameRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 30, // ارتفاع ثابت برای قسمت متن
  },
  columnActionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 30, // ارتفاع ثابت برای قسمت دکمه‌ها
  },
  columnActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  finalizeButton: {
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  scheduleButton: {
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  finalizedIndicator: {
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  titleOval: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  istitleOval: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#207adbff",
    alignItems: "center",
    justifyContent: "center",
  },
  pastDayOval: {
    backgroundColor: "#fff",
    borderColor: "#FF9999",
  },
  headerText: {
    textAlign: "center",
    color: "rgba(82, 15, 15, 1)",
    fontFamily: "BYekan",
  },
  dayText: {
    textAlign: "center",
    color: "#333",
    fontFamily: "BYekan",
  },
  pastDayText: {
    color: "#F44336",
    fontFamily: "BYekan",
  },
  dateText: {
    color: "#666",
    textAlign: "center",
    marginTop: 2,
    fontFamily: "BYekan",
  },
  todayText: {
    color: "#FF9800",
    fontFamily: "BYekan",
  },
  pastDateText: {
    color: "#F44336",
    fontFamily: "BYekan",
  },
  dateOnly: {
    textAlign: "center",
    color: "#333",
    fontFamily: "BYekan",
  },
  squareContainer: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    position: "relative",
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  statusIcon: {
    fontFamily: "BYekan",
  },
  bottomRightContainer: {
    position: "absolute",
    bottom: 4,
    start: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "#FFFFFF",
    fontFamily: "BYekan",
  },
  bulbIcon: {
    marginLeft: 2,
  },
  circleOutline: {
    position: "absolute",
    borderRadius: 25,
    borderWidth: 3,
  },
  circleProgressBorder: {
    position: "absolute",
    borderRadius: 25,
    borderWidth: 3,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  percentageText: {
    fontFamily: "BYekan",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "BYekan",
  },
  emptyStateSubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "BYekan",
  },
  tabContainerWrapper: {
    flexDirection: "column",
    marginHorizontal: 20,
    marginVertical: 8,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  zoomSliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  zoomIcon: {
    padding: 4,
  },
  tabContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent2: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabText: {
    fontSize: 11,
    marginRight: 5,
    fontWeight: "600",
    color: "#000",
    marginStart: 15,
    textAlign: "right",
    fontFamily: "BYekan",
  },
  addTabButton2: {
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    width: Math.min(320, screenWidth - 40),
    maxWidth: 320,
    alignItems: "center",
    alignSelf: "center",
    marginHorizontal: 20,
    marginTop: 50,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    maxHeight: "65%",
    transform: [{ scale: 0.85 }],
  },
  modalCloseButton: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 20,
    padding: 6,
    borderRadius: 20,
  },
  alarmModalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    width: Math.min(350, screenWidth - 20),
    maxWidth: 350,
    alignItems: "center",
    alignSelf: "center",
    marginHorizontal: 20,
    marginTop: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    maxHeight: "75%",
  },
  modalTitle: {
    fontSize: 12,
    marginBottom: 15,
    textAlign: "center",
    fontFamily: "BYekan",
  },
  scheduleOptionsContainer: {
    width: "100%",
    marginBottom: 15,
  },
  scheduleOption: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    marginVertical: 4,
    alignItems: "center",
  },
  scheduleOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
    fontFamily: "BYekan",
  },
  modalButtonsContainer: {
    width: "100%",
  },
  modalButton: {
    padding: 10,
    borderRadius: 6,
    marginVertical: 4,
    width: "100%",
    alignItems: "center",
  },
  completedButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#9E9E9E",
  },
  confirmButton: {
    backgroundColor: "#2196F3",
  },
  modalButtonText: {
    color: "white",
    fontSize: 14,
    fontFamily: "BYekan",
  },
  modalHeader: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  soundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
    padding: 10,
    borderRadius: 10,
  },
  soundRowSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#F0F8FF",
  },
  soundLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 30,
    paddingVertical: 1,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: "#707070ff",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  soundText: {
    fontSize: 12,
    color: "#000",
    fontFamily: "BYekan",
  },
  soundRight: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  timePickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 10,
  },
  timeSection: {
    alignItems: "center",
    marginHorizontal: 5,
  },
  timeLabel: {
    fontSize: 12,
    color: "#333",
    marginBottom: 5,
    fontFamily: "BYekan",
  },
  timeScrollView: {
    height: 40,
  },
  timeOption: {
    alignItems: "center",
    paddingVertical: 4,
    width: 40,
  },
  selectedTimeOption: {
    backgroundColor: "#2196F3",
    borderRadius: 5,
  },
  timeOptionText: {
    fontSize: 20,
    color: "#333",
    fontFamily: "BYekan",
  },
  selectedTimeOptionText: {
    color: "#FFFFFF",
    fontFamily: "BYekan",
  },
  setAlarmButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
  },
  setAlarmButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "BYekan",
  },
  removeAlarmButton: {
    backgroundColor: "#F44336",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
  },
  removeAlarmButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "BYekan",
  },
  spinnerTextStyle: {
    color: "#FFF",
    fontFamily: "BYekan",
    fontSize: 16,
  },
  percentageItem: {
    alignItems: "center",
    flex: 1,
  },
  percentageLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 4,
    fontFamily: "BYekan",
    textAlign: "center",
  },
  percentageValueContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  percentageValue: {
    fontSize: 12,
    fontFamily: "BYekan",
    textAlign: "center",
  },
  floatingButton: {
    position: "absolute",
    // place centered horizontally, and half-overlapping the bottom tab bar
    left: "50%",
    transform: [{ translateX: -25 }],
    backgroundColor: "transparent",
    zIndex: 9999,
    // vertical offset approximates half of the tab bar height (platform dependent)
    bottom: Platform.OS === "android" ? 65 / 2 - 25 : 80 / 2 - 25,
  },

  floatingButtonIcon: {
    width: 50,
    height: 50,
  },
  gemAndQuestionContainer: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  gemIconContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 8,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  middleRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },

  mainText: {
    fontSize: 16,
    color: "#333",
    fontFamily: "BYekan",
    textAlign: "center",
  },

  subText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "BYekan",
    textAlign: "center",
  },

  bottomRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 25,
    paddingBottom: 30,
    backgroundColor: "transparent",
  },

  progressContainer: {
    position: "relative",
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },

  percentageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  percentageGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E88E5",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  percentageTextLarge: {
    fontSize: 24,
    fontFamily: "BYekan",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },

  percentageSubtitle: {
    fontSize: 12,
    color: "#666",
    fontFamily: "BYekan",
    marginTop: 8,
    textAlign: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  circularProgressWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },

  percentageCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  gradientBackground: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#2196F3",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },

  percentageLabel: {
    fontSize: 12,
    color: "#666",
    fontFamily: "BYekan",
    marginTop: 4,
    textAlign: "center",
  },

  circle: {
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#2196F3",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  percentageText: {
    fontSize: 18,
    color: "#2196F3",
    fontFamily: "BYekan",
  },

  // استایل‌های جدید برای Network Error Modal
  networkErrorOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 20,
  },

  networkErrorContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 25,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },

  networkErrorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  networkErrorTitle: {
    fontSize: 20,
    color: "#F44336",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "BYekan",
  },

  networkErrorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
    fontFamily: "BYekan",
  },

  networkErrorButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },

  networkErrorButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  networkErrorRetryButton: {
    backgroundColor: "#2196F3",
  },

  networkErrorCancelButton: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  networkErrorButtonText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontFamily: "BYekan",
  },

  // استایل‌های جدید برای Welcome Modal
  welcomeOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 20,
  },

  welcomeContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    padding: 30,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 12,
  },

  welcomeIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF9E6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    position: "relative",
  },

  welcomeGemImage: {
    width: 60,
    height: 60,
    position: "absolute",
    zIndex: 1,
  },

  welcomeTitle: {
    fontSize: 22,
    color: "#FF9800",
    textAlign: "center",
    marginBottom: 15,
    fontFamily: "BYekan",
  },

  welcomeMessage: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 10,
    fontFamily: "BYekan",
  },

  gemHighlight: {
    color: "#FF9800",
    fontWeight: "bold",
    fontSize: 18,
  },

  welcomeSubMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 25,
    fontFamily: "BYekan",
  },

  welcomeButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  welcomeButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "BYekan",
  },
});

export default HomeScreen;
