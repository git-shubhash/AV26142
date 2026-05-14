import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Phone, 
  MessageSquare, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  User,
  Lock,
  Camera,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface AlertSetting {
  _id?: string;
  class: string;
  sms: boolean;
  call: boolean;
}

const DETECTION_CLASSES = [
  'weapon',
  'Gun',
  'Knife',
  'Pistol',
  'Fire',
  'fire',
  'Accident',
  'smoking',
  'cigarette',
  'without_mask',
  'Person Entered Restricted Area'
];

type TabType = 'profile' | 'security' | 'alerts';

const Settings: React.FC = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  
  // Profile state
  const [name, setName] = useState(user.name || user.username);
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(user.profilePhoto);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Alert settings state
  const [alertSettings, setAlertSettings] = useState<AlertSetting[]>([]);
  const [alertLoading, setAlertLoading] = useState(true);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertStatus, setAlertStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Load user profile on mount
  useEffect(() => {
    if (user.isAuthenticated) {
      refreshUser().then(() => {
        setName(user.name || user.username);
        setProfilePhoto(user.profilePhoto);
      });
    }
  }, [user.isAuthenticated]);

  // Fetch alert settings on mount
  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchAlertSettings();
    }
  }, [activeTab]);

  const fetchAlertSettings = async () => {
    try {
      setAlertLoading(true);
      const response = await axios.get('http://localhost:5000/api/alert-settings');
      
      const settingsMap = new Map<string, AlertSetting>();
      response.data.forEach((setting: AlertSetting) => {
        settingsMap.set(setting.class.toLowerCase(), setting);
      });

      const allSettings: AlertSetting[] = DETECTION_CLASSES.map(className => {
        const existing = settingsMap.get(className.toLowerCase());
        return existing || {
          class: className,
          sms: true,
          call: true
        };
      });

      setAlertSettings(allSettings);
    } catch (error) {
      console.error('Error fetching alert settings:', error);
      setAlertStatus({ type: 'error', message: 'Failed to load alert settings' });
      const defaultSettings: AlertSetting[] = DETECTION_CLASSES.map(className => ({
        class: className,
        sms: true,
        call: true
      }));
      setAlertSettings(defaultSettings);
    } finally {
      setAlertLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setProfileStatus({ type: 'error', message: 'Invalid file type. Please select an image file.' });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setProfileStatus({ type: 'error', message: 'File size too large. Maximum size is 5MB.' });
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileStatus({ type: null, message: '' });

      // Upload photo if selected
      let photoUrl = profilePhoto;
      let photoUploaded = false;
      if (photoFile) {
        try {
          const formData = new FormData();
          formData.append('photo', photoFile);
          formData.append('username', user.username);

          const uploadResponse = await axios.post('http://localhost:5000/api/user/profile-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (uploadResponse.data && uploadResponse.data.photo_url) {
            photoUrl = `http://localhost:5000${uploadResponse.data.photo_url}`;
            photoUploaded = true;
          } else {
            throw new Error('Photo upload failed: No photo URL returned');
          }
        } catch (uploadError: any) {
          console.error('Error uploading photo:', uploadError);
          let errorMessage = 'Failed to upload photo. Please try again.';
          
          if (uploadError.code === 'ECONNABORTED' || uploadError.code === 'ERR_NETWORK') {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (uploadError.response?.data?.error) {
            errorMessage = uploadError.response.data.error;
          } else if (uploadError.message) {
            errorMessage = uploadError.message;
          }
          
          setProfileStatus({ 
            type: 'error', 
            message: errorMessage
          });
          setProfileLoading(false);
          return;
        }
      }

      // Prepare profile update data
      const updateData: any = {
        username: user.username,
        name: name || user.username
      };

      // Only include profile_photo if we have a photo URL and it wasn't already uploaded
      // (photo upload endpoint already updates the database)
      if (photoUrl && !photoUploaded) {
        // Remove the base URL if it's included
        updateData.profile_photo = photoUrl.includes('http://localhost:5000') 
          ? photoUrl.replace('http://localhost:5000', '') 
          : photoUrl;
      } else if (photoPreview === null && !profilePhoto && !photoUploaded) {
        // If user removed photo, set to empty string
        updateData.profile_photo = '';
      }

      // Update profile (only if there are other fields to update besides photo)
      // If only photo was uploaded, skip this call since photo endpoint already updated it
      let profileUpdateSuccess = true;
      if (photoUploaded && name === (user.name || user.username)) {
        // Only photo was updated, skip profile update call
        profileUpdateSuccess = true;
      } else {
        try {
          const response = await axios.put('http://localhost:5000/api/user/profile', updateData);
          profileUpdateSuccess = response.status === 200;
        } catch (profileError: any) {
          console.error('Error updating profile:', profileError);
          // If photo was uploaded successfully, don't show error for profile update failure
          if (photoUploaded) {
            profileUpdateSuccess = true; // Treat as success since photo was updated
          } else {
            throw profileError; // Re-throw if photo wasn't uploaded
          }
        }
      }

      if (profileUpdateSuccess) {
        // Update local state
        updateUser({ name, profilePhoto: photoUrl || undefined });
        await refreshUser();

        setProfileStatus({ type: 'success', message: 'Profile updated successfully!' });
        setPhotoFile(null);
        setPhotoPreview(null);
        
        setTimeout(() => {
          setProfileStatus({ type: null, message: '' });
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      let errorMessage = 'Failed to update profile. Please check your connection and try again.';
      
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setProfileStatus({ 
        type: 'error', 
        message: errorMessage
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const changePassword = async () => {
    try {
      setPasswordLoading(true);
      setPasswordStatus({ type: null, message: '' });

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordStatus({ type: 'error', message: 'All fields are required' });
        return;
      }

      if (newPassword.length < 3) {
        setPasswordStatus({ type: 'error', message: 'New password must be at least 3 characters' });
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordStatus({ type: 'error', message: 'New passwords do not match' });
        return;
      }

      await axios.post('http://localhost:5000/api/user/change-password', {
        username: user.username,
        current_password: currentPassword,
        new_password: newPassword
      });

      setPasswordStatus({ type: 'success', message: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setPasswordStatus({ type: null, message: '' });
      }, 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordStatus({ 
        type: 'error', 
        message: error.response?.data?.error || 'Failed to change password. Please try again.' 
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const updateAlertSetting = (className: string, field: 'sms' | 'call', value: boolean) => {
    setAlertSettings(prev => 
      prev.map(setting => 
        setting.class === className 
          ? { ...setting, [field]: value }
          : setting
      )
    );
  };

  const saveAlertSettings = async () => {
    try {
      setAlertSaving(true);
      setAlertStatus({ type: null, message: '' });

      const settingsToSave = alertSettings.map(setting => ({
        class: setting.class,
        sms: setting.sms,
        call: setting.call
      }));

      await axios.post('http://localhost:5000/api/alert-settings', settingsToSave);

      setAlertStatus({ type: 'success', message: 'Alert settings saved successfully!' });
      
      setTimeout(() => {
        setAlertStatus({ type: null, message: '' });
      }, 3000);
    } catch (error) {
      console.error('Error saving alert settings:', error);
      setAlertStatus({ type: 'error', message: 'Failed to save alert settings. Please try again.' });
    } finally {
      setAlertSaving(false);
    }
  };

  const resetAlertDefaults = () => {
    const defaultSettings: AlertSetting[] = DETECTION_CLASSES.map(className => ({
      class: className,
      sms: true,
      call: true
    }));
    setAlertSettings(defaultSettings);
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'security' as TabType, label: 'Security', icon: Lock },
    { id: 'alerts' as TabType, label: 'Alert Settings', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12 pt-8">
      <div className="w-full px-4 sm:px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        : 'text-gray-600 hover:bg-white hover:text-indigo-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl text-white shadow-xl shadow-indigo-100 hidden lg:block">
              <h4 className="font-bold mb-2">Need Help?</h4>
              <p className="text-indigo-100 text-xs mb-4">Check our help center for detailed guides and support.</p>
              <button 
                onClick={() => window.location.href = '/help'}
                className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all backdrop-blur-sm"
              >
                Go to Help Center
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
              <div className="p-8">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                      <p className="text-gray-500">Update your personal details and profile picture.</p>
                    </div>
                    
                    {profileStatus.type && (
                      <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 ${
                        profileStatus.type === 'success' 
                          ? 'bg-green-50 text-green-700 border border-green-100' 
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {profileStatus.type === 'success' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                        <span className="font-medium">{profileStatus.message}</span>
                      </div>
                    )}

                    <div className="space-y-8 max-w-2xl">
                      {/* Profile Photo */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-4">Profile Photo</label>
                        <div className="flex items-center gap-8">
                          <div className="relative group">
                            <div className="w-32 h-32 rounded-3xl overflow-hidden bg-gray-100 border-4 border-white shadow-xl flex items-center justify-center">
                              {photoPreview || profilePhoto ? (
                                <img 
                                  src={photoPreview || profilePhoto} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                />
                              ) : (
                                <User className="w-16 h-16 text-gray-300" />
                              )}
                            </div>
                            {(photoPreview || profilePhoto) && (
                              <button
                                onClick={removePhoto}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-white text-red-500 rounded-xl shadow-lg border border-gray-100 flex items-center justify-center hover:bg-red-50 transition-all z-10"
                                title="Remove photo"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoSelect}
                              className="hidden"
                              id="photo-upload"
                            />
                            <div className="flex flex-col sm:flex-row gap-3">
                              <label
                                htmlFor="photo-upload"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all cursor-pointer shadow-lg shadow-indigo-100"
                              >
                                <Camera className="w-5 h-5" />
                                {photoPreview || profilePhoto ? 'Change Photo' : 'Upload New Photo'}
                              </label>
                            </div>
                            <p className="text-xs text-gray-400 mt-3 font-medium">JPG, PNG or WEBP. Max size 5MB.</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {/* Name */}
                        <div>
                          <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                            Display Name
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                            placeholder="Enter your name"
                          />
                        </div>

                        {/* Username (read-only) */}
                        <div>
                          <label htmlFor="username" className="block text-sm font-bold text-gray-700 mb-2">
                            Username
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              id="username"
                              value={user.username}
                              disabled
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed italic"
                            />
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-8 border-t border-gray-100">
                        <button
                          onClick={saveProfile}
                          disabled={profileLoading}
                          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
                        >
                          {profileLoading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Save className="w-5 h-5" />
                          )}
                          Save Profile
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900">Security</h2>
                      <p className="text-gray-500">Update your password to keep your account secure.</p>
                    </div>
                    
                    {passwordStatus.type && (
                      <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 ${
                        passwordStatus.type === 'success' 
                          ? 'bg-green-50 text-green-700 border border-green-100' 
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {passwordStatus.type === 'success' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                        <span className="font-medium">{passwordStatus.message}</span>
                      </div>
                    )}

                    <div className="max-w-md space-y-6">
                      <div>
                        <label htmlFor="current-password" className="block text-sm font-bold text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            id="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none pr-12"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div>
                          <label htmlFor="new-password" className="block text-sm font-bold text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              id="new-password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none pr-12"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="confirm-password" className="block text-sm font-bold text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              id="confirm-password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none pr-12"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-6">
                        <button
                          onClick={changePassword}
                          disabled={passwordLoading}
                          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
                        >
                          {passwordLoading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Lock className="w-5 h-5" />
                          )}
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alert Settings Tab */}
                {activeTab === 'alerts' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Alert Configuration</h2>
                        <p className="text-gray-500">Choose how you want to be notified for each detection type.</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={resetAlertDefaults}
                          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Reset Defaults
                        </button>
                        <button
                          onClick={saveAlertSettings}
                          disabled={alertSaving || alertLoading}
                          className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-100 disabled:opacity-50"
                        >
                          {alertSaving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save Changes
                        </button>
                      </div>
                    </div>

                    {alertStatus.type && (
                      <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 ${
                        alertStatus.type === 'success' 
                          ? 'bg-green-50 text-green-700 border border-green-100' 
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {alertStatus.type === 'success' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                        <span className="font-medium">{alertStatus.message}</span>
                      </div>
                    )}

                    {alertLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading your settings...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                          {alertSettings.map((setting) => (
                            <div 
                              key={setting.class}
                              className="group p-5 bg-gray-50 rounded-2xl border border-transparent hover:bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50 transition-all"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900 capitalize mb-1">
                                    {setting.class.replace(/_/g, ' ')}
                                  </h3>
                                  <p className="text-xs text-gray-500 font-medium">Configure notifications for this detection</p>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="flex items-center gap-8">
                                    <div className="flex flex-col items-center gap-2">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SMS Alert</span>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={setting.sms}
                                          onChange={(e) => updateAlertSetting(setting.class, 'sms', e.target.checked)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                      </label>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Voice Call</span>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={setting.call}
                                          onChange={(e) => updateAlertSetting(setting.class, 'call', e.target.checked)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-10 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                              <AlertCircle className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-indigo-900 mb-2">Important Information</h4>
                              <p className="text-sm text-indigo-700 leading-relaxed">
                                Alert settings are applied globally across all connected cameras. Emergency calls will use your registered phone number. Make sure your Twilio configuration is active for SMS and Call delivery.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
