import { useCallback, useEffect, useRef, useState } from 'react';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
const WHEEL_SENSITIVITY = 0.0015;
const PAN_LIMIT = 500;

export interface ZoomState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ZoomApi extends ZoomState {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  zoomAt: (svgX: number, svgY: number, factor: number) => void;
  panBy: (dx: number, dy: number) => void;
  toSvgPoint: (svg: SVGSVGElement, clientX: number, clientY: number) => { x: number; y: number };
}

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

function clampPan(v: number): number {
  return Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, v));
}

/**
 * Zoom/pan state for the SVG diagram.
 *
 * @param originY  The viewBox Y coordinate of the zoomable content's local
 *                 origin (e.g. the top of the architecture diagram below a
 *                 fixed header strip). Defaults to 0 when the zoomable area
 *                 starts at the top of the viewBox.
 */
export function useDiagramZoom(originY: number = 0): ZoomApi {
  const [state, setState] = useState<ZoomState>({ zoom: 1, panX: 0, panY: 0 });
  const stateRef = useRef(state);
  const originYRef = useRef(originY);
  stateRef.current = state;
  originYRef.current = originY;

  const zoomAt = useCallback((svgX: number, svgY: number, factor: number) => {
    const cur = stateRef.current;
    const oy = originYRef.current;
    const next = clampZoom(cur.zoom * factor);
    if (next === cur.zoom) return;
    const k = next / cur.zoom;
    setState({
      zoom: next,
      panX: clampPan(svgX - (svgX - cur.panX) * k),
      panY: clampPan((svgY - oy) - (svgY - oy - cur.panY) * k),
    });
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    const cur = stateRef.current;
    setState({
      zoom: cur.zoom,
      panX: clampPan(cur.panX + dx),
      panY: clampPan(cur.panY + dy),
    });
  }, []);

  const zoomIn = useCallback(() => {
    const cur = stateRef.current;
    const next = clampZoom(cur.zoom * 1.25);
    setState({ zoom: next, panX: cur.panX, panY: cur.panY });
  }, []);

  const zoomOut = useCallback(() => {
    const cur = stateRef.current;
    const next = clampZoom(cur.zoom / 1.25);
    setState({ zoom: next, panX: cur.panX, panY: cur.panY });
  }, []);

  const reset = useCallback(() => {
    setState({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  const toSvgPoint = useCallback((svg: SVGSVGElement, clientX: number, clientY: number) => {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const inv = ctm.inverse();
      const p = pt.matrixTransform(inv);
      return { x: p.x, y: p.y };
    }
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scaleX = vb.width / rect.width;
    const scaleY = vb.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  return { ...state, zoomIn, zoomOut, reset, zoomAt, panBy, toSvgPoint };
}

export function useDiagramGestures(
  svgRef: React.RefObject<SVGSVGElement | null>,
  api: ZoomApi,
): void {
  const svgRefRef = useRef(svgRef);
  svgRefRef.current = svgRef;
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const svg = svgRefRef.current.current;
    if (!svg) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    let pinchMid = { x: 0, y: 0 };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const z = apiRef.current;
      const pt = z.toSvgPoint(svg, e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * WHEEL_SENSITIVITY);
      z.zoomAt(pt.x, pt.y, factor);
    };

    const onPointerDown = (e: PointerEvent) => {
      svg.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const z = apiRef.current;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        const prevPt = z.toSvgPoint(svg, prev.x, prev.y);
        const currPt = z.toSvgPoint(svg, e.clientX, e.clientY);
        z.panBy(currPt.x - prevPt.x, currPt.y - prevPt.y);
      } else if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        if (pinchDist > 0) {
          const pt = z.toSvgPoint(svg, pinchMid.x, pinchMid.y);
          z.zoomAt(pt.x, pt.y, dist / pinchDist);
          const prevMid = z.toSvgPoint(svg, pinchMid.x, pinchMid.y);
          const currMid = z.toSvgPoint(svg, mid.x, mid.y);
          z.panBy(currMid.x - prevMid.x, currMid.y - prevMid.y);
        }
        pinchDist = dist;
        pinchMid = mid;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
    };

    const onDblClick = () => {
      apiRef.current.reset();
    };

    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
    svg.addEventListener('dblclick', onDblClick);
    return () => {
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onPointerUp);
      svg.removeEventListener('dblclick', onDblClick);
    };
  }, [svgRef]);
}
