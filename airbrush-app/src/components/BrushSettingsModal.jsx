import React from "react";
import { X, Circle, Minus, Ellipsis, Square } from "lucide-react";

const STROKE_ICONS = {
  solid: <Minus size={20} />,
  dashed: <Minus size={20} />,
  dotted: <Ellipsis size={20} />,
};

const CAP_ICONS = {
  round: <Circle size={20} />,
  butt: <Minus size={20} />,
  square: <Square size={20} />,
};

const BrushSettingsModal = ({
  isBrushSettingsModalOpen,
  setIsBrushSettingsModalOpen,
  activeBrush,
  brushSettings,
  setBrushSettings,
  currentColor,
  setCurrentColor,
  currentWidth,
  setCurrentWidth,
  currentAlpha,
  setCurrentAlpha,
  currentCap,
  setCurrentCap,
  currentDash,
  handleCapChange,
  handleDashChange,
}) => {
  if (!isBrushSettingsModalOpen) return null;

  const handleWidthChange = (e) => {
    const v = Math.round(parseFloat(e.target.value));
    setCurrentWidth(v);
    setBrushSettings((prev) => ({
      ...prev,
      [activeBrush]: { ...prev[activeBrush], w: v },
    }));
  };

  const handleOpacityChange = (e) => {
    const v = parseFloat(e.target.value);
    setCurrentAlpha(v);
    setBrushSettings((prev) => ({
      ...prev,
      [activeBrush]: { ...prev[activeBrush], a: v },
    }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
      onClick={() => setIsBrushSettingsModalOpen(false)}
    >
      <div
        className="bg-white/20 backdrop-blur-2xl rounded-xl border border-white/30 shadow-xl p-8 w-[90%] max-w-[500px] text-white relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsBrushSettingsModalOpen(false)}
          className="absolute top-4 right-4 text-gray-300 hover:text-white"
          title="Close"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-6">
          Brush Settings:{" "}
          <span className="capitalize text-blue-300">{activeBrush}</span>
        </h2>
        <section className="mb-6">
          <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2">
            Width
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={Math.round(currentWidth)}
              onChange={handleWidthChange}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
            <span className="w-12 text-right text-sm text-gray-300">
              {Math.round(currentWidth)}
            </span>
          </div>
        </section>
        <section className="mb-6">
          <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2">
            Opacity
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentAlpha}
              onChange={handleOpacityChange}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
            <span className="w-16 text-right text-sm text-gray-300">
              {Math.round(currentAlpha * 100)}%
            </span>
          </div>
        </section>
        <section className="mb-6">
          <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2">
            Cap
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(CAP_ICONS).map((val) => (
              <button
                key={val}
                onClick={() => handleCapChange(val)}
                className={`flex flex-col items-center justify-center gap-1 h-16 rounded-md transition-colors bg-white/10 backdrop-blur-sm border border-white/30
                  ${
                    currentCap === val
                      ? "bg-blue-600 border-white/50 text-white"
                      : "text-gray-200 hover:bg-white/10"
                  }`}
                title={val}
              >
                {CAP_ICONS[val]}
                <span className="leading-none text-xs capitalize">{val}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="mb-6">
          <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2">
            Stroke
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: "solid", dash: [] },
              { val: "dashed", dash: [12, 8] },
              { val: "dotted", dash: [2, 6] },
            ].map(({ val, dash }) => (
              <button
                key={val}
                onClick={() => handleDashChange(dash)}
                className={`flex flex-col items-center justify-center gap-1 h-16 rounded-md transition-colors bg-white/10 backdrop-blur-sm border border-white/30
                  ${
                    JSON.stringify(currentDash) === JSON.stringify(dash)
                      ? "bg-blue-600 border-white/50 text-white"
                      : "text-gray-200 hover:bg-white/10"
                  }`}
                title={val}
              >
                {STROKE_ICONS[val]}
                <span className="leading-none text-xs capitalize">{val}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default BrushSettingsModal;
