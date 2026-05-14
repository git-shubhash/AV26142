import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  Camera as CameraIcon, 
  Clock, 
  Download, 
  Trash2, 
  Play, 
  ChevronDown, 
  ChevronRight, 
  X,
  RefreshCw,
  Search,
  Filter,
  FileVideo,
  AlertCircle,
  Eye,
  MoreVertical
} from 'lucide-react';
import axios from 'axios';

interface Recording {
  id: string;
  camera_id: string;
  camera_name: string;
  filename: string;
  url: string;
  date: string;
  time: string;
  size: number;
  created_at: string | null;
}

interface OrganizedRecordings {
  [cameraName: string]: {
    [date: string]: Recording[];
  };
}

const Recordings: React.FC = () => {
  const [recordings, setRecordings] = useState<OrganizedRecordings>({});
  const [loading, setLoading] = useState(true);
  const [expandedCameras, setExpandedCameras] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecordings();
    const interval = setInterval(fetchRecordings, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/recordings');
      setRecordings(response.data);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCamera = (cameraName: string) => {
    const newExpanded = new Set(expandedCameras);
    if (newExpanded.has(cameraName)) {
      newExpanded.delete(cameraName);
    } else {
      newExpanded.add(cameraName);
    }
    setExpandedCameras(newExpanded);
  };

  const toggleDate = (key: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDates(newExpanded);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDelete = (recordingId: string) => {
    setRecordingToDelete(recordingId);
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  const confirmDelete = async () => {
    if (!recordingToDelete) return;

    if (passwordInput !== 'admin') {
      setPasswordError('Incorrect administrator password');
      return;
    }

    try {
      const response = await axios.delete(`http://localhost:5000/api/recordings/${recordingToDelete}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 200) {
        setShowPasswordModal(false);
        setRecordingToDelete(null);
        setPasswordInput('');
        setPasswordError('');
        fetchRecordings();
      }
    } catch (error: any) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording');
      setShowPasswordModal(false);
    }
  };

  const cancelDelete = () => {
    setShowPasswordModal(false);
    setRecordingToDelete(null);
    setPasswordInput('');
    setPasswordError('');
  };

  const handlePlay = (recording: Recording) => {
    setSelectedRecording(recording);
    setPlayingUrl(`http://localhost:5000${recording.url}`);
  };

  const handleDownload = (recording: Recording) => {
    const link = document.createElement('a');
    link.href = `http://localhost:5000${recording.url}`;
    link.download = recording.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cameraNames = Object.keys(recordings)
    .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 lg:px-12 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              placeholder="Search cameras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none shadow-sm"
            />
          </div>
          <button
            onClick={fetchRecordings}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading && Object.keys(recordings).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Indexing Recordings...</p>
          </div>
        ) : cameraNames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-100 shadow-xl max-w-2xl mx-auto px-10 text-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8">
              <Video className="h-12 w-12 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">No Recordings Found</h3>
            <p className="text-gray-500 font-medium leading-relaxed mb-8 text-sm">
              {searchTerm ? `No cameras match your search "${searchTerm}".` : "Your recorded footage will appear here once cameras start capturing activity."}
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {cameraNames.map((cameraName) => {
              const dates = Object.keys(recordings[cameraName]).sort().reverse();
              const isCameraExpanded = expandedCameras.has(cameraName);
              const totalFiles = dates.reduce((total, date) => total + recordings[cameraName][date].length, 0);

              return (
                <div key={cameraName} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-xl hover:shadow-gray-200/50">
                  {/* Camera Header */}
                  <div
                    onClick={() => toggleCamera(cameraName)}
                    className={`w-full px-8 py-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer transition-colors ${isCameraExpanded ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`p-3.5 rounded-xl transition-all ${isCameraExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                        <CameraIcon className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 tracking-tight">{cameraName}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                            <Calendar className="w-3 h-3" />
                            {dates.length} Days
                          </span>
                          <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                          <span className="flex items-center gap-1.5 text-[10px] font-medium text-indigo-600 uppercase tracking-wide">
                            <FileVideo className="w-3 h-3" />
                            {totalFiles} Total Clips
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4 md:mt-0">
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Last Recording</span>
                        <span className="text-xs font-medium text-gray-600">{dates[0] ? formatDate(dates[0]) : 'Never'}</span>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCameraExpanded ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'bg-gray-100 text-gray-400'}`}>
                        <ChevronDown className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Dates List */}
                  {isCameraExpanded && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {dates.map((date) => {
                        const dateRecordings = recordings[cameraName][date];
                        const dateKey = `${cameraName}-${date}`;
                        const isDateExpanded = expandedDates.has(dateKey);

                        return (
                          <div key={date} className="bg-white">
                            {/* Date Header */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDate(dateKey);
                              }}
                              className={`w-full px-10 py-5 flex items-center justify-between hover:bg-gray-50 transition-all ${isDateExpanded ? 'bg-gray-50/50' : ''}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-1 h-6 rounded-full transition-all ${isDateExpanded ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
                                <div className="flex flex-col items-start">
                                  <span className="text-sm font-semibold text-gray-800 tracking-tight">{formatDate(date)}</span>
                                  <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">{dateRecordings.length} Sequence Files</span>
                                </div>
                              </div>
                              <div className={`p-1.5 rounded-lg transition-all ${isDateExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                {isDateExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </div>
                            </button>

                            {/* Recordings Grid */}
                            {isDateExpanded && (
                              <div className="bg-gray-50/30 p-8 pt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                  {dateRecordings.map((recording) => (
                                    <div
                                      key={recording.id}
                                      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                    >
                                      {/* Video Thumbnail Placeholder */}
                                      <div 
                                        className="aspect-video bg-gray-900 relative flex items-center justify-center cursor-pointer overflow-hidden"
                                        onClick={() => handlePlay(recording)}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-110 transition-transform z-20 shadow-xl">
                                          <Play className="h-6 w-6 fill-current ml-1" />
                                        </div>
                                        {/* Time Badge */}
                                        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 z-20">
                                          <Clock className="w-3 h-3" />
                                          {recording.time}
                                        </div>
                                        {/* Size Badge */}
                                        <div className="absolute bottom-3 right-3 bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold z-20">
                                          {formatFileSize(recording.size)}
                                        </div>
                                      </div>

                                      {/* Card Info */}
                                      <div className="p-4">
                                        <h4 className="text-xs font-medium text-gray-700 truncate mb-4" title={recording.filename}>
                                          {recording.filename}
                                        </h4>
                                        <div className="flex items-center justify-between">
                                          <button
                                            onClick={() => handlePlay(recording)}
                                            className="flex items-center gap-1.5 text-indigo-600 font-semibold text-[9px] uppercase tracking-wide hover:text-indigo-700 transition-colors"
                                          >
                                            <Eye className="w-3 h-3" />
                                            Preview
                                          </button>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleDownload(recording)}
                                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                              title="Download"
                                            >
                                              <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDelete(recording.id)}
                                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                              title="Delete"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Password Modal for Delete */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300"
          onClick={cancelDelete}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Confirm Deletion</h3>
              </div>
              <button
                onClick={cancelDelete}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-gray-500 font-medium leading-relaxed mb-8 text-xs">
              This action cannot be undone. Please enter the administrator password to permanently remove this footage.
            </p>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="delete-password" className="block text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-2 ml-1">
                  Security Authentication
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') confirmDelete();
                  }}
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none transition-all font-medium text-xs ${
                    passwordError ? 'border-red-500 bg-red-50 focus:ring-red-100' : 'border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                  }`}
                  placeholder="Enter administrator password"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-600 text-[10px] font-semibold mt-2 ml-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {passwordError}
                  </p>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 py-3 bg-gray-50 text-gray-600 font-semibold rounded-xl hover:bg-gray-100 transition-all active:scale-95 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-2 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95 text-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {selectedRecording && playingUrl && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500"
          onClick={() => {
            setSelectedRecording(null);
            setPlayingUrl(null);
          }}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-5xl w-full shadow-2xl relative slide-in-from-bottom-8 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <CameraIcon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 tracking-tight">{selectedRecording.camera_name}</h3>
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    {formatDate(selectedRecording.date)} 
                    <span className="text-gray-300">•</span>
                    <Clock className="w-2.5 h-2.5" />
                    {selectedRecording.time}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedRecording)}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Download Footage"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedRecording(null);
                    setPlayingUrl(null);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="bg-black aspect-video flex items-center justify-center">
              <video
                src={playingUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[75vh]"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            
            <div className="bg-gray-50 px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Secure Playback Active</span>
              </div>
              <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 uppercase tracking-wide">
                File: {selectedRecording.filename}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recordings;

