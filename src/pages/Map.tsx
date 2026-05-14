import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Camera as CameraIcon, MapPin, Navigation, Layers, Search, X, Eye } from 'lucide-react';
import { useCamera } from '../context/CameraContext';
import { Detection, LocationSearchResult } from '../types';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Component to update map center
const MapCenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
};

// Heatmap Layer Component using leaflet.heat for thermal visualization
const HeatmapLayer: React.FC<{ points: [number, number, number][] }> = ({ points }) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);
  
  useEffect(() => {
    if (!map || !points.length) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }
    
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }
    
    const heatPoints = points.map(([lat, lng, intensity]) => [lat, lng, intensity] as [number, number, number]);
    
    const heatLayer = (L as any).heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 18,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.2: 'cyan',
        0.4: 'lime',
        0.6: 'yellow',
        0.8: 'orange',
        1.0: 'red'
      },
      minOpacity: 0.3,
    });
    
    heatLayer.addTo(map);
    heatLayerRef.current = heatLayer;
    
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points]);
  
  return null;
};

const Map: React.FC = () => {
  const { cameras } = useCamera();
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.073578, 77.499902]);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [selectedSearchLocation, setSelectedSearchLocation] = useState<[number, number] | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/detections');
        const transformedData: Detection[] = response.data.map((item: any) => ({
          _id: item._id,
          camera_name: item.camera_name,
          location: item.location,
          camera_location: item.camera_location,
          detection_time: item.detection_time,
          detection_date: item.detection_date,
          model_used: item.model_used,
          confidence: item.confidence,
          label: item.label,
          image_url: item.image_url ? `http://localhost:5000${item.image_url}` : '',
        }));
        setDetections(transformedData);
      } catch (error) {
        console.error('Error fetching detections:', error);
      }
    };
    fetchDetections();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location: [number, number] = [latitude, longitude];
          setCurrentLocation(location);
          setMapCenter(location);
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, []);

  const createCameraIcon = (letter: string, isActive: boolean) => {
    const color = isActive ? '#fbbf24' : '#ef4444';
    return L.divIcon({
      className: 'camera-marker',
      html: `
        <div style="
          position: relative;
          width: 50px;
          height: 50px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <div style="
            position: absolute;
            bottom: -8px;
            right: -8px;
            width: 24px;
            height: 24px;
            background-color: white;
            border: 2px solid ${color};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            color: ${color};
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          ">${letter}</div>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
      popupAnchor: [0, -25],
    });
  };

  const panToCurrentLocation = () => {
    if (currentLocation) {
      setMapCenter(currentLocation);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location: [number, number] = [latitude, longitude];
          setCurrentLocation(location);
          setMapCenter(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location.');
        }
      );
    }
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/location/search?q=${encodeURIComponent(query)}`);
        setSearchResults(response.data || []);
      } catch (error) {
        console.error('Error searching location:', error);
        setSearchResults([]);
      }
    }, 300);
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    const location: [number, number] = [lat, lng];
    setSelectedSearchLocation(location);
    setMapCenter(location);
    setSearchResults([]);
    setLocationSearch('');
  };

  useEffect(() => {
    if (locationSearch) {
      searchLocation(locationSearch);
    } else {
      setSearchResults([]);
    }
  }, [locationSearch]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .camera-marker { background: transparent !important; border: none !important; }
      .leaflet-container { height: 100%; width: 100%; font-family: inherit; }
      .leaflet-popup-content-wrapper { border-radius: 1.5rem; padding: 0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
      .leaflet-popup-content { margin: 0; width: auto !important; }
      .leaflet-popup-tip-container { display: none; }
      .location-label {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(4px);
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 800;
        color: #1e293b;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(226, 232, 240, 0.8);
        white-space: nowrap;
        pointer-events: none;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const getMarkerLetter = (index: number) => String.fromCharCode(65 + index);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 lg:px-12 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
            <div className="relative w-full sm:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                placeholder="Search for a location or area..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none shadow-sm"
              />
              {locationSearch && (
                <button
                  onClick={() => { setLocationSearch(''); setSearchResults([]); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X size={16} />
                </button>
              )}

              {searchResults.length > 0 && (
                <div className="absolute z-[2000] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleLocationSelect(result.lat, result.lon)}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-xl transition-all group flex items-start gap-3"
                      >
                        <div className="p-2 bg-gray-100 group-hover:bg-white rounded-lg transition-colors flex-shrink-0">
                          <MapPin size={16} className="text-gray-500 group-hover:text-indigo-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-900 line-clamp-2 pt-1">{result.display_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-sm active:scale-95 ${
                  showHeatmap 
                    ? 'bg-red-600 text-white shadow-red-100' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Layers size={18} className={showHeatmap ? 'animate-pulse' : ''} />
                {showHeatmap ? 'Disable Heatmap' : 'Enable Heatmap'}
              </button>
              <button
                onClick={panToCurrentLocation}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                <Navigation size={18} />
                My Position
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 bg-white px-6 py-3.5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Cameras: {cameras.filter(c => c.isActive).length}</span>
            </div>
            <div className="w-px h-4 bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${detections.length > 0 ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alert Status: {detections.length > 0 ? 'Active Alerts' : 'All Clear'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white p-2 shadow-gray-200/50">
          <div className="h-[calc(100vh-10rem)] rounded-[2rem] overflow-hidden relative">
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
              className="map-container"
            >
              <MapCenter center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {showHeatmap && (
                <HeatmapLayer
                  points={(() => {
                    return detections
                      .map(d => {
                        let lat: number | null = null;
                        let lon: number | null = null;
                        if (d.camera_location && d.camera_location.lat && d.camera_location.lon) {
                          lat = d.camera_location.lat;
                          lon = d.camera_location.lon;
                        } else {
                          const coords = d.location.split(',').map(Number);
                          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                            lat = coords[0];
                            lon = coords[1];
                          }
                        }
                        if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
                          const isCritical = ['Pistol', 'Knife', 'Fire', 'Gun', 'Weapon'].some(t => 
                            d.label.toLowerCase().includes(t.toLowerCase())
                          );
                          const baseWeight = Math.max(0.1, Math.min(1.0, d.confidence));
                          const weight = Math.min(1.0, baseWeight * (isCritical ? 1.5 : 1.0));
                          return [lat, lon, weight] as [number, number, number];
                        }
                        return null;
                      })
                      .filter((p): p is [number, number, number] => p !== null);
                  })()}
                />
              )}
              
              {currentLocation && (
                <Marker
                  position={currentLocation}
                  icon={L.divIcon({
                    className: 'current-location-marker',
                    html: `
                      <div class="relative">
                        <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-25"></div>
                        <div style="width: 20px; height: 20px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); position: relative;"></div>
                      </div>
                    `,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                  })}
                >
                  <Popup>
                    <div className="p-4 min-w-[220px]">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
                          <Navigation size={18} className="text-white" />
                        </div>
                        <div>
                          <span className="font-extrabold text-gray-900 block tracking-tight">Your Location</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Real-time GPS</span>
                        </div>
                      </div>
                      <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100 font-mono text-xs text-gray-700">
                        <div className="flex justify-between"><span>Lat</span><span>{currentLocation[0].toFixed(6)}</span></div>
                        <div className="flex justify-between"><span>Lng</span><span>{currentLocation[1].toFixed(6)}</span></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {selectedSearchLocation && (
                <Marker
                  position={selectedSearchLocation}
                  icon={L.divIcon({
                    className: 'searched-location-marker',
                    html: `<div style="width: 32px; height: 32px; background-color: #10b981; border: 4px solid white; border-radius: 50%; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  })}
                >
                  <Popup>
                    <div className="p-4 min-w-[220px]">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg"><MapPin size={18} className="text-white" /></div>
                        <div>
                          <span className="font-extrabold text-gray-900 block tracking-tight">Target Area</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search Result</span>
                        </div>
                      </div>
                      <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100 font-mono text-xs text-gray-700">
                        <div className="flex justify-between"><span>Lat</span><span>{selectedSearchLocation[0].toFixed(6)}</span></div>
                        <div className="flex justify-between"><span>Lng</span><span>{selectedSearchLocation[1].toFixed(6)}</span></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {!showHeatmap && cameras.map((camera, index) => {
                const position: [number, number] = [
                  parseFloat(camera.location.split(',')[0] || '13.073578'),
                  parseFloat(camera.location.split(',')[1] || '77.499902'),
                ];
                const letter = getMarkerLetter(index);
                const locationName = camera.locationName || camera.location.split(',')[0] || 'Unknown';

                return (
                  <React.Fragment key={camera.id}>
                    <Marker position={position} icon={createCameraIcon(letter, camera.isActive)}>
                      <Popup>
                        <div className="p-5 min-w-[260px]">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${camera.isActive ? 'bg-amber-500 text-white shadow-amber-100' : 'bg-red-600 text-white shadow-red-100'}`}><CameraIcon size={20} /></div>
                              <div>
                                <h3 className="font-extrabold text-gray-900 tracking-tight leading-none mb-1">{camera.name}</h3>
                                <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${camera.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div><span className={`text-[10px] font-bold uppercase tracking-widest ${camera.isActive ? 'text-green-600' : 'text-red-600'}`}>{camera.isActive ? 'Online' : 'Offline'}</span></div>
                              </div>
                            </div>
                            <div className="bg-gray-100 px-2 py-1 rounded-lg"><span className="text-xs font-bold text-gray-500">ID: {letter}</span></div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 p-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all"><MapPin size={16} className="text-indigo-600 mt-0.5" /><div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Installation</span><p className="text-xs font-bold text-gray-700">{locationName}</p></div></div>
                            <div className="flex items-start gap-3 p-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all"><Layers size={16} className="text-purple-600 mt-0.5" /><div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Intelligence</span><p className="text-xs font-bold text-gray-700">{camera.model}</p></div></div>
                          </div>
                          <button onClick={() => window.location.href = `/live?camera=${camera.id}`} className="w-full mt-4 py-3 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2"><Eye size={16} />View Live Stream</button>
                        </div>
                      </Popup>
                    </Marker>
                    <Marker position={[position[0] + 0.0005, position[1] + 0.0005]} icon={L.divIcon({ className: 'location-label-marker', html: `<div class="location-label animate-in zoom-in duration-300">${camera.name}</div>`, iconSize: [120, 24], iconAnchor: [0, 0] })} />
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;