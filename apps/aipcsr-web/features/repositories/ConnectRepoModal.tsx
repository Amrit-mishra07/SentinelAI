'use client';

import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConnectRepoModal: React.FC<ConnectRepoModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const { toast } = useToast();

  const validateUrl = (url: string) => {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?\/?$/;
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
      // Simulate API call
      await new Promise(res => setTimeout(res, 800));
      
      toast.success('Repository connected successfully');
      onSuccess();
      onClose();
      setRepoUrl('');
      setBranch('main');
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Repository"
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
          label="Default Branch"
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
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            loading={loading}
            disabled={!!urlError || !repoUrl}
          >
            Connect
          </Button>
        </div>
      </form>
    </Modal>
  );
};
