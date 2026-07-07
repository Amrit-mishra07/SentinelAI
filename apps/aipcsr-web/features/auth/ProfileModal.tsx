'use client';

import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LogOut, User, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api-client';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Update local state when user changes
  React.useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const handleLogout = () => {
    toast.success('Logged out successfully');
    logout();
    onClose();
  };

  const handleUpdateInfo = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await apiClient.put('/auth/me', { email });
      // update local storage user
      localStorage.setItem('user', JSON.stringify(res.data));
      toast.success('Profile updated');
      setEditingInfo(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password) return;
    setLoading(true);
    try {
      await apiClient.put('/auth/me', { password });
      toast.success('Password updated successfully');
      setEditingPassword(false);
      setPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Profile">
      <div className="space-y-6">
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-sentinel-accent/20 border border-sentinel-accent/50 flex items-center justify-center text-xl font-medium text-sentinel-accent uppercase">
            {user?.email?.substring(0, 2) || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-medium text-sentinel-text-primary truncate max-w-[200px]">{user?.email || 'User'}</h3>
            <p className="text-[14px] text-sentinel-text-secondary">Administrator</p>
            <Badge role="Owner" />
          </div>
        </div>

        <hr className="border-sentinel-border" />

        <div className="space-y-4">
          {!editingInfo ? (
            <button 
              onClick={() => setEditingInfo(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-sentinel-elevated transition-colors text-sentinel-text-primary text-[14px] font-medium border border-transparent hover:border-sentinel-border"
            >
              <span className="flex items-center">
                <User className="w-4 h-4 mr-3 text-sentinel-text-secondary" />
                Edit Personal Info
              </span>
            </button>
          ) : (
            <div className="bg-sentinel-elevated p-4 rounded-md space-y-3 border border-sentinel-border">
              <Input 
                label="Email Address" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                fullWidth
              />
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingInfo(false)}>Cancel</Button>
                <Button size="sm" loading={loading} onClick={handleUpdateInfo}>Save</Button>
              </div>
            </div>
          )}
          
          {!editingPassword ? (
            <button 
              onClick={() => setEditingPassword(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-sentinel-elevated transition-colors text-sentinel-text-primary text-[14px] font-medium border border-transparent hover:border-sentinel-border"
            >
              <span className="flex items-center">
                <Key className="w-4 h-4 mr-3 text-sentinel-text-secondary" />
                Change Password
              </span>
            </button>
          ) : (
            <div className="bg-sentinel-elevated p-4 rounded-md space-y-3 border border-sentinel-border">
              <Input 
                label="New Password" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                fullWidth
              />
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditingPassword(false); setPassword(''); }}>Cancel</Button>
                <Button size="sm" loading={loading} onClick={handleUpdatePassword}>Save</Button>
              </div>
            </div>
          )}
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
