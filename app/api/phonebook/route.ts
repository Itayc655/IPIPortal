import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const pool = await getConnection();
        const config = await pool.request().query('SELECT SchemaDef FROM PhonebookConfig WHERE Id = 1');
        const data = await pool.request().query('SELECT Content FROM PhonebookData WHERE Id = 1');

        return NextResponse.json({
            schema: JSON.parse(config.recordset[0]?.SchemaDef || '[]'),
            data: JSON.parse(data.recordset[0]?.Content || '[]')
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch phonebook' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const pool = await getConnection();
        const req = new sql.Request(pool);
        const payload = body.payload;
        
        // בתוך ה-API שמקבל את payload
        const validData = payload.filter((row: any) =>
            row.name && row.name.trim().length >= 2
        );
        // שמור רק את validData ל-SQL...


        if (body.type === 'schema') {
            await req.input('val', sql.NVarChar, JSON.stringify(body.payload))
                .query('UPDATE PhonebookConfig SET SchemaDef = @val WHERE Id = 1');
        } else {
            await req.input('val', sql.NVarChar, JSON.stringify(body.payload))
                .query('UPDATE PhonebookData SET Content = @val WHERE Id = 1');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
}