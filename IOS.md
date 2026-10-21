# גרסת iOS (Capacitor)

האפליקציה נארזת ל-iOS עם Capacitor 8. קבצי האתר נבנים ונכנסים **לתוך** האפליקציה (לא נטענים משרת מרוחק), כך שאין צורך בשרת נוסף. Firebase (התחברות ו-Firestore) ו-EmailJS עובדים ישירות מהאפליקציה, כמו באתר.

## דרישות (על ה-Mac)

- Xcode 26 ומעלה (מה-App Store, חינם)
- Node.js 22.13 ומעלה
- לא צריך CocoaPods. הפרויקט משתמש ב-Swift Package Manager.

## הרצה בסימולטור

```bash
git checkout ios-wrapper
npm install
npm run ios:sync    # בונה את קבצי האתר ומעתיק אותם לפרויקט ה-iOS
npm run ios:open    # פותח את ios/App/App.xcodeproj ב-Xcode
```

ב-Xcode: בוחרים סימולטור iPhone בסרגל העליון ולוחצים ▶ (Cmd+R).

אחרי כל שינוי בקוד האתר מריצים שוב `npm run ios:sync`, ואז ▶ ב-Xcode.

## הרצה על אייפון אמיתי

1. Xcode ‹ Settings ‹ Accounts: מוסיפים Apple ID (חינם).
2. בפרויקט App ‹ Signing & Capabilities: בוחרים Team. אם ה-Bundle ID תפוס, משנים אותו (`appId` ב-`capacitor.config.ts` וגם ב-Xcode).
3. מחברים את האייפון בכבל, מפעילים בו Developer Mode ‹ ▶.

## מה נוסף לגרסת iOS בלבד

| קובץ | תפקיד |
|---|---|
| `capacitor.config.ts` | הגדרות האפליקציה (שם, Bundle ID, מקלדת, סטטוס בר, מסך פתיחה) |
| `vite.ios.config.ts` | בניית האתר לתיקייה `dist-ios` עם נתיב שורש `/` (בניית GitHub Pages לא משתנה) |
| `native/ios-bridge.ts` | צבע הסטטוס בר והמקלדת לפי מצב בהיר/כהה, וגלילה לשדה הפעיל כשהמקלדת נפתחת |
| `lib/firebase.ts` | בתוך האפליקציה בלבד: `initializeAuth` במקום `getAuth` (מונע תקיעה בהתחברות). האתר לא משתנה |
| `ios/` | פרויקט ה-Xcode, כולל הרשאות מצלמה וספריית תמונות, אייקון ומסך פתיחה |

קישורי WhatsApp, Waze, טלפון וקישורים חיצוניים נפתחים אוטומטית באפליקציה המתאימה או ב-Safari.
