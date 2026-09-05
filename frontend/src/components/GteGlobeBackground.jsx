import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import nightShaderUrl from '../assets/night-shader.png';

const GLOBE_CONFIG = {
  luminanceThreshold: 0.02,
  densityExponent: 1.0,
  baseParticleCount: 75000,
  particleSize: 0.38,
  particleColor: '#FF9345',
  glowColor: '#FFB877',
  undertoneColor: '#FF7722',
  undertoneStrength: 0.6,
  particleOpacity: 0.9,
  opacityRandomness: 0.8,
  edgeFadeCutoff: 0.45,
  edgeFadeWidth: 0.25,
  shimmerSpeed: 3.2,
  shimmerIntensity: 0.55,
  shimmerSparsePower: 10,
  hoverIntensityMultiplier: 1.5,
  hoverRadiusInfluence: 0.35,
  atmosphereColor: '#FF9345',
  atmosphereOpacity: 0.004,
  atmosphereEdge: 1.0,
  atmosphereFalloff: 14.0,
  atmosphereOuterFalloff: 5.5,
  globeRadius: 7.0,
  axisTiltX: 20,
  axisTiltZ: -23.5,
  initialRotationY: -230,
  rotationSpeedY: 0.0014,
  cameraDistance: 13.0
};

const VERTEX_SHADER = `
  attribute float aPhase;
  attribute float aSize;
  attribute float aOpacity;
  attribute float aLuminance;

  uniform float uTime;
  uniform float uShimmerSpeed;
  uniform float uShimmerIntensity;
  uniform float uShimmerSparsePower;
  uniform float uBaseSize;
  uniform float uGlobeRadius;

  varying float vOpacity;
  varying float vFacing;
  varying float vParticleOpacity;
  varying float vPx;
  varying float vLum;

  void main() {
    vec3 normal = normalize(position);
    vec3 viewNormal = normalize(normalMatrix * normal);
    float facing = dot(viewNormal, vec3(0.0, 0.0, 1.0));

    vFacing = facing;
    vParticleOpacity = aOpacity;
    vLum = aLuminance;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    float p = aPhase;
    float freq1 = uShimmerSpeed * (1.5 + fract(p * 1.71) * 0.8);
    float freq2 = uShimmerSpeed * (0.6 + fract(p * 3.37) * 0.7);
    float freq3 = uShimmerSpeed * (0.2 + fract(p * 7.13) * 0.5);

    float w1 = sin(uTime * freq1 + p) * 0.5 + 0.5;
    float w2 = sin(uTime * freq2 + p * 2.3) * 0.5 + 0.5;
    float w3 = sin(uTime * freq3 + p * 5.1) * 0.5 + 0.5;

    float denseWave = mix(w1, w2, 0.3);
    float sparseWave = w1 * w2 * w3;
    sparseWave = pow(sparseWave, uShimmerSparsePower * 0.3);

    float wave = mix(sparseWave, denseWave, aLuminance);
    float shimmer = mix(1.0 - uShimmerIntensity, 1.0, wave);

    vOpacity = shimmer;

    float sizeShimmer = mix(1.0, shimmer, uShimmerIntensity * 0.5);
    float size = uBaseSize * aSize * sizeShimmer;
    float px = size * (220.0 / -mvPosition.z);

    const float MIN_PX = 2.8;
    if (px < MIN_PX) {
      vOpacity *= (px * px) / (MIN_PX * MIN_PX);
      px = MIN_PX;
    }
    gl_PointSize = px;
    vPx = px;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform vec3 uGlowColor;
  uniform vec3 uUndertone;
  uniform float uUndertoneStrength;
  uniform float uOpacity;
  uniform float uEdgeFadeCutoff;
  uniform float uEdgeFadeWidth;

  varying float vOpacity;
  varying float vFacing;
  varying float vParticleOpacity;
  varying float vPx;
  varying float vLum;

  void main() {
    if (vFacing < uEdgeFadeCutoff - uEdgeFadeWidth) {
      discard;
    }

    float edgeFade = smoothstep(uEdgeFadeCutoff - uEdgeFadeWidth, uEdgeFadeCutoff + uEdgeFadeWidth, vFacing);

    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    float core = 1.0 - smoothstep(0.0, 0.22, dist);
    float glow = 1.0 - smoothstep(0.1, 0.5, dist);
    float alpha = mix(glow * 0.65, 1.0, core);

    float softK = smoothstep(6.0, 3.0, vPx);
    float soft = exp(-10.0 * dist * dist) * (1.0 - smoothstep(0.4, 0.5, dist));
    alpha = mix(alpha, soft, softK);

    vec3 finalColor = mix(uColor, uGlowColor, core * 0.55);

    float baked = vParticleOpacity * (0.3 + 0.7 * vLum);
    float warmth = (1.0 - smoothstep(0.15, 0.65, baked)) * uUndertoneStrength;
    finalColor = mix(finalColor, uUndertone, warmth);

    float finalOpacity = alpha * vOpacity * uOpacity * edgeFade * vParticleOpacity;

    gl_FragColor = vec4(finalColor, finalOpacity);
  }
`;

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereOpacity;
  uniform float uFalloff;
  uniform float uOuterFalloff;
  uniform float uEdge;
  uniform float uGlobeRadius;
  varying vec3 vWorldPos;

  void main() {
    vec3 dir = normalize(vWorldPos - cameraPosition);
    float b = length(cross(cameraPosition, dir));
    float d = b / uGlobeRadius;
    float x = d - uEdge;
    float intensity = x <= 0.0
      ? exp(x * uFalloff)
      : exp(-x * uOuterFalloff);
    gl_FragColor = vec4(uAtmosphereColor, intensity * uAtmosphereOpacity);
  }
`;

export default function GteGlobeBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animFrameId = null;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, GLOBE_CONFIG.cameraDistance);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const pivot = new THREE.Group();
    pivot.rotation.x = THREE.MathUtils.degToRad(GLOBE_CONFIG.axisTiltX);
    pivot.rotation.z = THREE.MathUtils.degToRad(GLOBE_CONFIG.axisTiltZ);
    scene.add(pivot);

    // Atmosphere sphere
    const atmosGeom = new THREE.SphereGeometry(GLOBE_CONFIG.globeRadius * 2.1, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        uAtmosphereColor: { value: new THREE.Color(GLOBE_CONFIG.atmosphereColor) },
        uAtmosphereOpacity: { value: GLOBE_CONFIG.atmosphereOpacity },
        uFalloff: { value: GLOBE_CONFIG.atmosphereFalloff },
        uOuterFalloff: { value: GLOBE_CONFIG.atmosphereOuterFalloff },
        uEdge: { value: GLOBE_CONFIG.atmosphereEdge },
        uGlobeRadius: { value: GLOBE_CONFIG.globeRadius }
      },
      vertexShader: ATMOSPHERE_VERTEX_SHADER,
      fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false
    });
    const atmosphere = new THREE.Mesh(atmosGeom, atmosMat);
    pivot.add(atmosphere);

    let particlesMesh = null;
    let particleMaterial = null;

    function buildParticles(getLuminance) {
      const positions = [];
      const phases = [];
      const sizes = [];
      const opacities = [];
      const luminances = [];

      const rad = GLOBE_CONFIG.globeRadius;
      const targetCount = GLOBE_CONFIG.baseParticleCount;
      const maxAttempts = targetCount * 50;
      let count = 0;
      let attempts = 0;

      while (count < targetCount && attempts < maxAttempts) {
        attempts++;
        const u = Math.random();
        const v = Math.random();
        const phi = 2 * Math.PI * u;
        const theta = Math.acos(2 * v - 1);
        const lat = 90 - (theta * 180) / Math.PI;
        const lon = (phi * 180) / Math.PI - 180;

        const lum = getLuminance(lat, lon);
        if (lum < GLOBE_CONFIG.luminanceThreshold) continue;

        const prob = Math.pow(lum, GLOBE_CONFIG.densityExponent);
        if (Math.random() < prob) {
          const x = -rad * Math.sin(theta) * Math.cos(phi);
          const y = rad * Math.cos(theta);
          const z = rad * Math.sin(theta) * Math.sin(phi);

          positions.push(x, y, z);
          phases.push(Math.random() * Math.PI * 2);
          sizes.push(0.5 + lum * 0.7);
          opacities.push(1 - Math.random() * GLOBE_CONFIG.opacityRandomness);
          luminances.push(lum);
          count++;
        }
      }

      if (particlesMesh) {
        pivot.remove(particlesMesh);
        particlesMesh.geometry.dispose();
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
      geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
      geometry.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opacities, 1));
      geometry.setAttribute('aLuminance', new THREE.Float32BufferAttribute(luminances, 1));

      particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(GLOBE_CONFIG.particleColor) },
          uGlowColor: { value: new THREE.Color(GLOBE_CONFIG.glowColor) },
          uUndertone: { value: new THREE.Color(GLOBE_CONFIG.undertoneColor) },
          uUndertoneStrength: { value: GLOBE_CONFIG.undertoneStrength },
          uOpacity: { value: GLOBE_CONFIG.particleOpacity },
          uEdgeFadeCutoff: { value: GLOBE_CONFIG.edgeFadeCutoff },
          uEdgeFadeWidth: { value: GLOBE_CONFIG.edgeFadeWidth },
          uShimmerSpeed: { value: GLOBE_CONFIG.shimmerSpeed },
          uShimmerIntensity: { value: GLOBE_CONFIG.shimmerIntensity },
          uShimmerSparsePower: { value: GLOBE_CONFIG.shimmerSparsePower },
          uBaseSize: { value: GLOBE_CONFIG.particleSize },
          uGlobeRadius: { value: GLOBE_CONFIG.globeRadius }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      particlesMesh = new THREE.Points(geometry, particleMaterial);
      particlesMesh.rotation.y = THREE.MathUtils.degToRad(GLOBE_CONFIG.initialRotationY);
      pivot.add(particlesMesh);
    }

    // Procedural initial fallback so it starts immediately
    buildParticles((lat, lon) => {
      // Basic continent approximations
      const isLand = (lat > -35 && lat < 38 && lon > -20 && lon < 50) || // Africa/Europe
                    (lat > 10 && lat < 70 && lon > 50 && lon < 145) ||  // Asia
                    (lat > 15 && lat < 70 && lon > -165 && lon < -55) || // North America
                    (lat > -55 && lat < 12 && lon > -82 && lon < -34) || // South America
                    (lat > -40 && lat < -10 && lon > 112 && lon < 155);  // Australia
      return isLand ? (0.35 + Math.random() * 0.65) : 0.005;
    });

    // Load full high-res night shader land map
    const nightImg = new Image();
    nightImg.crossOrigin = 'anonymous';
    nightImg.src = nightShaderUrl;

    nightImg.onload = () => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = nightImg.width;
      offCanvas.height = nightImg.height;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(nightImg, 0, 0);
      const imgData = offCtx.getImageData(0, 0, nightImg.width, nightImg.height).data;
      const w = nightImg.width;
      const h = nightImg.height;

      buildParticles((lat, lon) => {
        const xNorm = (lon + 180) / 360;
        const yNorm = (90 - lat) / 180;
        const px = Math.floor(xNorm * w) % w;
        const py = Math.floor(yNorm * h) % h;
        const idx = (py * w + px) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      });
    };

    const clock = new THREE.Clock();

    function animate() {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (particlesMesh && particleMaterial) {
        particlesMesh.rotation.y += GLOBE_CONFIG.rotationSpeedY;
        particleMaterial.uniforms.uTime.value = elapsed;
      }

      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    />
  );
}
