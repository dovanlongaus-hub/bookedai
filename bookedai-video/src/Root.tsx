import {Composition} from "remotion";
import {BookedAI} from "./BookedAI";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="BookedAI"
        component={BookedAI}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

export const RemotionRoot = Root;
