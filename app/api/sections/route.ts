export const dynamic = 'force-dynamic'; // פקודה זו מכריחה את השרת לשלוף נתונים חיים בלבד

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getConnection } from '@/lib/db'; // ודא שהנתיב תואם למיקום שיצרת בו את הקובץ
import sql from 'mssql';


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
// שליפת הנתונים ממסד הנתונים והצגתם באתר - עכשיו עם אבטחת מידע מלאה (מחלקה, שם משתמש, טייטל)!
export async function GET(request: Request) {
  try {
    // 1. קוראים מי המשתמש שמבקש את המידע מתוך הכתובת (URL)
    const { searchParams } = new URL(request.url);
    const userDepartment = (searchParams.get('department') || '').toLowerCase();
    const userName = (searchParams.get('username') || '').toLowerCase(); // התוספת שלנו
    const userTitle = (searchParams.get('title') || '').toLowerCase();       // התוספת שלנו
    const isEditMode = searchParams.get('editMode') === 'true';

    const pool = await getConnection();
    
    const sectionsResult = await pool.request().query('SELECT * FROM Sections');
    const itemsResult = await pool.request().query('SELECT * FROM Items');

    const sections = sectionsResult.recordset;
    const items = itemsResult.recordset;

    const formattedData = sections.map(section => {
      // 2. הסינון האמיתי קורה כאן בשרת!
      const securedItems = items
        .filter(item => Number(item.SectionId) === Number(section.Id))
        .filter(item => {
          const visibilityStr = item.visibility || 'הכל';
          
          // אדמין במצב עריכה? תן לו לראות הכל
          if (isEditMode) return true;
          
          // פתוח לכולם? תן לראות
          if (visibilityStr === 'הכל') return true;
          
          // חותכים את המחרוזת מה-DB למערך נקי ומדויק
          const allowedList = visibilityStr.toLowerCase().split(',').map((s: string) => s.trim());
          
          // הרשאה ספציפית למחלקה, לשם המשתמש או לטייטל? תן לראות
          if (userDepartment && allowedList.includes(userDepartment)) return true;
          if (userName && allowedList.includes(userName)) return true;
          if (userTitle && allowedList.includes(userTitle)) return true;
          
          // אם הגענו לפה - השרת חוסם את הפריט! הוא לא יישלח לדפדפן בכלל.
          return false; 
        })
        .map(item => ({
          id: Number(item.Id),
          data: JSON.parse(item.Data || '{}'),
          visibility: item.visibility || 'הכל'
        }));

      return {
        id: Number(section.Id),
        title: section.Title,
        color: section.Color,
        schema: JSON.parse(section.SchemaDef || '[]'),
        items: securedItems
      };
    });

    return NextResponse.json(formattedData);
    
  } catch (error) {
    console.error('Database connection or GET query failed:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// שמירת הנתונים החדשים מהאתר לתוך מסד הנתונים
export async function POST(request: Request) {
  console.log('>>> 1. POST Request Started');
  
  try {
    const body = await request.json();
    console.log(`>>> 2. Action Received: ${body.action}`);

    console.log('>>> 3. Waiting for DB Connection...');
    const pool = await getConnection();
    console.log('>>> DB Connection Verified');
    
    const generateId = () => Date.now();

    if (body.action === 'create_section') {
      console.log(`>>> 4. Processing create_section: ${body.title}`);
      
      const countReq = new sql.Request(pool);
      const countRes = await countReq.query('SELECT COUNT(*) as cnt FROM Sections');
      const count = countRes.recordset[0].cnt;
      const nextColor = AUTO_COLORS[count % AUTO_COLORS.length];

      const req = new sql.Request(pool);
      await req
        .input('Id', sql.BigInt, generateId())
        .input('Title', sql.NVarChar, body.title)
        .input('Color', sql.NVarChar, nextColor)
        .input('SchemaDef', sql.NVarChar, JSON.stringify(body.schema || []))
        .query('INSERT INTO Sections (Id, Title, Color, SchemaDef) VALUES (@Id, @Title, @Color, @SchemaDef)');
        
      console.log('>>> Section saved to SQL successfully!');
    } 
    
    else if (body.action === 'update_section') {
      const req = new sql.Request(pool);
      await req
        .input('Id', sql.BigInt, body.id)
        .input('Title', sql.NVarChar, body.title)
        .input('SchemaDef', sql.NVarChar, JSON.stringify(body.schema || []))
        .query('UPDATE Sections SET Title = @Title, SchemaDef = @SchemaDef WHERE Id = @Id');
    }
    
    else if (body.action === 'add_item') {
      console.log('>>> 4. Processing add_item');
      const visibilityStr = body.visibility || 'הכל'; // <-- שולפים את ההרשאה (או 'הכל' כברירת מחדל)
      const req = new sql.Request(pool);
      await req
        .input('Id', sql.BigInt, generateId())
        .input('SectionId', sql.BigInt, body.sectionId)
        .input('Data', sql.NVarChar, JSON.stringify(body.data || {}))
        .input('visibility', sql.NVarChar, visibilityStr) // <-- מזריקים את ההרשאה
        .query('INSERT INTO Items (Id, SectionId, Data, visibility) VALUES (@Id, @SectionId, @Data, @visibility)'); // <-- מעדכנים שאילתה
    }
    
    else if (body.action === 'update_item') {
      const visibilityStr = body.visibility || 'הכל'; // <-- שולפים את ההרשאה החדשה
      const req = new sql.Request(pool);
      await req
        .input('Id', sql.BigInt, body.itemId)
        .input('SectionId', sql.BigInt, body.sectionId)
        .input('Data', sql.NVarChar, JSON.stringify(body.data || {}))
        .input('visibility', sql.NVarChar, visibilityStr) // <-- מזריקים את ההרשאה החדשה
        .query('UPDATE Items SET Data = @Data, visibility = @visibility WHERE Id = @Id AND SectionId = @SectionId'); // <-- מעדכנים שאילתה
    }
    
    else if (body.action === 'delete_section') {
      const req = new sql.Request(pool);
      await req
        .input('Id', sql.BigInt, body.id)
        .query('DELETE FROM Sections WHERE Id = @Id');
    }
    
    else if (body.action === 'delete_item') {
      const req = new sql.Request(pool);
      await req
        .input('Id', sql.BigInt, body.itemId)
        .query('DELETE FROM Items WHERE Id = @Id');
    }

    console.log('>>> 5. Fetching updated data from SQL...');
    const sectionsResult = await pool.request().query('SELECT * FROM Sections');
    const itemsResult = await pool.request().query('SELECT * FROM Items');

    const sectionsData = sectionsResult.recordset;
    const itemsData = itemsResult.recordset;

    const formattedData = sectionsData.map(section => ({
      id: Number(section.Id),
      title: section.Title,
      color: section.Color,
      schema: JSON.parse(section.SchemaDef || '[]'),
      items: itemsData
        .filter(item => Number(item.SectionId) === Number(section.Id))
        .map(item => ({
          id: Number(item.Id),
          data: JSON.parse(item.Data || '{}'),
          visibility: item.visibility || 'הכל' // <-- מושכים את ההרשאה המעודכנת
        }))
    }));

    console.log('>>> 6. Sending successful response back to Frontend!');
    return NextResponse.json(formattedData);

  } catch (error) {
    console.error('>>> ERROR CAUGHT IN POST:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}