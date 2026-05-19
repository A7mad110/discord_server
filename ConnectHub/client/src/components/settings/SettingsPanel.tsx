import React, { useState, useRef } from 'react';
import { X, Camera, Save, Moon, Sun, Globe, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { authService } from '../../services/auth';
import toast from 'react-hot-toast';

const languages = [
  { code: 'en' as const, label: 'English', flag: '🇺🇸' },
  { code: 'ar' as const, label: 'العربية', flag: '🇸🇦' },
  { code: 'de' as const, label: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr' as const, label: 'Türkçe', flag: '🇹🇷' },
];

export function SettingsPanel() {
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const setShowSettings = useStore((s) => s.setShowSettings);
  const [activeSection, setActiveSection] = useState<'profile' | 'appearance' | 'password'>('profile');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await authService.updateProfile(formData);
      setUser(data.user);
      toast.success('Avatar updated!');
    } catch (error: any) {
      toast.error('Failed to update avatar');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const formData = new FormData();
      formData.append('username', username);

      const { data } = await authService.updateProfile(formData);
      setUser(data.user);
      toast.success('Profile updated!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark') => {
    if (!user) return;
    const updatedUser = {
      ...user,
      settings: { ...user.settings, theme },
    };
    setUser(updatedUser);

    try {
      const formData = new FormData();
      formData.append('settings', JSON.stringify(updatedUser.settings));
      await authService.updateProfile(formData);
    } catch {
      // Theme change local only
    }

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLanguageChange = async (language: 'en' | 'ar' | 'de' | 'tr') => {
    if (!user) return;
    const updatedUser = {
      ...user,
      settings: { ...user.settings, language },
    };
    setUser(updatedUser as any);

    try {
      const formData = new FormData();
      formData.append('settings', JSON.stringify(updatedUser.settings));
      await authService.updateProfile(formData);
    } catch {
      // Language change local only
    }
    toast.success(`Language set to ${languages.find((l) => l.code === language)?.label}`);
  };

  const sections = [
    { key: 'profile', label: 'Profile', icon: Camera },
    { key: 'appearance', label: 'Appearance', icon: Sun },
    { key: 'password', label: 'Password', icon: Lock },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={() => setShowSettings(false)} />

      <div className="relative w-full max-w-3xl mx-auto my-8 bg-discord-800 rounded-xl shadow-2xl flex overflow-hidden">
        <div className="w-56 bg-discord-900 p-3 space-y-1">
          <h2 className="text-lg font-semibold text-white px-3 py-2">Settings</h2>
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === section.key
                  ? 'bg-discord-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-discord-700'
              }`}
            >
              <section.icon size={18} />
              {section.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              {sections.find((s) => s.key === activeSection)?.label}
            </h3>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-brand-500 flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user?.username?.[0].toUpperCase()
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-discord-600 rounded-full flex items-center justify-center text-white hover:bg-brand-500 transition-colors"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-white font-medium">{user?.username}</p>
                  <p className="text-sm text-gray-400">{user?.uniqueId}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input max-w-sm"
                />
              </div>

              <button onClick={handleUpdateProfile} className="btn-primary flex items-center gap-2">
                <Save size={18} /> Save Changes
              </button>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Theme</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                      user?.settings?.theme === 'dark'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-discord-500 text-gray-400 hover:border-discord-400'
                    }`}
                  >
                    <Moon size={20} /> Dark
                  </button>
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                      user?.settings?.theme === 'light'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-discord-500 text-gray-400 hover:border-discord-400'
                    }`}
                  >
                    <Sun size={20} /> Light
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Language</label>
                <div className="grid grid-cols-2 gap-3">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                        user?.settings?.language === lang.code
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-discord-500 text-gray-400 hover:border-discord-400'
                      }`}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  minLength={8}
                  required
                />
              </div>
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Save size={18} /> Change Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
