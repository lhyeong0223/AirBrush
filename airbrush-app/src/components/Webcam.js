// airbrush-app/src/components/Webcam.js
import React, { useRef, useEffect } from 'react';
import * as handTracking from '@mediapipe/hands';
import * as cameraUtils from '@mediapipe/camera_utils';

const Webcam = ({ onHandMove, onGestureChange }) => {
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
        const indexFingerTip = landmarks[8]; // 검지 끝
        const thumbTip = landmarks[4]; // 엄지 끝
        // 주먹 감지: 검지와 엄지 거리
        const distance = Math.hypot(
          indexFingerTip.x - thumbTip.x,
          indexFingerTip.y - thumbTip.y
        );
        const isDrawing = distance > 0.1; // 임계값 조정 가능
        onGestureChange(isDrawing);
        if (isDrawing) {
          onHandMove({
            x: (1 - indexFingerTip.x) * 640,
            y: indexFingerTip.y * 480,
          });
        }
      } else {
        onGestureChange(false); // 손 없으면 그리기 중지
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
  }, [onHandMove, onGestureChange]);

  return <video ref={videoRef} autoPlay style={{ border: '1px solid black', margin: '20px' }} />;
};

export default Webcam;