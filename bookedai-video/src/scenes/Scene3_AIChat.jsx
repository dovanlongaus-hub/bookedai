import {AbsoluteFill, interpolate, spring, useCurrentFrame} from "remotion";

const Bubble = ({children, align = "left", visible = true}) => {
  return (
    <div
      style={{
        alignSelf: align === "right" ? "flex-end" : "flex-start",
        background: align === "right" ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "rgba(255,255,255,0.08)",
        color: "white",
        padding: "18px 22px",
        borderRadius: 22,
        fontSize: 28,
        lineHeight: 1.35,
        maxWidth: "80%",
        backdropFilter: "blur(20px)",
        boxShadow: align === "right" ? "0 10px 30px rgba(37,99,235,0.35)" : "0 10px 30px rgba(0,0,0,0.18)",
        opacity: visible ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
};

export default function Scene3() {
  const frame = useCurrentFrame();
  const scale = spring({frame, fps: 30, config: {damping: 200}});
  const opacity = interpolate(frame, [0, 10, 165, 180], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", padding: 80, opacity}}>
      <div
        style={{
          width: 760,
          borderRadius: 36,
          padding: 28,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(24px)",
          transform: `scale(${0.96 + scale * 0.04})`,
          boxShadow: "0 25px 80px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{color: "rgba(255,255,255,0.7)", fontSize: 20, marginBottom: 22, letterSpacing: 1.2, textTransform: "uppercase"}}>
          AI booking assistant
        </div>

        <div style={{display: "flex", flexDirection: "column", gap: 16}}>
          <Bubble visible={frame >= 0}>How old is your child?</Bubble>
          <Bubble align="right" visible={frame >= 24}>5 years old</Bubble>
          <Bubble visible={frame >= 54}>Can they swim already?</Bubble>
          <Bubble align="right" visible={frame >= 82}>Beginner</Bubble>
          <Bubble visible={frame >= 112}>Preferred suburb?</Bubble>
          <Bubble align="right" visible={frame >= 138}>Caringbah</Bubble>
        </div>
      </div>
    </AbsoluteFill>
  );
}
