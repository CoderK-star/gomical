# Gomical (ゴミカル)

ごみ収集日をカレンダーで管理し、通知でお知らせするクロスプラットフォームアプリ。

## Features

- ごみ収集カレンダー（月表示 / 週表示）
- プッシュ通知（前日夜 / 当日朝）
- 複数自治体対応
- 分別検索
- マスコットキャラクター
- ダークモード
- 多言語対応（日本語 / English）

## Tech Stack

- **Framework**: React Native (Expo SDK 54)
- **Language**: TypeScript
- **Navigation**: Expo Router
- **State**: Zustand + AsyncStorage
- **Notifications**: expo-notifications

## Setup

```bash
npm install
npx expo start
```

## Project Structure

```
app/             Expo Router screens
src/
  components/    Reusable UI components
  data/          Municipality JSON data
  hooks/         Custom React hooks
  i18n/          Internationalization
  services/      Business logic
  store/         Zustand stores
  theme/         Design tokens & theme
  types/         TypeScript definitions
  utils/         Utility functions
assets/          Images, fonts, mascot art
docs/            Legal documents
scripts/         Data conversion tools
```

## License

All rights reserved.
