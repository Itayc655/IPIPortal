import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const pool = await getConnection();
        
        const req = new sql.Request(pool);
        const result = await req
            .input('pass', sql.NVarChar, password)
            .query("SELECT SettingValue FROM GlobalSettings WHERE SettingKey = 'EditPassword' AND SettingValue = @pass");

        if (result.recordset.length > 0) {
            // הצלחה
            return NextResponse.json({ success: true });
        }

        // ?? התיקון: מחזירים סטטוס 200 עם success: false במקום 401
        // זה ימנע מכרום (ומה-IIS) להקפיץ את חלון ההתחברות המכוער!
        return NextResponse.json({ success: false, message: 'סיסמה שגויה' }, { status: 200 });

    } catch (error) {
        console.error('Verify Password Error:', error);
        // גם כאן, נחזיר 200 כדי שה-Frontend יטפל בשגיאה ולא הדפדפן
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 200 });
    }
}