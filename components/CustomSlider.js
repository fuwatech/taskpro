// components/CustomSlider.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Text,
  TouchableWithoutFeedback,
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

const CustomSlider = ({
  minimumValue = 0.45, // حداقل 25%
  maximumValue = 0.75, // حداکثر 75% (شروع از اینجا)
  value = 0.75, // مقدار پیش‌فرض 75%
  onValueChange,
  step = 0.25, // گام‌های 25%
  minimumTrackTintColor = "#0059ac",
  maximumTrackTintColor = "#e6f0ff",
  thumbTintColor = "#0059ac",
  style,
  showValue = true,
  valueFormat = (val) => {
    if (val === 0.45) return "۲۵%";
    if (val === 0.5) return "۵۰%";
    if (val === 0.75) return "۷۵%";
    return `${(val * 100).toFixed(0)}%`;
  },
  leftIcon = "remove-outline", // آیکون برای کم کردن (کوچک‌تر کردن)
  rightIcon = "add-outline", // آیکون برای اضافه کردن (بزرگ‌تر کردن - غیرفعال)
  iconSize = 22,
  iconColor = "#0059ac",
}) => {
  const [sliderValue, setSliderValue] = useState(value);
  const sliderWidth = Math.min(screenWidth - 64, 280);
  const trackWidth = sliderWidth - 190;
  const thumbSize = 24;
  const trackHeight = 4;

  const thumbPosition = useRef(new Animated.Value(0)).current;
  const trackContainerRef = useRef(null);

  // مقدارهای استاندارد زوم - فقط سه درجه: 75% → 50% → 25%
  const standardValues = [0.75, 0.5, 0.45];
  const standardPositions = standardValues.map(
    (val) =>
      ((val - minimumValue) / (maximumValue - minimumValue)) * trackWidth,
  );

  // همگام‌سازی value با position
  useEffect(() => {
    const clampedValue = Math.max(minimumValue, Math.min(maximumValue, value));
    setSliderValue(clampedValue);

    const newPosition = valueToPosition(clampedValue);
    thumbPosition.setValue(newPosition);
  }, [value]);

  // تبدیل value به position با درنظر گرفتن RTL
  const valueToPosition = (val) => {
    const ratio = (val - minimumValue) / (maximumValue - minimumValue);
    const position = ratio * trackWidth;

    if (I18nManager.isRTL) {
      return trackWidth - position;
    }
    return position;
  };

  // تبدیل position به value با درنظر گرفتن RTL
  const positionToValue = (position) => {
    let adjustedPosition = position;

    if (I18nManager.isRTL) {
      adjustedPosition = trackWidth - position;
    }

    let ratio = adjustedPosition / trackWidth;
    ratio = Math.max(0, Math.min(1, ratio));

    let calculatedValue = minimumValue + ratio * (maximumValue - minimumValue);

    // پیدا کردن نزدیک‌ترین مقدار استاندارد
    let closestValue = calculatedValue;
    let minDistance = Infinity;

    standardValues.forEach((standardVal) => {
      const distance = Math.abs(standardVal - calculatedValue);
      if (distance < minDistance) {
        minDistance = distance;
        closestValue = standardVal;
      }
    });

    return closestValue;
  };

  // تابع برای کلیک مستقیم روی track
  const handleTrackPress = async (evt) => {
    if (!trackContainerRef.current) return;

    trackContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
      let touchX = evt.nativeEvent.pageX - pageX;

      if (I18nManager.isRTL) {
        touchX = width - touchX;
      }

      const clampedX = Math.max(0, Math.min(trackWidth, touchX));

      let closestPosition = clampedX;
      let minDistance = Infinity;

      standardPositions.forEach((stdPos) => {
        const distance = Math.abs(stdPos - clampedX);
        if (distance < minDistance) {
          minDistance = distance;
          closestPosition = stdPos;
        }
      });

      const newValue = positionToValue(closestPosition);
      updateSlider(newValue);
    });
  };

  // PanResponder برای کشیدن thumb
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: async (evt) => {},
      onPanResponderMove: (evt, gestureState) => {
        const deltaX = gestureState.dx;

        const adjustedDeltaX = I18nManager.isRTL ? -deltaX : deltaX;

        const currentPosition = thumbPosition._value;
        const newPosition = Math.max(
          0,
          Math.min(trackWidth, currentPosition + adjustedDeltaX),
        );

        thumbPosition.setValue(newPosition);

        const newValue = positionToValue(newPosition);
        setSliderValue(newValue);
        if (onValueChange) {
          onValueChange(newValue);
        }
      },
      onPanResponderRelease: () => {
        const currentValue = positionToValue(thumbPosition._value);
        const newPosition = valueToPosition(currentValue);

        Animated.spring(thumbPosition, {
          toValue: newPosition,
          useNativeDriver: false,
          tension: 150,
          friction: 12,
        }).start();
      },
    }),
  ).current;

  // به‌روزرسانی slider
  const updateSlider = (newValue) => {
    setSliderValue(newValue);

    const newPosition = valueToPosition(newValue);
    Animated.spring(thumbPosition, {
      toValue: newPosition,
      useNativeDriver: false,
      tension: 150,
      friction: 12,
    }).start();

    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  // دکمه کاهش (کم کردن زوم - کوچک‌تر کردن)
  const handleDecrease = () => {
    const currentIndex = standardValues.indexOf(sliderValue);
    if (currentIndex < standardValues.length - 1) {
      // از 75 به 50 به 25
      updateSlider(standardValues[currentIndex + 1]);
    }
  };

  // دکمه افزایش (افزایش زوم - بزرگ‌تر کردن)
  const handleIncrease = () => {
    const currentIndex = standardValues.indexOf(sliderValue);
    if (currentIndex > 0) {
      // از 25 به 50 به 75
      updateSlider(standardValues[currentIndex - 1]);
    }
  };

  // عرض track پر شده با درنظر گرفتن RTL
  const filledTrackWidth = thumbPosition.interpolate({
    inputRange: [0, trackWidth],
    outputRange: I18nManager.isRTL ? [trackWidth, 0] : [0, trackWidth],
  });

  // تابع تبدیل اعداد به فارسی
  const toPersianNumbers = (num) => {
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return num
      .toString()
      .replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
  };

  // تابع نمایش عنوان مقادیر
  const getValueLabel = (val) => {
    if (val === 0.45) return "کوچک";
    if (val === 0.5) return "متوسط";
    if (val === 0.75) return "طبیعی";
    return "";
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.sliderRow}>
        {/* دکمه کاهش (برای کوچک‌تر کردن - فعال فقط اگر بزرگ‌تر از 25% باشیم) */}
        <TouchableWithoutFeedback onPress={handleDecrease}>
          <View style={styles.iconButton}>
            <Ionicons
              name={leftIcon}
              size={iconSize}
              color={sliderValue > minimumValue ? iconColor : "#cccccc"}
            />
          </View>
        </TouchableWithoutFeedback>

        {/* track اصلی */}
        <View style={[styles.sliderTrackContainer, { width: trackWidth }]}>
          {/* track پس‌زمینه */}
          <TouchableWithoutFeedback onPress={handleTrackPress}>
            <View ref={trackContainerRef} style={styles.trackTouchArea}>
              <View
                style={[
                  styles.track,
                  {
                    backgroundColor: maximumTrackTintColor,
                    width: trackWidth,
                    height: trackHeight,
                  },
                ]}
              />

              {/* track پر شده */}
              <Animated.View
                style={[
                  styles.filledTrack,
                  {
                    backgroundColor: minimumTrackTintColor,
                    width: filledTrackWidth,
                    height: trackHeight,
                  },
                ]}
              />

              {/* نقاط نشانگر مقادیر استاندارد */}
              <View style={styles.markersContainer}>
                {standardPositions.map((position, index) => {
                  const markerPosition = I18nManager.isRTL
                    ? trackWidth - position
                    : position;

                  // منطق رنگ‌آمیزی برای RTL: اگر مقدار فعلی ≤ مقدار استاندارد باشد
                  const isActive = I18nManager.isRTL
                    ? sliderValue <= standardValues[index]
                    : sliderValue >= standardValues[index];

                  // return (
                  //   <View
                  //     key={index}
                  //     style={[
                  //       styles.marker,
                  //       {
                  //         left: markerPosition,
                  //         backgroundColor: isActive
                  //           ? minimumTrackTintColor
                  //           : maximumTrackTintColor,
                  //       },
                  //     ]}
                  //   />
                  // );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>

          {/* thumb */}
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: thumbTintColor,
                width: thumbSize,
                height: thumbSize,
                left: thumbPosition.interpolate({
                  inputRange: [0, trackWidth],
                  outputRange: I18nManager.isRTL
                    ? [trackWidth - thumbSize / 2, -thumbSize / 2]
                    : [-thumbSize / 2, trackWidth - thumbSize / 2],
                }),
              },
            ]}
            {...panResponder.panHandlers}
          />
        </View>

        {/* دکمه افزایش (برای بزرگ‌تر کردن - فعال فقط اگر کوچک‌تر از 75% باشیم) */}
        <TouchableWithoutFeedback onPress={handleIncrease}>
          <View style={styles.iconButton}>
            <Ionicons
              name={rightIcon}
              size={iconSize}
              color={sliderValue < maximumValue ? iconColor : "#cccccc"}
            />
          </View>
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    maxWidth: screenWidth - 32,
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "50%",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fbff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e6f0ff",
  },
  sliderTrackContainer: {
    position: "relative",
    justifyContent: "center",
    height: 40,
  },
  trackTouchArea: {
    height: 30,
    justifyContent: "center",
  },
  track: {
    borderRadius: 2,
    position: "absolute",
    overflow: "hidden",
  },
  filledTrack: {
    position: "absolute",
    borderRadius: 2,
    zIndex: 1,
  },
  markersContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  marker: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: "#ffffff",
    zIndex: 2,
  },
  thumb: {
    position: "absolute",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 3,
    borderColor: "#ffffff",
    zIndex: 10,
  },
  valueContainer: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  valueText: {
    fontSize: 14,
    color: "#0059ac",
    fontFamily: "BYekan",
    fontWeight: "700",
    backgroundColor: "#f0f8ff",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 4,
  },
  valueLabel: {
    fontSize: 12,
    color: "#0059ac",
    fontFamily: "BYekan",
  },
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    width: "100%",
    paddingHorizontal: 8,
  },
  labelColumn: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeLabelColumn: {
    backgroundColor: "#f0f8ff",
  },
  labelValue: {
    fontSize: 11,
    color: "#666666",
    fontFamily: "BYekan",
    marginBottom: 2,
  },
  labelTitle: {
    fontSize: 10,
    color: "#999999",
    fontFamily: "BYekan",
  },
  activeLabelValue: {
    color: "#0059ac",
    fontWeight: "700",
    fontSize: 12,
  },
  activeLabelTitle: {
    color: "#0059ac",
    fontWeight: "600",
  },
  firstLabel: {
    alignItems: "flex-start",
  },
  lastLabel: {
    alignItems: "flex-end",
  },
});

export default CustomSlider;
