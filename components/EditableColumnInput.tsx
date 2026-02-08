import React, { useState, useEffect, useRef } from "react";
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface EditableColumnInputProps
  extends Omit<TextInputProps, "style" | "value"> {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  onEndEditing: () => void;
  onBlur?: () => void; // افزودن onBlur prop
  scale?: number;
  customStyle?: TextInputProps["style"];
  minFontSize?: number;
  baseFontSize?: number;
  containerStyle?: any; // استایل برای کانتینر
}

const EditableColumnInput: React.FC<EditableColumnInputProps> = ({
  value,
  onChangeText,
  onSubmitEditing,
  onEndEditing,
  onBlur,
  autoFocus = true,
  scale = 1,
  customStyle,
  minFontSize = 8,
  baseFontSize = 10,
  containerStyle,
  ...restProps
}) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        setIsFocused(true);
      }, 100);
    }
  }, [autoFocus]);

  const styles = StyleSheet.create({
    columnInput: {
      textAlign: "center" as const,
      fontSize: Math.max(minFontSize, baseFontSize * scale),
      width: "100%",
      height: "100%",
      fontFamily: "BYekan",
      borderWidth: 1,
      borderColor: "#1976D2",
      borderRadius: 8,
      backgroundColor: "#FFFFFF",
      paddingVertical: 4,
    },
    container: {
      width: "100%",
      height: "100%",
    },
  });

  const handleChangeText = (text: string) => {
    setInputValue(text);
    onChangeText(text);
  };

  const handleSubmitEditing = () => {
    onSubmitEditing();
    setIsFocused(false);
  };

  const handleEndEditing = () => {
    onEndEditing();
    setIsFocused(false);
    if (onBlur) {
      onBlur();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) {
      onBlur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  // تابع برای هندل کردن کلیک خارج
  const handleOutsidePress = () => {
    if (isFocused && inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleOutsidePress}>
      <View style={[styles.container, containerStyle]}>
        <TextInput
          ref={inputRef}
          style={[styles.columnInput, customStyle]}
          value={inputValue}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmitEditing}
          onEndEditing={handleEndEditing}
          onBlur={handleBlur}
          onFocus={handleFocus}
          autoFocus={autoFocus}
          blurOnSubmit={false}
          multiline={false}
          returnKeyType="done"
          maxLength={30} // محدودیت طول متن
          placeholder="عنوان ستون"
          placeholderTextColor="#999"
          {...restProps}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default EditableColumnInput;
