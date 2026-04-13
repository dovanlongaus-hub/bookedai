#!/usr/bin/env bash
set -e

PROJECT_DIR="$HOME/BookedAI/bookedai-video"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Không tìm thấy project tại: $PROJECT_DIR"
  echo "Hãy chắc rằng bạn đã tạo project Remotion trước."
  exit 1
fi

cd "$PROJECT_DIR"
mkdir -p src/scenes

cat > src/Root.jsx <<'EOT'
import { Composition } from "remotion";
import { BookedAI } from "./BookedAI";

export const Root = () => {
  return (
    <>
      <Composition
        id="BookedAI"
        component={BookedAI}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
EOT

cat > src/BookedAI.jsx <<'EOT'
import { AbsoluteFill, Sequence } from "remotion";
import Scene1 from "./scenes/Scene1_Pain";
import Scene2 from "./scenes/Scene2_Brand";
import Scene3 from "./scenes/Scene3_AIChat";
import Scene4 from "./scenes/Scene4_Result";
import Scene5 from "./scenes/Scene5_Booking";
import Scene6 from "./scenes/Scene6_Success";
import Scene7 from "./scenes/Scene7_Outro";

export const BookedAI = () => {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at top, #16345c 0%, #0A2540 45%, #06111f 100%)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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

      <Sequence from={660} durationInFrames={90}>
        <Scene7 />
      </Sequence>
    </AbsoluteFill>
  );
};
EOT

cat > src/scenes/Scene1_Pain.jsx <<'EOT'
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export default function Scene1() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20, 70, 90], [0, 1, 1, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 120,
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          textAlign: "center",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 24,
            opacity: 0.7,
            marginBottom: 24,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Sydney parents
        </div>
        <div
          style={{
            fontSize: 76,
            lineHeight: 1.08,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          Booking swim classes shouldn’t feel like a second job.
        </div>
      </div>
    </AbsoluteFill>
  );
}
EOT

cat > src/scenes/Scene2_Brand.jsx <<'EOT'
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";

export default function Scene2() {
  const frame = useCurrentFrame();
  const scale = spring({
    frame,
    fps: 30,
    config: { damping: 200 },
  });
  const opacity = interpolate(frame, [0, 10, 45, 60], [0, 1, 1, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${0.9 + scale * 0.1})`,
          textAlign: "center",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -3,
            marginBottom: 20,
          }}
        >
          BookedAI
        </div>
        <div
          style={{
            fontSize: 30,
            opacity: 0.8,
            letterSpacing: -0.5,
          }}
        >
          Ask. Decide. Book.
        </div>
      </div>
    </AbsoluteFill>
  );
}
EOT

cat > src/scenes/Scene3_AIChat.jsx <<'EOT'
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";

const Bubble = ({ children, align = "left", visible = true }) => {
  return (
    <div
      style={{
        alignSelf: align === "right" ? "flex-end" : "flex-start",
        background:
          align === "right"
            ? "linear-gradient(135deg, #3B82F6, #2563EB)"
            : "rgba(255,255,255,0.08)",
        color: "white",
        padding: "18px 22px",
        borderRadius: 22,
        fontSize: 28,
        lineHeight: 1.35,
        maxWidth: "80%",
        backdropFilter: "blur(20px)",
        boxShadow:
          align === "right"
            ? "0 10px 30px rgba(37,99,235,0.35)"
            : "0 10px 30px rgba(0,0,0,0.18)",
        opacity: visible ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
};

export default function Scene3() {
  const frame = useCurrentFrame();
  const scale = spring({ frame, fps: 30, config: { damping: 200 } });
  const opacity = interpolate(frame, [0, 10, 165, 180], [0, 1, 1, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        opacity,
      }}
    >
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
        <div
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 20,
            marginBottom: 22,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          AI booking assistant
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
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
EOT

cat > src/scenes/Scene4_Result.jsx <<'EOT'
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const Card = ({ title, subtitle, time, price, delay }) => {
  const frame = useCurrentFrame();
  const translateY = interpolate(
    frame,
    [delay, delay + 18],
    [50, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = interpolate(
    frame,
    [delay, delay + 14],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

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
      <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ fontSize: 22, opacity: 0.7, marginBottom: 16 }}>
        {subtitle}
      </div>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{time}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{price}</div>
    </div>
  );
};

export default function Scene4() {
  const opacity = interpolate(useCurrentFrame(), [0, 10, 105, 120], [0, 1, 1, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        opacity,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 42, color: "white" }}>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1.5 }}>
          Perfect matches. Instantly.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card
          title="Future Swim Caringbah"
          subtitle="Beginner • Age 5+"
          time="Sat 10:00 AM"
          price="$25"
          delay={10}
        />
        <Card
          title="Future Swim Kirrawee"
          subtitle="Beginner • Age 5+"
          time="Sun 9:30 AM"
          price="$27"
          delay={24}
        />
      </div>
    </AbsoluteFill>
  );
}
EOT

cat > src/scenes/Scene5_Booking.jsx <<'EOT'
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export default function Scene5() {
  const frame = useCurrentFrame();
  const buttonScale = interpolate(
    frame,
    [22, 34, 48],
    [1, 0.94, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = interpolate(frame, [0, 10, 105, 120], [0, 1, 1, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        opacity,
      }}
    >
      <div
        style={{
          width: 760,
          borderRadius: 32,
          background: "rgba(255,255,255,0.96)",
          padding: 36,
          boxShadow: "0 20px 70px rgba(0,0,0,0.22)",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#0A2540",
            marginBottom: 28,
            letterSpacing: -1,
          }}
        >
          Checkout
        </div>

        <div
          style={{
            color: "#0A2540",
            fontSize: 28,
            marginBottom: 14,
          }}
        >
          Future Swim Caringbah
        </div>
        <div
          style={{
            color: "rgba(10,37,64,0.7)",
            fontSize: 22,
            marginBottom: 30,
          }}
        >
          Beginner • Sat 10:00 AM • Sydney
        </div>

        <div
          style={{
            background: "#F3F6FA",
            borderRadius: 20,
            padding: "18px 22px",
            fontSize: 24,
            color: "#0A2540",
            marginBottom: 16,
          }}
        >
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
EOT

cat > src/scenes/Scene6_Success.jsx <<'EOT'
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";

export default function Scene6() {
  const frame = useCurrentFrame();
  const pop = spring({ frame, fps: 30, config: { damping: 180 } });
  const opacity = interpolate(frame, [0, 8, 75, 90], [0, 1, 1, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "white",
          transform: `scale(${0.92 + pop * 0.08})`,
        }}
      >
        <div
          style={{
            fontSize: 88,
            marginBottom: 18,
            color: "#6EE7B7",
            textShadow: "0 0 40px rgba(110,231,183,0.35)",
          }}
        >
          ✓
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -2,
            marginBottom: 16,
          }}
        >
          You’re all set
        </div>
        <div
          style={{
            fontSize: 28,
            opacity: 0.78,
          }}
        >
          Confirmation sent via email and SMS
        </div>
      </div>
    </AbsoluteFill>
  );
}
EOT

cat > src/scenes/Scene7_Outro.jsx <<'EOT'
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export default function Scene7() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 90], [0, 1, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div style={{ textAlign: "center", color: "white" }}>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -3,
            marginBottom: 18,
          }}
        >
          BookedAI
        </div>
        <div
          style={{
            fontSize: 32,
            opacity: 0.82,
            letterSpacing: -0.5,
          }}
        >
          Book the right class. Instantly.
        </div>
      </div>
    </AbsoluteFill>
  );
}
EOT

echo
echo "✅ Setup xong."
echo "Chạy preview bằng:"
echo "  cd $PROJECT_DIR && npm run dev"
echo
echo "Render MP4 bằng:"
echo "  cd $PROJECT_DIR && npx remotion render BookedAI out/bookedai.mp4"
