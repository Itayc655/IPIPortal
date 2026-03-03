import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log(">>> [Messages API] GET Request Started");
        const pool = await getConnection();
        const req = new sql.Request(pool);
        const result = await req.query("SELECT * FROM SystemMessages");
        console.log(">>> [Messages API] Fetched messages:", result.recordset.length);
        return NextResponse.json({ data: result.recordset });
    } catch (error) {
        console.error(">>> [Messages API] GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log(">>> [Messages API] POST Request Started, Action:", body.action);
        const pool = await getConnection();
        const req = new sql.Request(pool);

        if (body.action === 'add') {
            console.log(">>> [Messages API] Adding message to SQL:", body.message.text);
            await req.input('id', sql.VarChar, body.message.id)
                     .input('text', sql.NVarChar, body.message.text)
                     .input('date', sql.VarChar, body.message.date)
                     .query("INSERT INTO SystemMessages (id, text, date) VALUES (@id, @text, @date)");
        } 
        else if (body.action === 'delete') {
            console.log(">>> [Messages API] Deleting message ID:", body.id);
            await req.input('id', sql.VarChar, body.id)
                     .query("DELETE FROM SystemMessages WHERE id = @id");
        }
        
        console.log(">>> [Messages API] Operation Successful!");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(">>> [Messages API] POST Error:", error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}