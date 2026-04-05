import { headers } from 'next/headers';
import { exec } from 'child_process';
import util from 'util';
import dns from 'dns/promises';

const execPromise = util.promisify(exec);


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

async function getComputerName(ip: string) {
  try {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'unknown') return 'Localhost';
    const hostnames = await dns.reverse(ip);
    if (hostnames && hostnames.length > 0) {
      return hostnames[0].split('.')[0].toUpperCase(); // חותך את הדומיין ומשאיר רק את שם המחשב באותיות גדולות
    }
  } catch (error) {
    // אם ה-DNS לא מכיר את ה-IP
  }
  return 'N/A';
}

export async function getCurrentUser() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  
  // תופסים את ה-IP הגולמי וחותכים פורט
  let rawIp = headersList.get('x-forwarded-for') || headersList.get('remote-addr') || 'unknown';
  const clientIp = rawIp.split(',')[0].split(':')[0].trim();

  let username = '';

  if (authHeader && authHeader.startsWith('NTLM ')) {
    username = decodeNTLM(authHeader);
    if (username) ipToUserCache.set(clientIp, username); 
  }

  if (!username && clientIp !== 'unknown') {
    username = ipToUserCache.get(clientIp) || '';
  }

  if (!username) {
    return { username: 'אורח', displayName: 'אורח', department: 'כללי', title: '', groups: [] };
  }

  const now = Date.now();
  if (userCache.has(username)) {
    const cached = userCache.get(username)!;
    if (now - cached.timestamp < CACHE_TTL) return cached.data;
  }

  const adServers = ['192.168.1.243', '192.168.1.244']; 
  let adData: any = null;

  for (const server of adServers) {
    try {
      // === התיקון הקריטי: מושכים את MemberOf בשאילתה אחת פשוטה ויציבה ===
      const psCommand = `powershell.exe -NoProfile -NonInteractive -Command "chcp 65001 >$null; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ADUser -Identity '${username}' -Server '${server}' -Properties Name,Department,Title,MemberOf | Select-Object Name,Department,Title,MemberOf | ConvertTo-Json"`;

      const { stdout } = await execPromise(psCommand, { 
          encoding: 'utf8', 
          windowsHide: true, 
          maxBuffer: 1024 * 1024 
      });
      
      if (stdout && stdout.trim()) {
         adData = JSON.parse(stdout);
         break; 
      }
    } catch (error) {
      console.warn(`⚠️ שרת AD בכתובת ${server} לא הגיב, מנסה את השרת הבא...`);
    }
  }

  const computerName = await getComputerName(clientIp);

  if (!adData) {
      return { username, displayName: username, department: 'כללי', title: '', groups: [], ipAddress: clientIp, computerName };
  }

  try {
    // === קסם הניקוי ב-JS: לוקחים את ה-MemberOf ומחלצים רק את השם ===
    let parsedGroups: string[] = [];
    if (adData.MemberOf) {
        // AD יכול להחזיר מחרוזת בודדת (אם יש קבוצה אחת) או מערך של מחרוזות
        const rawGroups = Array.isArray(adData.MemberOf) ? adData.MemberOf : [adData.MemberOf];
        
        parsedGroups = rawGroups.map((g: any) => {
            if (typeof g === 'string') {
                // לוקח את "CN=TrafficLights_Developer,OU=Roles"
                // חותך בפסיק הראשון ולוקח רק את החלק של ה-CN, ואז מוריד את ה-"CN="
                return g.split(',')[0].replace('CN=', '').trim();
            }
            return '';
        }).filter(Boolean); // מסנן החוצה ערכים ריקים
    }

    const fullUser = {
      username: username,
      displayName: adData.Name || username,
      department: adData.Department || 'כללי',
      title: adData.Title || '',           
      groups: parsedGroups,         // <--- עכשיו זה מערך אמיתי עם שמות הקבוצות!
      ipAddress: clientIp,
      computerName: computerName 
    };

    userCache.set(username, { data: fullUser, timestamp: now });
    return fullUser;

  } catch (error) {
    console.error("AD Parsing Error:", error);
    return { username, displayName: username, department: 'כללי', title: '', groups: [], ipAddress: clientIp, computerName };
  }
}