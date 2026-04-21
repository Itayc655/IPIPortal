import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import { createAdminToken } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        const pool = await getConnection();

        // 1. Check if username is in AuthorizedUsers
        const reqUser = new sql.Request(pool);
        const userResult = await reqUser
            .input('user', sql.NVarChar, username || '')
            .query('SELECT Username FROM AuthorizedUsers WHERE Username = @user');

        if (userResult.recordset.length === 0) {
            return NextResponse.json({ isAuthorized: false, message: 'שם משתמש לא מורשה' }, { status: 200 });
        }

        // 2. Check password
        if (password !== undefined && password !== '') {
            const reqPass = new sql.Request(pool);
            const passResult = await reqPass
                .query("SELECT SettingValue FROM GlobalSettings WHERE SettingKey = 'EditPassword'");

            if (passResult.recordset.length === 0) {
                return NextResponse.json({ isAuthorized: false, message: 'סיסמה לא מוגדרת' }, { status: 200 });
            }

            const storedPassword = passResult.recordset[0].SettingValue;

            const isHashed = storedPassword.startsWith('$2');
            const passwordMatch = isHashed
                ? await bcrypt.compare(password, storedPassword)
                : password === storedPassword;

            if (!passwordMatch) {
                return NextResponse.json({ isAuthorized: false, message: 'סיסמה שגויה!' }, { status: 200 });
            }
        }

        // 3. Create token and set cookie
        const token = await createAdminToken();

        const response = NextResponse.json({ isAuthorized: true });
        response.cookies.set('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60, // 1 hour
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Auth Error:', error);
        return NextResponse.json({ isAuthorized: false, message: 'שגיאת שרת פנימית' }, { status: 200 });
    }
}