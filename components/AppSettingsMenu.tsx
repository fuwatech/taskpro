import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useLinkTo } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AppSettingsMenu: React.FC = () => {
  const linkTo = useLinkTo();
  const [showExitModal, setShowExitModal] = useState(false);

  const handleExit = () => {
    setShowExitModal(true);
  };

  const handleExitConfirm = async () => {
    try {
      await AsyncStorage.removeItem("UserInfo");
      console.log("تمام داده‌های ذخیره شده پاک شدند.");
      setShowExitModal(false);
      linkTo("/");
    } catch (error) {
      console.error("خطا در پاک کردن داده‌ها:", error);
      // در صورت نیاز می‌توانید Modal دیگری برای خطا ایجاد کنید
    }
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
  };

  // تابع‌های دیگر منوها
  const handleAccountPress = () => {
    // linkTo("/account");
  };

  const handleNotificationsPress = () => {
    // linkTo("/notifications");
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.section}>
        <Text style={[styles.textBase, styles.sectionTitle]}>تنظیمات</Text>

        {/* آیتم حساب کاربری */}
        <MenuItem
          title="حساب کاربری"
          description="تلفن، ایمیل،..."
          // imageUrl={require("../assets/images/account-icon.png")}
          onPress={handleAccountPress}
        />

        {/* آیتم اعلان‌ها */}
        <MenuItem
          title="نوتیفیکیشن"
          description="مدیریت، ریست، ..."
          // imageUrl={require("../assets/images/notification-icon.png")}
          onPress={handleNotificationsPress}
        />

        {/* آیتم خروج */}
        <MenuItem
          title="خروج"
          description="خروج از برنامه "
          // imageUrl={require("../assets/images/exit-icon.png")}
          onPress={handleExit}
        />
      </View>

      {/* Modal برای تایید خروج */}
      <Modal
        visible={showExitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleExitCancel}
      >
        <TouchableWithoutFeedback onPress={handleExitCancel}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>خروج</Text>
                </View>
                <View style={styles.modalBody}>
                  <Text style={styles.modalMessage}>
                    مطمئن هستید که می‌خواهید خارج شوید؟
                  </Text>
                </View>
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleExitCancel}
                  >
                    <Text style={styles.cancelButtonText}>لغو</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.exitButton]}
                    onPress={handleExitConfirm}
                  >
                    <Text style={styles.exitButtonText}>خروج</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// کامپوننت MenuItem
const MenuItem: React.FC<{
  title: string;
  description: string;
  imageUrl: any;
  onPress(): void;
}> = ({ title, description, imageUrl, onPress }) => {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.iconContainer}>
        <View style={styles.circle}>
          <Image source={imageUrl} style={styles.image} />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.textBase, styles.menuTitle]}>{title}</Text>
        <Text style={[styles.textBase, styles.menuDescription]}>
          {description}
        </Text>
      </View>
      <Image
        source={require("../assets/images/arrow-right.png")}
        style={styles.iconRight}
      />
    </TouchableOpacity>
  );
};

// استایل‌ها
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  divider: {
    height: 4,
    backgroundColor: "#C4C4C6",
    marginBottom: 20,
    alignSelf: "center",
    borderRadius: 10,
    width: 45,
  },
  section: {
    marginBottom: 24,
    marginLeft: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 42,
    backgroundColor: "rgba(0, 89, 172, 1)",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 24,
    height: 24,
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
    marginLeft: 8,
  },
  textBase: {
    color: "#13141A",
    fontFamily: "BYekan",
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  menuDescription: {
    fontSize: 12,
    color: "#ACACAC",
  },
  iconRight: {
    width: 24,
    height: 24,
    transform: [{ rotate: "180deg" }],
  },
  // استایل‌های Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#13141A",
    fontFamily: "BYekan",
  },
  modalBody: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BYekan",
  },
  modalFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  modalButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: "#F0F0F0",
  },
  exitButton: {
    backgroundColor: "#FF3B30",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontFamily: "BYekan",
  },
  exitButtonText: {
    fontSize: 16,
    color: "white",
    fontFamily: "BYekan",
  },
});

export default AppSettingsMenu;
