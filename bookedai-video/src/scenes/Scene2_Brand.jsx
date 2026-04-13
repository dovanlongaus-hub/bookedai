import {AbsoluteFill, interpolate, spring, useCurrentFrame} from "remotion";

export default function Scene2() {
  const frame = useCurrentFrame();
  const scale = spring({frame, fps: 30, config: {damping: 200}});
  const opacity = interpolate(frame, [0, 10, 45, 60], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", opacity}}>
      <div style={{transform: `scale(${0.9 + scale * 0.1})`, textAlign: "center", color: "white"}}>
        <div style={{fontSize: 96, fontWeight: 800, letterSpacing: -3, marginBottom: 20}}>
          BookedAI
        </div>
        <div style={{fontSize: 30, opacity: 0.8, letterSpacing: -0.5}}>
          Ask. Decide. Book.
        </div>
      </div>
    </AbsoluteFill>
  );
}
