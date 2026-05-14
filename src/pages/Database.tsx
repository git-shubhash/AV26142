import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, Calendar, Clock, X, Filter } from 'lucide-react';
import { Detection, MongoDetection } from '../types';
import axios from 'axios';

const Database: React.FC = () => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Filter states
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        setLoading(true);
        // Using your Flask backend endpoint
        const response = await axios.get('http://localhost:5000/api/detections');
        
        // Transform MongoDB data to match your Detection interface
        const transformedData: Detection[] = response.data
          .map((item: MongoDetection) => {
            return {
              _id: item._id,
              camera_name: item.camera_name,
              location: item.location,
              camera_location: item.camera_location,
              detection_time: item.detection_time,
              detection_date: item.detection_date,
              model_used: item.model_used,
              confidence: item.confidence,
              label: item.label,
              // Ensure image URL is properly formatted with domain if needed
              image_url: `http://localhost:5000${item.image_url}`,
            };
          })
          .sort((a, b) => {
            // Combine date and time for proper sorting
            const dateTimeA = `${a.detection_date} ${a.detection_time}`;
            const dateTimeB = `${b.detection_date} ${b.detection_time}`;
            
            // Parse to Date objects for comparison
            const dateA = new Date(dateTimeA);
            const dateB = new Date(dateTimeB);
            
            // Sort in descending order (most recent first)
            return dateB.getTime() - dateA.getTime();
          });
        
        setDetections(transformedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching detections:', err);
        setError('Failed to fetch detection data');
      } finally {
        setLoading(false);
      }
    };

    fetchDetections();
    
    // Optional: Set up polling to refresh data periodically
    const intervalId = setInterval(fetchDetections, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  // Get unique values for filter dropdowns
  const uniqueCameras = Array.from(new Set(detections.map(d => d.camera_name))).sort();
  const uniqueLabels = Array.from(new Set(detections.map(d => d.label))).sort();
  const uniqueModels = Array.from(new Set(detections.map(d => d.model_used))).sort();
  const uniqueLocations = Array.from(new Set(detections.map(d => d.location))).sort();

  const filteredDetections = detections.filter((detection) => {
    // Search term filter
    const matchesSearch = 
      detection.camera_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detection.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detection.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detection.model_used.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Camera filter
    const matchesCamera = selectedCamera === 'all' || detection.camera_name === selectedCamera;
    
    // Label filter
    const matchesLabel = selectedLabel === 'all' || detection.label === selectedLabel;
    
    // Model filter
    const matchesModel = selectedModel === 'all' || detection.model_used === selectedModel;
    
    // Location filter
    const matchesLocation = selectedLocation === 'all' || detection.location === selectedLocation;
    
    // Date filter
    const matchesDate = !selectedDate || detection.detection_date === selectedDate;
    
    return matchesSearch && matchesCamera && matchesLabel && matchesModel && matchesLocation && matchesDate;
  });

  const clearFilters = () => {
    setSelectedCamera('all');
    setSelectedLabel('all');
    setSelectedModel('all');
    setSelectedLocation('all');
    setSelectedDate('');
    setSearchTerm('');
  };

  const handleImageView = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleImageDownload = (imageUrl: string) => {
    // In a real app, this would trigger a download
    window.open(imageUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-end items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search detections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter size={18} />
              Filters
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Filter Options</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Camera Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Camera
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Cameras</option>
                  {uniqueCameras.map((camera) => (
                    <option key={camera} value={camera}>
                      {camera}
                    </option>
                  ))}
                </select>
              </div>

              {/* Label Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detection Type
                </label>
                <select
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  {uniqueLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Models</option>
                  {uniqueModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Locations</option>
                  {uniqueLocations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      ) : filteredDetections.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Detections Found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCamera !== 'all' || selectedLabel !== 'all' || selectedModel !== 'all' || selectedLocation !== 'all' || selectedDate
              ? `No results matching your filters`
              : 'No detections have been recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredDetections.length}</span> of <span className="font-semibold text-gray-900">{detections.length}</span> detections
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Camera
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detection
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDetections.map((detection) => (
                  <tr key={detection._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {detection.camera_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {detection.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {detection.detection_date}
                      </div>
                      <div className="flex items-center text-xs text-gray-400 mt-1">
                        <Clock size={14} className="mr-1" />
                        {detection.detection_time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        {detection.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {detection.model_used}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(detection.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleImageView(detection.image_url)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Image"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleImageDownload(detection.image_url)}
                          className="text-green-600 hover:text-green-900"
                          title="Download Image"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg overflow-hidden max-w-3xl w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Detection Image</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage}
                alt="Detection"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => handleImageDownload(selectedImage)}
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Download size={18} className="mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Database;