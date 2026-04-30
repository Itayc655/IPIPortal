import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { pin } = await request.json();

        if (!process.env.REVEAL_PIN) {
            return NextResponse.json({ success: false, message: 'PIN not configured' }, { status: 200 });
        }

        if (pin === process.env.REVEAL_PIN) {
            return NextResponse.json({ success: true }, { status: 200 });
        }

        return NextResponse.json({ success: false, message: 'PIN שגוי' }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ success: false, message: 'שגיאת שרת' }, { status: 200 });
    }
}