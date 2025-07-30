// airbrush-app/src/components/Webcam.js
import React, { useRef, useEffect } from 'react';
import * as handTracking from '@mediapipe/hands';
import * as cameraUtils from '@mediapipe/camera_utils';

const Webcam = ({ onHandMove }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const hands = new handTracking.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks[0]) {
        const landmarks = results.multiHandLandmarks[0];
        const indexFingerTip = landmarks[8]; // 검지 끝 (landmark 8)
        onHandMove({
          x: (1 - indexFingerTip.x) * 640, // x좌표 반전
          y: indexFingerTip.y * 480,
        });
      }
    });

    const camera = new cameraUtils.Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });
    camera.start();

    return () => camera.stop();
  }, [onHandMove]);

  return <video ref={videoRef} autoPlay style={{ border: '1px solid black', margin: '20px' }} />;
};

export default Webcam;