import { serverAuth } from '@/lib/supabase/server-auth';
import LocationPageClient from '@/components/location/LocationPageClient';

export const metadata = {
  title: 'Family Location - Rowan',
  description: 'Keep your family connected with real-time location sharing',
};

export default async function LocationPage() {
  const { spaceId } = await serverAuth();
  return <LocationPageClient spaceId={spaceId} />;
}
