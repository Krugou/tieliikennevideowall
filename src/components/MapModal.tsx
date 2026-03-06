import React, { useEffect, useRef, useState } from "react";
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

// Configuration constants
const ROUTE_BUFFER_DISTANCE_METERS = 5000; // 5km buffer for cameras along route
const OSRM_ROUTING_SERVICE = "https://router.project-osrm.org/route/v1/driving";

const MapModal: React.FC<Props> = ({ isOpen, onClose, cameras }) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [selectedTarget, setSelectedTarget] = useState<CameraLocation | null>(
    null,
  );
  const [routeCameras, setRouteCameras] = useState<CameraLocation[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const hasInitializedRef = useRef(false);
  const hasCalculatedRouteRef = useRef(false);

  // Get user's location
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([
            position.coords.latitude,
            position.coords.longitude,
          ]);
        },
        (error) => {
          console.warn("Could not get user location:", error);
        },
      );
    }
  }, [isOpen]);

  // Initialize map only once when modal opens
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) {
      hasInitializedRef.current = false;
      return;
    }

    // Clean up existing map if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [64.0, 26.0], // Center of Finland
      zoom: 6,
      zoomControl: true,
    });

    mapRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Only fit bounds on initial load
    if (!hasInitializedRef.current && cameras.length > 0) {
      const coordinates: L.LatLngExpression[] = [];
      cameras.forEach((camera) => {
        const [lon, lat] = camera.coordinates;
        if (
          lon !== undefined &&
          lat !== undefined &&
          Number.isFinite(lon) &&
          Number.isFinite(lat)
        ) {
          coordinates.push([lat, lon]);
        }
      });

      if (coordinates.length > 0) {
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
      hasInitializedRef.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      hasInitializedRef.current = false;
    };
  }, [isOpen, cameras]);

  // Update markers when cameras change or route is calculated
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Decide which cameras to show
    const camerasToShow =
      selectedTarget && routeCameras.length > 0 ? routeCameras : cameras;

    // Create custom icon for camera markers - BRUTALIST STYLE
    const cameraIcon = L.divIcon({
      className: "custom-camera-marker",
      html: '<div class="w-3 h-3 bg-neo-blue border-2 border-black transform rotate-45"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    // Create highlighted icon for target camera
    const targetIcon = L.divIcon({
      className: "custom-camera-marker-target",
      html: '<div class="w-5 h-5 bg-neo-green border-2 border-black animate-bounce relative z-50"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // Add markers for cameras
    camerasToShow.forEach((camera) => {
      const [lon, lat] = camera.coordinates;
      if (
        lon === undefined ||
        lat === undefined ||
        !Number.isFinite(lon) ||
        !Number.isFinite(lat)
      ) {
        return;
      }

      const isTarget = selectedTarget?.id === camera.id;
      const marker = L.marker([lat, lon], {
        icon: isTarget ? targetIcon : cameraIcon,
        zIndexOffset: isTarget ? 1000 : 0,
      }).addTo(map);

      const popupContent = `<div class="font-mono text-xs"><strong>${camera.name}</strong>${
        camera.municipality ? `<br/>${camera.municipality}` : ""
      }${isTarget ? `<br/><em class="bg-neo-green text-black px-1">TARGET</em>` : ""}</div>`;

      marker.bindPopup(popupContent);

      // Make target cameras clickable to set as route destination
      if (!selectedTarget) {
        marker.on("click", () => {
          setSelectedTarget(camera);
        });
      }

      markersRef.current.push(marker);
    });

    // Add user location marker if available
    if (userLocation && userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    if (userLocation) {
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: '<div class="w-4 h-4 bg-neo-red border-2 border-black rounded-none animate-pulse"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const userMarker = L.marker(userLocation, { icon: userIcon }).addTo(map);
      userMarker.bindPopup(
        `<strong class="font-mono">${t("map.yourLocation")}</strong>`,
      );
      userMarkerRef.current = userMarker;
    }
  }, [cameras, selectedTarget, routeCameras, userLocation, t]);

  // Calculate route when target is selected
  useEffect(() => {
    if (!userLocation || !selectedTarget || !mapRef.current) {
      setRouteCameras([]);
      return;
    }

    const map = mapRef.current;
    setIsCalculatingRoute(true);

    // Clear existing route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    const [targetLon, targetLat] = selectedTarget.coordinates;

    // Fetch route from OSRM (Open Source Routing Machine)
    const fetchRoute = async () => {
      try {
        const url = `${OSRM_ROUTING_SERVICE}/${userLocation[1]},${userLocation[0]};${targetLon},${targetLat}?overview=full&geometries=geojson`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.code === "Ok" && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates.map(
            (coord: number[]) => [coord[1], coord[0]] as L.LatLngExpression,
          );

          // Draw route on map - BLACK LINE
          const routeLine = L.polyline(coordinates, {
            color: "black",
            weight: 5,
            opacity: 1,
            dashArray: "10, 10",
          }).addTo(map);
          routeLayerRef.current = routeLine;

          // Filter cameras along the route (within configured buffer distance)
          const camerasOnRoute = cameras.filter((camera) => {
            const [lon, lat] = camera.coordinates;
            if (
              lon === undefined ||
              lat === undefined ||
              !Number.isFinite(lon) ||
              !Number.isFinite(lat)
            ) {
              return false;
            }

            // Check if camera is near any point on the route
            const cameraLatLng = L.latLng(lat, lon);
            return coordinates.some((coord: L.LatLngExpression) => {
              const coordArray = coord as [number, number];
              const routePoint = L.latLng(coordArray[0], coordArray[1]);
              return (
                cameraLatLng.distanceTo(routePoint) <=
                ROUTE_BUFFER_DISTANCE_METERS
              );
            });
          });

          setRouteCameras(camerasOnRoute);

          // Fit map to show route only on first calculation
          if (!hasCalculatedRouteRef.current) {
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
            hasCalculatedRouteRef.current = true;
          }
        } else {
          console.warn("Route calculation failed:", data.code, data.message);
          setRouteCameras([]);
        }
      } catch (error) {
        console.error("Failed to fetch route:", error);
        setRouteCameras([]);
      } finally {
        setIsCalculatingRoute(false);
      }
    };

    fetchRoute();
  }, [userLocation, selectedTarget, cameras]);

  const handleClearRoute = () => {
    setSelectedTarget(null);
    setRouteCameras([]);
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    hasCalculatedRouteRef.current = false;
  };

  const displayedCameras =
    selectedTarget && routeCameras.length > 0 ? routeCameras : cameras;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-[900px] bg-white p-3 sm:p-4 md:p-6 font-sans text-finn-text">
        <div className="mb-3 sm:mb-4 flex items-start justify-between gap-2 sm:gap-4 border-b border-finn-border pb-3">
          <div className="flex-1">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-finn-blue">
              {t("map.title")}
            </h2>
            <p className="text-xs sm:text-sm text-finn-muted mt-0.5">
              {selectedTarget && routeCameras.length > 0
                ? t("map.routeCameraCount", {
                    count: routeCameras.length,
                    total: cameras.length,
                  })
                : t("map.cameraCount", { count: cameras.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("modal.close")}
            className="flex-none px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-finn-muted border border-finn-border rounded hover:border-finn-sky hover:text-finn-sky transition-colors"
          >
            {t("modal.close")}
          </button>
        </div>

        {/* Route controls */}
        {userLocation && (
          <div className="mb-3 p-2.5 sm:p-4 rounded border border-finn-border bg-finn-bg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div className="flex-1">
                {!selectedTarget ? (
                  <p className="text-xs sm:text-sm font-semibold">
                    {t("map.clickCameraForRoute")}
                  </p>
                ) : (
                  <div>
                    <p className="text-xs sm:text-sm">
                      {t("map.routeToTarget")}:{" "}
                      <strong className="text-finn-blue font-semibold">
                        {selectedTarget.name}
                      </strong>
                    </p>
                    {isCalculatingRoute && (
                      <p className="text-xs text-finn-muted mt-1">
                        {t("map.calculatingRoute")}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {selectedTarget && (
                <button
                  onClick={handleClearRoute}
                  className="px-3 py-1.5 text-xs font-medium bg-finn-red text-white rounded hover:opacity-90 transition-opacity"
                >
                  {t("map.clearRoute")}
                </button>
              )}
            </div>
          </div>
        )}

        {!userLocation && (
          <div className="mb-3 p-2 sm:p-3 bg-finn-blue/10 text-finn-blue border border-finn-blue/30 rounded">
            <p className="text-xs sm:text-sm font-semibold">
              {t("map.enableLocationForRoute")}
            </p>
          </div>
        )}

        <div
          ref={mapContainerRef}
          className="w-full h-[40vh] sm:h-[50vh] md:h-[60vh] min-h-[250px] border border-finn-border rounded shadow-sm"
        />

        {/* Camera list */}
        <div className="mt-3 max-h-36 sm:max-h-48 overflow-y-auto border border-finn-border rounded p-1.5 sm:p-2 bg-finn-bg">
          <details className="text-xs sm:text-sm">
            <summary className="cursor-pointer font-medium text-finn-text hover:text-finn-blue">
              {t("map.showList", { count: displayedCameras.length })}
            </summary>
            <ul className="mt-2 space-y-1">
              {displayedCameras.map((camera) => (
                <li
                  key={camera.id}
                  className={`text-xs px-2 py-1 rounded flex justify-between ${
                    selectedTarget?.id === camera.id
                      ? "bg-finn-blue text-white font-semibold"
                      : "text-finn-muted"
                  }`}
                >
                  <span>
                    {camera.name}
                    {camera.municipality && (
                      <span className="opacity-70">
                        {" "}
                        - {camera.municipality}
                      </span>
                    )}
                  </span>
                  {selectedTarget?.id === camera.id && (
                    <span className="uppercase text-[10px]">TARGET</span>
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
