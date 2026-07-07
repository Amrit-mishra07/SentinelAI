'use client';

import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { LogOut, User, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../hooks/useToast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = () => {
    // In a real app, clear JWT tokens here
    toast.success('Logged out successfully');
    onClose();
    router.push('/login');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Profile">
      <div className="space-y-6">
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-sentinel-accent/20 border border-sentinel-accent/50 flex items-center justify-center text-xl font-medium text-sentinel-accent">
            AM
          </div>
          <div>
            <h3 className="text-lg font-medium text-sentinel-text-primary">Amrit Mishra</h3>
            <p className="text-[14px] text-sentinel-text-secondary">am@example.com</p>
            <Badge role="Developer" />
          </div>
        </div>

        <hr className="border-sentinel-border" />

        <div className="space-y-2">
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-sentinel-elevated transition-colors text-sentinel-text-primary text-[14px] font-medium border border-transparent hover:border-sentinel-border">
            <span className="flex items-center">
              <User className="w-4 h-4 mr-3 text-sentinel-text-secondary" />
              Edit Personal Info
            </span>
            <span className="text-sentinel-text-tertiary text-xs">Coming soon</span>
          </button>
          
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-sentinel-elevated transition-colors text-sentinel-text-primary text-[14px] font-medium border border-transparent hover:border-sentinel-border">
            <span className="flex items-center">
              <Key className="w-4 h-4 mr-3 text-sentinel-text-secondary" />
              Change Password
            </span>
            <span className="text-sentinel-text-tertiary text-xs">Coming soon</span>
          </button>
        </div>

        <div className="pt-4 flex justify-end">
          <Button variant="secondary" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
            Sign Out
          </Button>
        </div>

      </div>
    </Modal>
  );
};

const Badge = ({ role }: { role: string }) => (
  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sentinel-accent/10 text-sentinel-accent border border-sentinel-accent/20">
    {role}
  </span>
);
