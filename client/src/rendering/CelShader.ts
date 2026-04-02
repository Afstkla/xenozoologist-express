import * as THREE from 'three';

const outlineVertexShader = `
  uniform float outlineThickness;
  void main() {
    vec3 pos = position + normal * outlineThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const outlineFragmentShader = `
  uniform vec3 outlineColor;
  void main() {
    gl_FragColor = vec4(outlineColor, 1.0);
  }
`;

export function createOutlineMaterial(
  thickness: number = 0.03,
  color: THREE.Color = new THREE.Color(0x000000),
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      outlineThickness: { value: thickness },
      outlineColor: { value: color },
    },
    vertexShader: outlineVertexShader,
    fragmentShader: outlineFragmentShader,
    side: THREE.BackSide,
  });
}

export function addOutline(mesh: THREE.Mesh, thickness?: number): THREE.Mesh {
  const outlineMesh = new THREE.Mesh(mesh.geometry, createOutlineMaterial(thickness));
  outlineMesh.scale.copy(mesh.scale);
  mesh.add(outlineMesh);
  return outlineMesh;
}
