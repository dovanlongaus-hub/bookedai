import {AbsoluteFill, Sequence} from "remotion";
import Scene1 from "./scenes/Scene1_Pain";
import Scene2 from "./scenes/Scene2_Brand";
import Scene3 from "./scenes/Scene3_AIChat";
import Scene4 from "./scenes/Scene4_Result";
import Scene5 from "./scenes/Scene5_Booking";
import Scene6 from "./scenes/Scene6_Success";
import Scene7 from "./scenes/Scene7_Outro";
import Scene8 from "./scenes/Scene8_Trust";

export const BookedAI = () => {
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at top, #16345c 0%, #0A2540 45%, #06111f 100%)",
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <Sequence from={0} durationInFrames={90}>
        <Scene1 />
      </Sequence>
      <Sequence from={90} durationInFrames={60}>
        <Scene2 />
      </Sequence>
      <Sequence from={150} durationInFrames={180}>
        <Scene3 />
      </Sequence>
      <Sequence from={330} durationInFrames={120}>
        <Scene4 />
      </Sequence>
      <Sequence from={450} durationInFrames={120}>
        <Scene5 />
      </Sequence>
      <Sequence from={570} durationInFrames={90}>
        <Scene6 />
      </Sequence>
      <Sequence from={660} durationInFrames={120}>
        <Scene8 />
      </Sequence>
      <Sequence from={780} durationInFrames={90}>
        <Scene7 />
      </Sequence>
    </AbsoluteFill>
  );
};
