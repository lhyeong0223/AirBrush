import React, { forwardRef } from 'react';
import Webcam from 'react-webcam';

const WebcamComponent = forwardRef(({ logicalWidth = 960, logicalHeight = 720 }, ref) => {
  // WebcamComponent는 단순히 <Webcam> 태그 렌더링, ref를 전달받음
  // MediaPipe Hands 초기화, 스트림 전송은 App.jsx에서 할거임.
  return (
    <Webcam
      ref={ref}
      mirrored={true}
      className="w-full h-auto rounded-lg"
      videoConstraints={{
        width: logicalWidth,
        height: logicalHeight,
        facingMode: 'user', // 전면 카메라
      }}
    />
  );
});

export default WebcamComponent;
