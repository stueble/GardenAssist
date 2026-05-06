/**
 * GardenPlanWidget — reusable interactive garden plan component.
 *
 * Features:
 *  - Pan (mouse drag / touch)
 *  - Zoom via mousewheel (toward cursor), pinch-to-zoom on touch
 *  - Fit-Height (↕) / Fit-Width (↔) toggle buttons — combinable
 *  - Configurable pins (absolutely positioned, counter-scaled to stay constant pixel-size)
 *  - Pick mode: cursor becomes crosshair, click fires onPick(x_percent, y_percent)
 *  - Placeholder when no planUrl is provided
 *
 * Used in: PlantsView (Edit Dialog center column), DashboardView (future).
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanPin {
  x:      number;   // 0–100, percent of plan image width
  y:      number;   // 0–100, percent of plan image height
  label?: string;   // shown inside the pin dot (e.g. "1", "🌹")
  color?: string;   // pin background color; default: var(--green-deep)
}

export interface GardenPlanWidgetProps {
  planUrl:     string | null;
  pins?:       PlanPin[];
  pickMode?:   boolean;
  onPick?:     (x: number, y: number) => void;
  onPinClick?: (pin: PlanPin, index: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GardenPlanWidget({
  planUrl,
  pins = [],
  pickMode = false,
  onPick,
  onPinClick,
}: GardenPlanWidgetProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const imgRef  = useRef<HTMLImageElement>(null);

  // Pan/zoom state stored in refs to avoid re-render on every frame
  const stateRef = useRef({
    scale: 1, minScale: 0.3,
    tx: 0, ty: 0,
    imgW: 800, imgH: 600,
    dragging: false,
    startX: 0, startY: 0,
    startTx: 0, startTy: 0,
    lastPinchDist: 0,
  });

  const [modeFitH, setModeFitH] = useState(false);
  const [modeFitW, setModeFitW] = useState(false);
  // Refs so the wheel handler always reads the current mode without being re-registered
  const modeFitHRef = useRef(false);
  const modeFitWRef = useRef(false);
  // Trigger re-render for pin positions after transform change
  const [, forceUpdate] = useState(0);

  // ── helpers ─────────────────────────────────────────────────────────────────

  const applyT = useCallback((animated: boolean) => {
    const plan = planRef.current;
    if (!plan) return;
    const s = stateRef.current;
    plan.style.transition = animated ? "transform .3s ease" : "none";
    plan.style.transform  = `translate(${s.tx}px,${s.ty}px) scale(${s.scale})`;
    forceUpdate((n) => n + 1);
  }, []);

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    const s  = stateRef.current;
    const ns = clamp(s.scale * factor, s.minScale, 4);
    const r  = ns / s.scale;
    s.tx     = cx - r * (cx - s.tx);
    s.ty     = cy - r * (cy - s.ty);
    s.scale  = ns;
  }, []);

  const getAreaSize = () => {
    const el = areaRef.current;
    return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 800, h: 600 };
  };

  const initPlan = useCallback(() => {
    const img = imgRef.current;
    const plan = planRef.current;
    if (!img || !plan) return;
    const s    = stateRef.current;
    s.imgW     = img.naturalWidth  || img.width  || 800;
    s.imgH     = img.naturalHeight || img.height || 600;
    const { w, h } = getAreaSize();
    const sc   = Math.min(w / s.imgW, h / s.imgH);
    s.minScale = sc * 0.6;
    s.scale    = sc;
    s.tx       = (w - s.imgW * sc) / 2;
    s.ty       = (h - s.imgH * sc) / 2;
    plan.style.width  = s.imgW + "px";
    plan.style.height = s.imgH + "px";
    applyT(false);
  }, [applyT]);

  const applyFitH = useCallback(() => {
    const s = stateRef.current;
    const { w, h } = getAreaSize();
    s.scale = h / s.imgH;
    s.tx    = (w - s.imgW * s.scale) / 2;
    s.ty    = 0;
    applyT(true);
  }, [applyT]);

  const applyFitW = useCallback(() => {
    const s = stateRef.current;
    const { w, h } = getAreaSize();
    s.scale = w / s.imgW;
    s.tx    = 0;
    s.ty    = (h - s.imgH * s.scale) / 2;
    applyT(true);
  }, [applyT]);

  const applyFitBoth = useCallback(() => {
    const plan = planRef.current;
    const area = areaRef.current;
    if (!plan || !area) return;
    const s   = stateRef.current;
    s.scale   = 1;
    s.tx      = 0;
    s.ty      = 0;
    plan.style.width  = area.clientWidth  + "px";
    plan.style.height = area.clientHeight + "px";
    plan.style.transition = "none";
    plan.style.transform  = "translate(0px,0px) scale(1)";
    forceUpdate((n) => n + 1);
  }, []);

  const applyCurrentMode = useCallback((fitH: boolean, fitW: boolean, animated = true) => {
    if (fitH && fitW) { applyFitBoth(); return; }
    if (fitH)         { applyFitH();   return; }
    if (fitW)         { applyFitW();   return; }
    if (animated)     { applyT(true);  return; }
    initPlan();
  }, [applyFitBoth, applyFitH, applyFitW, applyT, initPlan]);

  // ── event listeners ──────────────────────────────────────────────────────────

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const s = stateRef.current;

    // Mouse pan
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-zoom-btn]")) return;
      s.dragging = true;
      s.startX   = e.clientX; s.startY = e.clientY;
      s.startTx  = s.tx;      s.startTy = s.ty;
      area.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!s.dragging) return;
      s.tx = s.startTx + (e.clientX - s.startX);
      s.ty = s.startTy + (e.clientY - s.startY);
      applyT(false);
    };
    const onMouseUp = () => {
      s.dragging = false;
      area.style.cursor = pickMode ? "crosshair" : "grab";
    };

    // Wheel: zoom (free), pan H (fit-height), pan V (fit-width), locked (both)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const fitH = modeFitHRef.current;
      const fitW = modeFitWRef.current;
      if (fitH && fitW) return;                           // both active: locked
      const s = stateRef.current;
      if (fitH) {
        // Fit-Height: image fills height, wheel scrolls left/right
        s.tx -= e.deltaY * 1.5;
        applyT(false);
        return;
      }
      if (fitW) {
        // Fit-Width: image fills width, wheel scrolls up/down
        s.ty -= e.deltaY * 1.5;
        applyT(false);
        return;
      }
      // Free mode: zoom toward cursor
      const r = area.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 0.89);
      applyT(false);
    };

    // Touch pan + pinch zoom
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        s.dragging  = true;
        s.startX    = e.touches[0].clientX; s.startY = e.touches[0].clientY;
        s.startTx   = s.tx;                 s.startTy = s.ty;
      }
      if (e.touches.length === 2) {
        s.lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && s.dragging) {
        s.tx = s.startTx + (e.touches[0].clientX - s.startX);
        s.ty = s.startTy + (e.touches[0].clientY - s.startY);
        applyT(false);
      }
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const r = area.getBoundingClientRect();
        zoomAt(
          (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left,
          (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top,
          d / (s.lastPinchDist || d)
        );
        s.lastPinchDist = d;
        applyT(false);
      }
    };
    const onTouchEnd = () => { s.dragging = false; };

    // Resize — re-apply current fit mode, or re-fit-inside if free
    const onResize = () => {
      const fitH = modeFitHRef.current;
      const fitW = modeFitWRef.current;
      if (fitH || fitW) applyCurrentMode(fitH, fitW, false);
      else initPlan();
    };

    area.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    area.addEventListener("wheel",       onWheel,      { passive: false });
    area.addEventListener("touchstart",  onTouchStart, { passive: false });
    area.addEventListener("touchmove",   onTouchMove,  { passive: false });
    area.addEventListener("touchend",    onTouchEnd);
    window.addEventListener("resize",    onResize);

    return () => {
      area.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
      area.removeEventListener("wheel",       onWheel);
      area.removeEventListener("touchstart",  onTouchStart);
      area.removeEventListener("touchmove",   onTouchMove);
      area.removeEventListener("touchend",    onTouchEnd);
      window.removeEventListener("resize",    onResize);
    };
  }, [applyT, zoomAt, initPlan, pickMode]);

  // Re-apply cursor when pickMode changes
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.cursor = pickMode ? "crosshair" : "grab";
  }, [pickMode]);

  // ── click handler for pick mode ───────────────────────────────────────────────

  const handleAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickMode || !onPick) return;
    if ((e.target as HTMLElement).closest("[data-zoom-btn]")) return;
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    const s    = stateRef.current;
    const rect = areaRef.current!.getBoundingClientRect();
    const xPx  = (e.clientX - rect.left - s.tx) / s.scale;
    const yPx  = (e.clientY - rect.top  - s.ty) / s.scale;
    const xPct = Math.max(0, Math.min(100, (xPx / s.imgW) * 100));
    const yPct = Math.max(0, Math.min(100, (yPx / s.imgH) * 100));
    onPick(parseFloat(xPct.toFixed(1)), parseFloat(yPct.toFixed(1)));
  }, [pickMode, onPick]);

  // ── fit buttons ───────────────────────────────────────────────────────────────

  const handleFitH = () => {
    const nextH = !modeFitHRef.current;
    const curW  = modeFitWRef.current;
    modeFitHRef.current = nextH;
    setModeFitH(nextH);
    if (!nextH && !curW) initPlan();
    else applyCurrentMode(nextH, curW, true);
  };
  const handleFitW = () => {
    const nextW = !modeFitWRef.current;
    const curH  = modeFitHRef.current;
    modeFitWRef.current = nextW;
    setModeFitW(nextW);
    if (!curH && !nextW) initPlan();
    else applyCurrentMode(curH, nextW, true);
  };

  // ── render ────────────────────────────────────────────────────────────────────

  const currentScale = stateRef.current.scale;

  return (
    <div
      ref={areaRef}
      data-testid="garden-plan-widget"
      onClick={handleAreaClick}
      style={{
        position:   "relative",
        flex:       1,
        overflow:   "hidden",
        background: "var(--green-mist)",
        cursor:     pickMode ? "crosshair" : "grab",
        userSelect: "none",
      }}
    >
      {planUrl ? (
        <div
          ref={planRef}
          style={{ position: "absolute", transformOrigin: "0 0" }}
        >
          <img
            ref={imgRef}
            src={planUrl}
            alt="Gartenplan"
            data-testid="garden-plan-img"
            onLoad={initPlan}
            style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}
          />

          {/* Pins */}
          {pins.map((pin, i) => (
            <div
              key={i}
              data-pin
              data-testid={`plan-pin-${i}`}
              onClick={(e) => { e.stopPropagation(); onPinClick?.(pin, i); }}
              style={{
                position:  "absolute",
                left:      `${pin.x}%`,
                top:       `${pin.y}%`,
                transform: `translate(-50%, -50%) scale(${1 / currentScale})`,
                zIndex:    10,
                cursor:    onPinClick ? "pointer" : "default",
              }}
            >
              {/* Pulsing ring */}
              <div style={{
                position:     "absolute",
                width:        "32px",
                height:       "32px",
                borderRadius: "50%",
                border:       "2px solid rgba(45,74,45,.4)",
                top:          "50%",
                left:         "50%",
                transform:    "translate(-50%, -50%)",
                animation:    "gpw-pulse 1.5s ease-out infinite",
                pointerEvents:"none",
              }} />
              {/* Dot */}
              <div style={{
                width:          "20px",
                height:         "20px",
                borderRadius:   "50%",
                background:     pin.color ?? "var(--green-deep)",
                border:         "3px solid white",
                boxShadow:      "0 2px 8px rgba(0,0,0,.4)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       "9px",
                fontWeight:     700,
                color:          "white",
                fontFamily:     "var(--font-body)",
              }}>
                {pin.label}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Placeholder */
        <div
          data-testid="garden-plan-placeholder"
          style={{
            position:       "absolute",
            inset:          0,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "8px",
            color:          "var(--text-light)",
            fontSize:       "13px",
            fontFamily:     "var(--font-body)",
          }}
        >
          <span style={{ fontSize: "36px" }}>🗺️</span>
          <span>Kein Gartenplan vorhanden</span>
          <span style={{ fontSize: "11px" }}>Gartenplan unter Einstellungen hochladen</span>
        </div>
      )}

      {/* Zoom controls */}
      <div
        data-zoom-btn
        style={{
          position:      "absolute",
          bottom:        "14px",
          right:         "14px",
          display:       "flex",
          flexDirection: "column",
          gap:           "4px",
          zIndex:        50,
        }}
      >
        {[
          { id: "fit-h", label: "↕", active: modeFitH, title: "Auf Höhe einpassen",   handler: handleFitH },
          { id: "fit-w", label: "↔", active: modeFitW, title: "Auf Breite einpassen",  handler: handleFitW },
        ].map(({ id, label, active, title, handler }) => (
          <button
            key={id}
            type="button"
            data-zoom-btn
            data-testid={`zoom-btn-${id}`}
            title={title}
            onClick={(e) => { e.stopPropagation(); handler(); }}
            style={{
              width:        "32px",
              height:       "32px",
              background:   active ? "var(--green-deep)" : "rgba(255,255,255,.9)",
              border:       "1px solid var(--border)",
              borderRadius: "7px",
              fontSize:     "16px",
              cursor:       "pointer",
              color:        active ? "white" : "var(--green-deep)",
              fontWeight:   700,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
              transition:   "background .15s, color .15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* CSS animation for pin pulse ring */}
      <style>{`
        @keyframes gpw-pulse {
          0%   { transform: translate(-50%, -50%) scale(1);   opacity: .8; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0;  }
        }
      `}</style>
    </div>
  );
}
