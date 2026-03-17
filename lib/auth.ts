import { headers } from 'next/headers';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// === מילון תרגום אישי (גיבוי לעברית) ===
const hebrewDictionary: Record<string, string> = {
  'Itay Cohen': 'איתי כהן',
  'Traffic Lights': 'רמזורים',
  'Software': 'תוכנה',
  'General': 'כללי'
};

const userCache = new Map<string, { data: any, timestamp: number }>();
const ipToUserCache = new Map<string, string>(); 
const CACHE_TTL = 60 * 60 * 1000;

function decodeNTLM(authHeader: string): string {
  try {
    const base64Token = authHeader.split(' ')[1];
    const buffer = Buffer.from(base64Token, 'base64');
    const userLen = buffer.readUInt16LE(36);
    const userOffset = buffer.readUInt32LE(40);
    const rawUser = buffer.slice(userOffset, userOffset + userLen);
    
    let username = rawUser.toString('utf16le').replace(/\0/g, '').trim();
    if (!username || /^[\x00-\x1F]*$/.test(username)) {
      username = rawUser.toString('utf8').replace(/\0/g, '').trim();
    }
    if (username.includes('\\')) username = username.split('\\')[1];
    return username;
  } catch (e) {
    return '';
  }
}

export async function getCurrentUser() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  
  // תופסים את ה-IP הגולמי
  let rawIp = headersList.get('x-forwarded-for') || headersList.get('remote-addr') || 'unknown';
  
  // === התיקון! חותכים את הפורט המשתנה ===
  // הופך את "192.168.1.76:49222" ל-"192.168.1.76"
  const clientIp = rawIp.split(',')[0].split(':')[0].trim();

  let username = '';

  // 1. קריאת הזיהוי הראשונית מהדפדפן
  if (authHeader && authHeader.startsWith('NTLM ')) {
    username = decodeNTLM(authHeader);
    if (username) {
      ipToUserCache.set(clientIp, username); // שומרים רק את ה-IP הנקי!
    }
  }

  // 2. קסם הרענון: שליפה לפי IP נקי
  if (!username && clientIp !== 'unknown') {
    username = ipToUserCache.get(clientIp) || '';
  }

  // אם אחרי הכל לא מצאנו כלום, זה אורח
  if (!username) {
    return { username: 'אורח', displayName: 'אורח', department: 'כללי' };
  }

  // בדיקת זיכרון מטמון מול ה-AD
  const now = Date.now();
  if (userCache.has(username)) {
    const cached = userCache.get(username)!;
    if (now - cached.timestamp < CACHE_TTL) return cached.data;
  }

  try {
    const psCommand = `powershell.exe -NoProfile -NonInteractive -Command "chcp 65001 >$null; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ADUser -Identity '${username}' -Properties DisplayName,Department | Select-Object DisplayName,Department | ConvertTo-Json"`;

    // הפעלת הפקודה בשקט (מונע חלונות קופצים בשרת)
    const { stdout } = await execPromise(psCommand, { 
        encoding: 'utf8', 
        windowsHide: true, 
        maxBuffer: 1024 * 1024 
    });
    
    let adData: any = {};
    if (stdout && stdout.trim()) {
       adData = JSON.parse(stdout);
    }

    const rawName = adData.DisplayName || username;
    const rawDept = adData.Department || 'כללי';

    const fullUser = {
      username: username,
      displayName: hebrewDictionary[rawName] || rawName,
      department: hebrewDictionary[rawDept] || rawDept
    };

    userCache.set(username, { data: fullUser, timestamp: now });
    return fullUser;

  } catch (error) {
    console.error("AD Error:", error);
    return { username, displayName: username, department: 'כללי' };
  }
}