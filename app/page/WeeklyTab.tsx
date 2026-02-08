import React, { useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import EditableColumnInput from "@/components/EditableColumnInput";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  getCellStatus as helperGetCellStatus,
  getStatusColor as helperGetStatusColor,
  shouldShowRed as helperShouldShowRed,
  getStatusIcon as helperGetStatusIcon,
  getStatusIconColor as helperGetStatusIconColor,
} from "@/utils/taskHelpers";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const WeeklyTab = ({
  weeks,
  columns,
  scale,
  lastScale,
  setScale,
  setLastScale,
  editingColumn,
  setEditingColumn,
  handleCellPress,
  showScheduleTutorial,
  showConfirmTutorial,
  showAlarmTutorial,
  openAlarmModal,
  finalizeColumn,
  updateColumnName,
  toPersianNumbers,
  getPercentageColor,
  selectedColumnForAlarm,
  setSelectedColumnForSchedule,
  setScheduleModalVisible,
  showTutorial,
  updateCellStatusSafely,
}) => {
  const mainScrollRef = useRef(null);
  const scheduleButtonRefs = useRef({});
  const confirmButtonRefs = useRef({});
  const alarmButtonRefs = useRef({});

  // ایجاد gesture pinch با استفاده از API جدید
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      // ذخیره scale فعلی به عنوان نقطه شروع
    })
    .onUpdate((event) => {
      const newScale = lastScale * event.scale;
      const clampedScale = Math.max(0.5, Math.min(3, newScale));
      setScale(clampedScale);
    })
    .onEnd(() => {
      // ذخیره scale نهایی برای استفاده در gesture بعدی
      setLastScale(scale);
    });

  // ترکیب gestureها در صورت نیاز
  const composedGesture = Gesture.Simultaneous(pinchGesture);

  const getVisibleColumnsCount = () => {
    if (scale <= 0.7) return Math.min(columns.length, 10);
    if (scale <= 0.9) return Math.min(columns.length, 7);
    if (scale <= 1.1) return Math.min(columns.length, 5);
    if (scale <= 1.5) return Math.min(columns.length, 3);
    return Math.min(columns.length, 2);
  };

  const getVisibleColumns = () => {
    const visibleCount = getVisibleColumnsCount();
    return columns.slice(0, visibleCount);
  };

  // تابع محاسبه درصد هفتگی
  const calculateWeeklyPercentage = (week) => {
    // تمام ستون‌های نهایی شده (چه editable و چه غیر editable)
    const taskColumns = columns.filter(
      (col) => col.type === "task" && col.finalized
    );

    if (taskColumns.length === 0) return 0;

    let completedCount = 0;
    let totalCount = 0;

    taskColumns.forEach((col) => {
      const status = week.completed[col.id];
      const isScheduled = week.scheduled[col.id];

      // فقط هفته‌هایی که تسک برای آنها برنامه‌ریزی شده را محاسبه کن
      if (
        isScheduled === true ||
        status === "future" ||
        status === "completed"
      ) {
        totalCount++;

        // اگر ستون از سرور است
        if (col.isFromServer) {
          if (week.serverIsDone && typeof week.serverIsDone === "object") {
            if (week.serverIsDone[col.id] === true) {
              completedCount++;
            }
          } else if (status === "completed") {
            completedCount++;
          }
        } else if (status === "completed") {
          completedCount++;
        }
      }
    });

    if (totalCount === 0) return 0;

    return Math.round((completedCount / totalCount) * 100);
  };

  // Use shared helpers
  const getCellStatus = helperGetCellStatus;
  const getStatusColor = helperGetStatusColor;
  const shouldShowRed = helperShouldShowRed;
  const getStatusIcon = helperGetStatusIcon;
  const getStatusIconColor = helperGetStatusIconColor;

  const getColumnHeaderWidth = () => {
    const baseSize = 80;
    return baseSize * scale + 10;
  };

  // تابع برای هندل کردن کلیک روی محیط اطراف
  const handleOutsidePress = useCallback(() => {
    if (editingColumn) {
      const column = columns.find((col) => col.id === editingColumn);
      if (column) {
        if (column.name.trim() === "") {
          updateColumnName(editingColumn, "عنوان جدید", true);
        } else {
          updateColumnName(editingColumn, column.name, true);
        }
      }
      setEditingColumn(null);
    }
  }, [editingColumn, columns, updateColumnName]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>هیچ برنامه‌ای ایجاد نشده است</Text>
      <Text style={styles.emptyStateSubText}>
        برای ایجاد برنامه جدید، روی دکمه + در تب‌ها کلیک کنید
      </Text>
    </View>
  );

  const visibleColumns = getVisibleColumns();
  const columnWidth = getColumnHeaderWidth();
  const baseSquareSize = 50;
  const scaledSquareSize = baseSquareSize * scale;

  return (
    <KeyboardAwareScrollView style={{ flex: 1 }}>
      <Pressable style={styles.tableContainer} onPress={handleOutsidePress}>
        <View style={styles.tableContainerInner}>
          {columns.length === 0 ? (
            renderEmptyState()
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              ref={mainScrollRef}
              contentContainerStyle={{
                flexDirection: "row-reverse",
                minWidth: screenWidth,
                paddingHorizontal: 8,
              }}
            >
              <View style={styles.fullWidthContainer}>
                <View style={[styles.headerRow, { height: 60 * scale }]}>
                  <View
                    style={[
                      styles.titleOval3,
                      {
                        paddingStart: Math.max(4, 6 * scale),
                        paddingEnd: Math.max(4, 6 * scale),
                        marginStart: Math.max(10, 20 * scale),
                        marginEnd: 8,
                        minWidth: Math.max(60, 100 * scale),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.headerText,
                        {
                          fontSize: Math.max(8, 11 * scale),
                          fontFamily: "BYekan",
                        },
                      ]}
                    >
                      درصد هفتگی
                    </Text>
                  </View>

                  <View style={styles.tasksHeaderContainer}>
                    {visibleColumns.map((column) => {
                      const scaledSize = getColumnHeaderWidth();

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
                            },
                          ]}
                        >
                          {editingColumn === column.id && column.editable ? (
                            <View
                              style={[
                                styles.columnInputContainer,
                                { width: scaledSize },
                              ]}
                            >
                              <EditableColumnInput
                                value={column.name}
                                onChangeText={(text) => {
                                  updateColumnName(column.id, text);
                                }}
                                onSubmitEditing={() => {
                                  updateColumnName(
                                    column.id,
                                    column.name,
                                    true
                                  );
                                  setEditingColumn(null);
                                }}
                                onEndEditing={() => {
                                  if (column.name.trim() === "") {
                                    updateColumnName(
                                      column.id,
                                      "عنوان جدید",
                                      true
                                    );
                                  } else {
                                    updateColumnName(
                                      column.id,
                                      column.name,
                                      true
                                    );
                                  }
                                  setEditingColumn(null);
                                }}
                                onBlur={() => {
                                  if (column.name.trim() === "") {
                                    updateColumnName(
                                      column.id,
                                      "عنوان جدید",
                                      true
                                    );
                                  } else {
                                    updateColumnName(
                                      column.id,
                                      column.name,
                                      true
                                    );
                                  }
                                  setEditingColumn(null);
                                }}
                                autoFocus={true}
                                scale={scale}
                                customStyle={[
                                  styles.columnInput,
                                  {
                                    textAlign: "center",
                                    fontSize: Math.max(8, 10 * scale),
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
                                { direction: "rtl" },
                              ]}
                            >
                              <Pressable
                                style={[
                                  styles.columnHeader,
                                  { width: scaledSize },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.titleOval2,
                                    {
                                      paddingHorizontal: Math.max(6, 8 * scale),
                                      paddingVertical: Math.max(1, 1 * scale),
                                      width: "100%",
                                      minHeight: 50,
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
                                          fontSize: Math.max(8, 9 * scale),
                                          fontFamily: "BYekan",
                                          width: "100%",
                                        },
                                      ]}
                                      numberOfLines={1}
                                      ellipsizeMode="tail"
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
                                          marginTop: 4,
                                        },
                                      ]}
                                    >
                                      {!column.finalized ? (
                                        <>
                                          <TouchableOpacity
                                            ref={(ref) =>
                                              (confirmButtonRefs.current[
                                                column.id
                                              ] = ref)
                                            }
                                            style={[
                                              styles.finalizeButton,
                                              {
                                                marginHorizontal: 6,
                                                transform: [
                                                  {
                                                    scale: Math.max(
                                                      1,
                                                      scale * 0.8
                                                    ),
                                                  },
                                                ],
                                                padding: 6,
                                                minWidth: Math.max(
                                                  30,
                                                  35 * scale
                                                ),
                                                minHeight: Math.max(
                                                  30,
                                                  35 * scale
                                                ),
                                                justifyContent: "center",
                                                alignItems: "center",
                                              },
                                            ]}
                                            onPress={() =>
                                              finalizeColumn(column.id)
                                            }
                                          >
                                            <Ionicons
                                              name="checkmark-circle"
                                              size={Math.max(18, 22 * scale)}
                                              color="#4CAF50"
                                            />
                                          </TouchableOpacity>

                                          <TouchableOpacity
                                            ref={(ref) =>
                                              (scheduleButtonRefs.current[
                                                column.id
                                              ] = ref)
                                            }
                                            style={[
                                              styles.scheduleButton,
                                              {
                                                marginHorizontal: 6,
                                                transform: [
                                                  {
                                                    scale: Math.max(
                                                      1,
                                                      scale * 0.8
                                                    ),
                                                  },
                                                ],
                                                padding: 6,
                                                minWidth: Math.max(
                                                  30,
                                                  35 * scale
                                                ),
                                                minHeight: Math.max(
                                                  30,
                                                  35 * scale
                                                ),
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
                                                  column.id
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
                                            (alarmButtonRefs.current[
                                              column.id
                                            ] = ref)
                                          }
                                          style={[
                                            styles.finalizedIndicator,
                                            {
                                              transform: [
                                                {
                                                  scale: Math.max(
                                                    1,
                                                    scale * 0.8
                                                  ),
                                                },
                                              ],
                                              padding: 6,
                                              minWidth: Math.max(
                                                30,
                                                35 * scale
                                              ),
                                              minHeight: Math.max(
                                                30,
                                                35 * scale
                                              ),
                                              justifyContent: "center",
                                              alignItems: "center",
                                            },
                                          ]}
                                          onPress={() =>
                                            openAlarmModal(column.id)
                                          }
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
                  </View>
                </View>

                <View style={styles.contentContainer}>
                  <ScrollView
                    showsVerticalScrollIndicator={true}
                    style={{ height: screenHeight * 0.7 }}
                  >
                    {weeks.map((week) => {
                      const weeklyPercentage = calculateWeeklyPercentage(week);
                      const percentageColor =
                        getPercentageColor(weeklyPercentage);

                      // تعیین رنگ برای هفته‌های گذشته
                      const isPastWeek = week.isPast;
                      const weekTitleColor = isPastWeek ? "#F44336" : "#333";
                      const weekOvalBackgroundColor = isPastWeek
                        ? "rgba(255, 200, 200, 0.33)"
                        : week.isCurrent
                        ? "rgba(255, 255, 255, 0.33)"
                        : "rgba(255, 255, 255, 0.33)";
                      const weekOvalBorderColor = isPastWeek
                        ? "#FF9999"
                        : week.isCurrent
                        ? "#207adbff"
                        : "#FFFFFF";

                      return (
                        <View
                          key={week.id}
                          style={[
                            styles.row,
                            {
                              height: Math.max(60, 80 * scale),
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.cell,
                              styles.percentageCell,
                              {
                                marginStart: Math.max(10, 20 * scale),
                                marginEnd: 8,
                                minWidth: Math.max(60, 100 * scale),
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
                                      {
                                        rotate: `${weeklyPercentage * 3.6}deg`,
                                      },
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
                                    fontSize: Math.max(8, 10 * scale),
                                    color: percentageColor,
                                    fontFamily: "BYekan",
                                  },
                                ]}
                              >
                                {toPersianNumbers(weeklyPercentage)}%
                              </Text>
                            </View>
                          </View>

                          <View style={styles.tasksContentContainer}>
                            {visibleColumns.map((column) => {
                              const status = getCellStatus(
                                week,
                                column.id,
                                column
                              );
                              const taskTime = week.taskTime[column.id];
                              const isColumnFinalized = column.finalized;
                              const isPastWeekFlag = week.isPast;
                              const shouldBeRed = shouldShowRed(
                                week,
                                column.id,
                                column
                              );
                              const statusColor = getStatusColor(
                                status,
                                week,
                                column.id,
                                column
                              );

                              return (
                                <TouchableOpacity
                                  key={column.id}
                                  style={[
                                    styles.cell,
                                    styles.taskCell,
                                    {
                                      minWidth: columnWidth,
                                      width: columnWidth,
                                      marginLeft: 4,
                                      marginRight: 4,
                                    },
                                  ]}
                                  onPress={() =>
                                    handleCellPress(week.id, column.id, true)
                                  }
                                  disabled={
                                    (isColumnFinalized &&
                                      !week.isCurrent &&
                                      !column.isFromServer) ||
                                    (isPastWeekFlag && !column.isFromServer)
                                  }
                                >
                                  <View
                                    style={[
                                      styles.squareContainer,
                                      {
                                        backgroundColor: statusColor,
                                        borderWidth:
                                          status === "future" && !shouldBeRed
                                            ? 2
                                            : 0,
                                        borderColor:
                                          status === "future" && !shouldBeRed
                                            ? "#1976D2"
                                            : "transparent",
                                        opacity:
                                          (isColumnFinalized &&
                                            !week.isCurrent) ||
                                          isPastWeekFlag
                                            ? 0.5
                                            : 1,
                                        width: columnWidth - 20,
                                        height: scaledSquareSize,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.statusIcon,
                                        {
                                          color: getStatusIconColor(
                                            status,
                                            shouldBeRed,
                                            isPastWeekFlag
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
                                              color: isPastWeekFlag
                                                ? "#666666"
                                                : "#FFFFFF",
                                              fontSize: Math.max(6, 8 * scale),
                                              fontFamily: "BYekan",
                                            },
                                          ]}
                                        >
                                          {toPersianNumbers(taskTime)}
                                        </Text>
                                      )}
                                      <Ionicons
                                        name="bulb"
                                        size={Math.max(8, 10 * scale)}
                                        color={
                                          isPastWeekFlag ? "#666666" : "#FFFFFF"
                                        }
                                        style={styles.bulbIcon}
                                      />
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <View
                            style={[
                              styles.cell,
                              styles.weekCell,
                              {
                                minWidth: Math.max(80, 120 * scale),
                                marginStart: 8,
                                marginEnd: 8,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.titleOval,
                                {
                                  backgroundColor: weekOvalBackgroundColor,
                                  borderColor: weekOvalBorderColor,
                                  paddingHorizontal: Math.max(8, 12 * scale),
                                  paddingVertical: Math.max(4, 6 * scale),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.weekTitleText,
                                  {
                                    color: weekTitleColor,
                                    fontSize: Math.max(9, 11 * scale),
                                    fontFamily: "BYekan",
                                  },
                                ]}
                              >
                                {week.displayTitle}
                              </Text>
                              <View style={styles.weekDaysContainer}>
                                {week.days &&
                                  week.days.map((day) => {
                                    // تعیین رنگ روزها بر اساس وضعیت هفته
                                    const dayBackgroundColor = isPastWeek
                                      ? "#FF9999"
                                      : day.isCurrentDay
                                      ? "#2196F3"
                                      : "#E0E0E0";

                                    const dayTextColor = isPastWeek
                                      ? "#F44336"
                                      : day.isCurrentDay
                                      ? "#fff"
                                      : "#666";

                                    const dayBorderColor = isPastWeek
                                      ? "#FF9999"
                                      : "#FFFFFF";

                                    return (
                                      <View
                                        key={day.id}
                                        style={[
                                          styles.dayOval,
                                          {
                                            backgroundColor: dayBackgroundColor,
                                            borderColor: dayBorderColor,
                                            width: Math.max(12, 15 * scale),
                                            height: Math.max(12, 15 * scale),
                                          },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.tinyDayNumber,
                                            {
                                              color: dayTextColor,
                                              fontSize: Math.max(5, 6 * scale),
                                              fontFamily: "BYekan",
                                            },
                                          ]}
                                        >
                                          {toPersianNumbers(day.dayNumber)}
                                        </Text>
                                      </View>
                                    );
                                  })}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Pressable>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  tableContainer: {
    flex: 1,
    backgroundColor: "rgba(234, 244, 254, 1)",
    paddingHorizontal: 4,
  },
  tableContainerInner: {
    flex: 1,
  },
  fullWidthContainer: {
    flex: 1,
    minWidth: screenWidth - 16,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row-reverse",
    zIndex: 10,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tasksHeaderContainer: {
    flexDirection: "row-reverse",
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 4,
  },
  tasksContentContainer: {
    flexDirection: "row-reverse",
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 4,
  },
  headerCell: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 4,
  },
  cell: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  weekCell: {
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
    minHeight: 80,
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
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    minHeight: 50,
    width: "100%",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  columnNameRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    minHeight: 20,
    marginBottom: 2,
    paddingVertical: 4,
  },
  columnActionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    minHeight: 24,
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
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  titleOval3: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  headerText: {
    textAlign: "center",
    color: "rgba(82, 15, 15, 1)",
    fontFamily: "BYekan",
  },
  weekTitleText: {
    textAlign: "center",
    fontFamily: "BYekan",
  },
  squareContainer: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    position: "relative",
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
  bulbIcon: {},
  circleContainer: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
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
  weekDaysContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 4,
  },
  dayOval: {
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
    borderWidth: 1,
  },
  tinyDayNumber: {
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
});

export default WeeklyTab;
