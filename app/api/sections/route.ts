import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// --- הגדרות הצפנה ---
// חשוב: במערכת אמיתית, המפתח הזה צריך להיות משתנה סביבה (ENV) ולא בקוד
// המפתח חייב להיות באורך 32 תווים בדיוק
const ENCRYPTION_KEY = '12345678901234567890123456789012'; 
const IV_LENGTH = 16; // אורך וקטור האתחול

const dataFilePath = path.join(process.cwd(), 'dynamic_db.json');
const AUTO_COLORS = ['red', 'blue', 'green', 'purple', 'orange', 'teal', 'indigo', 'pink', 'cyan'];

// --- פונקציות עזר להצפנה ופענוח ---

function encryptText(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptText(text: string): string {
    if (!text || !text.includes(':')) return text; // הגנה אם הטקסט לא מוצפן
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// פונקציה שעוברת על כל הדאטה ומצפינה רק שדות סיסמה
const encryptAllData = (sections: any[]) => {
    return sections.map(section => ({
        ...section,
        items: section.items.map((item: any) => {
            const encryptedData = { ...item.data };
            // מעבר על כל השדות ובדיקה אם זה שדה סיסמה
            section.schema.forEach((field: any) => {
                if (field.type === 'password' && encryptedData[field.key]) {
                    // מצפינים רק את הסיסמה, לא את שם המשתמש
                    encryptedData[field.key] = {
                        ...encryptedData[field.key],
                        password: encryptText(encryptedData[field.key].password)
                    };
                }
            });
            return { ...item, data: encryptedData };
        })
    }));
};

// פונקציה שעוברת על כל הדאטה ומפענחת סיסמאות לקריאה
const decryptAllData = (sections: any[]) => {
    return sections.map(section => ({
        ...section,
        items: section.items.map((item: any) => {
            const decryptedData = { ...item.data };
            section.schema.forEach((field: any) => {
                if (field.type === 'password' && decryptedData[field.key]) {
                    // מפענחים את הסיסמה כדי שהקליינט יוכל להציג אותה (מוסתרת בכוכביות)
                    decryptedData[field.key] = {
                        ...decryptedData[field.key],
                        password: decryptText(decryptedData[field.key].password)
                    };
                }
            });
            return { ...item, data: decryptedData };
        })
    }));
};

// --- ניהול קבצים ---

const getData = () => {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
    return [];
  }
  try { 
      const rawData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
      // כשאנחנו קוראים מהקובץ, אנחנו מפענחים את המידע כדי לשלוח אותו ל-Frontend
      return decryptAllData(rawData); 
  } catch { return []; }
};

const saveData = (sections: any[]) => {
    // לפני השמירה לקובץ, אנחנו מצפינים את הסיסמאות
    const dataToSave = encryptAllData(sections);
    fs.writeFileSync(dataFilePath, JSON.stringify(dataToSave, null, 2));
};

// --- API HANDLERS ---

export async function GET() {
  return NextResponse.json(getData());
}

export async function POST(req: Request) {
  // 1. קבלת המידע המפוענח הנוכחי
  const sections = getData(); 
  const body = await req.json();

  // 2. ביצוע השינויים (על המידע הגלוי בזיכרון)
  if (body.action === 'create_section') {
      const nextColor = AUTO_COLORS[sections.length % AUTO_COLORS.length];
      sections.push({
          id: Date.now(),
          title: body.title,
          color: nextColor, 
          schema: body.schema, 
          items: []
      });
  } 
  else if (body.action === 'update_section') {
      const section = sections.find((s: any) => s.id === body.id);
      if (section) {
          section.title = body.title;
          section.schema = body.schema;
      }
  }
  else if (body.action === 'add_item') {
      const section = sections.find((s: any) => s.id === body.sectionId);
      if (section) section.items.push({ id: Date.now(), data: body.data });
  }
  else if (body.action === 'update_item') {
      const section = sections.find((s: any) => s.id === body.sectionId);
      if (section) {
          const item = section.items.find((i: any) => i.id === body.itemId);
          if (item) item.data = body.data;
      }
  }
  else if (body.action === 'delete_section') {
      const index = sections.findIndex((s: any) => s.id === body.id);
      if (index > -1) sections.splice(index, 1);
  }
  else if (body.action === 'delete_item') {
      const section = sections.find((s: any) => s.id === body.sectionId);
      if (section) section.items = section.items.filter((i: any) => i.id !== body.itemId);
  }

  // 3. שמירה לקובץ (הפונקציה saveData תבצע הצפנה לפני הכתיבה)
  saveData(sections);
  
  return NextResponse.json(sections);
}