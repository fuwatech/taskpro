import React, {
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
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
import EditableColumnInput from "@/components/EditableColumnInput";
import {
  getCellStatus as helperGetCellStatus,
  getStatusColor as helperGetStatusColor,
  shouldShowRed as helperShouldShowRed,
  getStatusIcon as helperGetStatusIcon,
  getStatusIconColor as helperGetStatusIconColor,
} from "@/utils/taskHelpers";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const DailyTab = forwardRef(
  (
    {
      days,
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
      onScroll, // اضافه کردن prop جدید
      isHeaderSticky, // وضعیت چسبندگی هدر
      onHeaderLayout, // برای اندازه‌گیری ارتفاع
    },
    ref,
  ) => {
    const mainScrollRef = useRef(null);
    const verticalScrollRef = useRef(null);
    const scheduleButtonRefs = useRef({});
    const confirmButtonRefs = useRef({});
    const alarmButtonRefs = useRef({});

    // برای مدیریت اسکرول داخلی
    const lastInternalScrollY = useRef(0);

    useImperativeHandle(ref, () => ({
      // توابعی که از خارج قابل دسترسی هستند
      scrollToTop: () => {
        if (verticalScrollRef.current) {
          verticalScrollRef.current.scrollTo({ y: 0, animated: true });
        }
      },
      getScrollPosition: () => {
        return lastInternalScrollY.current;
      },
    }));

    // تابع getVisibleColumnsCount تغییر یافته برای نگه داشتن تعداد ستون‌ها
    const getVisibleColumnsCount = () => {
      // همیشه تعداد کل ستون‌ها را برگردان، نه بر اساس اسکیل
      return Math.min(columns.length, 15); // حداکثر 15 ستون برای نمایش
    };

    const getVisibleColumns = () => {
      const visibleCount = getVisibleColumnsCount();
      return columns.slice(0, visibleCount);
    };

    // تابع برای تنظیم فونت سایز بر اساس اسکیل
    const getFontSize = (baseSize) => {
      return Math.max(baseSize * 0.8, baseSize * scale * 0.9);
    };

    const calculateDailyPercentage = (day) => {
      // فقط ستون‌های قابل مشاهده (visibleColumns) را در نظر بگیر
      const visibleTaskColumns = visibleColumns.filter(
        (col) => col.type === "task" && col.finalized,
      );

      if (visibleTaskColumns.length === 0) return 0;

      let completedCount = 0;
      let totalCount = 0;

      visibleTaskColumns.forEach((col) => {
        const status = day.completed[col.id];
        const isScheduled = day.scheduled[col.id];

        // فقط اگر تسک برای این روز زمان‌بندی شده یا وضعیت future یا completed دارد
        if (
          isScheduled === true ||
          status === "future" ||
          status === "completed"
        ) {
          totalCount++;

          // بررسی تسک‌های سروری
          if (col.isFromServer) {
            // برای تسک‌های سروری، بررسی وضعیت انجام شدن
            if (typeof day.serverIsDone === "object") {
              // اگر serverIsDone یک آبجکت است، وضعیت این ستون خاص را بررسی کن
              if (day.serverIsDone[col.id] === true) {
                completedCount++;
              } else if (status === "completed") {
                completedCount++;
              }
            } else if (day.serverIsDone === true) {
              // اگر boolean ساده است
              completedCount++;
            } else if (status === "completed") {
              completedCount++;
            }
          } else if (status === "completed") {
            // برای تسک‌های محلی
            completedCount++;
          }
        }
      });

      if (totalCount === 0) return 0;

      const percentage = Math.round((completedCount / totalCount) * 100);

      // برای دیباگ
      console.log(
        `Day ${day.displayDate}: ${completedCount}/${totalCount} = ${percentage}%`,
      );

      return percentage;
    };

    // Use shared helpers
    const getCellStatus = helperGetCellStatus;
    const getStatusColor = helperGetStatusColor;
    const shouldShowRed = helperShouldShowRed;
    const getStatusIcon = helperGetStatusIcon;
    const getStatusIconColor = helperGetStatusIconColor;

    // تابع getColumnHeaderWidth تغییر یافته برای تنظیم بر اساس اسکیل
    const getColumnHeaderWidth = () => {
      const baseSize = 120; // افزایش سایز پایه
      return baseSize * scale;
    };

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

    // تابع برای هندل کردن کلیک روی سلول
    const handleTaskCellPress = (dayId, columnId, isDisabled) => {
      if (!isDisabled) {
        handleCellPress(dayId, columnId, false);
      }
    };

    // تابع handleInternalScroll برای اسکرول داخلی
    const handleInternalScroll = useCallback(
      (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        lastInternalScrollY.current = currentScrollY;

        // اطلاع به کامپوننت والد در صورت نیاز
        if (onScroll) {
          onScroll(currentScrollY);
        }
      },
      [onScroll],
    );

    const visibleColumns = getVisibleColumns();
    const columnWidth = getColumnHeaderWidth();
    const baseSquareSize = 50;
    const scaledSquareSize = baseSquareSize * scale;

    return (
      <View style={styles.tableContainer}>
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
              scrollEventThrottle={16}
              decelerationRate="fast"
              overScrollMode="always"
              bounces={true}
              alwaysBounceHorizontal={true}
              persistentScrollbar={true}
            >
              <View style={styles.fullWidthContainer}>
                <View
                  style={[
                    styles.headerRow,
                    {
                      height: 80 * scale,
                      // position: isHeaderSticky ? "absolute" : "relative",
                      // top: isHeaderSticky ? 0 : undefined,
                      // left: 0,
                      // right: 0,
                      // zIndex: isHeaderSticky ? 1000 : 1,
                      // backgroundColor: isHeaderSticky ? "#fff" : "transparent",
                      // borderBottomWidth: isHeaderSticky ? 1 : 0,
                      // borderBottomColor: "#e0e0e0",
                    },
                  ]}
                  onLayout={onHeaderLayout}
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
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.headerText,
                        {
                          fontSize: getFontSize(11),
                          fontFamily: "BYekan",
                        },
                      ]}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.7}
                    >
                      درصد روزانه
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
                                    true,
                                  );
                                  setEditingColumn(null);
                                }}
                                onEndEditing={() => {
                                  if (column.name.trim() === "") {
                                    updateColumnName(
                                      column.id,
                                      "عنوان جدید",
                                      true,
                                    );
                                  } else {
                                    updateColumnName(
                                      column.id,
                                      column.name,
                                      true,
                                    );
                                  }
                                  setEditingColumn(null);
                                }}
                                onBlur={() => {
                                  if (column.name.trim() === "") {
                                    updateColumnName(
                                      column.id,
                                      "عنوان جدید",
                                      true,
                                    );
                                  } else {
                                    updateColumnName(
                                      column.id,
                                      column.name,
                                      true,
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
                                          fontSize: getFontSize(9),
                                          fontFamily: "BYekan",
                                          width: "100%",
                                        },
                                      ]}
                                      numberOfLines={1}
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
                                                      scale * 0.8,
                                                    ),
                                                  },
                                                ],
                                                padding: 6,
                                                minWidth: Math.max(
                                                  30,
                                                  35 * scale,
                                                ),
                                                minHeight: Math.max(
                                                  30,
                                                  35 * scale,
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
                                                      scale * 0.8,
                                                    ),
                                                  },
                                                ],
                                                padding: 6,
                                                minWidth: Math.max(
                                                  30,
                                                  35 * scale,
                                                ),
                                                minHeight: Math.max(
                                                  30,
                                                  35 * scale,
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
                                                    scale * 0.8,
                                                  ),
                                                },
                                              ],
                                              padding: 6,
                                              minWidth: Math.max(
                                                30,
                                                35 * scale,
                                              ),
                                              minHeight: Math.max(
                                                30,
                                                35 * scale,
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

                <View
                  style={[
                    styles.contentContainer,
                    // { marginTop: isHeaderSticky ? 80 * scale : 0 },
                  ]}
                >
                  <ScrollView
                    ref={verticalScrollRef}
                    showsVerticalScrollIndicator={true}
                    style={{
                      height: screenHeight * 0.7,
                    }}
                    nestedScrollEnabled={true}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    overScrollMode="always"
                    bounces={true}
                    alwaysBounceVertical={true}
                    persistentScrollbar={true}
                    onScroll={handleInternalScroll}
                  >
                    {days.map((day) => {
                      const dailyPercentage = calculateDailyPercentage(day);
                      const percentageColor =
                        getPercentageColor(dailyPercentage);

                      return (
                        <View
                          key={day.id}
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
                                        rotate: `${dailyPercentage * 3.6}deg`,
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

                          <View style={styles.tasksContentContainer}>
                            {visibleColumns.map((column) => {
                              const status = getCellStatus(
                                day,
                                column.id,
                                column,
                              );
                              const taskTime = day.taskTime[column.id];
                              const isColumnFinalized = column.finalized;
                              const isPastDay = day.isPast;
                              const shouldBeRed = shouldShowRed(
                                day,
                                column.id,
                                column,
                              );
                              const statusColor = getStatusColor(
                                status,
                                day,
                                column.id,
                                column,
                              );

                              // برای ستون‌های سروری، بررسی دقیق‌تر
                              const isDisabled = column.isFromServer
                                ? false // ستون‌های سروری همیشه فعال هستند
                                : (isColumnFinalized && !day.isToday) ||
                                  isPastDay;

                              // بررسی اینکه آیا این ستون خاص در سرور انجام شده
                              const isServerDoneForThisColumn =
                                column.isFromServer &&
                                typeof day.serverIsDone === "object"
                                  ? day.serverIsDone[column.id]
                                  : day.serverIsDone;

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
                                    },
                                  ]}
                                >
                                  <Pressable
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
                                        opacity: isDisabled ? 0.5 : 1,
                                        width: columnWidth - 20,
                                        height: scaledSquareSize,
                                      },
                                    ]}
                                    onPress={() =>
                                      handleTaskCellPress(
                                        day.id,
                                        column.id,
                                        isDisabled,
                                      )
                                    }
                                    disabled={isDisabled}
                                    hitSlop={{
                                      top: 5,
                                      bottom: 5,
                                      left: 5,
                                      right: 5,
                                    }}
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
                                              color: isPastDay
                                                ? "#666666"
                                                : "#FFFFFF",
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
                                        color={
                                          isPastDay ? "#666666" : "#FFFFFF"
                                        }
                                        style={styles.bulbIcon}
                                      />
                                    </View>
                                  </Pressable>
                                </View>
                              );
                            })}
                          </View>

                          <View
                            style={[
                              styles.cell,
                              styles.dayCell,
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
                                day.isToday && styles.istitleOval,
                                day.isPast && styles.pastDayOval,
                                {
                                  paddingHorizontal: Math.max(8, 12 * scale),
                                  paddingVertical: Math.max(4, 6 * scale),
                                },
                              ]}
                            >
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
      </View>
    );
  },
);

const styles = StyleSheet.create({
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
  contentContainer: {
    flex: 1,
    // حذف marginTop
  },
  headerRow: {
    flexDirection: "row-reverse",
    zIndex: 10,
    paddingHorizontal: 4,
    backgroundColor: "#fff", // پس‌زمینه سفید برای هدر جدول
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    // حذف position و shadow
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 4,
    paddingVertical: 8,
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
    backgroundColor: "#fff",
    minHeight: 50,
    width: "100%",
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    padding: 10,
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
    padding: 10,
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
    padding: 10,
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
  squareContainer: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    position: "relative",
    width: 100,
    height: 100,
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

export default DailyTab;
