// airbrush-app/src/App.js
import React, { useState } from 'react';
import Canvas from './components/Canvas';
import Webcam from './components/Webcam';
import './App.css';

function App() {
  const [handPosition, setHandPosition] = useState(null);

  return (
    <div>
      <h1>AirBrush</h1>
      <Webcam onHandMove={setHandPosition} />
      <Canvas handPosition={handPosition} />
    </div>
  );
}

export default App;