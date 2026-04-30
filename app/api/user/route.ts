import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');

  if (searchTerm) {
    // SEC-3: validate input before passing to PowerShell
    const isSafe = /^[a-zA-Z0-9_\-\.@\u0590-\u05FF ]+$/.test(searchTerm);
    if (!isSafe || searchTerm.length > 64) {
        return NextResponse.json({ exists: false, error: 'Invalid input' }, { status: 200 });
    }

    try {
      const adServers = ['192.168.1.243', '192.168.1.244'];

      for (const server of adServers) {
        try {
         
          const psCommand = `powershell.exe -NoProfile -NonInteractive -Command "chcp 65001 >$null; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ADObject -Filter \\"sAMAccountName -eq '${searchTerm}' -or Name -eq '${searchTerm}'\\" -Server '${server}' | Select-Object Name"`;
          const { stdout } = await execPromise(psCommand, { windowsHide: true });

          if (stdout && stdout.trim()) {
            return NextResponse.json({ exists: true });
          }
        } catch (e) {
          // שרת לא זמין או משתמש לא נמצא - נסה את השרת הבא
        }
      }

      return NextResponse.json({ exists: false });

    } catch (error) {
      console.error('AD Check Failed:', error);
      return NextResponse.json({ error: 'AD Check Failed', exists: false }, { status: 500 });
    }
  }

  // --- התרחיש הרגיל: שליפת המשתמש המחובר למערכת ---
  const user = await getCurrentUser();
  return NextResponse.json(user);
}