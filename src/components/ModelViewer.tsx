// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import {
  CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Toast } from 'primereact/toast';
import { blurHashToImage, imageToBlurhash } from '../services/io/image_hashes.ts';
import { CenteredSpinner } from './CenteredSpinner.tsx';

/// <reference types="@google/model-viewer" />
declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

export const PREDEFINED_ORBITS: [string, number, number][] = [
  ['Diagonal', Math.PI / 4, Math.PI / 4],
  ['Front', 0, Math.PI / 2],
  ['Right', Math.PI / 2, Math.PI / 2],
  ['Back', Math.PI, Math.PI / 2],
  ['Left', -Math.PI / 2, Math.PI / 2],
  ['Top', 0, 0],
  ['Bottom', 0, Math.PI],
];

function spherePoint(theta: number, phi: number): [number, number, number] {
  return [Math.cos(theta) * Math.sin(phi), Math.sin(theta) * Math.sin(phi), Math.cos(phi)];
}

function euclideanDist(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const radDist = (a: number, b: number) =>
  Math.min(Math.abs(a - b), Math.abs(a - b + 2 * Math.PI), Math.abs(a - b - 2 * Math.PI));

function getClosestPredefinedOrbitIndex(theta: number, phi: number): [number, number, number] {
  const point = spherePoint(theta, phi);
  const points = PREDEFINED_ORBITS.map(([_, t, p]) => spherePoint(t, p));
  const distances = points.map((p) => euclideanDist(point, p));
  const radDistances = PREDEFINED_ORBITS.map(([_, ptheta, pphi]) =>
    Math.max(radDist(theta, ptheta), radDist(phi, pphi)),
  );
  const [index, dist] = distances.reduce(
    (acc, d, i) => (d < acc[1] ? [i, d] : acc),
    [0, Infinity],
  ) as [number, number];
  return [index, dist, radDistances[index]];
}

const originalOrbit = (([name, theta, phi]) => `${theta}rad ${phi}rad auto`)(PREDEFINED_ORBITS[0]);

interface ModelViewerProps {
  className?: string;
  style?: CSSProperties;
  modelUri?: string;
  preview?: { blurhash: string };
}

export interface ModelViewerHandle {
  getWebpScreenshot: () => Promise<string | null>;
  resetView: () => void;
}

interface ModelViewerProps {
  lightMode?: boolean;
}

const ModelViewer = forwardRef<ModelViewerHandle, ModelViewerProps>(
  function ModelViewer(props, ref) {
    const [interactionPrompt, setInteractionPrompt] = useState('none'); // disable for now
    // const [interactionPrompt, setInteractionPrompt] = useState('auto');
    const modelViewerRef = useRef<any>(null);
    const axesViewerRef = useRef<any>(null);
    const toastRef = useRef<Toast>(null);

    const [loadedUri, setLoadedUri] = useState<string | undefined>();

    const [cachedImageHash, setCachedImageHash] = useState<
      { hash: string; uri: string } | undefined
    >(undefined);

    const loaded = loadedUri === props.modelUri;

    if (props?.preview) {
      let { hash, uri } = cachedImageHash ?? { hash: '' };
      if (props.preview.blurhash && hash !== props.preview.blurhash) {
        hash = props.preview.blurhash;
        uri = blurHashToImage(hash, 100, 100);
        setCachedImageHash({ hash, uri });
      }
    } else if (cachedImageHash) {
      setCachedImageHash(undefined);
    }

    const onLoad = useCallback(
      async (e: any) => {
        setLoadedUri(props.modelUri);

        if (!modelViewerRef.current) return;

        const uri = await modelViewerRef.current.toDataURL('image/png', 0.5);
        const preview = { blurhash: await imageToBlurhash(uri) };
        // props.preview = preview;
      },
      [props.modelUri, setLoadedUri, modelViewerRef.current],
    );

    useEffect(() => {
      if (!modelViewerRef.current) return;

      const element = modelViewerRef.current;
      element.addEventListener('load', onLoad);
      return () => element.removeEventListener('load', onLoad);
    }, [modelViewerRef.current, onLoad]);

    for (const ref of [modelViewerRef, axesViewerRef]) {
      const otherRef = ref === modelViewerRef ? axesViewerRef : modelViewerRef;
      useEffect(() => {
        if (!ref.current) return;

        function handleCameraChange(e: any) {
          if (!otherRef.current) return;
          if (e.detail.source === 'user-interaction') {
            const cameraOrbit = ref.current.getCameraOrbit();
            cameraOrbit.radius = otherRef.current.getCameraOrbit().radius;

            otherRef.current.cameraOrbit = cameraOrbit.toString();
          }
        }

        const element = ref.current;
        element.addEventListener('camera-change', handleCameraChange);
        return () => element.removeEventListener('camera-change', handleCameraChange);
      }, [ref.current, otherRef.current]);
    }

    // Cycle through predefined views when user clicks on the axes viewer
    useEffect(() => {
      let mouseDownSpherePoint: [number, number, number] | undefined;

      function getSpherePoint() {
        const orbit = axesViewerRef.current.getCameraOrbit();
        return spherePoint(orbit.theta, orbit.phi);
      }

      function onMouseDown(e: MouseEvent) {
        if (e.target === axesViewerRef.current) {
          mouseDownSpherePoint = getSpherePoint();
        }
      }

      function onMouseUp(e: MouseEvent) {
        if (e.target === axesViewerRef.current) {
          const euclEps = 0.01;
          const radEps = 0.1;

          const spherePoint = getSpherePoint();
          const clickDist =
            mouseDownSpherePoint ? euclideanDist(spherePoint, mouseDownSpherePoint) : Infinity;
          if (clickDist > euclEps) {
            return;
          }
          // Note: unlike the axes viewer, the model viewer has a prompt that makes the model wiggle around, we only fetch it to get the radius.
          const axesOrbit = axesViewerRef.current.getCameraOrbit();
          const modelOrbit = modelViewerRef.current.getCameraOrbit();
          const [currentIndex, dist, radDist] = getClosestPredefinedOrbitIndex(
            axesOrbit.theta,
            axesOrbit.phi,
          );
          const newIndex =
            e.button == 2 ? 0
            : dist < euclEps && radDist < radEps ? (currentIndex + 1) % PREDEFINED_ORBITS.length
            : currentIndex;
          const [name, theta, phi] = PREDEFINED_ORBITS[newIndex];
          Object.assign(modelOrbit, { theta, phi });
          const newOrbit =
            (modelViewerRef.current.cameraOrbit =
            axesViewerRef.current.cameraOrbit =
              modelOrbit.toString());
          // toastRef.current?.show({ severity: 'info', detail: `${name} view`, life: 1000 });
          setInteractionPrompt('none');
          e.stopPropagation();
          e.preventDefault();
        }
      }

      function onContextMenu(e: MouseEvent) {
        if (e.target === axesViewerRef.current) {
          e.preventDefault();
        }
      }

      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('contextmenu', onContextMenu);
      // window.addEventListener('click', onClick);

      return () => {
        // window.removeEventListener('click', onClick);
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('contextmenu', onContextMenu);
      };
    });

    /**
     * Captures a screenshot of the current model-viewer at 500x500px in WebP format.
     * Returns a data URL (webp) or null if failed.
     */
    async function getWebpScreenshot(): Promise<string | null> {
      if (!modelViewerRef.current) return null;
      // Get PNG data URL from model-viewer (default size)
      const pngDataUrl = await modelViewerRef.current.toDataURL('image/png', 1.0);

      const img = new window.Image();
      img.src = pngDataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, 500, 500);
      // Convert to WebP data URL
      return canvas.toDataURL('image/webp', 0.9); // 0.9 quality for good compression
    }

    function resetView() {
      if (!modelViewerRef.current || !axesViewerRef.current) return;
      modelViewerRef.current.cameraOrbit = originalOrbit;
      axesViewerRef.current.cameraOrbit = originalOrbit;
    }

    useImperativeHandle(
      ref,
      () => ({
        getWebpScreenshot,
        resetView,
      }),
      [getWebpScreenshot, resetView],
    );

    return (
      <div
        className={props.className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          flex: 1,
          width: '100%',
          background: props.lightMode ? '#eee' : '#111',
          ...(props.style ?? {}),
        }}
      >
        <Toast ref={toastRef} position="top-right" />
        <style>
          {`
          @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 0.7; }
            100% { opacity: 0.4; }
          }
        `}
        </style>

        {!loaded ?
          cachedImageHash ?
            <img
              src={cachedImageHash.uri}
              style={{
                animation: 'pulse 1.5s ease-in-out infinite',
                position: 'absolute',
                pointerEvents: 'none',
                width: '100%',
                height: '100%',
              }}
            />
          : <CenteredSpinner text="Loading model" />
        : <></>}

        <model-viewer
          orientation="0deg -90deg 0deg"
          class="main-viewer"
          src={props.modelUri}
          style={{
            transition: 'opacity 0.5s',
            // opacity: loaded ? 1 : 0,
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
          camera-orbit={originalOrbit}
          interaction-prompt={interactionPrompt}
          environment-image="./skybox-lights.jpg"
          // skybox-image="./skybox-lights.jpg"
          exposure={2}
          max-camera-orbit="auto 180deg auto"
          min-camera-orbit="auto 0deg auto"
          camera-controls
          ar
          ref={modelViewerRef}
        >
          <span slot="progress-bar"></span>
        </model-viewer>
        <model-viewer
          orientation="0deg -90deg 0deg"
          src="./axes.glb"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            zIndex: 10,
            height: '100px',
            width: '100px',
          }}
          loading="eager"
          camera-orbit={originalOrbit}
          // interpolation-decay="0"
          // environment-image="./skybox-lights.jpg"
          max-camera-orbit="auto 180deg auto"
          min-camera-orbit="auto 0deg auto"
          orbit-sensitivity="5"
          interaction-prompt="none"
          camera-controls="false"
          disable-zoom
          disable-tap
          disable-pan
          ref={axesViewerRef}
        >
          <span slot="progress-bar"></span>
        </model-viewer>
      </div>
    );
  },
);

export default ModelViewer;
