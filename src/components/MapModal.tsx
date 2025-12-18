import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Only initialize the map when modal is open and container is available
    if (!isOpen || !mapContainerRef.current) return;

    // Clean up existing map if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [64.0, 26.0], // Center of Finland
      zoom: 6,
      zoomControl: true, // Enable zoom controls
    });

    mapRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create custom icon for camera markers
    const cameraIcon = L.divIcon({
      className: "custom-camera-marker",
      html: '<div class="w-3 h-3 bg-blue-600 border-2 border-blue-400 rounded-full"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    // Add markers for cameras and collect coordinates for bounds
    const coordinates: L.LatLngExpression[] = [];
    cameras.forEach((camera) => {
      const [lon, lat] = camera.coordinates;
      if (
        lon === undefined ||
        lat === undefined ||
        !Number.isFinite(lon) ||
        !Number.isFinite(lat)
      ) {
        return;
      }

      const marker = L.marker([lat, lon], { icon: cameraIcon }).addTo(map);
      marker.bindPopup(
        `<strong>${camera.name}</strong>${
          camera.municipality ? `<br/>${camera.municipality}` : ""
        }`
      );

      coordinates.push([lat, lon]);
    });

    // Fit map to show all markers
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, cameras]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-[900px] rounded-md bg-neutral-900 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{t("map.title")}</h2>
          <p className="text-sm text-neutral-400 mt-1">
            {t("map.cameraCount", { count: cameras.length })}
          </p>
        </div>

        <div
          ref={mapContainerRef}
          className="w-full h-[70vh] min-h-[400px] rounded-lg overflow-hidden"
        />

        {/* Camera list */}
        <div className="mt-4 max-h-48 overflow-y-auto">
          <details className="text-sm">
            <summary className="cursor-pointer text-neutral-400 hover:text-neutral-300">
              {t("map.showList", { count: cameras.length })}
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
