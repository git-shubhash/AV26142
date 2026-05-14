import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bar, Doughnut, Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Camera, Users, AlertTriangle, Clock, TrendingUp, MapPin, Activity, Shield, Target, Zap } from 'lucide-react';
import { Detection, DashboardStats, MongoDetection } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [recentDetections, setRecentDetections] = useState<Detection[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const socketRef = useRef<any>(null);
  const detectionsRef = useRef<Detection[]>([]);

  // Initial fetch
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/detections');
        const transformedData: Detection[] = response.data.map((item: MongoDetection) => ({
          _id: item._id,
          camera_name: item.camera_name,
          location: item.location,
          camera_location: item.camera_location,
          detection_time: item.detection_time,
          detection_date: item.detection_date,
          model_used: item.model_used,
          confidence: item.confidence,
          label: item.label,
          image_url: `http://localhost:5000${item.image_url}`,
        }));
        detectionsRef.current = transformedData;
        setDetections(transformedData);
        setRecentDetections(transformedData.slice(0, 20));
        const calculatedStats = processDetections(transformedData);
        setStats(calculatedStats);
        setError(null);
      } catch (err) {
        setError('Failed to fetch detection data');
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetections();
  }, []);

  // Socket connection for real-time updates
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    socketRef.current.on('video_frame', (data: { camera_id: string; frame: string; detections: any[] }) => {
      if (data.detections?.length > 0) {
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
        setDetections(prev => {
          const existingIds = new Set(prev.map(d => d._id));
          const uniqueNew = newDetections.filter(d => !existingIds.has(d._id));
          const updated = [...uniqueNew, ...prev];
          detectionsRef.current = updated;
          setRecentDetections(updated.slice(0, 20));
          const calculatedStats = processDetections(updated);
          setStats(calculatedStats);
          return updated;
        });
      }
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const processDetections = (detections: Detection[]): DashboardStats => {
    const today = new Date().toISOString().split('T')[0];
    const total_detections = detections.length;
    const detections_today = detections.filter(d => d.detection_date === today).length;
    const active_cameras = new Set(detections.map(d => d.camera_name)).size;
    const detection_by_model = detections.reduce((acc, d) => {
      acc[d.model_used] = (acc[d.model_used] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    const detection_by_camera = detections.reduce((acc, d) => {
      acc[d.camera_name] = (acc[d.camera_name] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    const detection_by_day = detections.reduce((acc, d) => {
      acc[d.detection_date] = (acc[d.detection_date] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    return {
      total_detections,
      detections_today,
      active_cameras,
      detection_by_model,
      detection_by_camera,
      detection_by_day,
    };
  };

  // KPI Calculations
  const criticalThreats = detections.filter(d => 
    ['Pistol', 'Knife', 'Fire', 'Gun', 'Weapon'].some(t => d.label.toLowerCase().includes(t.toLowerCase()))
  ).length;

  const avgConfidence = detections.length > 0
    ? (detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length * 100).toFixed(1)
    : '0.0';

  const mostActiveCamera = Object.entries(stats?.detection_by_camera || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

  // Time-series data
  const getDailyData = () => {
    const sortedDates = Object.keys(stats?.detection_by_day || {}).sort();
    return {
      labels: sortedDates,
      data: sortedDates.map(date => stats?.detection_by_day[date] || 0),
    };
  };

  // Hourly heatmap data
  const getHeatmapData = () => {
    const days = Object.keys(stats?.detection_by_day || {}).sort().slice(-7);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const heatmapData: number[][] = [];
    days.forEach(day => {
      const dayDetections = detections.filter(d => d.detection_date === day);
      const hourlyCounts = Array.from({ length: 24 }, () => 0);
      dayDetections.forEach(d => {
        const hour = parseInt(d.detection_time.split(':')[0] || '0');
        hourlyCounts[hour]++;
      });
      heatmapData.push(hourlyCounts);
    });
    return { days, hours, data: heatmapData };
  };

  // Model data
  const modelData = {
    labels: Object.keys(stats?.detection_by_model || {}),
    data: Object.values(stats?.detection_by_model || {}),
  };

  // Label data
  const getLabelData = () => {
    const labelCounts: { [key: string]: number } = {};
    detections.forEach(d => {
      labelCounts[d.label] = (labelCounts[d.label] || 0) + 1;
    });
    const sorted = Object.entries(labelCounts).sort((a, b) => b[1] - a[1]);
    return {
      labels: sorted.map(([label]) => label),
      data: sorted.map(([, count]) => count),
    };
  };

  // Confidence distribution
  const getConfidenceData = () => {
    const bins = [0, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const binCounts = bins.slice(0, -1).map(() => 0);
    detections.forEach(d => {
      for (let i = 0; i < bins.length - 1; i++) {
        if (d.confidence >= bins[i] && d.confidence < bins[i + 1]) {
          binCounts[i]++;
          break;
        }
      }
    });
    return {
      labels: bins.slice(0, -1).map((b, i) => `${(b * 100).toFixed(0)}-${(bins[i + 1] * 100).toFixed(0)}%`),
      data: binCounts,
    };
  };

  // Confidence by label
  const getConfidenceByLabel = () => {
    const labelConf: { [key: string]: number[] } = {};
    detections.forEach(d => {
      if (!labelConf[d.label]) labelConf[d.label] = [];
      labelConf[d.label].push(d.confidence);
    });
    const labels = Object.keys(labelConf).slice(0, 10);
    return {
      labels,
      data: labels.map(label => {
        const confs = labelConf[label];
        return confs.reduce((sum, c) => sum + c, 0) / confs.length * 100;
      }),
    };
  };

  // Forecast data (simple moving average)
  const getForecastData = () => {
    const dailyData = getDailyData();
    const values = dailyData.data;
    if (values.length < 3) return { labels: dailyData.labels, data: values, forecast: [] };
    
    const window = 3;
    const forecast: number[] = [];
    for (let i = 0; i < 7; i++) {
      const recent = values.slice(-window);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      forecast.push(Math.max(0, Math.round(avg * (1 + (i * 0.05)))));
    }
    
    const forecastLabels = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return date.toISOString().split('T')[0];
    });
    
    return {
      labels: [...dailyData.labels, ...forecastLabels],
      data: [...values, ...Array(7).fill(null)],
      forecast: [...Array(values.length).fill(null), ...forecast],
    };
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!stats) {
    return <div>No data available.</div>;
  }

  const dailyData = getDailyData();
  const heatmapData = getHeatmapData();
  const labelData = getLabelData();
  const confidenceData = getConfidenceData();
  const confidenceByLabel = getConfidenceByLabel();
  const forecastData = getForecastData();
  const cameraData = {
    labels: Object.keys(stats.detection_by_camera),
    data: Object.values(stats.detection_by_camera),
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Analytics Dashboard</h1>

      {/* Section 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Detections</p>
            <AlertTriangle className="text-blue-500" size={24} />
          </div>
          <p className="text-4xl font-bold text-gray-800">{stats.total_detections.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Critical Threats</p>
            <Shield className="text-red-500" size={24} />
          </div>
          <p className="text-4xl font-bold text-gray-800">{criticalThreats}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Cameras Active</p>
            <Camera className="text-green-500" size={24} />
          </div>
          <p className="text-4xl font-bold text-gray-800">{stats.active_cameras}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg Confidence</p>
            <Target className="text-purple-500" size={24} />
          </div>
          <p className="text-4xl font-bold text-gray-800">{avgConfidence}%</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Most Active Camera</p>
            <Zap className="text-yellow-500" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-800 truncate">{mostActiveCamera}</p>
        </div>
      </div>

      {/* Section 2: Time-Series Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Detections Over Time</h3>
          <div className="h-80">
            <Line
              data={{
                labels: dailyData.labels,
                datasets: [{
                  label: 'Detections',
                  data: dailyData.data,
                  borderColor: 'rgba(59,130,246,1)',
                  backgroundColor: 'rgba(59,130,246,0.1)',
                  fill: true,
                  tension: 0.4,
                }],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Hourly Activity Heatmap</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: heatmapData.days,
                datasets: Array.from({ length: 24 }, (_, hour) => ({
                  label: `${hour}:00`,
                  data: heatmapData.data.map(dayData => dayData[hour]),
                  backgroundColor: `rgba(${255 - hour * 10}, ${100 + hour * 5}, ${200}, 0.6)`,
                })),
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Threat & Model Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Detections by Model (Clustered Bar)</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: modelData.labels,
                datasets: [{
                  label: 'Detections',
                  data: modelData.data,
                  backgroundColor: ['rgba(239,68,68,0.8)', 'rgba(251,191,36,0.8)', 'rgba(34,197,94,0.8)', 'rgba(59,130,246,0.8)'],
                }],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Detections by Label (Donut)</h3>
          <div className="h-80">
            <Doughnut
              data={{
                labels: labelData.labels.slice(0, 10),
                datasets: [{
                  data: labelData.data.slice(0, 10),
                  backgroundColor: [
                    'rgba(239,68,68,0.8)', 'rgba(251,191,36,0.8)', 'rgba(34,197,94,0.8)',
                    'rgba(59,130,246,0.8)', 'rgba(139,92,246,0.8)', 'rgba(236,72,153,0.8)',
                    'rgba(20,184,166,0.8)', 'rgba(245,158,11,0.8)', 'rgba(249,115,22,0.8)', 'rgba(168,85,247,0.8)'
                  ],
                }],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Section 4: Camera Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Detections by Camera (Horizontal Bar)</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: cameraData.labels,
                datasets: [{
                  label: 'Detections',
                  data: cameraData.data,
                  backgroundColor: 'rgba(59,130,246,0.8)',
                }],
              }}
              options={{
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } },
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Location Map Visualization</h3>
          <div className="h-80">
            <MapContainer
              center={[13.073578, 77.499902]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {detections.slice(0, 50).map((d, i) => {
                const coords = d.location.split(',').map(Number);
                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                  const isCritical = ['Pistol', 'Knife', 'Fire'].some(t => d.label.toLowerCase().includes(t.toLowerCase()));
                  return (
                    <Marker
                      key={i}
                      position={[coords[0], coords[1]]}
                      icon={L.divIcon({
                        className: 'location-marker',
                        html: `<div style="width: ${isCritical ? '20' : '12'}px; height: ${isCritical ? '20' : '12'}px; background-color: ${isCritical ? 'red' : 'blue'}; border-radius: 50%; border: 2px solid white;"></div>`,
                        iconSize: [isCritical ? 20 : 12, isCritical ? 20 : 12],
                      })}
                    >
                      <Popup>
                        <div className="p-2">
                          <p className="font-semibold">{d.camera_name}</p>
                          <p className="text-sm">{d.label}</p>
                          <p className="text-xs text-gray-500">{(d.confidence * 100).toFixed(1)}%</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Section 5: Confidence & Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Confidence Score Distribution (Histogram)</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: confidenceData.labels,
                datasets: [{
                  label: 'Number of Detections',
                  data: confidenceData.data,
                  backgroundColor: 'rgba(251,191,36,0.8)',
                }],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Confidence by Label (Scatter)</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: confidenceByLabel.labels,
                datasets: [{
                  label: 'Avg Confidence %',
                  data: confidenceByLabel.data,
                  backgroundColor: 'rgba(139,92,246,0.8)',
                }],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` } } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Section 6: Advanced AI Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Threat Prediction Trend (7-Day Forecast)</h3>
          <div className="h-80">
            <Line
              data={{
                labels: forecastData.labels,
                datasets: [
                  {
                    label: 'Actual',
                    data: forecastData.data,
                    borderColor: 'rgba(59,130,246,1)',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    fill: true,
                  },
                  {
                    label: 'Forecast',
                    data: forecastData.forecast,
                    borderColor: 'rgba(251,191,36,1)',
                    borderDash: [5, 5],
                    fill: false,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Anomaly Detection Timeline</h3>
          <div className="h-80">
            <Line
              data={{
                labels: dailyData.labels,
                datasets: [{
                  label: 'Detections',
                  data: dailyData.data.map((val, i) => {
                    const avg = dailyData.data.reduce((a, b) => a + b, 0) / dailyData.data.length;
                    const std = Math.sqrt(dailyData.data.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / dailyData.data.length);
                    return val > avg + 2 * std ? val : null;
                  }),
                  borderColor: 'rgba(239,68,68,1)',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  pointRadius: 8,
                  pointBackgroundColor: 'rgba(239,68,68,1)',
                }],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
