import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";

export default function Scene7() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 90], [0, 1, 1]);

  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", opacity}}>
      <div style={{textAlign: "center", color: "white"}}>
        <div style={{fontSize: 96, fontWeight: 800, letterSpacing: -3, marginBottom: 18}}>
          BookedAI
        </div>
        <div style={{fontSize: 32, opacity: 0.82, letterSpacing: -0.5}}>
          Book the right class. Instantly.
        </div>
      </div>
    </AbsoluteFill>
  );
}
