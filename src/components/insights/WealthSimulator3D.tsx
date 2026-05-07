"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Text } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import * as THREE from "three";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateMaturity } from "@/lib/maturity";
import { cn, formatCurrency } from "@/lib/utils";

type Compounding = "quarterly" | "monthly" | "annual";

type TimePoint = {
  month: number;
  value: number;
  interest: number;
  growth: number;
};

type Scenario = {
  principal: number;
  rate: number;
  tenor: number;
  compounding: Compounding;
};

const SPEEDS = [
  { label: "Calm", value: 0.75 },
  { label: "Cruise", value: 1 },
  { label: "Warp", value: 1.6 },
] as const;

const COMPOUNDING_OPTIONS: Array<{ label: string; value: Compounding }> = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Annual", value: "annual" },
];

function generateGrowthCurve({ principal, rate, tenor, compounding }: Scenario): TimePoint[] {
  return Array.from({ length: tenor + 1 }, (_, month) => {
    const value =
      month === 0
        ? principal
        : calculateMaturity({
            principal,
            ratePercent: rate,
            tenorMonths: month,
            compounding,
          }).maturityAmount;

    return {
      month,
      value,
      interest: value - principal,
      growth: tenor > 0 ? month / tenor : 0,
    };
  });
}

function formatMonthLabel(month: number) {
  if (month < 12) return `${month} mo`;
  const years = Math.floor(month / 12);
  const remainingMonths = month % 12;
  return remainingMonths ? `${years} yr ${remainingMonths} mo` : `${years} yr`;
}

function getMaturityLabel(tenor: number) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(
    calculateMaturity({
      principal: 100000,
      ratePercent: 7,
      tenorMonths: tenor,
      compounding: "quarterly",
    }).maturityDate
  );
}

function CoinDisc({
  index,
  isTop,
  position,
  scale,
}: {
  index: number;
  isTop: boolean;
  position: [number, number, number];
  scale: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coinColor = isTop ? "#ffe2a2" : index % 2 === 0 ? "#d7b66d" : "#caa15f";

  useFrame((state) => {
    if (!meshRef.current) return;
    const lift = Math.sin(state.clock.elapsedTime * 1.7 + index * 0.18) * (isTop ? 0.055 : 0.012);
    meshRef.current.position.y = position[1] + lift;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[0, index * 0.12, 0]} scale={[scale, 1, scale]}>
      <cylinderGeometry args={[0.72, 0.72, 0.12, 48]} />
      <meshStandardMaterial
        color={coinColor}
        emissive={coinColor}
        emissiveIntensity={isTop ? 0.32 : 0.08}
        metalness={0.82}
        roughness={0.2}
      />
    </mesh>
  );
}

function CoinStack({
  compact,
  maxCoins,
  progress,
}: {
  compact: boolean;
  maxCoins: number;
  progress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const visibleCoins = Math.max(1, Math.ceil(Math.max(0.025, progress) * maxCoins));
  const baseY = compact ? -0.25 : -1.45;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * (0.22 + progress * 0.18);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, baseY + progress * 0.25, 0.04);
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: visibleCoins }).map((_, index) => (
        <CoinDisc
          key={index}
          index={index}
          isTop={index === visibleCoins - 1}
          position={[0, index * 0.145, 0]}
          scale={Math.max(0.78, 1 - index * 0.004)}
        />
      ))}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1.55 + progress * 0.4, 72]} />
        <meshBasicMaterial color="#d7b66d" transparent opacity={0.12 + progress * 0.18} />
      </mesh>
    </group>
  );
}

function GrowthBeams({ compact, progress }: { compact: boolean; progress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z = state.clock.elapsedTime * 0.12;
  });

  return (
    <group ref={groupRef} position={[0, (compact ? 0.5 : 0.85) + progress * 0.8, -0.55]}>
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 1.65, Math.sin(angle) * 0.22, Math.sin(angle) * 1.15]}
            rotation={[Math.PI / 2, 0, angle]}
          >
            <boxGeometry args={[0.025, 0.025, 1.4 + progress * 0.7]} />
            <meshBasicMaterial color={index % 2 ? "#6dbba1" : "#efd38b"} transparent opacity={0.16 + progress * 0.24} />
          </mesh>
        );
      })}
    </group>
  );
}

function ParticleField({ intensity }: { intensity: number }) {
  const ref = useRef<THREE.Points>(null);
  const count = 72;
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      const angle = index * 2.399963;
      const radius = 0.9 + (index % 9) * 0.22;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = -1.2 + (index % 24) * 0.18;
      values[index * 3 + 2] = Math.sin(angle) * radius;
    }
    return values;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.05;
    const attribute = ref.current.geometry.attributes.position;
    for (let index = 0; index < count; index++) {
      const currentY = attribute.getY(index);
      const nextY = currentY + 0.004 + intensity * 0.012;
      attribute.setY(index, nextY > 3.1 ? -1.2 : nextY);
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#efd38b" opacity={0.26 + intensity * 0.48} size={0.045} sizeAttenuation transparent />
    </points>
  );
}

function FloatingValue({
  compact,
  currentValue,
  progress,
}: {
  compact: boolean;
  currentValue: number;
  progress: number;
}) {
  return (
    <Float floatIntensity={0.28} rotationIntensity={0} speed={1.2}>
      <Text
        anchorX="center"
        anchorY="middle"
        color="#ffe2a2"
        fontSize={0.28}
        outlineColor="#050504"
        outlineWidth={0.01}
        position={[0, (compact ? 1.62 : 2.05) + progress * 0.55, 0]}
      >
        {`Rs ${Math.round(currentValue).toLocaleString("en-IN")}`}
      </Text>
    </Float>
  );
}

function CompactCoinBeacon({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7) * 0.04;
    groupRef.current.scale.setScalar(1 + progress * 0.28);
  });

  return (
    <group ref={groupRef} position={[0, 0.05, 0.15]}>
      <mesh>
        <circleGeometry args={[0.82, 64]} />
        <meshBasicMaterial color="#d7b66d" />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[0.58, 0.74, 64]} />
        <meshBasicMaterial color="#ffe2a2" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function ResponsiveCamera() {
  const { camera, viewport } = useThree();
  const compact = viewport.aspect < 1;

  useFrame(() => {
    camera.position.lerp(new THREE.Vector3(0, compact ? 2.15 : 1.25, compact ? 4.95 : 4.7), 0.08);
    camera.lookAt(0, compact ? -0.2 : 0.18, 0);
  });

  return null;
}

function Scene3D({
  currentValue,
  maxCoins,
  progress,
}: {
  currentValue: number;
  maxCoins: number;
  progress: number;
}) {
  const { viewport } = useThree();
  const compact = viewport.aspect < 1;

  return (
    <>
      <color attach="background" args={["#050504"]} />
      <ambientLight intensity={0.45} />
      <directionalLight color="#fff5df" intensity={1.35} position={[4, 5, 4]} />
      <pointLight color="#6dbba1" intensity={0.55 + progress * 0.45} position={[-2.4, 2.3, 1.6]} />
      <spotLight angle={0.5} color="#efd38b" intensity={0.7 + progress * 0.55} penumbra={0.7} position={[0, 5, 1]} />
      <ResponsiveCamera />
      {compact ? <CompactCoinBeacon progress={progress} /> : null}
      <CoinStack compact={compact} maxCoins={maxCoins} progress={progress} />
      <GrowthBeams compact={compact} progress={progress} />
      <FloatingValue compact={compact} currentValue={currentValue} progress={progress} />
      <ParticleField intensity={progress} />
      <Environment preset="city" />
    </>
  );
}

function MiniChart({
  currentIndex,
  data,
  principal,
}: {
  currentIndex: number;
  data: TimePoint[];
  principal: number;
}) {
  if (data.length < 2) return null;

  const width = 100;
  const height = 42;
  const maxValue = data[data.length - 1].value;
  const minValue = principal * 0.96;
  const range = maxValue - minValue || 1;

  const toPoint = (point: TimePoint, index: number) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((point.value - minValue) / range) * height;
    return { x, y };
  };

  const fullPath = data
    .map((point, index) => {
      const { x, y } = toPoint(point, index);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const activeData = data.slice(0, currentIndex + 1);
  const activePath = activeData
    .map((point, index) => {
      const { x, y } = toPoint(point, index);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const current = toPoint(data[currentIndex], currentIndex);

  return (
    <svg aria-hidden="true" className="h-14 w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height + 6}`}>
      <defs>
        <linearGradient id="wealthChartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d7b66d" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#6dbba1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fullPath} fill="none" stroke="rgba(246,240,228,0.18)" strokeWidth="1" />
      {currentIndex > 0 ? (
        <path d={`${activePath} L${current.x.toFixed(1)},${height} L0,${height} Z`} fill="url(#wealthChartFill)" />
      ) : null}
      <path d={activePath} fill="none" stroke="#efd38b" strokeLinecap="round" strokeWidth="1.6" />
      <circle cx={current.x} cy={current.y} fill="#6dbba1" r="2.8" />
    </svg>
  );
}

function MetricTile({
  label,
  tone = "muted",
  value,
}: {
  label: string;
  tone?: "accent" | "highlight" | "muted" | "success";
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius-panel)] border border-outline bg-inner-panel px-4 py-3">
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.14em]",
          tone === "accent" && "text-accent",
          tone === "highlight" && "text-highlight",
          tone === "success" && "text-success",
          tone === "muted" && "text-text-muted"
        )}
      >
        {label}
      </p>
      <p className="financial-value mt-1 truncate text-base font-bold text-text-strong tablet:text-lg">{value}</p>
    </div>
  );
}

function MobileCoinFallback({ progress }: { progress: number }) {
  const visibleCoins = Math.max(1, Math.ceil(3 + progress * 6));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[178px] z-[1] flex justify-center tablet:hidden">
      <div className="relative h-24 w-40" style={{ perspective: "520px" }}>
        <div className="absolute inset-x-0 bottom-0 mx-auto h-16 w-36 rounded-full bg-accent/12 blur-md" />
        {Array.from({ length: visibleCoins }).map((_, index) => (
          <div
            className="absolute left-1/2 h-9 w-32 -translate-x-1/2 rounded-[50%] border border-[#ffe2a2]/55 bg-[#d7b66d] shadow-[0_10px_24px_rgba(215,182,109,0.18)]"
            key={index}
            style={{
              bottom: `${index * 5}px`,
              transform: "translateX(-50%) rotateX(64deg)",
              zIndex: index,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function WealthSimulator3D() {
  const [scenario, setScenario] = useState<Scenario>({
    principal: 100000,
    rate: 7.5,
    tenor: 36,
    compounding: "quarterly",
  });
  const [currentMonth, setCurrentMonth] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  const data = useMemo(() => generateGrowthCurve(scenario), [scenario]);
  const currentPoint = data[currentMonth] ?? data[0];
  const finalResult = useMemo(
    () =>
      calculateMaturity({
        principal: scenario.principal,
        ratePercent: scenario.rate,
        tenorMonths: scenario.tenor,
        compounding: scenario.compounding,
      }),
    [scenario]
  );
  const progress = scenario.tenor > 0 ? currentMonth / scenario.tenor : 0;
  const interestShare = finalResult.maturityAmount > 0 ? finalResult.interestEarned / finalResult.maturityAmount : 0;
  const maxCoins = Math.min(48, Math.max(10, Math.ceil(scenario.tenor / 2.5)));
  const maturityLabel = getMaturityLabel(scenario.tenor);

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastFrameRef.current = null;
    progressRef.current = currentMonth;
    setPlaying(false);
  }, [currentMonth]);

  const resetSimulation = useCallback(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastFrameRef.current = null;
    progressRef.current = 0;
    setCurrentMonth(0);
    setPlaying(false);
  }, []);

  const runAnimation = useCallback(
    function tick(timestamp: number) {
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
      const delta = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      progressRef.current += (delta / 2400) * scenario.tenor * speed;
      const nextMonth = Math.min(scenario.tenor, Math.round(progressRef.current));
      setCurrentMonth(nextMonth);

      if (nextMonth >= scenario.tenor) {
        progressRef.current = scenario.tenor;
        animationRef.current = null;
        lastFrameRef.current = null;
        setPlaying(false);
        return;
      }

      animationRef.current = window.requestAnimationFrame(tick);
    },
    [scenario.tenor, speed]
  );

  const togglePlayback = useCallback(() => {
    if (playing) {
      stopAnimation();
      return;
    }

    if (currentMonth >= scenario.tenor) {
      progressRef.current = 0;
      setCurrentMonth(0);
    } else {
      progressRef.current = currentMonth;
    }

    setPlaying(true);
    animationRef.current = window.requestAnimationFrame(runAnimation);
  }, [currentMonth, playing, runAnimation, scenario.tenor, stopAnimation]);

  const updateScenario = useCallback(
    (next: Partial<Scenario>) => {
      resetSimulation();
      setScenario((current) => ({ ...current, ...next }));
    },
    [resetSimulation]
  );

  useEffect(() => resetSimulation, [resetSimulation]);

  return (
    <Card className="relative overflow-hidden border-outline bg-panel shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_48%_0%,rgba(109,187,161,0.13),transparent_42%),radial-gradient(ellipse_at_85%_20%,rgba(215,182,109,0.13),transparent_36%)]" />
      <CardHeader className="relative z-10 pb-3">
        <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Future Wealth</p>
            </div>
            <CardTitle className="mt-2 text-2xl">Time-travel your FD to maturity</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Fast-forward month by month and watch principal turn into maturity value through compounding.
            </CardDescription>
          </div>
          <button
            aria-label={expanded ? "Collapse wealth simulator" : "Expand wealth simulator"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline bg-inner-panel text-text-muted hover:text-accent"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <CardContent className="relative z-10 grid gap-5">
              <div className="grid gap-5 laptop:grid-cols-[minmax(0,1.25fr)_360px]">
                <div className="relative min-h-[520px] overflow-hidden rounded-[var(--radius-panel)] border border-outline bg-[#050504] tablet:min-h-[430px]">
                  <Canvas
                    camera={{ fov: 42, position: [0, 1.25, 4.7] }}
                    dpr={[1, 1.6]}
                    gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
                    onCreated={({ gl, scene }) => {
                      gl.setClearColor("#050504", 1);
                      scene.background = new THREE.Color("#050504");
                    }}
                    style={{ background: "#050504" }}
                  >
                    <Scene3D currentValue={currentPoint.value} maxCoins={maxCoins} progress={progress} />
                  </Canvas>
                  <MobileCoinFallback progress={progress} />

                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                    <Badge className="border-accent/25 bg-black/55 text-accent backdrop-blur" variant="outline">
                      {formatMonthLabel(currentMonth)} / {formatMonthLabel(scenario.tenor)}
                    </Badge>
                    <div className="max-w-[12rem] rounded-[var(--radius-panel)] border border-white/10 bg-black/55 p-3 text-right backdrop-blur">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">Now showing</p>
                      <p className="financial-value mt-1 text-lg font-bold text-[#ffe2a2]">{formatCurrency(currentPoint.value)}</p>
                      <p className="financial-value mt-1 text-xs font-semibold text-success">
                        +{formatCurrency(Math.max(0, currentPoint.interest))}
                      </p>
                    </div>
                  </div>

                  <div className="absolute inset-x-4 bottom-4 rounded-[var(--radius-panel)] border border-white/10 bg-black/45 p-3 backdrop-blur">
                    <MiniChart currentIndex={currentMonth} data={data} principal={scenario.principal} />
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.13em] text-white/55">
                      <span>Today</span>
                      <span>{maturityLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="grid content-start gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <MetricTile label="Maturity" tone="accent" value={formatCurrency(finalResult.maturityAmount)} />
                    <MetricTile label="Interest" tone="highlight" value={formatCurrency(finalResult.interestEarned)} />
                    <MetricTile label="Yield" tone="success" value={`${finalResult.effectiveYield}%`} />
                    <MetricTile label="Interest mix" value={`${Math.round(interestShare * 100)}%`} />
                  </div>

                  <div className="grid gap-4 rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                    <label className="grid gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        <IndianRupee className="h-3.5 w-3.5" /> Principal
                      </span>
                      <input
                        className="accent-accent"
                        max={5000000}
                        min={10000}
                        onChange={(event) => updateScenario({ principal: Number(event.target.value) })}
                        step={10000}
                        type="range"
                        value={scenario.principal}
                      />
                      <span className="financial-value text-sm font-semibold text-text-strong">{formatCurrency(scenario.principal)}</span>
                    </label>

                    <label className="grid gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        <TrendingUp className="h-3.5 w-3.5" /> Rate
                      </span>
                      <input
                        className="accent-accent"
                        max={10}
                        min={4}
                        onChange={(event) => updateScenario({ rate: Number(event.target.value) })}
                        step={0.1}
                        type="range"
                        value={scenario.rate}
                      />
                      <span className="financial-value text-sm font-semibold text-accent">{scenario.rate.toFixed(1)}% p.a.</span>
                    </label>

                    <label className="grid gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        <CalendarClock className="h-3.5 w-3.5" /> Tenor
                      </span>
                      <input
                        className="accent-accent"
                        max={120}
                        min={3}
                        onChange={(event) => updateScenario({ tenor: Number(event.target.value) })}
                        step={1}
                        type="range"
                        value={scenario.tenor}
                      />
                      <span className="financial-value text-sm font-semibold text-text-strong">
                        {formatMonthLabel(scenario.tenor)}
                      </span>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Compounding</span>
                      <select
                        className="custom-select min-h-11 rounded-[var(--radius-input)] border border-outline bg-input-bg px-3 text-sm font-semibold text-text-strong outline-none focus:border-accent"
                        onChange={(event) => updateScenario({ compounding: event.target.value as Compounding })}
                        value={scenario.compounding}
                      >
                        {COMPOUNDING_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      {SPEEDS.map((option) => (
                        <button
                          className={cn(
                            "min-h-10 rounded-full border px-3 text-xs font-semibold transition",
                            speed === option.value
                              ? "border-accent bg-accent text-on-accent"
                              : "border-outline bg-input-bg text-text-muted hover:border-accent/35 hover:text-text-strong"
                          )}
                          key={option.value}
                          onClick={() => setSpeed(option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={togglePlayback} variant="secondary">
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {playing ? "Pause" : currentMonth > 0 ? "Resume" : "Fast-forward"}
                      </Button>
                      <Button aria-label="Reset wealth simulator" onClick={resetSimulation} size="icon" variant="outline">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-success/20 bg-success/10 p-3 text-sm leading-6 text-text">
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <p>
                        At maturity, this FD adds{" "}
                        <span className="financial-value font-semibold text-success">{formatCurrency(finalResult.interestEarned)}</span>{" "}
                        over your starting deposit.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
