# Trinity CRM

## Overview
אפליקציה לניהול תורים ולקוחות למספרות, עברית קודם ובנויה לטלפון. זה פרויקט פול סטאק ולא הדגמת AI: אב טיפוס עובד שרץ כולו על השירותים החינמיים של Cloudflare.

## Technical Details
- **Frontend**: React 19, Vite, React Router, TypeScript
- **Backend**: Hono על Cloudflare Worker יחיד
- **Database**: Cloudflare D1 עם Drizzle ORM
- **Testing**: Vitest וסקריפטי ביקורת של Playwright

## יכולות עיקריות
- הרבה מספרות על מערכת אחת, מופרדות זו מזו: השרת מחליט לאיזו מספרה שייכת בקשה ולעולם לא מקבל את זה מהדפדפן
- עמוד הזמנת תורים ציבורי לכל מספרה
- סיום תור בטוח לחזרה: הוא קורה פעם אחת, כמה פעמים שלא ילחצו על הכפתור
- לקוחות מקובצים לפי הזמן שעבר מהביקור האחרון, כך שהמספרה רואה מי אמור להגיע ומי בסיכון לעזוב
- SMS יושב מאחורי ממשק ובינתיים מדומה

## Project Type
web-app

## Status
in-development

## Repository
Private Repository

## Featured
false

## Category
פיתוח פול סטאק
