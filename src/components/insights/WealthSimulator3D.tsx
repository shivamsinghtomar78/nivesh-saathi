"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Text, Environment } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  IndianRupee,
} from "lucide-react";
import * as THREE from "three";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { calculateMaturity } from "@/lib/maturity";

/* ─── Types ─── */
type TimePoint = {
  month: number;
  value: number;
  interest: number;
  growth: number; // 0→1
};

/* ─── Pure math: generate growth curve data ─── */
function generateGrowthCurve(
  principal: number,
  ratePercent: number,
  tenorMonths: number,
  compounding: "quarterly" | "monthly" | "annual" = "quarterly"
): TimePoint[] {
  const points: TimePoint[] = [];
  for (let m = 0; m <= tenorMonths; m++) {
    const result = calculateMaturity({
      principal,
      ratePercent,
      tenorMonths: Math.max(m, 1),
      compounding,
    });
    const value = m === 0 ? principal : result.maturityAmount;
    points.push({
      month: m,
      value,
      interest: value - principal,
      growth: m / tenorMonths,
    });
  }
  return points;
}

/* ─── 3D Growing Coin Stack ─── */
function CoinStack({
  progress,
  maxCoins,
}: {
  progress: number;
  maxCoins: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const visibleCoins = Math.max(1, Math.ceil(progress * maxCoins));

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.4, 0]}>
      {Array.from({ length: visibleCoins }).map((_, i) => {
        const y = i * 0.18;
        const scale = 1 - i * 0.004;
        const delay = i * 0.02;
        return (
          <CoinDisc
            key={i}
            position={[0, y, 0]}
            scale={scale}
            index={i}
            delay={delay}
            isTop={i === visibleCoins - 1}
          />
        );
      })}

      {/* glow at base */}
      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial
          color="#d7b66d"
          transparent
          opacity={0.08 + progress * 0.12}
        />
      </mesh>
    </group>
  );
}

function CoinDisc({
  position,
  scale,
  index,
  delay,
  isTop,
}: {
  position: [number, number, number];
  scale: number;
  index: number;
  delay: number;
  isTop: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseColor = new THREE.Color("#d7b66d");
  const topColor = new THREE.Color("#efd38b");

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime + delay;
      const hover = Math.sin(t * 1.2) * (isTop ? 0.06 : 0.015);
      meshRef.current.position.y = position[1] + hover;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={[scale, 1, scale]}>
      <cylinderGeometry args={[0.7, 0.7, 0.12, 32]} />
      <meshStandardMaterial
        color={isTop ? topColor : baseColor}
        metalness={0.85}
        roughness={0.18}
        emissive={isTop ? topColor : baseColor}
        emissiveIntensity={isTop ? 0.35 : 0.08 + (index % 3) * 0.04}
      />
    </mesh>
  );
}

function GrowthLabel({
  progress,
  currentValue,
}: {
  progress: number;
  currentValue: number;
}) {
  const formatted = `₹${Math.round(currentValue).toLocaleString("en-IN")}`;

  return (
    <Float speed={1.4} rotationIntensity={0} floatIntensity={0.3}>
      <Text
        position={[0, 2.2 + progress * 0.5, 0]}
        fontSize={0.28}
        color="#efd38b"
        anchorX="center"
        anchorY="middle"
        font="/fonts/WorkSans-SemiBold.woff"
        outlineWidth={0.008}
        outlineColor="#000000"
      >
        {formatted}
      </Text>
    </Float>
  );
}

function ParticleField({ intensity }: { intensity: number }) {
  const count = 40;
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 1] = Math.random() * 4 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.04;
      const positions = ref.current.geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        const y = positions.getY(i);
        positions.setY(i, y + 0.005 * intensity);
        if (y > 3.5) positions.setY(i, -1);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#d7b66d"
        transparent
        opacity={0.3 + intensity * 0.5}
        sizeAttenuation
      />
    </points>
  );
}

function Scene3D({
  progress,
  currentValue,
  maxCoins,
}: {
  progress: number;
  currentValue: number;
  maxCoins: number;
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} color="#fff5e1" />
      <pointLight position={[-2, 3, -2]} intensity={0.4} color="#d7b66d" />
      <spotLight
        position={[0, 6, 0]}
        angle={0.4}
        penumbra={0.6}
        intensity={0.8}
        color="#efd38b"
        castShadow={false}
      />

      <CoinStack progress={progress} maxCoins={maxCoins} />
      <GrowthLabel progress={progress} currentValue={currentValue} />
      <ParticleField intensity={progress} />

      <Environment preset="city" />
    </>
  );
}

/* ─── Mini Chart (2D overlay) ─── */
function MiniChart({
  data,
  currentIndex,
  principal,
}: {
  data: TimePoint[];
  currentIndex: number;
  principal: number;
}) {
  if (data.length < 2) return null;

  const maxVal = data[data.length - 1].value;
  const minVal = principal * 0.95;
  const range = maxVal - minVal || 1;
  const w = 100;
  const h = 40;

  const pathPoints = data
    .map((pt, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((pt.value - minVal) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const filledPath = data
    .slice(0, currentIndex + 1)
    .map((pt, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((pt.value - minVal) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const currentX = (currentIndex / (data.length - 1)) * w;
  const currentY =
    h - ((data[currentIndex].value - minVal) / range) * h;

  return (
    <svg
      viewBox={`0 0 ${w} ${h + 4}`}
      className="w-full h-12 opacity-60"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="wealthChartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d7b66d" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#d7b66d" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* full curve ghost */}
      <path d={pathPoints} fill="none" stroke="rgba(215,182,109,0.15)" strokeWidth="1" />

      {/* filled area */}
      {currentIndex > 0 && (
        <path
          d={`${filledPath} L${currentX.toFixed(1)},${h} L0,${h} Z`}
          fill="url(#wealthChartGrad)"
        />
      )}

      {/* active curve */}
      <path d={filledPath} fill="none" stroke="#d7b66d" strokeWidth="1.5" />

      {/* current dot */}
      <circle cx={currentX} cy={currentY} r="2.5" fill="#efd38b" />
    </svg>
  );
}

/* ─── Main Component ─── */
export default function WealthSimulator3D() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(7.5);
  const [tenor, setTenor] = useState(36);
  const [playing, setPlaying] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const data = useMemo(
    () => generateGrowthCurve(principal, rate, tenor),
    [principal, rate, tenor]
  );

  const currentPoint = data[currentMonth] || data[0];
  const finalResult = calculateMaturity({
    principal,
    ratePercent: rate,
    tenorMonths: tenor,
    compounding: "quarterly",
  });

  const progress = tenor > 0 ? currentMonth / tenor : 0;
  const maxCoins = Math.min(40, Math.max(6, Math.ceil(tenor / 2)));

  const stopAnimation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startAnimation = useCallback(() => {
    stopAnimation();
    setCurrentMonth(0);
    setPlaying(true);

    let month = 0;
    intervalRef.current = setInterval(() => {
      month++;
      if (month > tenor) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setPlaying(false);
        return;
      }
      setCurrentMonth(month);
    }, Math.max(60, 2400 / tenor));
  }, [tenor, stopAnimation]);

  const resetSimulation = useCallback(() => {
    stopAnimation();
    setCurrentMonth(0);
  }, [stopAnimation]);

  return (
    <Card className="relative overflow-hidden border-outline bg-panel shadow-sm">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(215,182,109,0.1),transparent_60%)]" />

      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Time-Travel Simulator
              </p>
            </div>
            <CardTitle className="mt-2 text-xl">
              Visualize Your Future Wealth
            </CardTitle>
            <CardDescription className="mt-1 max-w-lg">
              Watch your FD grow in real-time. Adjust parameters and hit play to see compound interest build your wealth.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline bg-inner-panel text-text-muted transition hover:text-accent"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <CardContent className="relative z-10 grid gap-5">
              {/* 3D Canvas */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-panel)] border border-outline bg-[#060606]">
                <Canvas
                  camera={{ position: [0, 1.6, 4.5], fov: 42 }}
                  dpr={[1, 1.5]}
                  gl={{ antialias: true, alpha: true }}
                >
                  <Scene3D
                    progress={progress}
                    currentValue={currentPoint.value}
                    maxCoins={maxCoins}
                  />
                </Canvas>

                {/* HUD overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                  <MiniChart
                    data={data}
                    currentIndex={currentMonth}
                    principal={principal}
                  />
                </div>

                {/* Time badge */}
                <div className="absolute left-3 top-3">
                  <Badge
                    variant="outline"
                    className="border-accent/25 bg-black/60 text-[10px] font-semibold text-accent backdrop-blur"
                  >
                    Month {currentMonth} / {tenor}
                  </Badge>
                </div>

                {/* Stats overlay */}
                <div className="absolute right-3 top-3 grid gap-1 text-right">
                  <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
                    Current Value
                  </p>
                  <p className="financial-value text-lg font-bold text-[#efd38b]">
                    {formatCurrency(Math.round(currentPoint.value))}
                  </p>
                  {currentPoint.interest > 0 && (
                    <p className="text-[10px] font-semibold text-success">
                      +{formatCurrency(Math.round(currentPoint.interest))} interest
                    </p>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="grid gap-4 tablet:grid-cols-[1fr_1fr_0.7fr]">
                <label className="grid gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    <IndianRupee className="h-3 w-3" /> Principal
                  </span>
                  <input
                    type="range"
                    min={10000}
                    max={5000000}
                    step={10000}
                    value={principal}
                    onChange={(e) => {
                      setPrincipal(Number(e.target.value));
                      resetSimulation();
                    }}
                    className="accent-accent"
                  />
                  <span className="financial-value text-sm font-semibold text-text-strong">
                    {formatCurrency(principal)}
                  </span>
                </label>

                <label className="grid gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    <TrendingUp className="h-3 w-3" /> Rate (% p.a.)
                  </span>
                  <input
                    type="range"
                    min={4}
                    max={10}
                    step={0.1}
                    value={rate}
                    onChange={(e) => {
                      setRate(Number(e.target.value));
                      resetSimulation();
                    }}
                    className="accent-accent"
                  />
                  <span className="financial-value text-sm font-semibold text-accent">
                    {rate.toFixed(1)}%
                  </span>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Tenor (months)
                  </span>
                  <input
                    type="range"
                    min={3}
                    max={120}
                    step={1}
                    value={tenor}
                    onChange={(e) => {
                      setTenor(Number(e.target.value));
                      resetSimulation();
                    }}
                    className="accent-accent"
                  />
                  <span className="financial-value text-sm font-semibold text-text-strong">
                    {tenor} mo ({(tenor / 12).toFixed(1)} yr)
                  </span>
                </label>
              </div>

              {/* Play controls + Final stats */}
              <div className="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={playing ? stopAnimation : startAnimation}
                    className="rounded-full"
                  >
                    {playing ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {playing ? "Pause" : "Play Time-Travel"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetSimulation}
                    className="rounded-full"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-[var(--radius-panel)] border border-outline bg-accent-soft px-4 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                      Maturity
                    </p>
                    <p className="financial-value mt-1 text-lg font-bold text-text-strong">
                      {formatCurrency(finalResult.maturityAmount)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-panel)] border border-outline bg-highlight-soft px-4 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-highlight">
                      Interest
                    </p>
                    <p className="financial-value mt-1 text-lg font-bold text-text-strong">
                      {formatCurrency(finalResult.interestEarned)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel px-4 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Yield
                    </p>
                    <p className="financial-value mt-1 text-lg font-bold text-success">
                      {finalResult.effectiveYield}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
