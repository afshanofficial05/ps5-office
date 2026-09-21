import React, { useEffect } from 'react';
import '../styles/globals.css';
import Head from 'next/head';
import { AuthProvider } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function App({ Component, pageProps }) {
  // Silent pre-warm for Render free tier on initial visitor load
  useEffect(() => {
    const rawApiUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
      : '';
    const targetUrl = rawApiUrl ? `${rawApiUrl}/health` : '/api/health';
    
    // Fire-and-forget background ping
    fetch(targetUrl, { method: 'GET', mode: 'cors' }).catch(() => {
      // Ignore background errors
    });
  }, []);
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Head>
          <title>PSO Gaming Platform | Internal FC Competitive Arena</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
          <meta name="description" content="Internal office competitive football gaming platform with Elo rating engine and leaderboard tracking." />
          <meta name="theme-color" content="#2563eb" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="PSO League" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="format-detection" content="telephone=no" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/gamepad_banner.jpg" />
        </Head>
        <Component {...pageProps} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
