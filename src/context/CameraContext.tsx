import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Camera } from '../types';
import axios from 'axios';

interface CameraContextType {
  cameras: Camera[];
  addCamera: (camera: Camera) => void;
  removeCamera: (id: string) => void;
  updateCamera: (id: string, updates: Partial<Camera>) => void;
  availableCameras: string[];
  availableModels: string[];
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);

  // Mock available cameras and models
  const availableCameras = ['Camera 1', 'Camera 2', 'Camera 3', 'Camera 4', 'Camera 5'];
  const availableModels = ['Smoking', 'shoplifting', 'mask', 'Accident', 'restricted_area', 'weapon', 'Panic Detection', 'fire'];

  useEffect(() => {
    // Load cameras from localStorage
    const savedCameras = localStorage.getItem('cameras');
    if (savedCameras) {
      setCameras(JSON.parse(savedCameras));
    }
  }, []);

  useEffect(() => {
    // Save cameras to localStorage whenever they change
    localStorage.setItem('cameras', JSON.stringify(cameras));
  }, [cameras]);

  const addCamera = async (camera: Camera) => {
    setCameras([...cameras, camera]);
    // Save to database (already handled in Live.tsx, but keep for consistency)
    try {
      await axios.post('http://localhost:5000/api/cameras', camera);
    } catch (error) {
      console.error('Error saving camera to database:', error);
    }
  };

  const removeCamera = (id: string) => {
    setCameras(cameras.filter(camera => camera.id !== id));
    // Note: Camera removal from database can be handled here if needed
  };

  const updateCamera = async (id: string, updates: Partial<Camera>) => {
    const updatedCameras = cameras.map(camera =>
      camera.id === id ? { ...camera, ...updates } : camera
    );
    setCameras(updatedCameras);

    // Update in database
    const updatedCamera = updatedCameras.find(c => c.id === id);
    if (updatedCamera) {
      try {
        await axios.put('http://localhost:5000/api/cameras', updatedCamera);
      } catch (error) {
        console.error('Error updating camera in database:', error);
      }
    }
  };

  return (
    <CameraContext.Provider value={{
      cameras,
      addCamera,
      removeCamera,
      updateCamera,
      availableCameras,
      availableModels
    }}>
      {children}
    </CameraContext.Provider>
  );
};

export const useCamera = (): CameraContextType => {
  const context = useContext(CameraContext);
  if (context === undefined) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
};