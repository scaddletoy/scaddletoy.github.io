import { type IndexedPolyhedron } from './common';

function calculateNormal(
  v1: { x: number; y: number; z: number },
  v2: { x: number; y: number; z: number },
  v3: { x: number; y: number; z: number },
) {
  const ux = v2.x - v1.x;
  const uy = v2.y - v1.y;
  const uz = v2.z - v1.z;
  const vx = v3.x - v1.x;
  const vy = v3.y - v1.y;
  const vz = v3.z - v1.z;
  return {
    x: uy * vz - uz * vy,
    y: uz * vx - ux * vz,
    z: ux * vy - uy * vx,
  };
}

export async function exportStl(data: IndexedPolyhedron): Promise<Blob> {
  let stl = 'solid polyhedron\n';
  for (const face of data.faces) {
    const [i1, i2, i3] = face.vertices;
    const v1 = data.vertices[i1];
    const v2 = data.vertices[i2];
    const v3 = data.vertices[i3];
    const n = calculateNormal(v1, v2, v3);
    stl += `  facet normal ${n.x} ${n.y} ${n.z}\n`;
    stl += '    outer loop\n';
    stl += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`;
    stl += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`;
    stl += `      vertex ${v3.x} ${v3.y} ${v3.z}\n`;
    stl += '    endloop\n';
    stl += '  endfacet\n';
  }
  stl += 'endsolid polyhedron\n';
  return new Blob([stl], { type: 'model/stl' });
}
