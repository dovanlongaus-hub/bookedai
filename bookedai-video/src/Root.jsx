import {Composition} from "remotion";
import {BookedAI} from "./BookedAI";

export const Root = () => {
  return (
    <>
      <Composition
        id="BookedAI"
        component={BookedAI}
        durationInFrames={870}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
