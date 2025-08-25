import React, { forwardRef } from "react";
import Webcam from "react-webcam";

const WebcamComponent = forwardRef(({ logicalWidth, logicalHeight }, ref) => {
  return (
    <Webcam
      ref={ref}
      audio={false}
      mirrored={true}
      width={logicalWidth}
      height={logicalHeight}
      className="w-full h-full object-cover rounded-xl"
      videoConstraints={{
        width: logicalWidth,
        height: logicalHeight,
        facingMode: "user",
      }}
    />
  );
});

export default WebcamComponent;
