import DynamicIPIDashboard from './ClientPage';
import { getCurrentUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function Page() {
  // צד השרת תופס את היוזר בטעינה הראשונה (איפה שה-NTLM עובד מושלם)
  const user = await getCurrentUser();
  
  // ומעביר אותו מיד כפרופ (Prop) לקומפוננטת הלקוח שלנו
  return <DynamicIPIDashboard initialUser={user} />;
}