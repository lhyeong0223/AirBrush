import React, { useRef } from "react";
import {
  PenLine,
  Highlighter,
  Eraser,
  Minus,
  Ellipsis,
  Droplet,
  Settings,
} from "lucide-react";

const BRUSH_ICONS = {
  pen: <PenLine size={24} />,
  marker: <PenLine size={24} />,
  highlighter: <Highlighter size={24} />,
  dashed: <Minus size={24} />,
  dotted: <Ellipsis size={24} />,
  eraser: <Eraser size={24} />,
};

const LeftSidebar = ({
  activeBrush,
  applyBrush,
  brushSettings,
  setBrushSettings,
  currentColor,
  setCurrentColor,
  setIsBrushSettingsModalOpen,
}) => {
  const colorInputRef = useRef(null);

  const handleColorChange = (e) => {
    const color = e.target.value;
    setCurrentColor(color);
    if (activeBrush !== "eraser") {
      setBrushSettings((prev) => ({
        ...prev,
        [activeBrush]: { ...prev[activeBrush], c: color },
      }));
    }
  };

  const openColorPicker = () => {
    if (activeBrush !== "eraser" && colorInputRef.current) {
      colorInputRef.current.click();
    }
  };

  return (
    <aside className="flex flex-col items-center gap-6 p-4 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-md w-28 lg:sticky top-24">
      {/* Brush Selection */}
      <section className="flex flex-col items-center gap-3">
        {Object.keys(BRUSH_ICONS).map((key) => (
          <button
            key={key}
            onClick={() => applyBrush(key)}
            className={`flex items-center justify-center h-14 w-14 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30
              ${
                activeBrush === key
                  ? "bg-white/40 border-white/50 text-white"
                  : "text-gray-200 hover:bg-white/20"
              }`}
            title={key}
          >
            {BRUSH_ICONS[key]}
          </button>
        ))}
        <div className="w-full h-[1px] bg-gray-600 my-2" />
        {/* Brush Detail Settings Button */}
        <button
          onClick={() => setIsBrushSettingsModalOpen(true)}
          className="flex items-center justify-center h-14 w-14 rounded-full transition-colors bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20"
          title="Brush Settings"
        >
          <Settings size={28} />
        </button>
      </section>

      <div className="w-full h-[1px] bg-gray-600 my-4" />

      <section className="flex flex-col items-center gap-4">
        {/* Color Picker */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-gray-300">Color</span>
          <div className="relative w-14 h-14">
            <input
              type="color"
              aria-label="Pick color"
              value={currentColor}
              onChange={handleColorChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={activeBrush === "eraser"}
              ref={colorInputRef}
            />
            <button
              onClick={openColorPicker}
              className={`w-14 h-14 rounded-md transition-colors bg-white/10 backdrop-blur-sm border border-white/30 flex items-center justify-center ${
                activeBrush === "eraser"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-white/20"
              }`}
              style={{ backgroundColor: currentColor }}
              title="Pick Color"
              disabled={activeBrush === "eraser"}
            >
              <Droplet size={28} className="text-white drop-shadow-md" />
            </button>
          </div>
        </div>

        {/* Basic Color Palette */}
        <div className="grid grid-cols-2 gap-2">
          {[
            "#000000",
            "#ff0000",
            "#00a152",
            "#1976d2",
            "#9c27b0",
            "#ff9800",
            "#795548",
            "#ffffff",
          ].map((c) => (
            <button
              key={c}
              onClick={() => {
                if (activeBrush === "eraser") return;
                setCurrentColor(c);
                setBrushSettings((prev) => ({
                  ...prev,
                  [activeBrush]: { ...prev[activeBrush], c },
                }));
              }}
              className={`w-6 h-6 rounded-full border transition-transform transform hover:scale-110
                ${c === "#ffffff" ? "border-gray-300" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              title={c}
              disabled={activeBrush === "eraser"}
            />
          ))}
        </div>
      </section>
    </aside>
  );
};

export default LeftSidebar;
