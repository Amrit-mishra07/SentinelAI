'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { apiClient } from '../../lib/api-client';
import { Repository } from '../../types';
import { Loader2, AlertCircle } from 'lucide-react';

interface NewScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewScanModal: React.FC<NewScanModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchRepositories();
    }
  }, [isOpen]);

  const fetchRepositories = async () => {
    setLoadingRepos(true);
    try {
      const response = await apiClient.get('/repository/list');
      setRepositories(response.data);
      if (response.data.length > 0) {
        setSelectedRepoId(response.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !selectedRepoId) return;

    setSubmitting(true);
    try {
      await apiClient.post('/scan/create', { repository: selectedRepoId });
      toast.success('Scan queued successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start scan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start a new scan"
      preventClose={submitting}
    >
      {loadingRepos ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-sentinel-accent" />
          <span className="text-sm text-sentinel-text-secondary">Loading connected repositories...</span>
        </div>
      ) : repositories.length === 0 ? (
        <div className="text-center py-6 space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="w-12 h-12 text-sentinel-high/80" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-medium text-sentinel-text-primary">No repositories connected</h3>
            <p className="text-xs text-sentinel-text-secondary max-w-xs mx-auto">
              You must connect a GitHub repository before you can trigger a security scan.
            </p>
          </div>
          <div className="pt-2 flex justify-center space-x-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                onClose();
                // Navigate to repositories page or instruct user
                window.location.href = '/repositories';
              }}
            >
              Go to Repositories
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col space-y-1.5 w-full">
            <label className="text-[13px] font-medium text-sentinel-text-secondary">
              Select Repository
            </label>
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="h-10 px-3 bg-sentinel-inset text-sentinel-text-primary border border-sentinel-border-muted rounded-md outline-none transition-shadow focus:ring-2 focus:ring-sentinel-accent/20 focus:border-sentinel-accent disabled:opacity-50 disabled:cursor-not-allowed w-full text-sm"
              disabled={submitting}
            >
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name} ({repo.default_branch})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Button 
              variant="ghost" 
              type="button" 
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={submitting}
              disabled={!selectedRepoId}
            >
              Start scan
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
