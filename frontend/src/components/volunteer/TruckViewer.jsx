/**
 * TruckViewer — FoodBridge Volunteer Driver 3D truck identity component.
 *
 * Model: "Truck by Poly by Google"
 * Source: Poly Pizza — https://poly.pizza/m/truck-poly-by-google
 * License: CC-BY 3.0 — Attribution required.
 *
 * Uses @react-three/fiber + @react-three/drei (already installed).
 * Canvas is transparent — blends naturally with both light and dark themes.
 *
 * Props:
 *   reducedMotion  — boolean: disable all animations (prefers-reduced-motion)
 *   deliveryState  — 'idle' | 'transit':
 *                    idle    → static truck, frameloop="demand" (no wasted render cycles)
 *                    transit → subtle pitch sway via useFrame, frameloop="always"
 */

import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei';

// ── Model configuration ───────────────────────────────────────────────────────
//   "Truck by Poly by Google" — Poly Pizza (CC-BY)
//   Local asset bundled in /public/models/truck.glb
export const VOLUNTEER_TRUCK_MODEL = '/models/truck.glb';
useGLTF.preload(VOLUNTEER_TRUCK_MODEL);

// ── Runtime material neutralization ──────────────────────────────────────────
// Traverses every mesh in the loaded scene and recolors any blue/green-hued
// solid-color material (H 140°–240°, S > 0.15) to neutral off-white.
// This is purely runtime — the .glb file on disk is never modified.
// If the branding is baked into a UV texture (not a plain color), this
// function has no effect on that mesh and leaves it untouched.
function neutralizeBrandingMaterials(scene) {
  scene.traverse((node) => {
    if (!node.isMesh) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.forEach((mat) => {
      if (!mat || !mat.color) return;
      const { r, g, b } = mat.color;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === min) return;                    // achromatic — skip
      const d = max - min;
      const l = (max + min) / 2;
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (s < 0.15) return;                       // too desaturated to target
      let h;
      if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else                h = ((r - g) / d + 4) / 6;
      h *= 360; // 0–360°
      // Blue / teal / green range — third-party branding hues
      if (h >= 140 && h <= 240) {
        mat.color.setRGB(0.94, 0.94, 0.93);          // neutral warm white
        if (mat.roughness  !== undefined) mat.roughness  = 0.40;
        if (mat.metalness  !== undefined) mat.metalness  = 0.08;
        if (mat.emissive)                 mat.emissive.setRGB(0, 0, 0);
        mat.needsUpdate = true;
      }
    });
  });
}

// ── Scene sub-components ──────────────────────────────────────────────────────

/**
 * TruckModel — renders the GLB with state-based animation and material cleanup.
 *
 * deliveryState='transit': subtle ±0.012 rad pitch oscillation at ~0.7 Hz
 * mimicking gentle road vibration — not a product-demo rotation.
 */
function TruckModel({ deliveryState, reducedMotion }) {
  const { scene } = useGLTF(VOLUNTEER_TRUCK_MODEL);
  const ref        = useRef();
  const neutralized = useRef(false);

  const BASE_ROTATION_Y = -Math.PI / 5.5; // 3/4 angle: front-left faces camera

  // One-time material pass — runs after scene loads, never again
  useEffect(() => {
    if (scene && !neutralized.current) {
      neutralizeBrandingMaterials(scene);
      neutralized.current = true;
    }
  }, [scene]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (deliveryState !== 'transit' || reducedMotion) {
      // Snap to static base pose
      ref.current.rotation.x = 0;
      ref.current.rotation.y = BASE_ROTATION_Y;
      return;
    }
    // Gentle pitch + faint yaw wander — very subtle, professional
    const t = clock.getElapsedTime();
    ref.current.rotation.x = Math.sin(t * 4.4) * 0.012;
    ref.current.rotation.y = BASE_ROTATION_Y + Math.sin(t * 1.1) * 0.005;
  });

  return (
    <primitive
      ref={ref}
      object={scene}
      rotation={[0, BASE_ROTATION_Y, 0]}
      position={[0, -0.9, 0]}
      scale={0.95}
    />
  );
}

function SceneLights() {
  return (
    <>
      {/* Ambient fill */}
      <ambientLight intensity={0.65} />
      {/* Key light — top-right */}
      <directionalLight
        position={[9, 14, 9]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      {/* Fill light — left, cool tint */}
      <directionalLight position={[-7, 5, -4]} intensity={0.5} color="#c8d8f0" />
      {/* Bounce light — warm ground reflection */}
      <pointLight position={[0, -2, 2]} intensity={0.3} color="#ffe8d6" />
    </>
  );
}

// ── Loading fallback ──────────────────────────────────────────────────────────

function CanvasFallback() {
  return (
    <div className="vd-truck-fallback">
      <div className="vd-truck-fallback-spinner" />
      <span className="vd-truck-fallback-label">Loading truck…</span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * @param {boolean}          reducedMotion  Disable all animations
 * @param {'idle'|'transit'} deliveryState  'transit' triggers subtle sway
 */
export function TruckViewer({ reducedMotion = false, deliveryState = 'idle' }) {
  // Only run the render loop when there is actual animation to show
  const frameloop = (!reducedMotion && deliveryState === 'transit') ? 'always' : 'demand';

  return (
    <div
      className="vd-truck-canvas-wrapper"
      role="img"
      aria-label="Interactive 3D FoodBridge delivery truck. Drag to rotate, scroll to zoom."
    >
      <Suspense fallback={<CanvasFallback />}>
        <Canvas
          shadows
          camera={{ position: [6, 2.8, 9], fov: 38 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0); // transparent — page theme shows through
          }}
          style={{ background: 'transparent', touchAction: 'none' }}
          frameloop={frameloop}
        >
          <SceneLights />

          <TruckModel deliveryState={deliveryState} reducedMotion={reducedMotion} />

          {/* Ground shadow — subtle, blends with both themes */}
          <ContactShadows
            position={[0, -0.9, 0]}
            opacity={0.22}
            scale={16}
            blur={3.5}
            far={7}
            color="#1e2a3a"
          />

          {/* Environment map for realistic PBR reflections */}
          <Environment preset="city" />

          {/* Manual drag/zoom — no auto-rotation (removed: was product-demo style) */}
          <OrbitControls
            autoRotate={false}
            enableZoom={true}
            enablePan={false}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2.05}
            minDistance={4}
            maxDistance={18}
            target={[0, 0, 0]}
            makeDefault
          />
        </Canvas>
      </Suspense>
    </div>
  );
}

export default TruckViewer;
