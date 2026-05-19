import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-discord-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">CH</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
          <p className="text-gray-400 mt-2">Sign in to ConnectHub</p>
        </div>
        <div className="bg-discord-800 rounded-xl p-6 shadow-lg">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
