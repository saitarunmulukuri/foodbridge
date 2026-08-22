import React, { useRef, useState, useEffect, useMemo, Component } from 'react';
import * as THREE from 'three';
import { Canvas, extend, useThree, useFrame } from '@react-three/fiber';
import {
  Physics,
  RigidBody,
  BallCollider,
  CuboidCollider,
  useRopeJoint,
  useSphericalJoint,
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';

extend({ MeshLineGeometry, MeshLineMaterial });

/**
 * WebGL Error Boundary Fallback
 */
class WebGLBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn('WebGL Lanyard fallback triggered:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Procedural Clip & Clasp 3D Mesh
 */
function BadgeClip({ color = '#94A3B8' }) {
  return (
    <group position={[0, 1.25, 0]}>
      {/* Metal clip body */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.18, 16]} />
        <meshStandardMaterial metalness={0.9} roughness={0.2} color={color} />
      </mesh>
      {/* Swivel ring */}
      <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.08, 0.025, 12, 24]} />
        <meshStandardMaterial metalness={0.95} roughness={0.15} color="#CBD5E1" />
      </mesh>
      {/* Badge hole fastener */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.22, 0.06, 0.06]} />
        <meshStandardMaterial metalness={0.8} roughness={0.3} color="#64748B" />
      </mesh>
    </group>
  );
}

/**
 * The Interactive Swinging Physics Band & Badge Card
 */
function Band({
  frontTexture,
  backTexture,
  strapTexture,
  lanyardWidth = 0.85,
  gravity = [0, -35, 0],
  flipSignal = 0,
  resetSignal = 0,
}) {
  const band = useRef();
  const fixed = useRef();
  const j1 = useRef();
  const j2 = useRef();
  const j3 = useRef();
  const card = useRef();

  const vec = useMemo(() => new THREE.Vector3(), []);
  const ang = useMemo(() => new THREE.Vector3(), []);
  const rot = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  const { width, height } = useThree((state) => state.size);
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );

  const [dragged, drag] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Rope joints connecting the anchor down to joint 3
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  // Spherical joint connecting joint 3 to the badge card
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.35, 0]]);

  // Flip impulse when flipSignal triggers
  useEffect(() => {
    if (flipSignal > 0 && card.current) {
      card.current.wakeUp();
      card.current.applyTorqueImpulse({ x: 0, y: 1.2, z: 0 }, true);
    }
  }, [flipSignal]);

  // Reset impulse when resetSignal triggers
  useEffect(() => {
    if (resetSignal > 0 && card.current) {
      card.current.wakeUp();
      card.current.setTranslation({ x: 0, y: 1.5, z: 0 }, true);
      card.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      card.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, [resetSignal]);

  useFrame((state) => {
    if (dragged && card.current) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    if (fixed.current && j1.current && j2.current && j3.current && card.current) {
      // Calculate Catmull-Rom spline curve from joints
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.translation());
      curve.points[2].copy(j1.current.translation());
      curve.points[3].copy(fixed.current.translation());

      if (band.current?.geometry) {
        band.current.geometry.setPoints(curve.getPoints(32));
      }

      // Gentle auto-stabilization to face screen comfortably
      if (!dragged) {
        ang.copy(card.current.angvel());
        rot.copy(card.current.rotation());
        // Dampen wild spins and nudge back upright
        card.current.setAngvel({
          x: ang.x * 0.98 - rot.x * 0.05,
          y: ang.y * 0.98,
          z: ang.z * 0.98 - rot.z * 0.05,
        });
      }
    }
  });

  return (
    <>
      <group position={[0, 4.2, 0]}>
        {/* Fixed Top Anchor */}
        <RigidBody
          ref={fixed}
          angularDamping={2}
          linearDamping={2}
          type="fixed"
        />

        {/* Joint 1 */}
        <RigidBody
          position={[0.4, 0, 0]}
          ref={j1}
          angularDamping={2.5}
          linearDamping={2.5}
        >
          <BallCollider args={[0.08]} />
        </RigidBody>

        {/* Joint 2 */}
        <RigidBody
          position={[0.8, 0, 0]}
          ref={j2}
          angularDamping={2.5}
          linearDamping={2.5}
        >
          <BallCollider args={[0.08]} />
        </RigidBody>

        {/* Joint 3 */}
        <RigidBody
          position={[1.2, 0, 0]}
          ref={j3}
          angularDamping={2.5}
          linearDamping={2.5}
        >
          <BallCollider args={[0.08]} />
        </RigidBody>

        {/* The Badge Card Rigid Body */}
        <RigidBody
          position={[1.5, 0, 0]}
          ref={card}
          angularDamping={1.5}
          linearDamping={1.5}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.75, 1.15, 0.04]} />

          {/* Interactive Badge Group */}
          <group
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerUp={(e) => {
              e.stopPropagation();
              e.target.releasePointerCapture(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.target.setPointerCapture(e.pointerId);
              drag(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation()))
              );
            }}
          >
            {/* Metal Clip at Top */}
            <BadgeClip />

            {/* Acrylic Transparent Case / Bezel */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1.54, 2.34, 0.06]} />
              <meshPhysicalMaterial
                transparent
                opacity={0.35}
                roughness={0.1}
                transmission={0.8}
                thickness={0.08}
                color="#FFFFFF"
              />
            </mesh>

            {/* Front Card Face */}
            <mesh position={[0, 0, 0.032]}>
              <planeGeometry args={[1.5, 2.3]} />
              <meshBasicMaterial
                map={frontTexture}
                toneMapped={false}
                side={THREE.FrontSide}
              />
            </mesh>

            {/* Back Card Face (flipped 180 deg) */}
            <mesh position={[0, 0, -0.032]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[1.5, 2.3]} />
              <meshBasicMaterial
                map={backTexture}
                toneMapped={false}
                side={THREE.FrontSide}
              />
            </mesh>

            {/* Subtle Inner Glow on Hover */}
            {hovered && (
              <mesh position={[0, 0, 0]}>
                <planeGeometry args={[1.56, 2.36]} />
                <meshBasicMaterial
                  color="#FF5A2F"
                  transparent
                  opacity={0.15}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </group>
        </RigidBody>
      </group>

      {/* The Lanyard Strap Ribbon */}
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          transparent
          opacity={0.92}
          color="#FFFFFF"
          map={strapTexture}
          useMap={strapTexture ? 1 : 0}
          repeat={new THREE.Vector2(-4, 1)}
          depthTest={false}
          resolution={[width, height]}
          lineWidth={lanyardWidth}
        />
      </mesh>
    </>
  );
}

/**
 * 2.5D CSS Interactive Physics-Tilt Fallback Card
 */
function FallbackProfileCard({ frontImage, backImage, isFlipped, onFlip }) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isGrabbing, setIsGrabbing] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotation({ x: -y * 22, y: x * 28 });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setIsGrabbing(false);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '460px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1200px',
        userSelect: 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsGrabbing(true)}
      onMouseUp={() => setIsGrabbing(false)}
    >
      {/* Lanyard hanging strap visual */}
      <div
        style={{
          width: '28px',
          height: '70px',
          background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '4px 4px 0 0',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
          marginBottom: '-12px',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingBottom: '6px',
        }}
      >
        <div
          style={{
            width: '16px',
            height: '10px',
            background: '#CBD5E1',
            borderRadius: '2px',
          }}
        />
      </div>

      {/* 3D Rotating Badge */}
      <div
        onClick={onFlip}
        style={{
          width: '270px',
          height: '405px',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: isGrabbing ? 'transform 0.05s ease-out' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y + (isFlipped ? 180 : 0)}deg) scale(${isGrabbing ? 1.02 : 1})`,
          cursor: isGrabbing ? 'grabbing' : 'grab',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          borderRadius: '16px',
        }}
      >
        {/* Front */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.8)',
            background: '#FFFFFF',
          }}
        >
          <img
            src={frontImage}
            alt="FoodBridge ID Front"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
        </div>

        {/* Back */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.2)',
            background: '#0F172A',
          }}
        >
          <img
            src={backImage}
            alt="FoodBridge ID Back"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Main Lanyard Component
 * Compatible with React Bits Lanyard signature props and dynamic Canvas textures.
 */
export function Lanyard({
  frontImage,
  backImage,
  lanyardImage,
  position = [0, 0, 15],
  gravity = [0, -35, 0],
  fov = 22,
  transparent = true,
  lanyardWidth = 0.85,
  flipSignal = 0,
  resetSignal = 0,
}) {
  const [frontTexture, setFrontTexture] = useState(null);
  const [backTexture, setBackTexture] = useState(null);
  const [strapTexture, setStrapTexture] = useState(null);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [fallbackFlipped, setFallbackFlipped] = useState(false);

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebGlSupported(false);
    } catch {
      setWebGlSupported(false);
    }
  }, []);

  // Load textures
  useEffect(() => {
    const loader = new THREE.TextureLoader();

    if (frontImage) {
      loader.load(
        frontImage,
        (tex) => {
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.colorSpace = THREE.SRGBColorSpace;
          setFrontTexture(tex);
        },
        undefined,
        () => {}
      );
    }

    if (backImage) {
      loader.load(
        backImage,
        (tex) => {
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.colorSpace = THREE.SRGBColorSpace;
          setBackTexture(tex);
        },
        undefined,
        () => {}
      );
    }

    if (lanyardImage) {
      loader.load(
        lanyardImage,
        (tex) => {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(-4, 1);
          setStrapTexture(tex);
        },
        undefined,
        () => {}
      );
    }
  }, [frontImage, backImage, lanyardImage]);

  if (!webGlSupported) {
    return (
      <FallbackProfileCard
        frontImage={frontImage}
        backImage={backImage}
        isFlipped={fallbackFlipped}
        onFlip={() => setFallbackFlipped((f) => !f)}
      />
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '480px', position: 'relative' }}>
      <WebGLBoundary
        fallback={
          <FallbackProfileCard
            frontImage={frontImage}
            backImage={backImage}
            isFlipped={fallbackFlipped}
            onFlip={() => setFallbackFlipped((f) => !f)}
          />
        }
      >
        <Canvas
          camera={{ position, fov }}
          gl={{ alpha: transparent, antialias: true, powerPreference: 'high-performance' }}
          style={{ width: '100%', height: '100%', cursor: 'grab' }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 10, 5]} intensity={1.8} castShadow={false} />
          <directionalLight position={[-5, 5, -5]} intensity={0.8} />
          <pointLight position={[0, -2, 4]} intensity={0.6} color="#FF5A2F" />

          <Physics
            interpolate
            gravity={gravity}
            timeStep={1 / 60}
          >
            <Band
              frontTexture={frontTexture}
              backTexture={backTexture}
              strapTexture={strapTexture}
              lanyardWidth={lanyardWidth}
              gravity={gravity}
              flipSignal={flipSignal}
              resetSignal={resetSignal}
            />
          </Physics>
        </Canvas>
      </WebGLBoundary>
    </div>
  );
}

export default Lanyard;
