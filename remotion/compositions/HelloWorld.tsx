import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { DemoProviders } from '../providers/DemoProviders';
import { WelcomeWidget } from '@/components/dashboard/WelcomeWidget';

export const HelloWorld: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const widgetOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const widgetY = interpolate(frame, [30, 60], [40, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-black flex flex-col items-center justify-center">
      {/* Animated title */}
      <div
        style={{ opacity: titleOpacity }}
        className="text-5xl font-bold text-white mb-12 tracking-tight"
      >
        Welcome to Rowan
      </div>

      {/* WelcomeWidget rendered with mock providers */}
      <div
        style={{ opacity: widgetOpacity, transform: `translateY(${widgetY}px)` }}
        className="w-[700px]"
      >
        <DemoProviders>
          <WelcomeWidget userName="Sarah" />
        </DemoProviders>
      </div>
    </AbsoluteFill>
  );
};
