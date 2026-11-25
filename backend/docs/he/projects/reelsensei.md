# ReelSensei - AI Gaming Highlights

## Overview
מושהה ופרטי: השירות לא רץ והמאגר סגור. הוא הפך הקלטות ארוכות של משחקים לסרטוני היילייטס: מודל מולטימודלי דירג את הרגעים, וצנרת אסינכרונית ביצעה את החיתוך. החלק הקשה היה העלות, לא הזיהוי: להריץ עיבוד וידאו על Spot VMs ועבודות batch בזול מספיק כדי שזה ישתלם, בלי תור שיכול לאבד עבודה בשקט. הוא כאן כי ההנדסה שווה קריאה, לא כי זה מוצר שאפשר להירשם אליו.

## Technical Details
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python, Firebase/Firestore
- **AI/ML**: Google Cloud Vertex AI, מודל מולטימודלי
- **Video Processing**: FFmpeg, GCP Batch, Cloud Tasks
- **Deployment**: Google Cloud Run, עם עובדים על Spot VMs
- **Security & Infrastructure**: Google Cloud Armor, Load Balancer, CDN

## יכולות עיקריות
- זיהוי רגעי השיא במשחק: רגעים מכריעים, מהלכים מרשימים ורגעים אפיים, עם ציון ביטחון לכל קטע
- צנרת אסינכרונית מלאה: העלאה, יצירת עבודה, עיבוד ב־Batch, ניתוח AI, חיתוך ושמירה, כך שעבודה ארוכה אף פעם לא חוסמת בקשה ועובד שנפל לא מאבד עבודה
- הורדת עלויות עם Spot VMs, מיקום אזורי של הנתונים ו־CDN
- מגבלות עבודה במקביל: 3 למשתמש, 10 בסך הכול

## Project Type
web-app

## Status
paused

## Repository
Private Repository

## Media
https://i.ibb.co/JFwxp9wk/Screenshot-2025-07-30-at-15-03-45.png

## Featured
true

## Category
AI וגיימינג
