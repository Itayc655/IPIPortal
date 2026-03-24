import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        const pool = await getConnection();

        // 1. קודם כל בודקים אם השם משתמש מורשה (בטבלת AuthorizedUsers)
        const reqUser = new sql.Request(pool);
        const userResult = await reqUser
            .input('user', sql.NVarChar, username || '')
            .query('SELECT Username FROM AuthorizedUsers WHERE Username = @user');

        if (userResult.recordset.length === 0) {
            // ?? התיקון: מחזירים סטטוס 200 כדי למנוע את החלון של כרום
            return NextResponse.json({ isAuthorized: false, message: 'שם משתמש לא מורשה' }, { status: 200 });
        }

        // 2. אם נשלחה סיסמה מהטופס - בודקים גם אותה מול ה-GlobalSettings
        if (password !== undefined && password !== '') {
            const reqPass = new sql.Request(pool);
            const passResult = await reqPass
                .input('pass', sql.NVarChar, password)
                .query("SELECT SettingValue FROM GlobalSettings WHERE SettingKey = 'EditPassword' AND SettingValue = @pass");

            if (passResult.recordset.length === 0) {
                // ?? התיקון: מחזירים סטטוס 200 עם דגל כישלון
                return NextResponse.json({ isAuthorized: false, message: 'סיסמה שגויה!' }, { status: 200 });
            }
        }

        // הכל תקין! מאשרים כניסה
        return NextResponse.json({ isAuthorized: true });

    } catch (error) {
        console.error('Auth Error:', error);
        // גם שגיאות שרת נחזיר כ-200 כדי שה-Frontend יטפל בזה בצורה נקייה
        return NextResponse.json({ isAuthorized: false, message: 'שגיאת שרת פנימית' }, { status: 200 });
    }
}