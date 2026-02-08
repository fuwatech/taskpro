// TimePicker.jsx
import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

const TimePicker = ({
  value,
  onValueChange,
  items,
  itemHeight = 50,
  width = 60,
  label = "",
  formatItem = (item) => item,
  disabled = false,
}) => {
  const scrollRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    if (scrollRef.current && value !== undefined) {
      setTimeout(() => {
        scrollRef.current.scrollToOffset({
          offset: value * itemHeight,
          animated: false,
        });
      }, 100);
    }
  }, []);

  const handleScrollEnd = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    const newValue = Math.max(0, Math.min(items.length - 1, index));

    if (newValue !== value) {
      onValueChange(newValue);
    }

    if (scrollRef.current) {
      scrollRef.current.scrollToOffset({
        offset: newValue * itemHeight,
        animated: true,
      });
    }

    setTimeout(() => setIsScrolling(false), 150);
  };

  const renderItem = ({ item, index }) => {
    const isSelected = value === index;
    return (
      <View style={[styles.item, { height: itemHeight }]}>
        <Text style={[styles.itemText, isSelected && styles.selectedText]}>
          {formatItem(item)}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { width }]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.pickerWrapper, { height: itemHeight * 3 }]}>
        <View style={styles.maskTop} />
        <View style={styles.maskBottom} />
        <View style={styles.highlight} />

        <FlatList
          ref={scrollRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `item-${index}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onScrollBeginDrag={() => setIsScrolling(true)}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          scrollEnabled={!disabled}
          getItemLayout={(_, index) => ({
            length: itemHeight,
            offset: itemHeight * index,
            index,
          })}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    color: "#555",
    marginBottom: 6,
  },
  pickerWrapper: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "#F8F9FF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  item: {
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    fontSize: 20,
    color: "#888",
  },
  selectedText: {
    fontSize: 24,
    color: "#2196F3",
    fontWeight: "bold",
  },
  maskTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    zIndex: 1,
  },
  maskBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    zIndex: 1,
  },
  highlight: {
    position: "absolute",
    top: 50,
    left: 5,
    right: 5,
    height: 50,
    backgroundColor: "rgba(33, 150, 243, 0.08)",
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: "#2196F3",
    borderRadius: 8,
    zIndex: 0,
  },
});

export default TimePicker;
