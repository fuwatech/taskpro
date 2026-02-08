// فایل axios.js را اصلاح کنید
import axios from "axios";

const instance = axios.create({
  baseURL: "http://194.5.188.40:8042", // فقط یک بار http://
  timeout: 10000,
});

export default instance;
