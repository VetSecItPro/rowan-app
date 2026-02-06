'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, BookOpen, ShoppingCart } from 'lucide-react';
import { FeaturePageLayout } from '@/components/features/FeaturePageLayout';
import { RelatedFeatures } from '@/components/features/RelatedFeatures';
import { MealsDemo } from '@/components/home/feature-demos/MealsDemo';

export function MealsFeatureContent() {
  const router = useRouter();

  return (
    <FeaturePageLayout
      featureName="Meal Planning"
      tagline="Meal Planning"
      headline="Meal Planning Made |Effortless|"
      description="Plan your family's meals for the week and auto-generate shopping lists. Save time, reduce waste, eat better."
      colorScheme={{
        primary: 'orange',
        secondary: 'amber',
        gradient: 'from-orange-500 to-amber-500',
      }}
      benefits={[
        {
          icon: CalendarDays,
          title: 'Weekly Planning',
          description:
            'Plan breakfast, lunch, and dinner for the whole week in minutes. Drag and drop meals into your calendar.',
        },
        {
          icon: BookOpen,
          title: 'Recipe Library',
          description:
            'Save your family\'s favorite recipes and discover new ones. Build a collection everyone can browse.',
        },
        {
          icon: ShoppingCart,
          title: 'Auto Shopping Lists',
          description:
            'Turn your meal plan into a shopping list with one tap. Never forget an ingredient again.',
        },
      ]}
      detailBullets={[
        'Drag-and-drop meal calendar',
        'Save favorite recipes',
        'Auto-generate shopping lists',
        'Nutritional awareness',
        'Share meals with family',
      ]}
      demoComponent={<MealsDemo />}
      onSignupClick={() => router.push('/signup')}
      relatedFeaturesSection={<RelatedFeatures currentFeature="meals" />}
    />
  );
}
