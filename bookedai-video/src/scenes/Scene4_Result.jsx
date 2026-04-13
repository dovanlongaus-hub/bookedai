import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";

const Card = ({title, subtitle, time, price, delay}) => {
  const frame = useCurrentFrame();
  const translateY = interpolate(frame, [delay, delay + 18], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [delay, delay + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 420,
        background: "rgba(255,255,255,0.95)",
        color: "#0A2540",
        borderRadius: 28,
        padding: 28,
        boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      <div style={{fontSize: 34, fontWeight: 700, marginBottom: 10}}>{title}</div>
      <div style={{fontSize: 22, opacity: 0.7, marginBottom: 16}}>{subtitle}</div>
      <div style={{fontSize: 24, marginBottom: 8}}>{time}</div>
      <div style={{fontSize: 28, fontWeight: 700}}>{price}</div>
    </div>
  );
};

export default function Scene4() {
  const opacity = interpolate(useCurrentFrame(), [0, 10, 105, 120], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", padding: 80, opacity}}>
      <div style={{textAlign: "center", marginBottom: 42, color: "white"}}>
        <div style={{fontSize: 56, fontWeight: 700, letterSpacing: -1.5}}>
          Perfect matches. Instantly.
        </div>
      </div>

      <div style={{display: "flex", gap: 24, alignItems: "center", justifyContent: "center"}}>
        <Card title="Future Swim Caringbah" subtitle="Beginner • Age 5+" time="Sat 10:00 AM" price="$25" delay={10} />
        <Card title="Future Swim Kirrawee" subtitle="Beginner • Age 5+" time="Sun 9:30 AM" price="$27" delay={24} />
      </div>
    </AbsoluteFill>
  );
}
