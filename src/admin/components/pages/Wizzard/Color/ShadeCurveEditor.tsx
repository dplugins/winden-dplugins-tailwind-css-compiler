import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ReactComponent as ResetIcon } from "@/assets/icons/resetIcon.svg";
import {
  clamp,
  createDefaultCurveHandles,
  evaluateCurveAtNodes,
  generateShadeHexList,
  getBaseShadeToneAtT,
  getShadeBaseT,
  isDefaultCurve,
  normalizeCurveHandles,
  normalizeShadeBaseIndex,
  type CurveProperty,
  type ShadeCurveHandles,
} from "./shadeCurves";

interface ShadeCurveEditorProps {
  baseColor: string;
  shadeCount: number;
  baseIndex: number;
  lightnessCurve: ShadeCurveHandles;
  saturationCurve: ShadeCurveHandles;
  hueCurve: ShadeCurveHandles;
  onCurveChange: (property: CurveProperty, curve: ShadeCurveHandles) => void;
  onResetCurve: (property: CurveProperty) => void;
}

type DragTarget =
  | "leftHandle1"
  | "leftHandle2"
  | "rightHandle1"
  | "rightHandle2"
  | "startNode"
  | "endNode";

const CURVE_EDITOR_HEIGHT = 200;
const CURVE_PADDING_Y = 12;
const CURVE_MIN_HANDLE_GAP = 0.05;

const PROPERTY_TABS: { value: CurveProperty; label: string }[] = [
  { value: "lightness", label: "Lightness" },
  { value: "saturation", label: "Saturation" },
  { value: "hue", label: "Hue" },
];

const VALUE_RANGE: Record<CurveProperty, { min: number; max: number }> = {
  lightness: { min: -100, max: 100 },
  saturation: { min: -100, max: 100 },
  hue: { min: -180, max: 180 },
};

const DISPLAY_RANGE: Record<CurveProperty, { min: number; max: number }> = {
  lightness: { min: 0, max: 100 },
  saturation: { min: -100, max: 100 },
  hue: { min: -180, max: 180 },
};

function valueToCurveY(value: number, property: CurveProperty, minY: number, maxY: number): number {
  const { min, max } = DISPLAY_RANGE[property];
  const normalized = (clamp(value, min, max) - min) / (max - min);
  // Display is inverted on Y (min at bottom, max at top)
  return maxY - normalized * (maxY - minY);
}

function curveYToValue(y: number, property: CurveProperty, minY: number, maxY: number): number {
  const { min, max } = DISPLAY_RANGE[property];
  const clampedY = clamp(y, minY, maxY);
  const normalized = 1 - (clampedY - minY) / (maxY - minY);
  return clamp(min + normalized * (max - min), min, max);
}

const ShadeCurveEditor: React.FC<ShadeCurveEditorProps> = ({
  baseColor,
  shadeCount,
  baseIndex,
  lightnessCurve,
  saturationCurve,
  hueCurve,
  onCurveChange,
  onResetCurve,
}) => {
  const [activeProperty, setActiveProperty] = useState<CurveProperty>("lightness");
  const [dragState, setDragState] = useState<{ target: DragTarget; property: CurveProperty } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const curvesRef = useRef({
    lightness: lightnessCurve,
    saturation: saturationCurve,
    hue: hueCurve,
  });

  useEffect(() => {
    curvesRef.current = {
      lightness: lightnessCurve,
      saturation: saturationCurve,
      hue: hueCurve,
    };
  }, [lightnessCurve, saturationCurve, hueCurve]);

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const normalizedBaseIndex = normalizeShadeBaseIndex(baseIndex, shadeCount);

  const activeCurve = useMemo((): ShadeCurveHandles => {
    switch (activeProperty) {
      case "saturation":
        return saturationCurve;
      case "hue":
        return hueCurve;
      default:
        return lightnessCurve;
    }
  }, [activeProperty, lightnessCurve, saturationCurve, hueCurve]);

  const shadeColors = useMemo(
    () => generateShadeHexList(baseColor, shadeCount, normalizedBaseIndex, lightnessCurve, saturationCurve, hueCurve),
    [baseColor, shadeCount, normalizedBaseIndex, lightnessCurve, saturationCurve, hueCurve]
  );

  const curveResetState = useMemo(
    () => ({
      lightness: !isDefaultCurve(lightnessCurve, shadeCount, normalizedBaseIndex),
      saturation: !isDefaultCurve(saturationCurve, shadeCount, normalizedBaseIndex),
      hue: !isDefaultCurve(hueCurve, shadeCount, normalizedBaseIndex),
    }),
    [lightnessCurve, saturationCurve, hueCurve, shadeCount, normalizedBaseIndex]
  );

  const getCurveDisplayValue = useCallback(
    (property: CurveProperty, t: number, adjustment: number) => {
      if (property === "lightness") {
        const baseTone = getBaseShadeToneAtT(t, shadeCount, normalizedBaseIndex);
        return clamp(baseTone + adjustment, 0, 100);
      }
      const { min, max } = DISPLAY_RANGE[property];
      return clamp(adjustment, min, max);
    },
    [shadeCount, normalizedBaseIndex]
  );

  const getStoredCurveValue = useCallback(
    (property: CurveProperty, t: number, displayValue: number) => {
      if (property === "lightness") {
        const baseTone = getBaseShadeToneAtT(t, shadeCount, normalizedBaseIndex);
        const { min, max } = VALUE_RANGE.lightness;
        return clamp(displayValue - baseTone, min, max);
      }
      const { min, max } = VALUE_RANGE[property];
      return clamp(displayValue, min, max);
    },
    [shadeCount, normalizedBaseIndex]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, target: DragTarget) => {
      e.preventDefault();
      setDragState({ target, property: activeProperty });
    },
    [activeProperty]
  );

  useEffect(() => {
    if (!dragState || containerWidth === 0) return;

    const onMove = (e: MouseEvent) => {
      const curve = curvesRef.current[dragState.property];
      const next = { ...curve };
      const baseT = getShadeBaseT(shadeCount, normalizedBaseIndex);
      const minY = CURVE_PADDING_Y;
      const maxY = CURVE_EDITOR_HEIGHT - CURVE_PADDING_Y;

      const swatchWidth = containerWidth / shadeCount;
      const firstNodeX = swatchWidth / 2;
      const lastNodeX = containerWidth - swatchWidth / 2;
      const rangeX = Math.max(1, lastNodeX - firstNodeX);
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect || svgRect.width === 0 || svgRect.height === 0) return;

      const localX = ((e.clientX - svgRect.left) / svgRect.width) * containerWidth;
      const localY = ((e.clientY - svgRect.top) / svgRect.height) * CURVE_EDITOR_HEIGHT;
      const nextDisplayValue = curveYToValue(localY, dragState.property, minY, maxY);

      if (
        dragState.target === "leftHandle1" ||
        dragState.target === "leftHandle2" ||
        dragState.target === "rightHandle1" ||
        dragState.target === "rightHandle2"
      ) {
        let newT = clamp((localX - firstNodeX) / rangeX, 0, 1);

        if (dragState.target === "leftHandle1") {
          const maxT = clamp(curve.leftHandle2.t - CURVE_MIN_HANDLE_GAP, 0, baseT);
          newT = clamp(newT, 0, maxT);
          next.leftHandle1 = {
            t: newT,
            value: getStoredCurveValue(dragState.property, newT, nextDisplayValue),
          };
        } else if (dragState.target === "leftHandle2") {
          const minT = clamp(curve.leftHandle1.t + CURVE_MIN_HANDLE_GAP, 0, baseT);
          newT = clamp(newT, minT, baseT);
          next.leftHandle2 = {
            t: newT,
            value: getStoredCurveValue(dragState.property, newT, nextDisplayValue),
          };
        } else if (dragState.target === "rightHandle1") {
          const maxT = clamp(curve.rightHandle2.t - CURVE_MIN_HANDLE_GAP, baseT, 1);
          newT = clamp(newT, baseT, maxT);
          next.rightHandle1 = {
            t: newT,
            value: getStoredCurveValue(dragState.property, newT, nextDisplayValue),
          };
        } else {
          const minT = clamp(curve.rightHandle1.t + CURVE_MIN_HANDLE_GAP, baseT, 1);
          newT = clamp(newT, minT, 1);
          next.rightHandle2 = {
            t: newT,
            value: getStoredCurveValue(dragState.property, newT, nextDisplayValue),
          };
        }
      } else {
        const targetT = dragState.target === "startNode" ? 0 : 1;
        const storedValue = getStoredCurveValue(dragState.property, targetT, nextDisplayValue);
        if (dragState.target === "startNode") {
          next.startValue = storedValue;
        } else {
          next.endValue = storedValue;
        }
      }

      onCurveChange(dragState.property, next);
    };

    const onUp = () => setDragState(null);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragState, containerWidth, shadeCount, normalizedBaseIndex, getStoredCurveValue, onCurveChange]);

  const renderCurve = () => {
    const curve = normalizeCurveHandles(activeCurve, shadeCount, normalizedBaseIndex);
    if (shadeCount < 2 || containerWidth === 0) return null;

    const nodeRadius = 7;
    const baseNodeRadius = 9;
    const handleRadius = 6;
    const handleHitRadius = 14;
    const minY = CURVE_PADDING_Y;
    const maxY = CURVE_EDITOR_HEIGHT - CURVE_PADDING_Y;
    const zeroY = valueToCurveY(0, activeProperty, minY, maxY);
    const baseT = getShadeBaseT(shadeCount, normalizedBaseIndex);

    const swatchWidth = containerWidth / shadeCount;
    const firstNodeX = swatchWidth / 2;
    const lastNodeX = containerWidth - swatchWidth / 2;
    const rangeX = Math.max(1, lastNodeX - firstNodeX);

    const adjustments = evaluateCurveAtNodes(curve, shadeCount, normalizedBaseIndex);
    const nodePositions: { x: number; y: number }[] = [];
    const baseNodePositions: { x: number; y: number }[] = [];

    for (let i = 0; i < shadeCount; i++) {
      const t = i / (shadeCount - 1);
      const x = firstNodeX + rangeX * t;
      const displayValue = getCurveDisplayValue(activeProperty, t, adjustments[i]);
      const y = valueToCurveY(displayValue, activeProperty, minY, maxY);
      nodePositions.push({ x, y });

      if (activeProperty === "lightness") {
        const baseTone = getBaseShadeToneAtT(t, shadeCount, normalizedBaseIndex);
        baseNodePositions.push({ x, y: valueToCurveY(baseTone, activeProperty, minY, maxY) });
      }
    }

    const startNode = nodePositions[0];
    const baseNode = nodePositions[normalizedBaseIndex];
    const endNode = nodePositions[shadeCount - 1];

    const leftHandle1X = firstNodeX + rangeX * curve.leftHandle1.t;
    const leftHandle1Y = valueToCurveY(
      getCurveDisplayValue(activeProperty, curve.leftHandle1.t, curve.leftHandle1.value),
      activeProperty,
      minY,
      maxY
    );
    const leftHandle2X = firstNodeX + rangeX * curve.leftHandle2.t;
    const leftHandle2Y = valueToCurveY(
      getCurveDisplayValue(activeProperty, curve.leftHandle2.t, curve.leftHandle2.value),
      activeProperty,
      minY,
      maxY
    );
    const rightHandle1X = firstNodeX + rangeX * curve.rightHandle1.t;
    const rightHandle1Y = valueToCurveY(
      getCurveDisplayValue(activeProperty, curve.rightHandle1.t, curve.rightHandle1.value),
      activeProperty,
      minY,
      maxY
    );
    const rightHandle2X = firstNodeX + rangeX * curve.rightHandle2.t;
    const rightHandle2Y = valueToCurveY(
      getCurveDisplayValue(activeProperty, curve.rightHandle2.t, curve.rightHandle2.value),
      activeProperty,
      minY,
      maxY
    );

    const pathD = [
      `M ${startNode.x} ${startNode.y}`,
      `C ${leftHandle1X} ${leftHandle1Y}, ${leftHandle2X} ${leftHandle2Y}, ${baseNode.x} ${baseNode.y}`,
      `C ${rightHandle1X} ${rightHandle1Y}, ${rightHandle2X} ${rightHandle2Y}, ${endNode.x} ${endNode.y}`,
    ].join(" ");

    const basePathD =
      activeProperty === "lightness" && baseNodePositions.length > 1
        ? baseNodePositions.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
        : null;

    const renderHandle = (key: DragTarget, x: number, y: number) => (
      <g key={key}>
        <circle
          cx={x}
          cy={y}
          r={handleHitRadius}
          fill="transparent"
          style={{ cursor: "move" }}
          onMouseDown={(e) => handleMouseDown(e, key)}
        />
        <rect
          x={x - handleRadius}
          y={y - handleRadius}
          width={handleRadius * 2}
          height={handleRadius * 2}
          fill="var(--color-base-foreground)"
          stroke="var(--color-base-1)"
          strokeWidth={2}
          rx={2}
          style={{ pointerEvents: "none" }}
        />
      </g>
    );

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${containerWidth} ${CURVE_EDITOR_HEIGHT}`}
        style={{ width: "100%", height: CURVE_EDITOR_HEIGHT, display: "block" }}
      >
        {Array.from({ length: shadeCount + 1 }).map((_, i) => (
          <line
            key={`grid-${i}`}
            x1={i * swatchWidth}
            y1={0}
            x2={i * swatchWidth}
            y2={CURVE_EDITOR_HEIGHT}
            stroke="var(--color-input)"
            strokeWidth={1}
            opacity={0.35}
          />
        ))}

        {activeProperty === "lightness" && basePathD ? (
          <path d={basePathD} fill="none" stroke="var(--color-border)" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.8} />
        ) : (
          <line
            x1={0}
            y1={zeroY}
            x2={containerWidth}
            y2={zeroY}
            stroke="var(--color-border)"
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.5}
          />
        )}

        <path d={pathD} fill="none" stroke="var(--color-base-foreground)" strokeWidth={2} />

        <line x1={startNode.x} y1={startNode.y} x2={leftHandle1X} y2={leftHandle1Y} stroke="var(--color-base-foreground)" strokeWidth={1.5} opacity={0.5} />
        <line x1={baseNode.x} y1={baseNode.y} x2={leftHandle2X} y2={leftHandle2Y} stroke="var(--color-base-foreground)" strokeWidth={1.5} opacity={0.5} />
        <line x1={baseNode.x} y1={baseNode.y} x2={rightHandle1X} y2={rightHandle1Y} stroke="var(--color-base-foreground)" strokeWidth={1.5} opacity={0.5} />
        <line x1={endNode.x} y1={endNode.y} x2={rightHandle2X} y2={rightHandle2Y} stroke="var(--color-base-foreground)" strokeWidth={1.5} opacity={0.5} />

        {renderHandle("leftHandle1", leftHandle1X, leftHandle1Y)}
        {renderHandle("leftHandle2", leftHandle2X, leftHandle2Y)}
        {renderHandle("rightHandle1", rightHandle1X, rightHandle1Y)}
        {renderHandle("rightHandle2", rightHandle2X, rightHandle2Y)}

        {nodePositions.map((np, i) => {
          const isFirstOrLast = i === 0 || i === nodePositions.length - 1;
          const isBase = i === normalizedBaseIndex;
          const fill = shadeColors[i] || "var(--color-base-1)";
          return (
            <circle
              key={`node-${i}`}
              cx={np.x}
              cy={np.y}
              r={isBase ? baseNodeRadius : nodeRadius}
              fill={fill}
              stroke="var(--color-base-foreground)"
              strokeWidth={isBase ? 3 : 2}
              style={isFirstOrLast ? { cursor: "ns-resize" } : undefined}
              onMouseDown={
                isFirstOrLast
                  ? (e) => handleMouseDown(e, i === 0 ? "startNode" : "endNode")
                  : undefined
              }
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="inline-flex rounded-md border border-input overflow-hidden self-start">
        {PROPERTY_TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveProperty(value)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r border-input last:border-r-0",
              activeProperty === value
                ? "bg-base-foreground text-base-1"
                : "bg-transparent text-base-foreground/60 hover:bg-base-3"
            )}
          >
            {label}
            {curveResetState[value] && (
              <span
                role="button"
                tabIndex={0}
                aria-label={`Reset ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onResetCurve(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onResetCurve(value);
                  }
                }}
                className="inline-flex items-center justify-center rounded hover:opacity-70 cursor-pointer"
              >
                <ResetIcon width={14} height={14} />
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="relative w-full border border-input rounded-md bg-base-2 overflow-hidden"
        style={{ height: CURVE_EDITOR_HEIGHT }}
      >
        {renderCurve()}
      </div>
    </div>
  );
};

export default ShadeCurveEditor;
