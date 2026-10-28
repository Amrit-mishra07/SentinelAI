'use client';

import React from 'react';
import Link from 'next/link';
import { LoginForm } from './LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-sentinel-base flex">
      {/* Left Column (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-sentinel-border bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sentinel-accent/10 via-sentinel-base to-sentinel-base">
        <div>
          <div className="flex items-center mb-12">
            <svg className="w-8 h-8 mr-3 text-sentinel-accent glow-text" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="text-2xl font-semibold tracking-wide text-sentinel-text-primary glow-text">
              SentinelAI
            </span>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-sentinel-text-primary mb-8">
              Securing code at the speed of thought.
            </h2>
            
            <ul className="space-y-4 text-[15px] text-sentinel-text-secondary">
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-3 mt-0.5 text-sentinel-completed" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Scan your connected GitHub repositories
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-3 mt-0.5 text-sentinel-completed" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Contextual AI vulnerability analysis
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-3 mt-0.5 text-sentinel-completed" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Validated patch suggestions and draft PRs
              </li>
            </ul>
          </div>
        </div>

        {/* Static demo scan visualization */}
        <div className="mt-12 p-6 rounded-lg bg-sentinel-panel border border-sentinel-border font-mono text-[12px] leading-relaxed shadow-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-sentinel-critical"></div>
            <div className="w-3 h-3 rounded-full bg-sentinel-high"></div>
            <div className="w-3 h-3 rounded-full bg-sentinel-completed"></div>
          </div>
          <div className="text-sentinel-text-secondary">
            <span className="text-sentinel-text-primary">Example security review</span><br/><br/>
            <span className="text-sentinel-high">HIGH</span> <span className="text-sentinel-accent">src/db.py:42</span><br/>
            Potential SQL injection from untrusted input.<br/><br/>
            Review the finding and contextual suggestion.<br/>
            Validate the change before opening a draft PR.<br/>
            Human review is required before merging.
          </div>
        </div>
      </div>

      {/* Right Column (Login Form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="text-[24px] font-semibold text-sentinel-text-primary">
              Sign in to SentinelAI
            </h2>
            <p className="text-[14px] text-sentinel-text-secondary mt-2">
              Welcome back. Enter your credentials to access the dashboard.
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-[13px] text-sentinel-text-secondary">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-sentinel-accent hover:text-blue-400 font-medium transition-colors">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
