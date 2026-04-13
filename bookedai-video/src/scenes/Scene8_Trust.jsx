import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";

const Badge = ({icon, label, sublabel, delay, accentColor}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const pop = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {damping: 160, stiffness: 120},
  });

  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        background: "rgba(255,255,255,0.07)",
        border: `1.5px solid rgba(255,255,255,0.14)`,
        borderRadius: 24,
        padding: "24px 36px",
        minWidth: 480,
        backdropFilter: "blur(12px)",
        boxShadow: `0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)`,
        transform: `scale(${0.88 + pop * 0.12}) translateY(${(1 - pop) * 28}px)`,
        opacity,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: accentColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 30,
          boxShadow: `0 4px 20px ${accentColor}55`,
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div>
        <div style={{color: "white", fontSize: 26, fontWeight: 700, letterSpacing: -0.5}}>
          {label}
        </div>
        <div style={{color: "rgba(255,255,255,0.58)", fontSize: 18, marginTop: 4, letterSpacing: 0.2}}>
          {sublabel}
        </div>
      </div>
    </div>
  );
};

export default function Scene8() {
  const frame = useCurrentFrame();

  const headingOpacity = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: "clamp"});
  const headingY = interpolate(frame, [0, 18], [-24, 0], {extrapolateRight: "clamp"});

  const sceneOpacity = interpolate(frame, [0, 10, 105, 120], [0, 1, 1, 0]);

  // Divider line
  const lineWidth = interpolate(frame, [18, 40], [0, 320], {extrapolateRight: "clamp"});

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: sceneOpacity,
        padding: 80,
      }}
    >
      <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 40}}>

        {/* Header */}
        <div
          style={{
            textAlign: "center",
            opacity: headingOpacity,
            transform: `translateY(${headingY}px)`,
          }}
        >
          <div
            style={{
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            Backed & Recognised
          </div>
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: "white",
              letterSpacing: -1.5,
              lineHeight: 1,
            }}
          >
            Trusted by the best
          </div>

          {/* Animated underline */}
          <div style={{display: "flex", justifyContent: "center", marginTop: 18}}>
            <div
              style={{
                height: 3,
                width: lineWidth,
                background: "linear-gradient(90deg, #3B82F6, #6EE7B7)",
                borderRadius: 99,
              }}
            />
          </div>
        </div>

        {/* Badges */}
        <div style={{display: "flex", flexDirection: "column", gap: 18}}>
          <Badge
            icon={
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <text x="4" y="26" fontSize="26" fontWeight="700" fill="white">G</text>
              </svg>
            }
            label="Google for Startups"
            sublabel="Accelerator program member"
            delay={28}
            accentColor="linear-gradient(135deg, #4285F4, #34A853)"
          />

          <Badge
            icon={
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="white" strokeWidth="2.5" fill="none"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
              </svg>
            }
            label="OpenAI for Startups"
            sublabel="Startup program member"
            delay={52}
            accentColor="linear-gradient(135deg, #10b981, #065f46)"
          />

          <Badge
            icon="🏆"
            label="AI for Business Hackathon"
            sublabel="1st Place Winner · Auschain"
            delay={76}
            accentColor="linear-gradient(135deg, #F59E0B, #B45309)"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}
