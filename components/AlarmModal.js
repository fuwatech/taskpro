import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  StyleSheet,
  Animated,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

const AlarmModal = ({
  visible,
  onClose,
  selectedColumnForAlarm,
  selectedAlarmSound,
  alarmHours: propAlarmHours,
  alarmMinutes: propAlarmMinutes,
  isPlaying,
  handleAlarmSelection,
  setAlarmHours: propSetAlarmHours,
  setAlarmMinutes: propSetAlarmMinutes,
  playSound,
  stopSound,
  setAlarm,
  removeAlarm,
  toPersianNumbers,
  columns,
  alarmSettings,
}) => {
  // State management
  const [localHours, setLocalHours] = useState(propAlarmHours);
  const [localMinutes, setLocalMinutes] = useState(propAlarmMinutes);
  const [isScrolling, setIsScrolling] = useState(false);
  const [lastSetTime, setLastSetTime] = useState(null);

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hoursScrollRef = useRef(null);
  const minutesScrollRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isComponentMounted = useRef(true);

  // Constants
  const ITEM_HEIGHT = 50;
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = Array.from({ length: 60 }, (_, i) => i);

  // Derived values
  const selectedColumn = columns?.find(
    (col) => col.id === selectedColumnForAlarm,
  );
  const hasAlarm = selectedColumn && selectedColumn.alarmTime;

  // Effects
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Update last set time
  useEffect(() => {
    if (!visible || !selectedColumnForAlarm || !alarmSettings) {
      setLastSetTime(null);
      return;
    }

    const settings = alarmSettings[selectedColumnForAlarm];
    if (settings?.setAt) {
      try {
        const date = new Date(settings.setAt);
        const persianDate = new Intl.DateTimeFormat("fa-IR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);

        setLastSetTime(persianDate);
      } catch (error) {
        console.error("Error formatting date:", error);
        setLastSetTime(null);
      }
    } else {
      setLastSetTime(null);
    }
  }, [alarmSettings, selectedColumnForAlarm, visible]);

  // Handle modal visibility changes
  useEffect(() => {
    if (visible) {
      // Reset local state to prop values
      setLocalHours(propAlarmHours);
      setLocalMinutes(propAlarmMinutes);

      // Set initial scroll positions
      setTimeout(() => {
        if (hoursScrollRef.current && isComponentMounted.current) {
          hoursScrollRef.current.scrollToOffset({
            offset: propAlarmHours * ITEM_HEIGHT,
            animated: false,
          });
        }
        if (minutesScrollRef.current && isComponentMounted.current) {
          minutesScrollRef.current.scrollToOffset({
            offset: propAlarmMinutes * ITEM_HEIGHT,
            animated: false,
          });
        }
      }, 100);

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, propAlarmHours, propAlarmMinutes]);

  // Scroll handlers
  const handleScrollBegin = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  const handleScrollEnd = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (isComponentMounted.current) {
        setIsScrolling(false);
      }
    }, 150);
  }, []);

  const handleHoursScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const newHour = Math.max(0, Math.min(23, index));

    setLocalHours(newHour);
  }, []);

  const handleMinutesScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const newMinute = Math.max(0, Math.min(59, index));

    setLocalMinutes(newMinute);
  }, []);

  const handleHoursScrollEnd = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const newHour = Math.max(0, Math.min(23, index));

      setLocalHours(newHour);
      propSetAlarmHours(newHour);

      if (hoursScrollRef.current && isComponentMounted.current) {
        hoursScrollRef.current.scrollToOffset({
          offset: newHour * ITEM_HEIGHT,
          animated: true,
        });
      }

      handleScrollEnd();
    },
    [propSetAlarmHours, handleScrollEnd],
  );

  const handleMinutesScrollEnd = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const newMinute = Math.max(0, Math.min(59, index));

      setLocalMinutes(newMinute);
      propSetAlarmMinutes(newMinute);

      if (minutesScrollRef.current && isComponentMounted.current) {
        minutesScrollRef.current.scrollToOffset({
          offset: newMinute * ITEM_HEIGHT,
          animated: true,
        });
      }

      handleScrollEnd();
    },
    [propSetAlarmMinutes, handleScrollEnd],
  );

  // Direct selection handlers
  const handleHourSelect = useCallback(
    (hour) => {
      if (isScrolling) return;

      setLocalHours(hour);
      propSetAlarmHours(hour);

      if (hoursScrollRef.current && isComponentMounted.current) {
        hoursScrollRef.current.scrollToOffset({
          offset: hour * ITEM_HEIGHT,
          animated: true,
        });
      }
    },
    [isScrolling, propSetAlarmHours],
  );

  const handleMinuteSelect = useCallback(
    (minute) => {
      if (isScrolling) return;

      setLocalMinutes(minute);
      propSetAlarmMinutes(minute);

      if (minutesScrollRef.current && isComponentMounted.current) {
        minutesScrollRef.current.scrollToOffset({
          offset: minute * ITEM_HEIGHT,
          animated: true,
        });
      }
    },
    [isScrolling, propSetAlarmMinutes],
  );

  // Sound handlers
  const handlePlaySound = useCallback(
    (soundIndex) => {
      if (isPlaying) {
        stopSound?.();
      } else {
        playSound?.(soundIndex);
      }
    },
    [isPlaying, playSound, stopSound],
  );

  const handleSoundSelection = useCallback(
    (soundIndex) => {
      if (isPlaying) {
        stopSound?.();
      }
      handleAlarmSelection?.(soundIndex);
    },
    [isPlaying, stopSound, handleAlarmSelection],
  );

  // Alarm actions
  const handleSetAlarm = useCallback(() => {
    if (isPlaying) {
      stopSound?.();
    }
    setAlarm?.();
  }, [isPlaying, stopSound, setAlarm]);

  const handleRemoveAlarm = useCallback(() => {
    if (isPlaying) {
      stopSound?.();
    }
    removeAlarm?.();
  }, [isPlaying, stopSound, removeAlarm]);

  const handleCloseModal = useCallback(() => {
    if (isPlaying) {
      stopSound?.();
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    onClose?.();
  }, [isPlaying, stopSound, onClose]);

  // Render helpers
  const renderHourItem = useCallback(
    ({ item }) => {
      const isSelected = localHours === item;

      return (
        <TouchableOpacity
          style={[styles.numberItem, isSelected && styles.numberItemSelected]}
          activeOpacity={0.7}
          onPress={() => handleHourSelect(item)}
          disabled={isScrolling}
        >
          <Text
            style={[styles.numberText, isSelected && styles.numberTextSelected]}
          >
            {toPersianNumbers(item.toString().padStart(2, "0"))}
          </Text>
        </TouchableOpacity>
      );
    },
    [localHours, isScrolling, handleHourSelect, toPersianNumbers],
  );

  const renderMinuteItem = useCallback(
    ({ item }) => {
      const isSelected = localMinutes === item;

      return (
        <TouchableOpacity
          style={[styles.numberItem, isSelected && styles.numberItemSelected]}
          activeOpacity={0.7}
          onPress={() => handleMinuteSelect(item)}
          disabled={isScrolling}
        >
          <Text
            style={[styles.numberText, isSelected && styles.numberTextSelected]}
          >
            {toPersianNumbers(item.toString().padStart(2, "0"))}
          </Text>
        </TouchableOpacity>
      );
    },
    [localMinutes, isScrolling, handleMinuteSelect, toPersianNumbers],
  );

  const isSoundPlaying = useCallback(
    (soundIndex) => {
      return isPlaying && selectedAlarmSound === soundIndex;
    },
    [isPlaying, selectedAlarmSound],
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleCloseModal}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[styles.alarmModalContent, { opacity: fadeAnim }]}
        >
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleCloseModal}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={26} color="#666" />
          </TouchableOpacity>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedColumn ? selectedColumn.name : "نام تسک"}
            </Text>
          </View>

          {[0, 1, 2].map((soundIndex) => {
            const isSelected = selectedAlarmSound === soundIndex;
            const isCurrentlyPlaying = isSoundPlaying(soundIndex);

            return (
              <TouchableOpacity
                key={soundIndex}
                style={[styles.soundRow, isSelected && styles.soundRowSelected]}
                onPress={() => handleSoundSelection(soundIndex)}
                activeOpacity={isSelected ? 1 : 0.7}
              >
                <View
                  style={[styles.soundLeft, isSelected && { marginTop: 20 }]}
                >
                  <View
                    style={[
                      styles.soundIconContainer,
                      isCurrentlyPlaying && styles.soundIconContainerPlaying,
                    ]}
                  >
                    <Ionicons
                      name="musical-note"
                      size={18}
                      color={isCurrentlyPlaying ? "#FFFFFF" : "#2196F3"}
                    />
                  </View>
                  <Text style={styles.soundText}>
                    آهنگ شماره {toPersianNumbers(soundIndex + 1)}
                  </Text>
                </View>

                {isSelected && (
                  <View style={styles.soundRight}>
                    <TouchableOpacity
                      onPress={() => handlePlaySound(soundIndex)}
                      style={[
                        styles.playButton,
                        isSelected && { marginTop: 20 },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          isCurrentlyPlaying ? "pause-circle" : "play-circle"
                        }
                        size={34}
                        color={isCurrentlyPlaying ? "#F44336" : "#2196F3"}
                      />
                    </TouchableOpacity>

                    <View style={styles.timePickerContainer}>
                      <View style={styles.timeSection}>
                        <Text style={styles.timeLabel}>دقیقه</Text>
                        <View style={styles.pickerContainer}>
                          <View style={styles.pickerWrapper}>
                            <View style={styles.pickerMaskTop} />
                            <View style={styles.pickerMaskBottom} />
                            <View style={styles.centerHighlight} />
                            <FlatList
                              ref={minutesScrollRef}
                              data={MINUTES}
                              renderItem={renderMinuteItem}
                              keyExtractor={(item) => `minute-${item}`}
                              showsVerticalScrollIndicator={false}
                              snapToInterval={ITEM_HEIGHT}
                              decelerationRate="fast"
                              onScrollBeginDrag={handleScrollBegin}
                              onScroll={handleMinutesScroll}
                              onMomentumScrollEnd={handleMinutesScrollEnd}
                              // onScrollEndDrag={handleMinutesScrollEnd}
                              getItemLayout={(_, index) => ({
                                length: ITEM_HEIGHT,
                                offset: ITEM_HEIGHT * index,
                                index,
                              })}
                              style={styles.pickerList}
                              contentContainerStyle={styles.pickerListContent}
                              scrollEnabled
                              bounces
                              scrollEventThrottle={16}
                              overScrollMode="always"
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.timeSeparator}>
                        <Text style={styles.timeSeparatorText}>:</Text>
                      </View>

                      <View style={styles.timeSection}>
                        <Text style={styles.timeLabel}>ساعت</Text>
                        <View style={styles.pickerContainer}>
                          <View style={styles.pickerWrapper}>
                            <View style={styles.pickerMaskTop} />
                            <View style={styles.pickerMaskBottom} />
                            <View style={styles.centerHighlight} />
                            <FlatList
                              ref={hoursScrollRef}
                              data={HOURS}
                              renderItem={renderHourItem}
                              keyExtractor={(item) => `hour-${item}`}
                              showsVerticalScrollIndicator={false}
                              snapToInterval={ITEM_HEIGHT}
                              decelerationRate="fast"
                              onScrollBeginDrag={handleScrollBegin}
                              onScroll={handleHoursScroll}
                              onMomentumScrollEnd={handleHoursScrollEnd}
                              // onScrollEndDrag={handleHoursScrollEnd}
                              getItemLayout={(_, index) => ({
                                length: ITEM_HEIGHT,
                                offset: ITEM_HEIGHT * index,
                                index,
                              })}
                              style={styles.pickerList}
                              contentContainerStyle={styles.pickerListContent}
                              scrollEnabled
                              bounces
                              scrollEventThrottle={16}
                              overScrollMode="always"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.setAlarmButton,
                selectedAlarmSound === null && styles.disabledButton,
              ]}
              onPress={handleSetAlarm}
              activeOpacity={0.7}
              disabled={selectedAlarmSound === null}
            >
              <Ionicons name="alarm-outline" size={20} color="#fff" />
              <Text style={styles.setAlarmButtonText}>تنظیم آوای انتظار</Text>
            </TouchableOpacity>

            {hasAlarm && (
              <TouchableOpacity
                style={[styles.actionButton, styles.removeAlarmButton]}
                onPress={handleRemoveAlarm}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.removeAlarmButtonText}>حذف آلارم</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Styles remain the same as your original code
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingTop: 50,
  },
  alarmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    width: Math.min(380, screenWidth - 30),
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 6,
  },
  modalHeader: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 16,
    color: "#1A237E",
    marginBottom: 4,
    textAlign: "center",
    fontFamily: "BYekan",
  },
  lastSetTimeContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginTop: 4,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lastSetTimeText: {
    fontSize: 10,
    color: "#666",
    marginRight: 4,
    fontFamily: "BYekan",
  },
  soundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    width: "100%",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E8EAF6",
    backgroundColor: "#F8F9FF",
  },
  soundRowSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#E8F4FD",
    shadowColor: "#2196F3",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  soundLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: 110,
  },
  soundIconContainer: {
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
    padding: 4,
  },
  soundIconContainerPlaying: {
    backgroundColor: "#2196F3",
  },
  soundText: {
    fontSize: 10,
    color: "#333",
    fontFamily: "BYekan",
  },
  soundRight: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    padding: 1,
    marginLeft: 8,
  },
  playButton: {
    padding: 4,
    marginHorizontal: 4,
  },
  timePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  timeSection: {
    alignItems: "center",
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 11,
    color: "#555",
    marginBottom: 6,
    fontFamily: "BYekan",
  },
  pickerContainer: {
    position: "relative",
  },
  pickerWrapper: {
    height: 150,
    width: 55,
    position: "relative",
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "#F8F9FF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  pickerList: {
    flex: 1,
  },
  pickerListContent: {
    paddingVertical: 50,
  },
  numberItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  numberItemSelected: {
    backgroundColor: "rgba(33, 150, 243, 0.05)",
  },
  numberText: {
    fontSize: 20,
    color: "#888",
    fontFamily: "BYekan",
    textAlign: "center",
  },
  numberTextSelected: {
    fontSize: 24,
    color: "#2196F3",
    // fontWeight: "bold",
  },
  pickerMaskTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    zIndex: 1,
    pointerEvents: "none",
  },
  pickerMaskBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    zIndex: 1,
    pointerEvents: "none",
  },
  centerHighlight: {
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
    pointerEvents: "none",
  },
  timeSeparator: {
    marginHorizontal: 4,
    marginTop: 20,
  },
  timeSeparatorText: {
    fontSize: 22,
    color: "#2196F3",
    fontWeight: "bold",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  setAlarmButton: {
    backgroundColor: "#2196F3",
  },
  removeAlarmButton: {
    backgroundColor: "#F44336",
  },
  disabledButton: {
    backgroundColor: "#B0BEC5",
    opacity: 0.7,
  },
  setAlarmButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "BYekan",
  },
  removeAlarmButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "BYekan",
  },
});

export default AlarmModal;
