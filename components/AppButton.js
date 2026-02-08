import React from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import defaultStyles from "../config/styles";

export default function AppButton({
  title = "کلیک کنید",
  onPress,
  color = "primary",
  textColor = "white",
  width = "100%",
  style,
  icon,
  disabled,
  isValid = true, 
}) {
  return (
    <Pressable
      style={[
        style,
        styles.button,
        {
          backgroundColor: defaultStyles.colors[color],
          width: width,
          borderColor: isValid ? defaultStyles.colors[color] : "red", 
          borderWidth: 1, 
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[defaultStyles.text, { color: defaultStyles.colors[textColor] }]}
      >
        {title}
        {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={textColor}
          style={styles.icon}
        />
      )}
      </Text>
      
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    marginVertical: 7.5,
    maxWidth: 400,
    shadowColor: "grey", //iOS shadow
    shadowOffset: { width: 0, height: 0 }, //iOS shadow
    shadowOpacity: 1, //iOS shadow
    shadowRadius: 5, //iOS shadow
    elevation: 5, //android shadow
  },
  icon: {
    marginLeft: 10,
    marginVertical: 8,
    marginHorizontal: 20,
  },
});
