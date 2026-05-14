export interface User {
  username: string;
  name?: string;
  profilePhoto?: string;
  isAuthenticated: boolean;
}

export interface ModelResult {
  model_name: string;
  precision: number;
  recall: number;
  f1_score: number;
  accuracy: number;
  training_date: string;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  locationName?: string;
  model: string;
  isActive: boolean;
  rtspUrl?: string;
}

export interface Detection {
  _id: string;
  camera_name: string;
  location: string;
  camera_location?: {
    lat: number;
    lon: number;
  };
  detection_time: string;
  detection_date: string;
  model_used: string;
  confidence: number;
  label: string;
  image_url: string;
}

export interface MongoDetection {
  _id: string;
  camera_id: string;
  camera_name: string;
  location: string;
  camera_location?: {
    lat: number;
    lon: number;
  };
  detection_time: string;
  detection_date: string;
  model_used: string;
  label: string;
  confidence: number;
  bbox: number[];
  image_url: string;
}

export interface DashboardStats {
  total_detections: number;
  detections_today: number;
  active_cameras: number;
  detection_by_model: Record<string, number>;
  detection_by_camera: Record<string, number>;
  detection_by_day: Record<string, number>;
}

export interface LocationSearchResult {
  display_name: string;
  lat: number;
  lon: number;
}