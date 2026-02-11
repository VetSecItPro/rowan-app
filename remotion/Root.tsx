import { Composition } from 'remotion';
import { HelloWorld } from './compositions/HelloWorld';
import { HeroShowcase } from './compositions/HeroShowcase';
import { OrganizeShowcase } from './compositions/OrganizeShowcase';
import { CoordinateShowcase } from './compositions/CoordinateShowcase';
import { GrowShowcase } from './compositions/GrowShowcase';
import './index.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="HeroShowcase"
        component={HeroShowcase}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="OrganizeShowcase"
        component={OrganizeShowcase}
        durationInFrames={390}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="CoordinateShowcase"
        component={CoordinateShowcase}
        durationInFrames={390}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="GrowShowcase"
        component={GrowShowcase}
        durationInFrames={390}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
