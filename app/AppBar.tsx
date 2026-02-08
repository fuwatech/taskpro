import * as React from "react";
import { Appbar } from "react-native-paper";
import { StyleSheet, Platform } from "react-native";
import defaultStyles from "../config/styles";

const AppBar = () => (
  <Appbar.Header style={styles.item}>
    <Appbar.Content title="" />
    {/* <Appbar.Action icon="magnify" onPress={() => {}} /> */}
  </Appbar.Header>
);

export default AppBar;

const styles = StyleSheet.create({
  item: {
    height: 20,
    backgroundColor: defaultStyles.colors["primary"],
  },
});
