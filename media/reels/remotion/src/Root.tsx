import React from 'react';
import {Composition, Folder} from 'remotion';
import {AnimatedReel, reelContent} from './reels/AnimatedReel';

export const Root: React.FC = () => (
  <Folder id="GRIT-SAC40">
    {reelContent.map((reel) => (
      <Composition
        key={reel.id}
        id={reel.id}
        component={AnimatedReel}
        durationInFrames={reel.scenes.length * 120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{reel}}
      />
    ))}
  </Folder>
);
