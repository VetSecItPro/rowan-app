'use client';

import { useState } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import {
  Settings,
  User,
  Shield,
  Bell,
  Palette,
  Lock,
  Users,
  Database,
  HelpCircle,
  Save,
  Camera,
  Mail,
  Phone,
  Globe,
  Moon,
  Sun,
  Monitor,
  Download,
  Trash2,
  LogOut,
  Key,
  Smartphone
} from 'lucide-react';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance' | 'privacy' | 'spaces' | 'data' | 'help';

export default function SettingsPage() {
  const { user, currentSpace } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  const tabs = [
    { id: 'profile' as SettingsTab, name: 'Profile', icon: User, description: 'Manage your personal information' },
    { id: 'security' as SettingsTab, name: 'Security', icon: Shield, description: 'Password and authentication' },
    { id: 'notifications' as SettingsTab, name: 'Notifications', icon: Bell, description: 'Email and push notifications' },
    { id: 'appearance' as SettingsTab, name: 'Appearance', icon: Palette, description: 'Theme and display settings' },
    { id: 'privacy' as SettingsTab, name: 'Privacy', icon: Lock, description: 'Data and visibility settings' },
    { id: 'spaces' as SettingsTab, name: 'Spaces', icon: Users, description: 'Manage your spaces and members' },
    { id: 'data' as SettingsTab, name: 'Data & Storage', icon: Database, description: 'Export and delete your data' },
    { id: 'help' as SettingsTab, name: 'Help & Support', icon: HelpCircle, description: 'Get help and contact us' },
  ];

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}>
      <div className="min-h-screen bg-gradient-to-t from-purple-200 via-purple-100/50 to-white dark:from-purple-900 dark:via-purple-900/50 dark:to-black p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-br from-purple-600 to-blue-600 bg-clip-text text-transparent">Settings</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 shadow-lg">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{tab.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 shadow-lg">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profile Settings</h2>
                      <p className="text-gray-600 dark:text-gray-400">Update your personal information and profile picture</p>
                    </div>

                    {/* Avatar Upload */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700 transition-colors shadow-lg">
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                        <button className="mt-2 text-sm text-purple-600 dark:text-purple-400 hover:underline">
                          Change profile picture
                        </button>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          defaultValue={user.name}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          defaultValue={user.email}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Phone className="w-4 h-4 inline mr-1" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Globe className="w-4 h-4 inline mr-1" />
                          Time Zone
                        </label>
                        <select className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white">
                          <option>Pacific Time (PT)</option>
                          <option>Eastern Time (ET)</option>
                          <option>Central Time (CT)</option>
                          <option>Mountain Time (MT)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Tell us about yourself..."
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
                      />
                    </div>

                    <button className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-lg flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Security Settings</h2>
                      <p className="text-gray-600 dark:text-gray-400">Manage your password and authentication methods</p>
                    </div>

                    {/* Change Password */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Key className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Change Password</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Update your password regularly to keep your account secure</p>
                          <div className="space-y-4">
                            <input
                              type="password"
                              placeholder="Current password"
                              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                            />
                            <input
                              type="password"
                              placeholder="New password"
                              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                            />
                            <input
                              type="password"
                              placeholder="Confirm new password"
                              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                            />
                            <button className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-lg">
                              Update Password
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Two-Factor Authentication</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Status: <span className="text-red-600 dark:text-red-400 font-medium">Not Enabled</span></p>
                          </div>
                        </div>
                        <button className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg">
                          Enable 2FA
                        </button>
                      </div>
                    </div>

                    {/* Active Sessions */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Sessions</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">MacBook Pro - Chrome</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">San Francisco, CA • Active now</p>
                          </div>
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Current</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Notification Preferences</h2>
                      <p className="text-gray-600 dark:text-gray-400">Choose how you want to be notified about updates</p>
                    </div>

                    {/* Email Notifications */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Email Notifications
                      </h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Task assignments', desc: 'Get notified when someone assigns you a task' },
                          { label: 'Event reminders', desc: 'Receive email reminders for upcoming events' },
                          { label: 'Messages', desc: 'Get notified about new messages' },
                          { label: 'Weekly digest', desc: 'Receive a weekly summary of your activity' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" defaultChecked className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Push Notifications */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Push Notifications
                      </h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Desktop notifications', desc: 'Show notifications on your desktop' },
                          { label: 'Mobile push', desc: 'Receive push notifications on your mobile device' },
                          { label: 'Sound alerts', desc: 'Play a sound when you receive a notification' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" defaultChecked className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Appearance Settings</h2>
                      <p className="text-gray-600 dark:text-gray-400">Customize how Rowan looks for you</p>
                    </div>

                    {/* Theme Selection */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Theme</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { value: 'light', label: 'Light', icon: Sun },
                          { value: 'dark', label: 'Dark', icon: Moon },
                          { value: 'system', label: 'System', icon: Monitor },
                        ].map((themeOption) => {
                          const Icon = themeOption.icon;
                          return (
                            <button
                              key={themeOption.value}
                              onClick={() => setTheme(themeOption.value as typeof theme)}
                              className={`p-6 rounded-xl border-2 transition-all ${
                                theme === themeOption.value
                                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-400'
                              }`}
                            >
                              <Icon className={`w-8 h-8 mx-auto mb-2 ${
                                theme === themeOption.value ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'
                              }`} />
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{themeOption.label}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Language */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Language & Region</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Language
                          </label>
                          <select className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white">
                            <option>English (US)</option>
                            <option>Español</option>
                            <option>Français</option>
                            <option>Deutsch</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Date Format
                          </label>
                          <select className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white">
                            <option>MM/DD/YYYY</option>
                            <option>DD/MM/YYYY</option>
                            <option>YYYY-MM-DD</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Tab */}
                {activeTab === 'privacy' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacy Settings</h2>
                      <p className="text-gray-600 dark:text-gray-400">Control your data and visibility preferences</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { label: 'Profile visibility', desc: 'Allow other space members to see your profile' },
                        { label: 'Activity status', desc: 'Show when you\'re online and active' },
                        { label: 'Read receipts', desc: 'Let others know when you\'ve read their messages' },
                        { label: 'Analytics', desc: 'Help us improve Rowan by sharing anonymous usage data' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spaces Tab */}
                {activeTab === 'spaces' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Space Management</h2>
                      <p className="text-gray-600 dark:text-gray-400">Manage your spaces and members</p>
                    </div>

                    {/* Current Space */}
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{currentSpace.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Current Space • 4 members</p>
                        </div>
                        <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">Admin</span>
                      </div>
                      <div className="flex gap-3">
                        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                          Invite Members
                        </button>
                        <button className="px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">
                          Manage Members
                        </button>
                      </div>
                    </div>

                    {/* Create New Space */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Create New Space</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Start a new space for another family or team</p>
                      <button className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity text-sm">
                        + New Space
                      </button>
                    </div>
                  </div>
                )}

                {/* Data & Storage Tab */}
                {activeTab === 'data' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Data & Storage</h2>
                      <p className="text-gray-600 dark:text-gray-400">Export your data or delete your account</p>
                    </div>

                    {/* Export Data */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Export Your Data</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Download a copy of all your data in JSON format</p>
                          <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Request Data Export
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delete Account */}
                    <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Delete Account</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                          <button className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            Delete My Account
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sign Out */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <LogOut className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Sign Out</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Sign out from all devices and sessions</p>
                          <button className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2">
                            <LogOut className="w-4 h-4" />
                            Sign Out Everywhere
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Help & Support Tab */}
                {activeTab === 'help' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Help & Support</h2>
                      <p className="text-gray-600 dark:text-gray-400">Get help and learn more about Rowan</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <a href="#" className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Documentation</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Browse our guides and tutorials</p>
                      </a>

                      <a href="#" className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Contact Support</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Get help from our team</p>
                      </a>

                      <a href="#" className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Community Forum</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Connect with other users</p>
                      </a>

                      <a href="#" className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">What's New</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">See the latest features and updates</p>
                      </a>
                    </div>

                    <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">App Version</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Rowan v1.0.0</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">You're running the latest version</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}
