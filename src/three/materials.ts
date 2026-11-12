import * as THREE from 'three'

/**
 * Petal material: physical (sheen = velvety petal look) + a gradient from the
 * petal base colour to a second tone toward the tip (`aT` attribute), a subtle
 * base darkening, and a cheap translucency term that fakes subsurface glow.
 */
export interface PetalMaterial extends THREE.MeshPhysicalMaterial {
  userData: {
    uniforms: {
      uColorA: { value: THREE.Color }
      uColorB: { value: THREE.Color }
      uGradient: { value: number }
      uTranslucency: { value: number }
    }
  }
}

export function createPetalMaterial(): PetalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.58,
    sheen: 0.7,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color('#fff4f0'),
  }) as PetalMaterial
  const uniforms = {
    uColorA: { value: new THREE.Color() },
    uColorB: { value: new THREE.Color() },
    uGradient: { value: 0.4 },
    uTranslucency: { value: 0.16 },
  }
  m.userData.uniforms = uniforms
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader =
      'attribute float aT;\nvarying float vT;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vT = aT;')
    shader.fragmentShader =
      'uniform vec3 uColorA;\nuniform vec3 uColorB;\nuniform float uGradient;\nuniform float uTranslucency;\nvarying float vT;\n' +
      shader.fragmentShader
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          `vec3 petalCol = mix(uColorA, uColorB, smoothstep(0.1, 1.0, vT) * uGradient);
  petalCol *= 0.78 + 0.22 * smoothstep(0.0, 0.35, vT);
  vec4 diffuseColor = vec4( petalCol * diffuse, opacity );`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * uTranslucency;',
        )
  }
  m.customProgramCacheKey = () => 'bloom-petal-v1'
  return m
}

export function setPetalColors(m: PetalMaterial, a: string, b: string, gradient: number) {
  const u = m.userData.uniforms
  u.uColorA.value.set(a)
  u.uColorB.value.set(b)
  u.uGradient.value = gradient
}

const accentCache = new Map<string, THREE.MeshStandardMaterial>()
export function accentMaterial(color: string) {
  let m = accentCache.get(color)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
    accentCache.set(color, m)
  }
  return m
}

export const SAGE = new THREE.Color('#8fa58a')
