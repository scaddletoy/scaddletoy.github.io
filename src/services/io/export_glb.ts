import { Accessor, Document, NodeIO, Primitive } from '@gltf-transform/core';
import { Color, colorFromHex, type Face, type IndexedPolyhedron } from './common';

type Geom = {
  positions: Float32Array;
  indices: Uint32Array;
  colors?: Float32Array;
};

function createPrimitive(
  doc: Document,
  baseColorFactor: Color,
  { positions, indices, colors }: Geom,
): Primitive {
  const prim = doc
    .createPrimitive()
    .setMode(Primitive.Mode.TRIANGLES)
    .setMaterial(
      doc
        .createMaterial()
        .setDoubleSided(true)
        .setAlphaMode(baseColorFactor[3] < 1 ? 'BLEND' : 'OPAQUE')
        .setMetallicFactor(0.0)
        .setRoughnessFactor(0.8)
        .setBaseColorFactor(baseColorFactor),
    )
    .setAttribute('POSITION', doc.createAccessor().setType(Accessor.Type.VEC3).setArray(positions))
    .setIndices(doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(indices));
  if (colors) {
    prim.setAttribute('COLOR_0', doc.createAccessor().setType(Accessor.Type.VEC3).setArray(colors));
  }
  return prim;
}

function getGeom(data: IndexedPolyhedron): Geom {
  const positions = new Float32Array(data.vertices.length * 3);
  const indices = new Uint32Array(data.faces.length * 3);

  const addedVertices = new Map<number, number>();
  let verticesAdded = 0;
  const addVertex = (i: number) => {
    let index = addedVertices.get(i);
    if (index === undefined) {
      const offset = verticesAdded * 3;
      const vertex = data.vertices[i];
      positions[offset] = vertex.x;
      positions[offset + 1] = vertex.y;
      positions[offset + 2] = vertex.z;
      index = verticesAdded++;
      addedVertices.set(i, index);
    }
    return index;
  };

  data.faces.forEach((face, i) => {
    const { vertices } = face;
    if (vertices.length < 3) throw new Error('Face must have at least 3 vertices');

    const offset = i * 3;
    indices[offset] = addVertex(vertices[0]);
    indices[offset + 1] = addVertex(vertices[1]);
    indices[offset + 2] = addVertex(vertices[2]);
  });
  return {
    positions: positions.slice(0, verticesAdded * 3),
    indices,
  };
}

export async function exportGlb(
  data: IndexedPolyhedron,
  isLightMode: boolean = false,
): Promise<Blob> {
  // Replace specific colors with nicer ones
  const oldColors = [
    [0.615686274509804, 0.796078431372549, 0.3176470588235294, 1],
    [0.9764705882352941, 0.8431372549019608, 0.17254901960784313, 1],
  ];
  const newColors: Color[] =
    isLightMode ?
      [
        colorFromHex('#322'), // Cuts
        colorFromHex('#222'), // Outside
      ]
    : [
        colorFromHex('#efdfdf'), // Cuts
        colorFromHex('#fff'), // Outside
      ];
  const replacedColors = data.colors.map((c) => {
    for (let i = 0; i < oldColors.length; ++i) {
      if (
        c.length === 4
        && Math.abs(c[0] - oldColors[i][0]) < 1e-6
        && Math.abs(c[1] - oldColors[i][1]) < 1e-6
        && Math.abs(c[2] - oldColors[i][2]) < 1e-6
        && Math.abs(c[3] - oldColors[i][3]) < 1e-6
      ) {
        return newColors[i];
      }
    }
    return c;
  });

  const doc = new Document();
  // const lightExt = doc.createExtension(KHRLightsPunctual);
  doc.createBuffer();

  const scene = doc.createScene();
  // .addChild(doc.createNode()
  //     .setExtension('KHR_lights_punctual', lightExt
  //         .createLight()
  //         .setType(Light.Type.DIRECTIONAL)
  //         .setIntensity(1.0)
  //         .setColor([1.0, 1.0, 1.0]))
  //     .setRotation([-0.3250576, -0.3250576, 0, 0.8880739]))
  // .addChild(doc.createNode()
  //     .setExtension('KHR_lights_punctual', lightExt
  //         .createLight()
  //         .setType(Light.Type.DIRECTIONAL)
  //         .setIntensity(1.0)
  //         .setColor([1.0, 1.0, 1.0]))
  //     .setRotation([0.6279631, 0.6279631, 0, 0.4597009]));

  const mesh = doc.createMesh();

  const facesByColor = new Map<number, Face[]>();
  data.faces.forEach((face) => {
    let faces = facesByColor.get(face.colorIndex);
    if (!faces) facesByColor.set(face.colorIndex, (faces = []));
    faces.push(face);
  });
  for (const [colorIndex, faces] of facesByColor.entries()) {
    const color = replacedColors[colorIndex];
    mesh.addPrimitive(
      createPrimitive(
        doc,
        color,
        getGeom({ vertices: data.vertices, faces, colors: replacedColors }),
      ),
    );
  }
  scene.addChild(doc.createNode().setMesh(mesh));

  const glb = await new NodeIO()
    // .registerExtensions([KHRLightsPunctual])
    .writeBinary(doc);
  // @ts-expect-error Blob constructor expects a BufferSource, but NodeIO returns Uint8Array which is compatible
  return new Blob([glb], { type: 'model/gltf-binary' });
}
