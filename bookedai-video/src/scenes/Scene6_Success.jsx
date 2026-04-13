import {AbsoluteFill, interpolate, spring, useCurrentFrame} from "remotion";

export default function Scene6() {
  const frame = useCurrentFrame();
  const pop = spring({frame, fps: 30, config: {damping: 180}});
  const opacity = interpolate(frame, [0, 8, 75, 90], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", opacity}}>
      <div style={{textAlign: "center", color: "white", transform: `scale(${0.92 + pop * 0.08})`}}>
        <div style={{fontSize: 88, marginBottom: 18, color: "#6EE7B7", textShadow: "0 0 40px rgba(110,231,183,0.35)"}}>
          ✓
        </div>
        <div style={{fontSize: 64, fontWeight: 700, letterSpacing: -2, marginBottom: 16}}>
          You’re all set
        </div>
        <div style={{fontSize: 28, opacity: 0.78}}>
          Confirmation sent via email and SMS
        </div>
      </div>
    </AbsoluteFill>
  );
}
