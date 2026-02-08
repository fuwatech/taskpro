import React, { forwardRef, useCallback, useState } from "react";
import {
  TextInput,
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PropTypes from "prop-types";

import defaultStyles from "../config/styles";

// ====================================================================
// COMPONENT
// ====================================================================
const AppPhoneInput = forwardRef(
  (
    {
      icon,
      imageSource = require("../assets/images/countryCode.jpg"),
      placeholder,
      value,
      onPress,
      focusable,
      onChangeText,
      width = "100%",
      handleKeyDown,
      containerStyle,
      inputStyle,
      iconStyle,
      imageStyle,
      showCountryCode = true,
      countryCode = "+98",
      onCountryCodePress,
      error = false,
      success = false,
      disabled = false,
      ...otherProps
    },
    ref
  ) => {
    // ====================================================================
    // STATE
    // ====================================================================
    const [isFocused, setIsFocused] = useState(false);
    const borderWidthAnim = useState(new Animated.Value(1))[0];

    // ====================================================================
    // HANDLERS
    // ====================================================================
    const handleFocus = useCallback(() => {
      setIsFocused(true);
      Animated.timing(borderWidthAnim, {
        toValue: 2,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [borderWidthAnim]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      Animated.timing(borderWidthAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [borderWidthAnim]);

    const handleTextChange = useCallback(
      (text) => {
        // فقط اعداد را قبول کن
        const numericText = text.replace(/[^0-9]/g, "");
        onChangeText?.(numericText);
      },
      [onChangeText]
    );

    const handleKeyPress = useCallback(
      (event) => {
        handleKeyDown?.(event);
      },
      [handleKeyDown]
    );

    // ====================================================================
    // STYLES
    // ====================================================================
    const getBorderColor = () => {
      if (disabled) return defaultStyles.colors.lightGray;
      if (error) return defaultStyles.colors.danger;
      if (success) return defaultStyles.colors.success;
      if (isFocused) return defaultStyles.colors.primary;
      return defaultStyles.colors.medium;
    };

    const getBackgroundColor = () => {
      if (disabled) return defaultStyles.colors.lightGray;
      return defaultStyles.colors.light;
    };

    const animatedBorderStyle = {
      borderWidth: borderWidthAnim,
      borderColor: borderWidthAnim.interpolate({
        inputRange: [1, 2],
        outputRange: [getBorderColor(), defaultStyles.colors.primary],
      }),
    };

    // ====================================================================
    // RENDER
    // ====================================================================
    return (
      <Animated.View
        style={[
          styles.container,
          { width },
          animatedBorderStyle,
          {
            backgroundColor: getBackgroundColor(),
            opacity: disabled ? 0.6 : 1,
          },
          containerStyle,
        ]}
      >
        {/* Country Code (RTL Support) */}

        {/* Input Field */}
        <View style={styles.inputWrapper}>
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={
                disabled
                  ? defaultStyles.colors.medium
                  : error
                  ? defaultStyles.colors.danger
                  : success
                  ? defaultStyles.colors.success
                  : isFocused
                  ? defaultStyles.colors.primary
                  : defaultStyles.colors.medium
              }
              style={[styles.icon, iconStyle]}
            />
          )}

          <TextInput
            ref={ref}
            focusable={!disabled && focusable}
            placeholder={placeholder}
            placeholderTextColor="#A29F9F"
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            blurOnSubmit={false}
            returnKeyType="next"
            value={value}
            onKeyPress={handleKeyPress}
            style={[
              styles.textInput,
              defaultStyles.text,
              {
                textAlign: "left", // RTL support
                writingDirection: "rtl", // RTL support
                color: disabled
                  ? defaultStyles.colors.medium
                  : defaultStyles.colors.dark,
              },
              inputStyle,
            ]}
            editable={!disabled}
            selectTextOnFocus={!disabled}
            keyboardType="number-pad"
            maxLength={10} // برای شماره موبایل ایران
            {...otherProps}
          />
        </View>

        {/* Status Indicators */}
        {(error || success) && (
          <View style={styles.statusIconContainer}>
            <MaterialCommunityIcons
              name={error ? "alert-circle" : "check-circle"}
              size={20}
              color={
                error
                  ? defaultStyles.colors.danger
                  : defaultStyles.colors.success
              }
              style={styles.statusIcon}
            />
          </View>
        )}
      </Animated.View>
    );
  }
);

// ====================================================================
// PROPTYPES
// ====================================================================
AppPhoneInput.propTypes = {
  icon: PropTypes.string,
  imageSource: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onPress: PropTypes.func,
  focusable: PropTypes.bool,
  onChangeText: PropTypes.func.isRequired,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleKeyDown: PropTypes.func,
  containerStyle: PropTypes.object,
  inputStyle: PropTypes.object,
  iconStyle: PropTypes.object,
  imageStyle: PropTypes.object,
  showCountryCode: PropTypes.bool,
  countryCode: PropTypes.string,
  onCountryCodePress: PropTypes.func,
  error: PropTypes.bool,
  success: PropTypes.bool,
  disabled: PropTypes.bool,
};

AppPhoneInput.defaultProps = {
  width: "100%",
  showCountryCode: true,
  countryCode: "+98",
  error: false,
  success: false,
  disabled: false,
};

// ====================================================================
// STYLES
// ====================================================================
const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse", // RTL layout
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 16 : 12,
    marginVertical: 8,
    backgroundColor: "#FFFFFF",
    minHeight: 56,
    borderWidth: 1,
    borderColor: "#E5E7EB",

    // Shadow for iOS
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
        shadowColor: "#000",
      },
    }),
  },

  countryCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12, // Space between country code and input
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
  },

  countryCodeTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },

  countryCodeText: {
    fontSize: 16,
    fontFamily: "BYekan",
    color: "#374151",
    marginRight: 4,
    writingDirection: "rtl",
  },

  chevronIcon: {
    marginRight: 4,
    transform: [{ rotate: "-90deg" }], // Adjust for RTL
  },

  image: {
    width: 24,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },

  inputWrapper: {
    flex: 1,
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
  },

  icon: {
    marginLeft: 12, // Space between icon and text input in RTL
  },

  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "BYekan",
    paddingVertical: 0,
    minHeight: 24,
    includeFontPadding: false,
    textAlignVertical: "center",

    // RTL specific
    writingDirection: "rtl",
    textAlign: "right",
  },

  statusIconContainer: {
    marginRight: 12, // Space between input and status icon in RTL
  },

  statusIcon: {
    // Additional styles if needed
  },
});

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================
export const formatPhoneNumber = (phone) => {
  if (!phone) return "";

  const cleaned = phone.replace(/\D/g, "");

  // فرمت برای شماره موبایل ایران: 0912 345 6789
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  return cleaned;
};

export const validatePhoneNumber = (phone) => {
  if (!phone) return false;

  const cleaned = phone.replace(/\D/g, "");

  // شماره موبایل ایران باید 10 رقم باشد و با 9 شروع شود
  if (cleaned.length !== 10) return false;
  if (cleaned[0] !== "9") return false;

  return true;
};

export default AppPhoneInput;
