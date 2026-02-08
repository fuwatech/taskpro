const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// اضافه کردن support برای فایل‌های صوتی
config.resolver.assetExts.push(
  'mp3',
  'wav',
  'aiff',
  'caf',
  'm4a'
);

module.exports = config;