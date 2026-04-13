import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";

export default function Scene1() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20, 70, 90], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", padding: 120, opacity}}>
      <div style={{maxWidth: 1200, textAlign: "center", color: "white"}}>
        <div style={{fontSize: 24, opacity: 0.7, marginBottom: 24, letterSpacing: 2, textTransform: "uppercase"}}>
          Sydney parents
        </div>
        <div style={{fontSize: 76, lineHeight: 1.08, fontWeight: 700, letterSpacing: -2}}>
          Booking swim classes shouldn’t feel like a second job.
        </div>
      </div>
    </AbsoluteFill>
  );
}
