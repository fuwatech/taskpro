import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const Master = ({
  children,
  child = 0,
}: {
  children: React.ReactNode;
  child?: number;
}) => {
  const [state, setState] = useState<number | null>(null);
  const [childState, setChildState] = useState<number>(child);

  // گرفتن اطلاعات کاربر
  // useEffect(() => {
  //   const checkData = async () => {
  //     try {
  //       const jsonValue = await AsyncStorage.getItem("UserInfo");
  //       const get = jsonValue ? JSON.parse(jsonValue) : null;

  //       if (!get) {
  //         setState(0);
  //         return;
  //       }

  //       setState(get.state);
  //       setChildState(child);
  //     } catch (e) {
  //       setState(0);
  //     }
  //   };

  //   checkData();
  // }, []);

  // // تغییر مسیر بعد از آماده شدن state
  // useEffect(() => {
  //   if (state === null) return; // هنوز آماده نشده

  //   if (state === 0) {
  //     router.replace("/page/Login");
  //   } else if (state === 1) {
  //     router.replace("/page/SmsScreen");
  //   } else if (state === 2 && childState === 0) {
  //     router.replace("/page/HomeScreen");
  //   }
  // }, [state, childState]);

  const theme = {
    ...DefaultTheme,
    roundness: 2,
    colors: {
      ...DefaultTheme.colors,
      primary: "rgb(120, 69, 172)",
      background: "rgb(255, 251, 255)",
    },
  };

  return (
    <PaperProvider theme={theme}>
      <View
        style={{
          flex: 1,
          direction: "rtl",
          display: "flex",
          maxWidth: 550,
          marginLeft: "auto",
          marginRight: "auto",
          width: "100%",
        }}
      >
        <StatusBar />
        {children}
        {/* <Toast /> */}
      </View>
    </PaperProvider>
  );
};

export default Master;
