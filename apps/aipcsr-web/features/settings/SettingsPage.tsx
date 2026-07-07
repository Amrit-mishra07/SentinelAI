'use client';

import React, { useState } from 'react';
import { useTheme } from '../../components/ui/ThemeProvider';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Github, Key, Bell, Palette } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

type SettingsTab = 'general' | 'integrations';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [githubToken, setGithubToken] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (activeTab === 'integrations') {
      const fetchIntegrations = async () => {
        setFetching(true);
        try {
          const response = await apiClient.get('/auth/integrations');
          if (response.data.has_github_token) setGithubToken('********');
          if (response.data.has_openai_key) setOpenAiKey('********');
        } catch (err) {
          console.error(err);
        } finally {
          setFetching(false);
        }
      };
      fetchIntegrations();
    }
  }, [activeTab]);

  const handleSaveIntegrations = async () => {
    setLoading(true);
    try {
      const payload: any = {};
      if (githubToken && githubToken !== '********') payload.github_token = githubToken;
      if (openAiKey && openAiKey !== '********') payload.openai_api_key = openAiKey;
      
      await apiClient.put('/auth/integrations', payload);
      toast.success('Integration settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save integrations');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: <Palette className="w-4 h-4 mr-2" /> },
    { id: 'integrations' as const, label: 'Integrations', icon: <Key className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="space-y-6 animate-slide-in-right" style={{ animationDuration: '0.4s' }}>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-sentinel-text-primary">Settings</h1>
      </div>

      <div className="flex space-x-1 border-b border-sentinel-border w-full overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2 text-[13px] font-medium transition-colors relative whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-sentinel-text-primary'
                : 'text-sentinel-text-secondary hover:text-sentinel-text-primary hover:bg-sentinel-elevated/50'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sentinel-accent" />
            )}
          </button>
        ))}
      </div>

      <div className="bg-sentinel-panel border border-sentinel-border rounded-lg overflow-hidden shadow-sm max-w-3xl">
        {activeTab === 'general' && (
          <>
            <div className="p-6 border-b border-sentinel-border">
              <h2 className="text-lg font-medium text-sentinel-text-primary mb-1">Appearance</h2>
              <p className="text-sm text-sentinel-text-secondary">Customize how SentinelAI looks on your device.</p>
            </div>
            
            <div className="p-6 border-b border-sentinel-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-sentinel-text-primary">Theme preference</h3>
                  <p className="text-sm text-sentinel-text-secondary mt-1 max-w-sm">
                    Choose between dark mode and light mode. Graphics and charts will adapt automatically.
                  </p>
                </div>
                
                <div className="flex items-center bg-sentinel-inset rounded-md p-1 border border-sentinel-border">
                  <button
                    onClick={() => theme !== 'light' && toggleTheme()}
                    className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                      theme === 'light' 
                        ? 'bg-sentinel-elevated text-sentinel-text-primary shadow-sm border border-sentinel-border' 
                        : 'text-sentinel-text-secondary hover:text-sentinel-text-primary'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => theme !== 'dark' && toggleTheme()}
                    className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                      theme === 'dark' 
                        ? 'bg-sentinel-elevated text-sentinel-text-primary shadow-sm border border-sentinel-border' 
                        : 'text-sentinel-text-secondary hover:text-sentinel-text-primary'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-b border-sentinel-border">
              <h2 className="text-lg font-medium text-sentinel-text-primary mb-1">Notifications</h2>
              <p className="text-sm text-sentinel-text-secondary mb-6">Manage when and how you receive alerts.</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-sentinel-text-secondary mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-sentinel-text-primary">Email Notifications</h3>
                    <p className="text-[13px] text-sentinel-text-secondary mt-1">Receive an email when a scan finishes or a high-severity vulnerability is found.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
                  <div className="w-11 h-6 bg-sentinel-inset peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-sentinel-text-secondary after:border-sentinel-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sentinel-accent peer-checked:after:bg-white border border-sentinel-border"></div>
                </label>
              </div>
            </div>
          </>
        )}

        {activeTab === 'integrations' && (
          <>
            <div className="p-6 border-b border-sentinel-border">
              <h2 className="text-lg font-medium text-sentinel-text-primary mb-1">API Integrations</h2>
              <p className="text-sm text-sentinel-text-secondary">Connect third-party services to power your security scans.</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex space-x-4">
                <div className="mt-1">
                  <Github className="w-6 h-6 text-sentinel-text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-sentinel-text-primary mb-1">GitHub Personal Access Token</h3>
                  <p className="text-[13px] text-sentinel-text-secondary mb-3">Required to clone private repositories and push AI-generated patches.</p>
                  <Input 
                    type="password" 
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    fullWidth
                  />
                </div>
              </div>

              <hr className="border-sentinel-border" />

              <div className="flex space-x-4">
                <div className="mt-1">
                  <div className="w-6 h-6 rounded bg-sentinel-text-primary text-sentinel-base flex items-center justify-center font-bold text-xs">
                    AI
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-sentinel-text-primary mb-1">OpenAI API Key</h3>
                  <p className="text-[13px] text-sentinel-text-secondary mb-3">Required for the AI engine to generate contextual code patches.</p>
                  <Input 
                    type="password" 
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxx" 
                    value={openAiKey}
                    onChange={(e) => setOpenAiKey(e.target.value)}
                    fullWidth
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button loading={loading} onClick={handleSaveIntegrations}>
                  Save Integrations
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      
    </div>
  );
};
