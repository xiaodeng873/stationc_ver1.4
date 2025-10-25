# Station C Android 平板應用程式

## 快速開始

```bash
cd mobile-app
npm install
npm start
```

然後:
- 按 `a` 在 Android 模擬器運行
- 或使用 Expo Go App 掃描 QR Code

## 已完成

✅ Expo React Native 專案建立
✅ TypeScript 配置
✅ Supabase 整合
✅ 身份驗證系統（AuthContext）
✅ 院友狀態管理（PatientContext）
✅ 環境變數設定

## 待開發

所有功能畫面需要從網頁版移植。請參考 `/src` 目錄中的網頁版程式碼。

## 專案結構

```
mobile-app/
├── src/
│   ├── context/          # Context API (已完成)
│   ├── lib/              # Supabase 配置 (已完成)
│   ├── screens/          # 畫面 (待開發)
│   ├── components/       # 元件 (待開發)
│   ├── navigation/       # 導覽 (待開發)
│   └── utils/            # 工具函式 (待移植)
├── App.tsx
└── package.json
```

## 重要資訊

- 與網頁版共享 Supabase 資料庫
- 環境變數在 `.env` 檔案中
- 使用 React Native Paper 作為 UI 框架
