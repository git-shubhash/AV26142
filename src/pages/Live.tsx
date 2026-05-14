import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, X, Play, Pause, Maximize, MapPin, Search, Video, Activity, AlertCircle, ZoomIn, ZoomOut, Camera, Circle, Square, Check, Trash2, Settings } from 'lucide-react';
import { useCamera } from '../context/CameraContext';
import { v4 as uuidv4 } from 'uuid';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import axios from 'axios';
import { LocationSearchResult, Detection } from '../types';
import 'leaflet/dist/leaflet.css';

interface LocationMarkerProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

const LocationMarker: React.FC<LocationMarkerProps> = ({ onLocationSelect }) => {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
};

const MapUpdater: React.FC<{ center?: [number, number] }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);

  return null;
};

const Live: React.FC = () => {
  const { cameras, addCamera, removeCamera, updateCamera, availableCameras, availableModels } = useCamera();
  const [isAddingCamera, setIsAddingCamera] = useState(false);
  const [editingCamera, setEditingCamera] = useState<string | null>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [locationName, setLocationName] = useState('');
  const [gridColumns, setGridColumns] = useState<number>(3);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([13.073578, 77.499902]);
  const [currentDateTime, setCurrentDateTime] = useState<{ time: string; date: string; day: string }>({
    time: '',
    date: '',
    day: ''
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [recentDetections, setRecentDetections] = useState<Detection[]>([]);
  const [loadingDetections, setLoadingDetections] = useState<boolean>(false);
  const [isROIMarking, setIsROIMarking] = useState<boolean>(false);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [savedPolygonPoints, setSavedPolygonPoints] = useState<[number, number][]>([]);
  const roiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingAnimationRef = useRef<number | null>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const fullscreenCameraRef = useRef<string | null>(null);
  
  // Automatic recording for active cameras
  const cameraRecordersRef = useRef<Map<string, MediaRecorder>>(new Map());
  const cameraCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const cameraChunksRef = useRef<Map<string, Blob[]>>(new Map());
  const cameraAnimationRefs = useRef<Map<string, number>>(new Map());

  const [newCamera, setNewCamera] = useState({
    cameraSource: '',
    rtspUrl: '',
    name: '',
    location: '',
    model: '',
    models: [] as string[],
  });
  const [cameraSourceType, setCameraSourceType] = useState<'local' | 'rtsp' | ''>('');

  // Update ref when fullscreenCamera changes
  useEffect(() => {
    fullscreenCameraRef.current = fullscreenCamera;
  }, [fullscreenCamera]);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });

    let animationFrameId: number | null = null;
    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const updateVideoFrame = (data: { camera_id: string; frame: string; detections: any[] }) => {
      const now = Date.now();
      // Throttle updates to target FPS
      if (now - lastFrameTime < frameInterval) {
        return;
      }
      lastFrameTime = now;

      const videoElement = document.getElementById(`video-${data.camera_id}`) as HTMLImageElement;
      const fullscreenElement = document.getElementById(`video-${data.camera_id}-fullscreen`) as HTMLImageElement;
      
      // Always update frames, but use requestAnimationFrame for better performance
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(() => {
        if (videoElement) {
          videoElement.src = `data:image/jpeg;base64,${data.frame}`;
        }
        if (fullscreenElement) {
          fullscreenElement.src = `data:image/jpeg;base64,${data.frame}`;
        }
      });
    };

    socketRef.current.on('video_frame', (data: { camera_id: string; frame: string; detections: any[] }) => {
      updateVideoFrame(data);

      if (data.detections?.length > 0) {
        console.log('Detections:', data.detections);
        
        // Update recent detections in real-time if this camera is in fullscreen
        const currentFullscreenCamera = fullscreenCameraRef.current;
        if (currentFullscreenCamera === data.camera_id && data.detections?.length > 0) {
          // Transform socket detections to match Detection interface
          const newDetections: Detection[] = data.detections.map((det: any) => ({
            _id: det._id || String(Date.now() + Math.random()),
            camera_name: det.camera_name,
            location: det.location,
            detection_time: det.detection_time,
            detection_date: det.detection_date,
            model_used: det.model_used,
            confidence: det.confidence,
            label: det.label,
            image_url: det.image_url ? `http://localhost:5000${det.image_url}` : '',
          }));
          
          // Add new detections to the top of the list, remove duplicates, and limit to 20
          setRecentDetections(prev => {
            const combined = [...newDetections, ...prev];
            // Remove duplicates based on _id
            const unique = combined.filter((det, index, self) => 
              index === self.findIndex(d => d._id === det._id)
            );
            return unique.slice(0, 20);
          });
        }
      }
    });

    // Helper function to get camera index from camera name or source
    const getCameraIndex = (cameraName: string): number | null => {
      // Try to parse from name format "Camera 1", "Camera 2", etc.
      const match = cameraName.match(/Camera\s+(\d+)/i);
      if (match) {
        const index = parseInt(match[1]) - 1;
        if (!isNaN(index) && index >= 0) {
          return index;
        }
      }
      // Try to find in availableCameras list
      const availableIndex = availableCameras.findIndex(avail => 
        avail.toLowerCase() === cameraName.toLowerCase()
      );
      if (availableIndex >= 0) {
        return availableIndex;
      }
      return null;
    };

    // Helper function to build stream data for a camera
    const buildStreamData = (camera: Camera) => {
      const streamData: any = {
        camera_id: camera.id,
        model_name: camera.model.toLowerCase().replace(/\s+/g, '_'),
      };
      
      // Check if camera has RTSP URL
      if ((camera as any).rtspUrl) {
        streamData.rtsp_url = (camera as any).rtspUrl;
      } else {
        // Try to get camera index from name
        const cameraIndex = getCameraIndex(camera.name);
        if (cameraIndex !== null) {
          streamData.camera_index = cameraIndex;
        }
      }
      
      return streamData;
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - restart streams for active cameras
        console.log('Tab became visible, restarting camera streams...');
        cameras.forEach(camera => {
          if (camera.isActive && socketRef.current) {
            const streamData = buildStreamData(camera);
            if (streamData.camera_index !== undefined || streamData.rtsp_url) {
              // Restart stream to ensure it's working
              socketRef.current.emit('stop_stream', { camera_id: camera.id });
              setTimeout(() => {
                if (socketRef.current) {
                  socketRef.current.emit('start_stream', streamData);
                  console.log(`Restarted stream for camera ${camera.name}`);
                }
              }, 500);
            } else {
              console.warn(`Could not determine camera source for ${camera.name}`);
            }
          }
        });
      } else {
        console.log('Tab became hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Stop all camera recordings on unmount
      cameraRecordersRef.current.forEach((recorder, cameraId) => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      });
      cameraRecordersRef.current.clear();
      cameraCanvasesRef.current.clear();
      cameraChunksRef.current.clear();
      cameraAnimationRefs.current.forEach(animId => cancelAnimationFrame(animId));
      cameraAnimationRefs.current.clear();
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [cameras, availableCameras]);

  // Get current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Current location:', latitude, longitude);
          setCurrentLocation([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          console.log('Using default location');
          // Keep default location if geolocation fails
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      console.log('Geolocation not supported, using default location');
    }
  }, []);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (response.data && response.data.display_name) {
        return response.data.display_name;
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/location/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchResults([]);
    }
  };

  const handleLocationSelect = async (lat: number, lng: number, displayName?: string) => {
    setSelectedLocation([lat, lng]);
    setNewCamera(prev => ({
      ...prev,
      location: `${lat},${lng}`,
    }));
    
    // If displayName is provided, use it; otherwise, reverse geocode to get the name
    if (displayName) {
      setLocationName(displayName);
    } else {
      const name = await reverseGeocode(lat, lng);
      setLocationName(name);
    }
    
    setSearchResults([]);
    setLocationSearch('');
  };

  const handleAddCamera = async () => {
    const hasSource = newCamera.cameraSource || newCamera.rtspUrl;
    if (hasSource && newCamera.name && newCamera.location && newCamera.model) {
      const cameraId = uuidv4();
      const cameraData: any = {
        id: cameraId,
        name: newCamera.name,
        location: newCamera.location,
        locationName: locationName,
        model: newCamera.model,
        isActive: true,
      };
      
      // Add RTSP URL if provided
      if (newCamera.rtspUrl) {
        cameraData.rtspUrl = newCamera.rtspUrl;
      }
      
      addCamera(cameraData);

      // Save camera to database with coordinates
      try {
        await axios.post('http://localhost:5000/api/cameras', cameraData);
      } catch (error) {
        console.error('Error saving camera to database:', error);
      }

      if (socketRef.current) {
        const streamData: any = {
          camera_id: cameraId,
          model_name: newCamera.model.toLowerCase().replace(/\s+/g, '_'),
        };
        
        // Add either camera_index or rtsp_url
        if (newCamera.rtspUrl) {
          streamData.rtsp_url = newCamera.rtspUrl;
        } else if (newCamera.cameraSource) {
          streamData.camera_index = parseInt(newCamera.cameraSource.split(' ')[1]) - 1;
        }
        
        socketRef.current.emit('start_stream', streamData);
        // Start recording after stream starts
        setTimeout(() => startAutoRecording(cameraId, newCamera.name), 2000);
      }

      setNewCamera({ cameraSource: '', rtspUrl: '', name: '', location: '', model: '' });
      setCameraSourceType('');
      setSelectedLocation(null);
      setLocationName('');
      setIsAddingCamera(false);
    }
  };

  const handleOpenEditCamera = (cameraId: string) => {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;
    
    setEditingCamera(cameraId);
    const hasRtspUrl = (camera as any).rtspUrl;
    setCameraSourceType(hasRtspUrl ? 'rtsp' : 'local');
    setNewCamera({
      cameraSource: '',
      rtspUrl: (camera as any).rtspUrl || '',
      name: camera.name,
      location: camera.location,
      model: (camera as any).models && (camera as any).models.length > 0 
        ? (camera as any).models[0] 
        : camera.model || '',
      models: (camera as any).models && (camera as any).models.length > 0 
        ? (camera as any).models 
        : (camera.model ? [camera.model] : []),
    });
    
    // Parse location if it exists
    if (camera.location) {
      try {
        const coords = camera.location.split(',');
        if (coords.length === 2) {
          const lat = parseFloat(coords[0].trim());
          const lon = parseFloat(coords[1].trim());
          if (!isNaN(lat) && !isNaN(lon)) {
            setSelectedLocation([lat, lon]);
          }
        }
      } catch (e) {
        console.error('Error parsing location:', e);
      }
    }
    
    setLocationName(camera.locationName || '');
  };

  const handleEditCamera = async () => {
    if (!editingCamera) return;
    
    const camera = cameras.find(c => c.id === editingCamera);
    if (!camera) return;

    const selectedModels = (newCamera.models && newCamera.models.length > 0) 
      ? newCamera.models 
      : (newCamera.model ? [newCamera.model] : (camera.model ? [camera.model] : []));
    
    if (!newCamera.name || !newCamera.location || selectedModels.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const updatedCameraData: any = {
      id: camera.id,
      name: newCamera.name,
      location: newCamera.location,
      locationName: locationName,
      model: selectedModels[0],
      models: selectedModels,
      isActive: camera.isActive,
    };
    
    // Include RTSP URL if it exists
    if (newCamera.rtspUrl) {
      updatedCameraData.rtspUrl = newCamera.rtspUrl;
    }

    updateCamera(camera.id, updatedCameraData);

    // Save camera to database with coordinates
    try {
      await axios.post('http://localhost:5000/api/cameras', updatedCameraData);
    } catch (error) {
      console.error('Error updating camera in database:', error);
    }

    // Restart stream with new model if camera is active
    if (camera.isActive && socketRef.current) {
      socketRef.current.emit('stop_stream', { camera_id: camera.id });
      setTimeout(() => {
        const streamData: any = {
          camera_id: camera.id,
          model_name: selectedModels[0].toLowerCase().replace(/\s+/g, '_'),
        };
        
        // Check if camera has RTSP URL
        if ((camera as any).rtspUrl) {
          streamData.rtsp_url = (camera as any).rtspUrl;
        } else {
          const cameraIndex = parseInt(camera.name.split(' ')[1]) - 1;
          if (!isNaN(cameraIndex) && cameraIndex >= 0) {
            streamData.camera_index = cameraIndex;
          }
        }
        
        socketRef.current.emit('start_stream', streamData);
      }, 500);
    }

    setNewCamera({ cameraSource: '', name: '', location: '', model: '', models: [] });
    setSelectedLocation(null);
    setLocationName('');
    setEditingCamera(null);
  };

  const handleRemoveCamera = (id: string) => {
    // Stop recording before removing
    stopAutoRecording(id);
    if (socketRef.current) {
      socketRef.current.emit('stop_stream', { camera_id: id });
    }
    removeCamera(id);
    if (fullscreenCamera === id) {
      exitFullscreen();
    }
  };

  const toggleCameraStatus = (id: string, currentStatus: boolean) => {
    updateCamera(id, { isActive: !currentStatus });
    if (socketRef.current) {
      if (!currentStatus) {
        const camera = cameras.find(c => c.id === id);
        if (camera) {
          const streamData: any = {
            camera_id: id,
            model_name: camera.model.toLowerCase().replace(/\s+/g, '_'),
          };
          
          // Check if camera has RTSP URL
          if ((camera as any).rtspUrl) {
            streamData.rtsp_url = (camera as any).rtspUrl;
          } else {
            // Try to parse camera index from name
            const match = camera.name.match(/Camera\s+(\d+)/i);
            if (match) {
              streamData.camera_index = parseInt(match[1]) - 1;
            }
          }
          
          socketRef.current.emit('start_stream', streamData);
          // Start recording when camera becomes active
          setTimeout(() => startAutoRecording(id, camera.name), 2000);
        }
      } else {
        socketRef.current.emit('stop_stream', { camera_id: id });
        // Stop recording when camera becomes inactive
        stopAutoRecording(id);
      }
    }
  };

  const handleFullscreen = (cameraId: string) => {
    setFullscreenCamera(cameraId);
    if (fullscreenRef.current?.requestFullscreen) {
      fullscreenRef.current.requestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (isRecording) {
      stopRecording();
    }
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setFullscreenCamera(null);
    setZoomLevel(1);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const takeSnapshot = () => {
    const imgElement = document.getElementById(`video-${fullscreenCamera}-fullscreen`) as HTMLImageElement;
    if (imgElement && imgElement.src) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;
        ctx.drawImage(imgElement, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `snapshot-${fullscreenCamera}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    }
  };

  const startRecording = () => {
    try {
      const imgElement = document.getElementById(`video-${fullscreenCamera}-fullscreen`) as HTMLImageElement;
      if (!imgElement) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Reduced resolution for smaller file size (640x360)
      canvas.width = 640;
      canvas.height = 360;
      recordingCanvasRef.current = canvas;

      // Reduced frame rate from 30 to 15 fps for smaller file size
      const canvasStream = canvas.captureStream(15);
      
      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm',
        videoBitsPerSecond: 500000  // 500 kbps bitrate for compression
      });
      
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recording-${fullscreenCamera}-${Date.now()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        canvasStream.getTracks().forEach(track => track.stop());
        if (recordingAnimationRef.current) {
          cancelAnimationFrame(recordingAnimationRef.current);
        }
      };
      
      // Draw frames continuously
      const drawFrame = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && imgElement.src) {
          ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
          recordingAnimationRef.current = requestAnimationFrame(drawFrame);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      drawFrame();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingAnimationRef.current) {
        cancelAnimationFrame(recordingAnimationRef.current);
      }
    }
  };

  // Start automatic recording for a camera
  const startAutoRecording = (cameraId: string, cameraName: string) => {
    try {
      // Check if already recording
      if (cameraRecordersRef.current.has(cameraId)) {
        return;
      }

      const videoElement = document.getElementById(`video-${cameraId}`) as HTMLImageElement;
      if (!videoElement || !videoElement.src) {
        // Retry if element not ready
        setTimeout(() => startAutoRecording(cameraId, cameraName), 1000);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Reduced resolution for smaller file size (640x360 instead of 1280x720)
      canvas.width = 640;
      canvas.height = 360;
      cameraCanvasesRef.current.set(cameraId, canvas);

      // Reduced frame rate from 30 to 15 fps for smaller file size
      const canvasStream = canvas.captureStream(15);
      
      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm',
        videoBitsPerSecond: 500000  // 500 kbps bitrate for compression
      });
      
      cameraChunksRef.current.set(cameraId, []);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const chunks = cameraChunksRef.current.get(cameraId) || [];
          chunks.push(event.data);
          cameraChunksRef.current.set(cameraId, chunks);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const chunks = cameraChunksRef.current.get(cameraId) || [];
        if (chunks.length === 0) return;
        
        const blob = new Blob(chunks, { type: 'video/webm' });
        
        // Upload to backend
        try {
          const formData = new FormData();
          formData.append('video', blob, `recording-${cameraId}-${Date.now()}.webm`);
          formData.append('camera_id', cameraId);
          formData.append('camera_name', cameraName);
          
          await axios.post('http://localhost:5000/api/recordings/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          console.log(`Recording uploaded for ${cameraName}`);
        } catch (error) {
          console.error('Error uploading recording:', error);
        }
        
        // Cleanup
        canvasStream.getTracks().forEach(track => track.stop());
        const animId = cameraAnimationRefs.current.get(cameraId);
        if (animId) {
          cancelAnimationFrame(animId);
        }
        cameraCanvasesRef.current.delete(cameraId);
        cameraChunksRef.current.delete(cameraId);
        cameraAnimationRefs.current.delete(cameraId);
      };
      
      cameraRecordersRef.current.set(cameraId, mediaRecorder);
      mediaRecorder.start();
      
      // Draw frames continuously
      const drawFrame = () => {
        const recorder = cameraRecordersRef.current.get(cameraId);
        const canvas = cameraCanvasesRef.current.get(cameraId);
        const videoEl = document.getElementById(`video-${cameraId}`) as HTMLImageElement;
        
        if (recorder && recorder.state === 'recording' && canvas && videoEl && videoEl.complete && videoEl.naturalWidth > 0) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          }
          const animId = requestAnimationFrame(drawFrame);
          cameraAnimationRefs.current.set(cameraId, animId);
        }
      };
      
      drawFrame();
      console.log(`Started auto-recording for ${cameraName}`);
    } catch (error) {
      console.error(`Error starting auto-recording for ${cameraId}:`, error);
    }
  };

  // Stop automatic recording for a camera
  const stopAutoRecording = (cameraId: string) => {
    const recorder = cameraRecordersRef.current.get(cameraId);
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      cameraRecordersRef.current.delete(cameraId);
      console.log(`Stopped auto-recording for camera ${cameraId}`);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenCamera(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Fetch recent detections for the fullscreen camera
  useEffect(() => {
    const fetchDetections = async () => {
      if (!fullscreenCamera) {
        setRecentDetections([]);
        return;
      }

      try {
        setLoadingDetections(true);
        // Get camera name from the camera ID
        const currentCamera = cameras.find(c => c.id === fullscreenCamera);
        const cameraName = currentCamera?.name;
        
        if (!cameraName) {
          setRecentDetections([]);
          return;
        }

        // Fetch all detections and filter by camera name
        const response = await axios.get('http://localhost:5000/api/detections');
        // Filter by camera name, sort by date and time, then limit to most recent 20
        const transformedData: Detection[] = response.data
          .filter((item: any) => item.camera_name === cameraName)
          .map((item: any) => ({
            _id: item._id,
            camera_name: item.camera_name,
            location: item.location,
            detection_time: item.detection_time,
            detection_date: item.detection_date,
            model_used: item.model_used,
            confidence: item.confidence,
            label: item.label,
            image_url: item.image_url ? `http://localhost:5000${item.image_url}` : '',
          }))
          .sort((a, b) => {
            // Combine date and time for proper sorting
            const dateTimeA = `${a.detection_date} ${a.detection_time}`;
            const dateTimeB = `${b.detection_date} ${b.detection_time}`;
            
            // Parse to Date objects for comparison
            const dateA = new Date(dateTimeA);
            const dateB = new Date(dateTimeB);
            
            // Sort in descending order (most recent first)
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 20);
        setRecentDetections(transformedData);
      } catch (error) {
        console.error('Error fetching detections:', error);
        setRecentDetections([]);
      } finally {
        setLoadingDetections(false);
      }
    };

    // Initial fetch to load existing detections
    fetchDetections();
    
    // No polling - updates will come via socket in real-time
  }, [fullscreenCamera, cameras]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Update date and time for fullscreen view
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const day = now.toLocaleDateString('en-US', { weekday: 'long' });
      setCurrentDateTime({ time, date, day });
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load saved polygon points when camera changes
  useEffect(() => {
    const loadPolygonPoints = async () => {
      if (!fullscreenCamera) {
        setSavedPolygonPoints([]);
        setPolygonPoints([]);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/camera/${fullscreenCamera}/restricted-area`);
        if (response.data && response.data.polygon_points && response.data.polygon_points.length > 0) {
          const points = response.data.polygon_points.map((p: number[]) => [p[0], p[1]] as [number, number]);
          setSavedPolygonPoints(points);
          setPolygonPoints(points);
        } else {
          setSavedPolygonPoints([]);
          setPolygonPoints([]);
        }
      } catch (error) {
        console.error('Error loading polygon points:', error);
        // Don't show error to user, just use empty points
        setSavedPolygonPoints([]);
        setPolygonPoints([]);
      }
    };

    loadPolygonPoints();
  }, [fullscreenCamera]);

  // Draw polygon on canvas
  useEffect(() => {
    const canvas = roiCanvasRef.current;
    if (!canvas || !fullscreenCamera) return;

    const imgElement = document.getElementById(`video-${fullscreenCamera}-fullscreen`) as HTMLImageElement;
    if (!imgElement) return;

    const drawPolygon = () => {
      if (!imgElement.complete || imgElement.naturalWidth === 0) {
        // Wait for image to load
        setTimeout(drawPolygon, 100);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match displayed image size
      const rect = imgElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw polygon if points exist
      if (polygonPoints.length > 0) {
        const currentCamera = cameras.find(c => c.id === fullscreenCamera);
        const isRestrictedArea = currentCamera?.model === 'restricted_area';
        
        // Calculate scale factors
        const naturalWidth = imgElement.naturalWidth || imgElement.width;
        const naturalHeight = imgElement.naturalHeight || imgElement.height;
        const displayedWidth = rect.width;
        const displayedHeight = rect.height;
        
        // For restricted_area, backend processes at 640px width but sends back original size
        // So we need to scale from 640px width space to original size, then to displayed size
        const backendWidth = isRestrictedArea ? 640 : naturalWidth;
        const backendHeight = isRestrictedArea 
          ? (640 * naturalHeight) / naturalWidth 
          : naturalHeight;
        
        // Scale factor: backend coordinates -> original size -> displayed size
        // First scale to original size, then to displayed
        const scaleToOriginal = naturalWidth / backendWidth;
        const scaleX = (displayedWidth / naturalWidth) * scaleToOriginal;
        const scaleY = (displayedHeight / naturalHeight) * (naturalHeight / backendHeight);

        // Draw polygon
        if (polygonPoints.length >= 3) {
          ctx.strokeStyle = '#00ff00';
          ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
          ctx.lineWidth = 2;

          ctx.beginPath();
          const firstPoint = polygonPoints[0];
          ctx.moveTo(firstPoint[0] * scaleX, firstPoint[1] * scaleY);
          for (let i = 1; i < polygonPoints.length; i++) {
            ctx.lineTo(polygonPoints[i][0] * scaleX, polygonPoints[i][1] * scaleY);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Draw points
        ctx.fillStyle = '#00ff00';
        polygonPoints.forEach((point, index) => {
          const x = point[0] * scaleX;
          const y = point[1] * scaleY;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
          // Draw point number
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Arial';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeText(`${index + 1}`, x + 8, y - 8);
          ctx.fillText(`${index + 1}`, x + 8, y - 8);
          ctx.fillStyle = '#00ff00';
        });
      }
    };

    // Draw immediately and also on image load
    drawPolygon();
    imgElement.addEventListener('load', drawPolygon);
    
    return () => {
      imgElement.removeEventListener('load', drawPolygon);
    };
  }, [polygonPoints, fullscreenCamera, cameras, zoomLevel]);

  // Handle click on video to add polygon point
  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't process if clicking on buttons or other interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('.absolute')) {
      return;
    }
    
    if (!isROIMarking || !fullscreenCamera) return;

    const imgElement = document.getElementById(`video-${fullscreenCamera}-fullscreen`) as HTMLImageElement;
    if (!imgElement || !imgElement.complete) return;

    const rect = imgElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Get natural image dimensions (backend resizes back to original size before sending)
    const naturalWidth = imgElement.naturalWidth || imgElement.width;
    const naturalHeight = imgElement.naturalHeight || imgElement.height;
    const displayedWidth = rect.width;
    const displayedHeight = rect.height;

    // Calculate scale factors from displayed to natural (original frame size)
    const scaleX = naturalWidth / displayedWidth;
    const scaleY = naturalHeight / displayedHeight;

    // Get coordinates in the natural image space (original frame size)
    const imageX = clickX * scaleX;
    const imageY = clickY * scaleY;

    // For restricted_area model, backend processes at 640px width but sends original size
    // Backend flow: original -> resize to 640px -> process -> resize back to original -> send
    // So polygon points must be in 640px width coordinate space
    const currentCamera = cameras.find(c => c.id === fullscreenCamera);
    if (currentCamera?.model === 'restricted_area') {
      // Backend processing dimensions (640px width)
      const backendWidth = 640;
      const backendHeight = naturalWidth > 0 ? (640 * naturalHeight) / naturalWidth : naturalHeight;
      
      // Scale coordinates from original frame size to backend processing size (640px width)
      const backendX = (imageX * backendWidth) / naturalWidth;
      const backendY = (imageY * backendHeight) / naturalHeight;
      
      setPolygonPoints([...polygonPoints, [backendX, backendY]]);
    } else {
      // Use actual image coordinates for other models
      setPolygonPoints([...polygonPoints, [imageX, imageY]]);
    }
  };

  // Save polygon points to backend
  const savePolygonPoints = async () => {
    if (!fullscreenCamera || polygonPoints.length < 3) {
      alert('Please mark at least 3 points to form a polygon');
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/camera/${fullscreenCamera}/restricted-area`, {
        polygon_points: polygonPoints
      });
      setSavedPolygonPoints([...polygonPoints]);
      setIsROIMarking(false);
      alert('Restricted area saved successfully!');
    } catch (error) {
      console.error('Error saving polygon points:', error);
      alert('Failed to save restricted area. Please try again.');
    }
  };

  // Clear polygon points
  const clearPolygonPoints = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setPolygonPoints([]);
    setIsROIMarking(false);
  };

  // Delete saved polygon
  const deletePolygon = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!fullscreenCamera) return;

    try {
      const response = await axios.post(`http://localhost:5000/api/camera/${fullscreenCamera}/restricted-area`, {
        polygon_points: []
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        setSavedPolygonPoints([]);
        setPolygonPoints([]);
        alert('Restricted area deleted successfully!');
      } else {
        throw new Error('Unexpected response status');
      }
    } catch (error: any) {
      console.error('Error deleting polygon:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to delete restricted area: ${errorMessage}. Please try again.`);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Live Surveillance</h2>
          <p className="text-gray-600 mt-1">Monitor and detect objects in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          {cameras.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setGridColumns(1)}
                className={`p-2 rounded-md transition-all ${
                  gridColumns === 1 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="1 Column"
              >
                <div className="w-4 h-4 flex flex-col gap-0.5">
                  <div className="w-full h-full bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setGridColumns(2)}
                className={`p-2 rounded-md transition-all ${
                  gridColumns === 2 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="2 Columns"
              >
                <div className="w-4 h-4 flex gap-0.5">
                  <div className="w-full h-full bg-current rounded-sm"></div>
                  <div className="w-full h-full bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setGridColumns(3)}
                className={`p-2 rounded-md transition-all ${
                  gridColumns === 3 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="3 Columns"
              >
                <div className="w-4 h-4 grid grid-cols-3 gap-0.5">
                  <div className="w-full h-full bg-current rounded-sm"></div>
                  <div className="w-full h-full bg-current rounded-sm"></div>
                  <div className="w-full h-full bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setGridColumns(4)}
                className={`p-2 rounded-md transition-all ${
                  gridColumns === 4 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="4 Columns"
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="w-full h-full bg-current rounded-sm"></div>
                  <div className="w-full h-full bg-current rounded-sm"></div>
                  <div className="w-full h-full bg-current rounded-sm"></div>
                  <div className="w-full h-full bg-current rounded-sm"></div>
                </div>
              </button>
            </div>
          )}
          <button
            onClick={() => setIsAddingCamera(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-purple-500/40 font-medium"
          >
            <PlusCircle size={20} />
            Add Camera
          </button>
        </div>
      </div>

      {/* Empty State */}
      {cameras.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-lg border border-gray-200 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200">
              <Video size={48} className="text-blue-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Cameras Added</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get started by adding your first camera to begin real-time monitoring and object detection.
          </p>
          <button
            onClick={() => setIsAddingCamera(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-purple-500/40 font-medium"
          >
            <PlusCircle size={20} />
            Add Your First Camera
          </button>
        </div>
      ) : (
        <div className={`grid gap-6 ${
            gridColumns === 1 ? 'grid-cols-1' :
            gridColumns === 2 ? 'grid-cols-1 md:grid-cols-2' :
            gridColumns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {cameras.map((camera) => (
            <div key={camera.id} className="bg-white rounded-t-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
              {/* Video Feed */}
              <div className="relative bg-gray-900 overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                <img
                  id={`video-${camera.id}`}
                  src="/images.png"
                  alt={`Feed from ${camera.name}`}
                  className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Status Indicator */}
                <div className="absolute top-3 left-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm ${
                    camera.isActive 
                      ? 'bg-green-500/90 text-white' 
                      : 'bg-gray-500/90 text-white'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      camera.isActive ? 'bg-white animate-pulse' : 'bg-white'
                    }`}></div>
                    <span className="text-xs font-medium">
                      {camera.isActive ? 'Live' : 'Paused'}
                    </span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => handleOpenEditCamera(camera.id)}
                    className="p-2.5 rounded-lg bg-blue-500/90 hover:bg-blue-600/90 backdrop-blur-sm transition-all"
                    title="Edit Settings"
                  >
                    <Settings size={18} className="text-white" />
                  </button>
                  <button
                    onClick={() => toggleCameraStatus(camera.id, camera.isActive)}
                    className={`p-2.5 rounded-lg backdrop-blur-sm transition-all ${
                      camera.isActive 
                        ? 'bg-red-500/90 hover:bg-red-600/90' 
                        : 'bg-green-500/90 hover:bg-green-600/90'
                    }`}
                    title={camera.isActive ? 'Pause' : 'Resume'}
                  >
                    {camera.isActive ? (
                      <Pause size={18} className="text-white" />
                    ) : (
                      <Play size={18} className="text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => handleFullscreen(camera.id)}
                    className="p-2.5 rounded-lg bg-gradient-to-r from-indigo-500/90 to-purple-600/90 hover:from-indigo-600/90 hover:to-purple-700/90 backdrop-blur-sm transition-all"
                    title="Fullscreen"
                  >
                    <Maximize size={18} className="text-white" />
                  </button>
                  <button
                    onClick={() => handleRemoveCamera(camera.id)}
                    className="p-2.5 rounded-lg bg-red-500/90 hover:bg-red-600/90 backdrop-blur-sm transition-all"
                    title="Remove"
                  >
                    <X size={18} className="text-white" />
                  </button>
                </div>
              </div>
              
              {/* Camera Info */}
              <div className="p-4">
                <div className="flex items-center gap-3 text-sm text-gray-700 flex-wrap">
                  <span className="font-bold text-gray-900">{camera.name}</span>
                  <span className="text-gray-400">•</span>
                  <span className="truncate flex-1 min-w-0">
                    {(camera.locationName || camera.location)?.split(',')[0]?.trim() || camera.location}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">
                    Models: <span className="font-medium text-gray-900">
                      {((camera as any).models && (camera as any).models.length > 0) 
                        ? (camera as any).models.join(', ') 
                        : camera.model}
                    </span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className={`font-medium ${
                    camera.isActive ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {camera.isActive ? 'Detecting' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Camera Modal */}
      {isAddingCamera && (
        <div 
          className="fixed bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] overflow-y-auto" 
          style={{ 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100vw', 
            height: '100vh',
            margin: 0, 
            padding: 0 
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] my-4 mx-4 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Add New Camera</h3>
                <p className="text-sm text-gray-600 mt-1">Configure camera settings and location</p>
              </div>
              <button 
                onClick={() => {
                  setIsAddingCamera(false);
                  setNewCamera({ cameraSource: '', rtspUrl: '', name: '', location: '', model: '', models: [] });
                  setCameraSourceType('');
                  setSelectedLocation(null);
                  setLocationName('');
                }} 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form */}
                <div className="space-y-5">
                  <div>
                    <label htmlFor="camera-source-type" className="block text-sm font-semibold text-gray-700 mb-2">
                      Camera Source Type
                    </label>
                    <select
                      id="camera-source-type"
                      value={cameraSourceType}
                      onChange={(e) => {
                        const selectedType = e.target.value as 'local' | 'rtsp' | '';
                        setCameraSourceType(selectedType);
                        // Clear the other source type when switching
                        if (selectedType === 'local') {
                          setNewCamera({ ...newCamera, rtspUrl: '', cameraSource: '' });
                        } else if (selectedType === 'rtsp') {
                          setNewCamera({ ...newCamera, cameraSource: '', rtspUrl: '' });
                        } else {
                          setNewCamera({ ...newCamera, cameraSource: '', rtspUrl: '' });
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    >
                      <option value="">Select Source Type</option>
                      <option value="local">Local Camera</option>
                      <option value="rtsp">RTSP Stream</option>
                    </select>
                  </div>

                  {cameraSourceType === 'local' && (
                    <div>
                      <label htmlFor="camera-source" className="block text-sm font-semibold text-gray-700 mb-2">
                        Camera Source
                      </label>
                      <select
                        id="camera-source"
                        value={newCamera.cameraSource}
                        onChange={(e) => setNewCamera({ ...newCamera, cameraSource: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                      >
                        <option value="">Select Camera</option>
                        {availableCameras.map((camera) => (
                          <option key={camera} value={camera}>
                            {camera}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {cameraSourceType === 'rtsp' && (
                    <div>
                      <label htmlFor="rtsp-url" className="block text-sm font-semibold text-gray-700 mb-2">
                        RTSP URL
                      </label>
                      <input
                        type="text"
                        id="rtsp-url"
                        value={newCamera.rtspUrl}
                        onChange={(e) => setNewCamera({ ...newCamera, rtspUrl: e.target.value })}
                        placeholder="rtsp://username:password@ip:port/stream"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Example: rtsp://admin:password@192.168.1.100:554/stream1
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="camera-name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Camera Name
                    </label>
                    <input
                      type="text"
                      id="camera-name"
                      value={newCamera.name}
                      onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                      placeholder="Enter camera name (e.g., Front Entrance, Parking Lot)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                      disabled={!newCamera.cameraSource && !newCamera.rtspUrl}
                    />
                    {!newCamera.cameraSource && !newCamera.rtspUrl && (
                      <p className="mt-1 text-xs text-gray-500">Please select a camera source or enter RTSP URL first</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="camera-model" className="block text-sm font-semibold text-gray-700 mb-2">
                      Detection Model
                    </label>
                    <select
                      id="camera-model"
                      value={newCamera.model}
                      onChange={(e) => setNewCamera({ ...newCamera, model: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    >
                      <option value="">Select Model</option>
                      {availableModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => {
                          setLocationSearch(e.target.value);
                          searchLocation(e.target.value);
                        }}
                        placeholder="Search for a location..."
                        className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                      <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            className="w-full px-4 py-3 text-left hover:bg-indigo-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                            onClick={() => handleLocationSelect(result.lat, result.lon, result.display_name)}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-indigo-500" />
                              <span className="text-sm text-gray-700">{result.display_name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedLocation && (
                      <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-indigo-700">
                          <MapPin size={16} />
                          <span className="font-medium">{locationName || `${selectedLocation[0].toFixed(6)}, ${selectedLocation[1].toFixed(6)}`}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Map */}
                <div className="h-96 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
                  <MapContainer
                    key={currentLocation[0] + currentLocation[1]}
                    center={currentLocation}
                    zoom={13}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {/* Current Location Marker */}
                    <Marker 
                      position={currentLocation}
                      icon={L.divIcon({
                        className: 'current-location-marker',
                        html: '<div style="width: 20px; height: 20px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                      })}
                    />
                    <LocationMarker onLocationSelect={handleLocationSelect} />
                    {selectedLocation ? (
                      <MapUpdater center={selectedLocation} />
                    ) : (
                      <MapUpdater center={currentLocation} />
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsAddingCamera(false);
                  setNewCamera({ cameraSource: '', rtspUrl: '', name: '', location: '', model: '', models: [] });
                  setCameraSourceType('');
                  setSelectedLocation(null);
                  setLocationName('');
                }}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCamera}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors font-medium shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={(!newCamera.cameraSource && !newCamera.rtspUrl) || !newCamera.name || !newCamera.location || !newCamera.model}
              >
                Add Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Camera Modal */}
      {editingCamera && (
        <div 
          className="fixed bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] overflow-y-auto" 
          style={{ 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100vw', 
            height: '100vh',
            margin: 0, 
            padding: 0 
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] my-4 mx-4 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Edit Camera Settings</h3>
                <p className="text-sm text-gray-600 mt-1">Update camera name, model, and location</p>
              </div>
              <button 
                onClick={() => {
                  setEditingCamera(null);
                  setNewCamera({ cameraSource: '', rtspUrl: '', name: '', location: '', model: '', models: [] });
                  setCameraSourceType('');
                  setSelectedLocation(null);
                  setLocationName('');
                }} 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form */}
                <div className="space-y-5">
                  <div>
                    <label htmlFor="edit-camera-name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Camera Name
                    </label>
                    <input
                      type="text"
                      id="edit-camera-name"
                      value={newCamera.name}
                      onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                      placeholder="Enter camera name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-camera-source-type" className="block text-sm font-semibold text-gray-700 mb-2">
                      Camera Source Type
                    </label>
                    <select
                      id="edit-camera-source-type"
                      value={cameraSourceType}
                      onChange={(e) => {
                        const selectedType = e.target.value as 'local' | 'rtsp' | '';
                        setCameraSourceType(selectedType);
                        // Clear the other source type when switching
                        if (selectedType === 'local') {
                          setNewCamera({ ...newCamera, rtspUrl: '', cameraSource: '' });
                        } else if (selectedType === 'rtsp') {
                          setNewCamera({ ...newCamera, cameraSource: '', rtspUrl: '' });
                        } else {
                          setNewCamera({ ...newCamera, cameraSource: '', rtspUrl: '' });
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    >
                      <option value="">Select Source Type</option>
                      <option value="local">Local Camera</option>
                      <option value="rtsp">RTSP Stream</option>
                    </select>
                  </div>

                  {cameraSourceType === 'local' && (
                    <div>
                      <label htmlFor="edit-camera-source" className="block text-sm font-semibold text-gray-700 mb-2">
                        Camera Source
                      </label>
                      <select
                        id="edit-camera-source"
                        value={newCamera.cameraSource}
                        onChange={(e) => setNewCamera({ ...newCamera, cameraSource: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                      >
                        <option value="">Select Camera</option>
                        {availableCameras.map((camera) => (
                          <option key={camera} value={camera}>
                            {camera}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {cameraSourceType === 'rtsp' && (
                    <div>
                      <label htmlFor="edit-rtsp-url" className="block text-sm font-semibold text-gray-700 mb-2">
                        RTSP URL
                      </label>
                      <input
                        type="text"
                        id="edit-rtsp-url"
                        value={newCamera.rtspUrl}
                        onChange={(e) => setNewCamera({ ...newCamera, rtspUrl: e.target.value })}
                        placeholder="rtsp://username:password@ip:port/stream"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Example: rtsp://admin:password@192.168.1.100:554/stream1
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="edit-camera-models" className="block text-sm font-semibold text-gray-700 mb-2">
                      Detection Models (Select Multiple)
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                      {availableModels.map((model) => (
                        <label key={model} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={newCamera.models?.includes(model) || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewCamera({ 
                                  ...newCamera, 
                                  models: [...(newCamera.models || []), model],
                                  model: model 
                                });
                              } else {
                                setNewCamera({ 
                                  ...newCamera, 
                                  models: (newCamera.models || []).filter(m => m !== model),
                                  model: (newCamera.models || []).filter(m => m !== model)[0] || ''
                                });
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{model}</span>
                        </label>
                      ))}
                    </div>
                    {newCamera.models && newCamera.models.length > 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        Selected: {newCamera.models.join(', ')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => {
                          setLocationSearch(e.target.value);
                          searchLocation(e.target.value);
                        }}
                        placeholder="Search for a location..."
                        className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                      <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            className="w-full px-4 py-3 text-left hover:bg-indigo-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                            onClick={() => handleLocationSelect(result.lat, result.lon, result.display_name)}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-indigo-500" />
                              <span className="text-sm text-gray-700">{result.display_name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedLocation && (
                      <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-indigo-700">
                          <MapPin size={16} />
                          <span className="font-medium">{locationName || `${selectedLocation[0].toFixed(6)}, ${selectedLocation[1].toFixed(6)}`}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Map */}
                <div className="h-96 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
                  <MapContainer
                    key={selectedLocation ? selectedLocation[0] + selectedLocation[1] : currentLocation[0] + currentLocation[1]}
                    center={selectedLocation || currentLocation}
                    zoom={13}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker onLocationSelect={handleLocationSelect} />
                    {selectedLocation ? (
                      <MapUpdater center={selectedLocation} />
                    ) : (
                      <MapUpdater center={currentLocation} />
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingCamera(null);
                  setNewCamera({ cameraSource: '', rtspUrl: '', name: '', location: '', model: '', models: [] });
                  setSelectedLocation(null);
                  setLocationName('');
                }}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCamera}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors font-medium shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newCamera.name || !newCamera.location || (newCamera.models && newCamera.models.length === 0) && !newCamera.model}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen View */}
      {fullscreenCamera && (
        <div 
          ref={fullscreenRef}
          className="fixed top-0 left-0 right-0 bottom-0 bg-black z-50 m-0"
          style={{ margin: 0, padding: 0 }}
        >
          <div className="w-full h-full bg-gray-950 flex overflow-hidden relative">
            {/* Left Side - Video Feed */}
            <div 
              className="flex-1 h-full flex items-start justify-start overflow-hidden relative bg-black"
              onClick={handleVideoClick}
              style={{ cursor: isROIMarking ? 'crosshair' : 'default' }}
            >
              <img
                id={`video-${fullscreenCamera}-fullscreen`}
                alt="Fullscreen camera feed"
                className="h-full w-auto object-contain transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
              />
              {/* ROI Canvas Overlay */}
              <canvas
                ref={roiCanvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ 
                  transform: `scale(${zoomLevel})`, 
                  transformOrigin: 'top left',
                  zIndex: 10,
                  imageRendering: 'pixelated'
                }}
              />
              {/* ROI Marking Instructions */}
              {isROIMarking && (
                <div className="absolute top-32 left-6 bg-yellow-500/90 text-black px-4 py-2 rounded-lg z-20 font-mono text-sm">
                  <p className="font-bold">ROI Marking Mode Active</p>
                  <p>Click on the video to mark polygon points</p>
                  <p>Minimum 3 points required</p>
                  <p className="mt-1">Points marked: {polygonPoints.length}</p>
                </div>
              )}
              
              {/* Top Left - Camera Info Overlay */}
              <div className={`absolute top-24 left-6 transition-opacity duration-300 z-10 font-mono ${showOverlay ? 'opacity-100' : 'opacity-0'}`}>
                <h3 className="text-2xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                  {cameras.find(c => c.id === fullscreenCamera)?.name}
                </h3>
                <p className="text-base text-blue-400 mb-1 drop-shadow-[0_0_6px_rgba(96,165,250,0.6)]">
                  {(cameras.find(c => c.id === fullscreenCamera)?.locationName || cameras.find(c => c.id === fullscreenCamera)?.location)?.split(',')[0]?.trim() || cameras.find(c => c.id === fullscreenCamera)?.location}
                </p>
                <p className="text-sm text-blue-300 drop-shadow-[0_0_4px_rgba(147,197,253,0.5)]">
                  Model: {cameras.find(c => c.id === fullscreenCamera)?.model}
                </p>
              </div>

              {/* Top Right - Time/Date Overlay */}
              <div className={`absolute top-24 right-6 text-right transition-opacity duration-300 z-10 font-mono ${showOverlay ? 'opacity-100' : 'opacity-0'}`}>
                <p className="text-2xl font-semibold text-cyan-400 mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">{currentDateTime.time}</p>
                <p className="text-base text-blue-400 mb-1 drop-shadow-[0_0_6px_rgba(96,165,250,0.6)]">{currentDateTime.day}</p>
                <p className="text-sm text-blue-300 drop-shadow-[0_0_4px_rgba(147,197,253,0.5)]">{currentDateTime.date}</p>
              </div>
              
              {/* Control Buttons Overlay */}
              <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-full transition-opacity duration-300 z-10 ${showOverlay ? 'opacity-100' : 'opacity-0'}`}>
              <button
                onClick={handleZoomOut}
                className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
              <div className="w-px h-8 bg-gray-600"></div>
              <button
                onClick={takeSnapshot}
                className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full transition-colors"
                title="Take Snapshot"
              >
                <Camera size={20} />
              </button>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                  title="Start Recording"
                >
                  <Circle size={20} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors animate-pulse"
                  title="Stop Recording"
                >
                  <Circle size={20} fill="currentColor" />
                </button>
              )}
              {/* ROI Marking Buttons - Only show for restricted_area model */}
              {cameras.find(c => c.id === fullscreenCamera)?.model === 'restricted_area' && (
                <>
                  <div className="w-px h-8 bg-gray-600"></div>
                  {!isROIMarking ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsROIMarking(true);
                      }}
                      className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
                      title="Mark Restricted Area"
                    >
                      <Square size={20} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          savePolygonPoints(e);
                        }}
                        className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Save Polygon"
                        disabled={polygonPoints.length < 3}
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearPolygonPoints(e);
                        }}
                        className="p-3 bg-orange-600 hover:bg-orange-700 text-white rounded-full transition-colors"
                        title="Clear Points"
                      >
                        <Trash2 size={20} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsROIMarking(false);
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {savedPolygonPoints.length > 0 && !isROIMarking && (
                    <button
                      onClick={deletePolygon}
                      className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                      title="Delete Saved Polygon"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </>
              )}
            </div>
            </div>

            {/* Right Side - Recent Detections Panel */}
            <div className="w-96 h-full bg-gray-900 border-l border-gray-800 flex flex-col">
              {/* Panel Header */}
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/95 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white">Recent Detections</h3>
                <button 
                  onClick={exitFullscreen}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Detections List */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingDetections ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-400">Loading detections...</div>
                  </div>
                ) : recentDetections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <AlertCircle size={48} className="mb-4 opacity-50" />
                    <p className="text-center">No detections found</p>
                    <p className="text-sm text-center mt-2">Detections will appear here when objects are detected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentDetections.map((detection) => (
                      <div
                        key={detection._id}
                        className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
                                {detection.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {(detection.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {detection.detection_date} • {detection.detection_time}
                            </p>
                          </div>
                        </div>
                        {detection.image_url && (
                          <div className="mt-2 rounded overflow-hidden">
                            <img
                              src={detection.image_url}
                              alt={`Detection: ${detection.label}`}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          <p>Model: {detection.model_used}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Live;
