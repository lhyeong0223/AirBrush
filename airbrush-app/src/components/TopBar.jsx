import React from "react";
import { Undo2, Redo2, Save, Trash2 } from "lucide-react"; // Trash2 아이콘 추가

const TopBar = ({
  handleUndo,
  handleRedo,
  handleClearCanvas,
  strokeGroups,
  redoGroups,
  mode,
  setMode,
  aspectRatio,
  setAspectRatio,
  resolutionTier,
  setResolutionTier,
  showIndicator,
  setShowIndicator,
  handleSaveImage,
  ASPECTS,
  RES_PRESETS,
  logicalWidth,
  logicalHeight,
}) => {
  return (
    <header className="w-full flex items-center justify-between p-4 sm:px-6 lg:px-8 bg-gray-900 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 shadow-md z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white hidden sm:block">
          AirBrush
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={strokeGroups.length === 0}
            className={`flex items-center justify-center h-10 w-10 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20
              ${
                strokeGroups.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-white/20"
              }`}
            title="Undo"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoGroups.length === 0}
            className={`flex items-center justify-center h-10 w-10 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20
              ${
                redoGroups.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-white/20"
              }`}
            title="Redo"
          >
            <Redo2 size={20} />
          </button>
          <button
            onClick={handleClearCanvas}
            className="flex items-center justify-center h-10 w-10 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20"
            title="Clear All"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("canvas")}
            className={`h-10 px-4 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30 text-sm ${
              mode === "canvas"
                ? "bg-blue-600 border-white/50 text-white"
                : "text-gray-200 hover:bg-white/10"
            }`}
            title="Canvas mode (white background)"
          >
            Canvas
          </button>
          <button
            onClick={() => setMode("camera")}
            className={`h-10 px-4 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30 text-sm ${
              mode === "camera"
                ? "bg-blue-600 border-white/50 text-white"
                : "text-gray-200 hover:bg-white/10"
            }`}
            title="Camera mode (draw over live feed)"
          >
            Camera
          </button>
        </div>

        {/* Canvas Size / Resolution Selection */}
        <div className="flex items-center gap-2">
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="h-10 px-3 rounded-full bg-white/10 border border-white/30 text-white text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.keys(ASPECTS).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <select
            value={resolutionTier}
            onChange={(e) => setResolutionTier(e.target.value)}
            className="h-10 px-3 rounded-full bg-white/10 border border-white/30 text-white text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {["Low", "Mid", "High"].map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-400 hidden lg:block">
            {logicalWidth}×{logicalHeight}
          </span>
        </div>

        {/* Indicator Toggle */}
        <button
          onClick={() => setShowIndicator((v) => !v)}
          className={`h-10 px-4 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30 text-sm ${
            showIndicator
              ? "bg-blue-600 border-white/50 text-white"
              : "text-gray-200 hover:bg-white/10"
          }`}
          title="Toggle on-screen indicator"
        >
          Indicator {showIndicator ? "On" : "Off"}
        </button>

        {/* Save Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSaveImage("png")}
            className="flex items-center justify-center gap-2 h-10 px-4 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-emerald-500 hover:border-emerald-400"
            title="Save as PNG"
          >
            <Save size={16} /> PNG
          </button>
          <button
            onClick={() => handleSaveImage("jpeg")}
            className="flex items-center justify-center gap-2 h-10 px-4 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-emerald-500 hover:border-emerald-400"
            title="Save as JPG"
          >
            <Save size={16} /> JPG
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
