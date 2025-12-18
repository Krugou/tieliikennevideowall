import React from "react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

type CameraLocation = {
  id: string;
  name: string;
  coordinates: number[];
  municipality?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  cameras: CameraLocation[];
};

const MapModal: React.FC<Props> = ({ isOpen, onClose, cameras }) => {
  const { t } = useTranslation();

  // Finland bounding box (approximate)
  // Longitude: 19.5°E to 31.5°E (width ~12°)
  // Latitude: 59.5°N to 70.5°N (height ~11°)
  const minLon = 19.5;
  const maxLon = 31.5;
  const minLat = 59.5;
  const maxLat = 70.5;

  const mapWidth = 800;
  const mapHeight = 900;
  const padding = 40;

  // Convert lat/lon to SVG coordinates
  const lonToX = (lon: number) => {
    const normalized = (lon - minLon) / (maxLon - minLon);
    return padding + normalized * (mapWidth - 2 * padding);
  };

  const latToY = (lat: number) => {
    const normalized = (lat - minLat) / (maxLat - minLat);
    // Invert Y axis (SVG coordinates increase downward)
    return mapHeight - padding - normalized * (mapHeight - 2 * padding);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-[900px] rounded-md bg-neutral-900 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{t("map.title")}</h2>
          <p className="text-sm text-neutral-400 mt-1">
            {t("map.cameraCount", { count: cameras.length })}
          </p>
        </div>

        <div className="bg-neutral-950 rounded-lg p-4 overflow-auto">
          <svg
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="w-full h-auto"
            style={{ maxHeight: "70vh" }}
          >
            {/* Grid lines for reference */}
            <defs>
              <pattern
                id="grid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

            {/* Camera markers */}
            {cameras.map((camera) => {
              const [lon, lat] = camera.coordinates;
              if (
                lon === undefined ||
                lat === undefined ||
                !Number.isFinite(lon) ||
                !Number.isFinite(lat)
              ) {
                return null;
              }

              const x = lonToX(lon);
              const y = latToY(lat);

              return (
                <g key={camera.id}>
                  {/* Camera marker */}
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3b82f6"
                    stroke="#60a5fa"
                    strokeWidth="1"
                    className="hover:fill-blue-400 cursor-pointer transition-colors"
                  />
                  {/* Tooltip on hover */}
                  <title>
                    {camera.name}
                    {camera.municipality ? ` - ${camera.municipality}` : ""}
                  </title>
                </g>
              );
            })}

            {/* Legend */}
            <g transform={`translate(${padding}, ${mapHeight - padding + 10})`}>
              <circle cx="0" cy="0" r="4" fill="#3b82f6" stroke="#60a5fa" />
              <text
                x="10"
                y="4"
                fill="white"
                fontSize="12"
                className="select-none"
              >
                Camera location
              </text>
            </g>
          </svg>
        </div>

        {/* Camera list */}
        <div className="mt-4 max-h-48 overflow-y-auto">
          <details className="text-sm">
            <summary className="cursor-pointer text-neutral-400 hover:text-neutral-300">
              Show camera list ({cameras.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {cameras.map((camera) => (
                <li key={camera.id} className="text-xs text-neutral-400">
                  {camera.name}
                  {camera.municipality && (
                    <span className="text-neutral-500">
                      {" "}
                      - {camera.municipality}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </Modal>
  );
};

export default MapModal;
