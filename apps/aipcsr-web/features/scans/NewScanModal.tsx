'use client';

import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

interface NewScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewScanModal: React.FC<NewScanModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const { toast } = useToast();

  const validateUrl = (url: string) => {
    // Basic GitHub URL validation
    const githubRegex = /^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)(\.git)?\/?$/;
    if (!url) {
      setUrlError('Repository URL is required');
      return false;
    }
    if (!githubRegex.test(url)) {
      setUrlError('Must be a valid GitHub URL (e.g., https://github.com/owner/repo)');
      return false;
    }
    setUrlError('');
    return true;
  };

  const handleBlur = () => {
    if (repoUrl) validateUrl(repoUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validateUrl(repoUrl)) return;
    if (!branch) {
      toast.error('Branch is required');
      return;
    }

    setLoading(true);
    try {
      // In a real app we'd POST to the API here
      // await api.post('/scan', { url: repoUrl, branch });
      
      // Simulate API call
      await new Promise(res => setTimeout(res, 800));
      
      toast.success('Scan queued successfully');
      onSuccess();
      onClose(); // Reset state is handled typically by unmounting or clearing here
      setRepoUrl('');
      setBranch('main');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start scan');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    const isDirty = repoUrl.length > 0 || branch !== 'main';
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Start a new scan"
      preventClose={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Repository URL"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onBlur={handleBlur}
          error={urlError}
          fullWidth
          disabled={loading}
        />
        
        <Input
          label="Branch"
          placeholder="main"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          fullWidth
          disabled={loading}
        />

        <div className="pt-4 flex justify-end space-x-3">
          <Button 
            variant="ghost" 
            type="button" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            loading={loading}
            disabled={!!urlError}
          >
            Start scan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
