import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 250; // Points per line

const MorphingLine = ({ activeSection, offset = 0, opacity = 0.3, width = 1 }: { activeSection: number, offset?: number, opacity?: number, width?: number }) => {
  const { viewport } = useThree();

  const transition = useRef(0);
  const targetTransition = activeSection === 0 ? 0 : 1;

  const [linePositions, spiralPositions] = useMemo(() => {
    const line = new Float32Array(COUNT * 3);
    const spiral = new Float32Array(COUNT * 3);

    // Spiral Params (Right side)
    const centerX = viewport.width * 0.28;
    const centerY = 0;
    const turns = 4.5; // Number of revolutions
    const maxRadius = viewport.height * 0.55;

    for (let i = 0; i < COUNT; i++) {
      const t = i / (COUNT - 1);

      // Line Base
      line[i * 3] = (t - 0.5) * viewport.width * 2;
      line[i * 3 + 1] = 0;
      line[i * 3 + 2] = 0;

      // Spiral Base
      const angle = t * Math.PI * 2 * turns;
      const radius = t * maxRadius;

      spiral[i * 3] = radius * Math.cos(angle) + centerX;
      spiral[i * 3 + 1] = radius * Math.sin(angle) + centerY;
      spiral[i * 3 + 2] = 0;
    }
    return [line, spiral];
  }, [viewport]);

  const line = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    const mat = new THREE.LineBasicMaterial({
      color: "#0891b2",
      transparent: true,
      opacity: opacity,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    return new THREE.Line(geom, mat);
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const geom = line.geometry;
    const posAttr = geom.attributes.position;

    transition.current = THREE.MathUtils.lerp(transition.current, targetTransition, 0.05);
    const currentSpeed = activeSection === 0 ? 0.7 : 0.9;

    for (let i = 0; i < COUNT; i++) {
      const t = i / (COUNT - 1);

      // Flowing wave motion
      const flow = Math.sin(t * 12 + time * currentSpeed + offset) * 0.2;

      const targetX = THREE.MathUtils.lerp(linePositions[i * 3], spiralPositions[i * 3], transition.current);
      const targetY = THREE.MathUtils.lerp(linePositions[i * 3 + 1] + flow, spiralPositions[i * 3 + 1], transition.current);

      // Add subtle vortex wobble to spiral
      let wobbleX = 0;
      let wobbleY = 0;
      if (transition.current > 0.5) {
        const angle = t * Math.PI * 2 * 4.5;
        const wobble = Math.sin(time * 2 + t * 10 + offset) * 0.05;
        wobbleX = Math.cos(angle) * wobble * viewport.width * 0.05;
        wobbleY = Math.sin(angle) * wobble * viewport.height * 0.05;
      }

      posAttr.setXYZ(i, targetX + wobbleX, targetY + wobbleY, 0);
    }
    posAttr.needsUpdate = true;
  });

  return <primitive object={line} />;
};

export const FlowingBackground = ({ activeSection }: { activeSection: number }) => {
  return (
    <div className="absolute inset-0 z-[10] pointer-events-none overflow-hidden opacity-100">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, depth: false }}
      >
        <React.Suspense fallback={null}>
          {/* Layered Lines for rich glowing effect - Using Normal blending for all-theme visibility */}
          <MorphingLine activeSection={activeSection} opacity={0.5} offset={0} />
          <MorphingLine activeSection={activeSection} opacity={0.2} offset={0.06} />
          <MorphingLine activeSection={activeSection} opacity={0.2} offset={-0.06} />
          <MorphingLine activeSection={activeSection} opacity={0.1} offset={0.12} />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default FlowingBackground;
