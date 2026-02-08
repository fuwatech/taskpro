import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

const ScheduleModal = ({
  visible,
  onClose,
  activeTab,
  selectedColumnForSchedule,
  handleScheduleSelection,
}) => {
  // بررسی که آیا ستون انتخاب شده است
  if (!selectedColumnForSchedule) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { direction: "rtl" }]}>
          <TouchableOpacity
            style={[styles.modalCloseButton, { left: "auto", right: 8 }]}
            onPress={onClose}
            accessibilityLabel="بستن"
          >
            <Ionicons name="close" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>انتخاب نوع زمان‌بندی</Text>

          <View style={styles.scheduleOptionsContainer}>
            <TouchableOpacity
              style={styles.scheduleOption}
              onPress={() => {
                handleScheduleSelection(selectedColumnForSchedule, "all");
                onClose();
              }}
            >
              <Text style={styles.scheduleOptionText}>
                همه {activeTab === "daily" ? "روزهای آینده" : "هفته‌ها"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scheduleOption}
              onPress={() => {
                handleScheduleSelection(selectedColumnForSchedule, "even");
                onClose();
              }}
            >
              <Text style={styles.scheduleOptionText}>
                {activeTab === "daily" ? "روزهای زوج" : "هفته‌های زوج"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scheduleOption}
              onPress={() => {
                handleScheduleSelection(selectedColumnForSchedule, "alternate");
                onClose();
              }}
            >
              <Text style={styles.scheduleOptionText}>یکی در میان</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>انصراف</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    width: Math.min(320, screenWidth - 40),
    maxWidth: 320,
    alignItems: "center",
    alignSelf: "center",
    marginHorizontal: 20,
    marginTop: 50,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    maxHeight: "65%",
    transform: [{ scale: 0.85 }],
  },
  modalCloseButton: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 20,
    padding: 6,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 12,
    
    marginBottom: 15,
    textAlign: "center",
    fontFamily: "BYekan",
  },
  scheduleOptionsContainer: {
    width: "100%",
    marginBottom: 15,
  },
  scheduleOption: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    marginVertical: 4,
    alignItems: "center",
  },
  scheduleOptionText: {
    fontSize: 14,
    color: "#333",
   
    fontFamily: "BYekan",
  },
  modalButton: {
    padding: 10,
    borderRadius: 6,
    marginVertical: 4,
    width: "100%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#9E9E9E",
  },
  modalButtonText: {
    color: "white",
    fontSize: 14,
   
    fontFamily: "BYekan",
  },
});

export default ScheduleModal;
