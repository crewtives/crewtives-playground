// Meshes from mesh.ts as three.js BufferGeometry (only in the WebGL chunk).

import { BufferGeometry, Float32BufferAttribute } from 'three';
import { beadMesh, specimenMesh, type MeshData } from './mesh';
import type { SpecimenSpec } from './spec';

export function toGeometry(mesh: MeshData, geometry = new BufferGeometry()): BufferGeometry {
  geometry.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(mesh.colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function buildSpecimen(spec: SpecimenSpec): BufferGeometry {
  return toGeometry(specimenMesh(spec));
}

export function buildBead(style: number): BufferGeometry {
  return toGeometry(beadMesh(style));
}
