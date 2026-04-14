import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// מגדירים שקובץ ההגדרות יישמר בתיקייה הראשית של הפרויקט
const settingsFilePath = path.join(process.cwd(), 'holiday-settings.json');

// פונקציה לשליפת ההגדרות (כשהאתר עולה)
export async function GET() {
    try {
        const file = await fs.readFile(settingsFilePath, 'utf8');
        return NextResponse.json(JSON.parse(file));
    } catch (error) {
        // אם הקובץ עדיין לא קיים, נחזיר ברירת מחדל (הכל כבוי)
        return NextResponse.json({ showHolidayDecor: false, memorialDayType: null });
    }
}

// פונקציה לשמירת ההגדרות (כשלוחצים על טוגל)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        // שומרים את המידע לקובץ ה-JSON הפשוט
        await fs.writeFile(settingsFilePath, JSON.stringify(body, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}