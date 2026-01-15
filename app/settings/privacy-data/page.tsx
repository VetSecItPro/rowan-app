'use client';

import { useState, useEffect } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Shield, Download, Trash2, Eye, EyeOff } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function PrivacyDataPage() {
  const [privacySettings, setPrivacySettings] = useState({
    dataProcessing: {
      analytics: false,
      marketing: false,
      functional: true,
      essential: true,
    },
    dataRetention: {
      messages: '1 year',
      analytics: '6 months',
      logs: '30 days',
    },
    dataSources: {
      browser: true,
      device: false,
      location: false,
      thirdParty: false,
    },
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load current privacy settings
    fetchPrivacySettings();
  }, []);

  const fetchPrivacySettings = async () => {
    try {
      const response = await fetch('/api/settings/privacy-data');
      if (response.ok) {
        const data = await response.json();
        setPrivacySettings(data.data);
      }
    } catch (error) {
      logger.error('Failed to load privacy settings:', error, { component: 'page', action: 'execution' });
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/privacy-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(privacySettings),
      });

      if (response.ok) {
        alert('Privacy settings updated successfully!');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      logger.error('Failed to save privacy settings:', error, { component: 'page', action: 'execution' });
      alert('Failed to update privacy settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDataProcessingChange = (key: string, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      dataProcessing: {
        ...prev.dataProcessing,
        [key]: value,
      },
    }));
  };

  const handleDataSourceChange = (key: string, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      dataSources: {
        ...prev.dataSources,
        [key]: value,
      },
    }));
  };

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings', href: '/settings' },
        { label: 'Privacy & Data' }
      ]}
    >
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Privacy & Data Settings
                </h1>
                <p className="text-gray-400">
                  Control how your data is processed and stored
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Data Processing */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Data Processing Preferences
              </h2>
              <div className="space-y-4">
                {Object.entries(privacySettings.dataProcessing).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white capitalize">
                        {key} Data
                      </h3>
                      <p className="text-sm text-gray-400">
                        {key === 'essential' && 'Required for basic functionality'}
                        {key === 'functional' && 'Enhances your experience'}
                        {key === 'analytics' && 'Helps us improve our services'}
                        {key === 'marketing' && 'Personalizes content and ads'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={value}
                        disabled={key === 'essential'}
                        onChange={(e) => handleDataProcessingChange(key, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-focus:ring-blue-800 rounded-full peer bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Sources */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Data Collection Sources
              </h2>
              <div className="space-y-4">
                {Object.entries(privacySettings.dataSources).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {value ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                      <div>
                        <h3 className="font-medium text-white capitalize">
                          {key} Data
                        </h3>
                        <p className="text-sm text-gray-400">
                          {key === 'browser' && 'Browser type, version, and preferences'}
                          {key === 'device' && 'Device type, operating system, and screen size'}
                          {key === 'location' && 'Approximate location for localized content'}
                          {key === 'thirdParty' && 'Data from integrated third-party services'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={value}
                        onChange={(e) => handleDataSourceChange(key, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-focus:ring-blue-800 rounded-full peer bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Retention */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Data Retention Periods
              </h2>
              <div className="space-y-4">
                {Object.entries(privacySettings.dataRetention).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white capitalize">
                        {key}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Data is automatically deleted after this period
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-gray-700 text-white text-sm rounded-full">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Data Management Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="flex items-center gap-3 p-4 bg-blue-900/20 border border-blue-800 rounded-full hover:bg-blue-900/30 transition-colors">
                  <Download className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <div className="font-medium text-blue-100">Download My Data</div>
                    <div className="text-sm text-blue-400">Export all your data</div>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-800 rounded-full hover:bg-red-900/30 transition-colors">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <div className="text-left">
                    <div className="font-medium text-red-100">Delete My Account</div>
                    <div className="text-sm text-red-400">Permanently remove all data</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full transition-colors"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}