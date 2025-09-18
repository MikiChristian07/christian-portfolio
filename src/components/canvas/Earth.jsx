import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";

import CanvasLoader from "../Loader";

const Earth = () => {
  const earth = useGLTF("./planet/scene.gltf");

  // Validate the loaded model
  React.useEffect(() => {
    if (earth.scene) {
      earth.scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          // Check for NaN values in position attributes
          const position = child.geometry.attributes.position;
          if (position) {
            for (let i = 0; i < position.array.length; i++) {
              if (isNaN(position.array[i])) {
                console.warn('Found NaN in geometry position, attempting to fix...');
                position.array[i] = 0;
              }
            }
            position.needsUpdate = true;
          }
        }
      });
    }
  }, [earth]);

  return (
    <primitive object={earth.scene} scale={2.5} position-y={0} rotation-y={0} />
  );
};

const EarthCanvas = () => {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <div className="w-full h-auto absolute inset-0 z-[-1] flex items-center justify-center">
        <div className="text-white text-center">
          <h3 className="text-xl mb-2">3D Model Loading Error</h3>
          <p className="text-secondary">Unable to load 3D Earth model</p>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      shadows
      frameloop='demand'
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
      camera={{
        fov: 45,
        near: 0.1,
        far: 200,
        position: [-4, 3, 6],
      }}
      onError={() => setHasError(true)}
    >
      <Suspense fallback={<CanvasLoader />}>
        <OrbitControls
          autoRotate
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
        <Earth />

        <Preload all />
      </Suspense>
    </Canvas>
  );
};

export default EarthCanvas;
