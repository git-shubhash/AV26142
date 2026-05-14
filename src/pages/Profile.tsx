import React from 'react';
import { User } from 'lucide-react';

const Profile: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
      <div className="text-center">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <User className="w-12 h-12 text-gray-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Coming Soon</h1>
        <p className="text-gray-600 text-lg">Profile page is under development</p>
      </div>
    </div>
  );
};

export default Profile;

