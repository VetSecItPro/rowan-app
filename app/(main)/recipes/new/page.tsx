import { serverAuth } from '@/lib/supabase/server-auth';
import NewRecipeClient from '@/components/recipes/NewRecipeClient';

export const metadata = {
  title: 'Create New Recipe - Rowan',
  description: 'Add your own recipe or use AI to import from anywhere',
};

export default async function NewRecipePage() {
  const { spaceId } = await serverAuth();
  return <NewRecipeClient spaceId={spaceId} />;
}
