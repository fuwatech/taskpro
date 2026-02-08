import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  clickPosition?: { x: number; y: number };
  buttonText?: string;
  icon?: any;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  title,
  description,
  clickPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 },
  buttonText = "متوجه شدم",
  icon,
}) => {
  const fadeAnim = useRef(new Animated.Value(0.8)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, slideAnim]);

  const calculateModalPosition = () => {
    const MODAL_WIDTH = SCREEN_WIDTH * 0.85;
    const MODAL_HEIGHT = icon ? 280 : 240;

    let left = (SCREEN_WIDTH - MODAL_WIDTH) / 2;
    let top = (SCREEN_HEIGHT - MODAL_HEIGHT) / 2;

    if (clickPosition && clickPosition.x !== SCREEN_WIDTH / 2) {
      left = clickPosition.x - MODAL_WIDTH / 2;
      top = clickPosition.y + 30;

      if (left < 15) left = 15;
      if (left + MODAL_WIDTH > SCREEN_WIDTH - 15) {
        left = SCREEN_WIDTH - MODAL_WIDTH - 15;
      }

      if (top + MODAL_HEIGHT > SCREEN_HEIGHT - 80) {
        top = clickPosition.y - MODAL_HEIGHT - 30;
      }

      if (top < 50) {
        top = 50;
      }
    }

    return { left, top };
  };

  const position = calculateModalPosition();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* مودال */}
          <Animated.View
            style={[
              styles.modalContainer,
              {
                left: position.left,
                top: position.top,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
                direction: "rtl",
              },
            ]}
          >
            <View style={styles.content}>
              {/* هدر مودال */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <View style={styles.titleContainer}>
                    {icon && (
                      <Image
                        source={icon}
                        style={styles.icon}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={styles.title}>{title}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={24} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* بدنه مودال */}
              <View style={styles.body}>
                <Text style={styles.description}>{description}</Text>
              </View>

              {/* فوتر مودال */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.button}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText}>{buttonText}</Text>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>
              </View>

              {/* پیکان جهت‌نما */}
              {clickPosition && clickPosition.x !== SCREEN_WIDTH / 2 && (
                <View
                  style={[
                    styles.arrow,
                    {
                      top:
                        position.top > clickPosition.y
                          ? -10
                          : SCREEN_HEIGHT * 0.85,
                      left: clickPosition.x - position.left - 10,
                      transform: [
                        {
                          rotate:
                            position.top > clickPosition.y ? "45deg" : "225deg",
                        },
                      ],
                    },
                  ]}
                />
              )}
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 15,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: "rgba(33, 150, 243, 0.1)",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  headerContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  icon: {
    width: 30,
    height: 30,
    marginLeft: 10,
  },
  title: {
    fontSize: 18,
    color: "#2196F3",
    textAlign: "right",
    fontFamily: "BYekan",
    lineHeight: 28,
    flex: 1,
    fontWeight: "normal", // اصلاح: حذف fontWeight یا تنظیم به normal
  },
  closeButton: {
    padding: 5,
    marginLeft: 10,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    minHeight: 90,
  },
  description: {
    fontSize: 15,
    color: "#555",
    lineHeight: 26,
    textAlign: "left",
    fontFamily: "BYekan",
    fontWeight: "normal", // اصلاح: حذف fontWeight یا تنظیم به normal
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 35,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 140,
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    fontFamily: "BYekan",
    marginLeft: 8,
    fontWeight: "normal", // اصلاح: حذف fontWeight یا تنظیم به normal
  },
  buttonIcon: {
    marginRight: 4,
  },
  arrow: {
    position: "absolute",
    width: 24,
    height: 24,
    backgroundColor: "#fff",
    transform: [{ rotate: "45deg" }],
    borderRadius: 4,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0, 0, 0, 0.1)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
});

export default CustomModal;
