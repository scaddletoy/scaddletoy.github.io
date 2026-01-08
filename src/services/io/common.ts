export type Vertex = {
  x: number;
  y: number;
  z: number;
};

export type Color = [number, number, number, number];

export type Face = {
  vertices: [number, number, number];
  colorIndex: number;
};

export type IndexedPolyhedron = {
  vertices: Vertex[];
  faces: Face[];
  colors: Color[];
};

// export const DEFAULT_FACE_COLOR: Color = [0xf9 / 255, 0xd7 / 255, 0x2c / 255, 1];
export const DEFAULT_FACE_COLOR: Color = [79 / 255, 209 / 255, 197 / 255, 1]; // Teal (#4FD1C5)

/**
 * Converts a hex color string (e.g. "#4FD1C5" or "4FD1C5") to a Color tuple ([r, g, b, a]).
 * Alpha defaults to 1 if not specified.
 * Accepts 3, 4, 6, or 8 digit hex (with or without #).
 */
export function colorFromHex(hex: string, alpha: number = 1): Color {
  let hexStr = hex.replace(/^#/, '');
  if (hexStr.length === 3) {
    hexStr = hexStr
      .split('')
      .map((x) => x + x)
      .join('');
  } else if (hexStr.length === 4) {
    hexStr = hexStr
      .split('')
      .map((x) => x + x)
      .join('');
  }
  let r = 0,
    g = 0,
    b = 0,
    a = alpha;
  if (hexStr.length === 6) {
    r = parseInt(hexStr.slice(0, 2), 16) / 255;
    g = parseInt(hexStr.slice(2, 4), 16) / 255;
    b = parseInt(hexStr.slice(4, 6), 16) / 255;
  } else if (hexStr.length === 8) {
    r = parseInt(hexStr.slice(0, 2), 16) / 255;
    g = parseInt(hexStr.slice(2, 4), 16) / 255;
    b = parseInt(hexStr.slice(4, 6), 16) / 255;
    a = parseInt(hexStr.slice(6, 8), 16) / 255;
  } else {
    throw new Error('Invalid hex color format');
  }
  return [r, g, b, a];
}
