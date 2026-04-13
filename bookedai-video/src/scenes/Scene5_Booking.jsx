import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";

export default function Scene5() {
  const frame = useCurrentFrame();
  const buttonScale = interpolate(frame, [22, 34, 48], [1, 0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 10, 105, 120], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", padding: 80, opacity}}>
      <div
        style={{
          width: 760,
          borderRadius: 32,
          background: "rgba(255,255,255,0.96)",
          padding: 36,
          boxShadow: "0 20px 70px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{fontSize: 48, fontWeight: 700, color: "#0A2540", marginBottom: 28, letterSpacing: -1}}>
          Checkout
        </div>

        <div style={{color: "#0A2540", fontSize: 28, marginBottom: 14}}>
          Future Swim Caringbah
        </div>
        <div style={{color: "rgba(10,37,64,0.7)", fontSize: 22, marginBottom: 30}}>
          Beginner • Sat 10:00 AM • Sydney
        </div>

        <div style={{background: "#F3F6FA", borderRadius: 20, padding: "18px 22px", fontSize: 24, color: "#0A2540", marginBottom: 16}}>
          Card ending in 4242
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #2563EB, #3B82F6)",
            color: "white",
            padding: "18px 34px",
            borderRadius: 18,
            fontSize: 28,
            fontWeight: 700,
            transform: `scale(${buttonScale})`,
            boxShadow: "0 14px 40px rgba(37,99,235,0.35)",
          }}
        >
          Pay & Book
        </div>
      </div>
    </AbsoluteFill>
  );
}
