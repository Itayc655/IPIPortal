import { headers } from 'next/headers';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// --- הפתרון לעומסים: זיכרון מטמון (Cache) ---
// כאן השרת ישמור את הנתונים של כל משתמש
const userCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL_MINUTES = 60; // תוקף הזיכרון (שעה אחת). אפשר לשנות ל-24 שעות אם רוצים.

function decodeNTLM(authHeader: string): string {
  try {
    const base64Token = authHeader.split(' ')[1];
    const buffer = Buffer.from(base64Token, 'base64');
    const userLen = buffer.readUInt16LE(36);
    const userOffset = buffer.readUInt32LE(40);
    const rawUser = buffer.slice(userOffset, userOffset + userLen);
    let username = rawUser.toString('utf16le').replace(/\0/g, '');
    
    if (!username || /^[\x00-\x1F]*$/.test(username)) {
      username = rawUser.toString('utf8');
    }
    return username;
  } catch (e) {
    return 'אורח';
  }
}

export async function getCurrentUser() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  
  if (!authHeader) return { username: 'אורח' };

  const username = decodeNTLM(authHeader);
  if (username === 'אורח') return { username };

  // --- בדיקת זיכרון (החלק שחוסך את העומס!) ---
  const cached = userCache.get(username);
  const now = Date.now();
  // אם יש לנו את המשתמש בזיכרון, ועדיין לא עברה שעה - נחזיר מיד!
  if (cached && (now - cached.timestamp < CACHE_TTL_MINUTES * 600 * 1000)) {
    console.log(`[Cache Hit] החזרת נתונים מהזיכרון עבור: ${username}`);
    return cached.data;
  }

  try {
    console.log(`[Cache Miss] מפעיל PowerShell מול השרת עבור: ${username}`);
    // פקודת ה-PowerShell כולל קידוד UTF-8 לעברית
    const psCommand = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ADUser -Identity "${username}" -Properties DisplayName,EmailAddress,Department,Title,telephoneNumber | Select-Object DisplayName,EmailAddress,Department,Title,telephoneNumber | ConvertTo-Json`;

    const { stdout } = await execPromise(`powershell.exe -Command "${psCommand}"`, { encoding: 'utf8' });
    const adData = JSON.parse(stdout);

    const fullUser = {
      username: username,
      displayName: adData.DisplayName || '',
      email: adData.EmailAddress || '',
      department: adData.Department || '',
      title: adData.Title || '',
      phone: adData.telephoneNumber || ''
    };

    // --- שמירה לזיכרון לפעם הבאה ---
    userCache.set(username, { data: fullUser, timestamp: now });

    return fullUser;

  } catch (error) {
    console.error("Failed to fetch AD data via PowerShell:", error);
    return { username: username, error: "No AD data" };
  }
}