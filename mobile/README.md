# BARBERS — React Native + Expo

גרסת המובייל של מערכת המספרות. היא משתמשת באותו Firebase ובאותם נתונים של גרסת ה־PWA הקיימת.

## מה עבר למובייל

- הרשמת לקוח עם קוד מספרה ושיוך קבוע ל־`shopId`
- הרשמת ספר חדש ואישור דרך פאנל המנהל
- תורים, זמינות וביטול תורים ללא התנגשות בין מספרות
- מחירון, מוצרים, גלריה, שעות ופרטי עסק
- ניהול מספרה ופאנל־על למנהל
- שמירת התחברות ותוכן אחרון במכשיר
- פתיחת חיוג ו־Waze דרך אפליקציות המכשיר

## הרצה

```bash
cd mobile
npm install
npx expo start
```

התקינו `Expo Go` באייפון או באנדרואיד וסרקו את קוד ה־QR. המחשב והטלפון צריכים להיות באותה רשת.

## בדיקות

```bash
npm run typecheck
npx expo-doctor
```

## בניית גרסת חנויות

```bash
npx eas-cli build --platform ios
npx eas-cli build --platform android
```

פרסום ל־App Store דורש חשבון Apple Developer. פיתוח והרצה ב־Expo Go אינם דורשים אותו.

אם רוצים לשמור גם את אימייל ההתראה על הרשמת ספר חדש, מגדירים לפני ההרצה את
`EXPO_PUBLIC_EMAILJS_SERVICE_ID`, `EXPO_PUBLIC_EMAILJS_TEMPLATE_ID` ו־`EXPO_PUBLIC_EMAILJS_PUBLIC_KEY`.
