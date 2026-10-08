/** 
 * Shared geometry and style constants for all three visualizers. 
 */ 
 
/** The playfield viewBox size (maintains fixed aspect ratio). */ 
export const PLAYFIELD = { width: 1200, height: 640 }; 
 
/** Node height/radius. */ 
export const NODE_H = 46; 
export const NODE_R = 6; 
 
/** Default stroke/fill colors (light mode). */ 
export const COLORS = { 
  edge: '#528bda', 
  edgeActive: '#a9c4e0', 
  nodeBorder: '#3b4252', 
  nodeText: '#eceff4', 
  nodeSubtext: '#d8dee9', 
  memorySample: '#3b82f6', 
  memorySampleText: '#93c5fd', 
  gate: '#fde68a', 
  gateText: '#92400e', 
  highlight: '#fde68a', 
  highlightBorder: '#b45309', 
  accentRed: '#dc2626', 
  accentBlue: '#2563eb', 
  accentGreen: '#16a34a', 
}; 
 
/** Dark mode. */ 
export const COLORS_DARK = { 
  edge: '#83a5d6', 
  edgeActive: '#b4d2e8', 
  nodeBorder: '#d4d7de', 
  nodeText: '#171717', 
  nodeSubtext: '#b4bac2', 
  memorySample: '#60a5fa', 
  memorySampleText: '#93c5fd', 
  gate: '#fde68a', 
  gateText: '#92400e', 
  highlight: '#fde68a', 
  highlightBorder: '#b45309', 
  accentRed: '#dc2626', 
  accentBlue: '#2563eb', 
  accentGreen: '#16a34a', 
}; 
 
/** Font family shared by diagram labels. */ 
export const FONT = 'Geist Mono, ui-monospace, monospace'; 
