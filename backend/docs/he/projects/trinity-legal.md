# Trinity Legal

## Overview
מערכת ענן לניהול מסמכים ותיקים למשרדי עורכי דין קטנים, בעברית ומימין לשמאל. היא בפיילוט חי עם לקוחות פעילים. זו עבודת מוצר פול סטאק ולא עבודת AI: החלקים הקשים הם מסמכים שכמה אנשים עורכים, הפרדה קפדנית בין משרדים, והעברת ארכיון אמיתי לענן בלי לאבד דבר. שם הלקוח לא מופיע כאן.

## Technical Details
- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Fastify 5, TypeScript
- **Database**: PostgreSQL 16 עם row-level security
- **Desktop**: תוסף .NET 10 ל-Word ול-Excel ב-Windows
- **Cloud Platform**: Google Cloud - Cloud Run, Cloud SQL, Cloud Storage, Pub/Sub, Cloud Scheduler, Firebase Hosting
- **CI/CD**: GitHub Actions, סריקת סודות, ובדיקת קוד עם AI על כל בקשת מיזוג

## Key Features
- כמה אנשים יכולים לעבוד על אותו מסמך Word בלי לאבד גרסה: עריכה נעשית בהשאלה, שמירה נבדקת מול הגרסה שממנה התחילה, וגרסאות שמורות לא נכתבות מחדש
- כל משרד רואה רק את הנתונים שלו. המשרד נלקח מהסשן, נאכף במסד הנתונים בכל נתיב, ונבדק לכל נקודת קצה
- כל קובץ שמועלה נסרק לנוזקות לפני שמישהו יכול לפתוח אותו
- ארכיון קיים של 56,607 קבצים (33.8 GB) יובא עם תיעוד מלא, ואדם מאשר את מה שהמייבא לא הצליח להכריע
- שש משימות מתוזמנות מטפלות בעבודת הרקע

## Project Type
web-app

## Status
production

## Repository
Private Repository

## Featured
false

## Category
פיתוח פול סטאק ועבודת לקוח
