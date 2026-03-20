// ============================================
// pages/face-verification.js - Face Verification Page
// ============================================
// Anti-proxy selfie check for attendance

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { faceVerificationAPI } from '@/lib/api';

export default function FaceVerificationPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [tab, setTab] = useState('verify'); // verify, enroll, pending
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({ enrolledMembers: 0, todayPassed: 0, todayFailed: 0, todayPending: 0 });
  const [pendingList, setPendingList] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [message, setMessage] = useState('');

  // Fetch stats on load
  useEffect(() => {
    if (orgId) fetchStats();
  }, [orgId]);

  const fetchStats = async () => {
    try {
      const res = await faceVerificationAPI.getStats(orgId);
      setStats(res.data.data || {});
    } catch (err) { console.error(err); }
  };

  const fetchPending = async () => {
    try {
      const res = await faceVerificationAPI.getPending(orgId);
      setPendingList(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCameraReady(true);
      }
    } catch (err) {
      setMessage('Camera access denied. Please allow camera permission.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraReady(false);
    }
  }, [stream]);

  // Capture photo from video
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Mirror the image (selfie mode)
    ctx.translate(480, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, 480, 480);

    const photo = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photo);
    setResult(null);
    setMessage('');
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedPhoto(null);
    setResult(null);
    setMessage('');
  };

  // Enroll face
  const handleEnroll = async () => {
    if (!capturedPhoto || !memberId || !orgId) {
      setMessage('Please enter Member ID, Org ID and capture a photo');
      return;
    }
    setLoading(true);
    try {
      const res = await faceVerificationAPI.enroll({
        memberId, organizationId: orgId, referencePhoto: capturedPhoto
      });
      setResult({ type: 'success', text: 'Face enrolled successfully! ✅' });
      setCapturedPhoto(null);
      fetchStats();
    } catch (err) {
      setResult({ type: 'error', text: err.response?.data?.message || 'Enrollment failed' });
    } finally {
      setLoading(false);
    }
  };

  // Verify face
  const handleVerify = async () => {
    if (!capturedPhoto || !memberId || !orgId) {
      setMessage('Please enter Member ID, Org ID and capture a selfie');
      return;
    }
    setLoading(true);
    try {
      const res = await faceVerificationAPI.verify({
        memberId, organizationId: orgId, selfiePhoto: capturedPhoto,
        location: null, deviceInfo: navigator.userAgent
      });
      const data = res.data.data;
      setResult({
        type: data.result === 'passed' ? 'success' : data.result === 'failed' ? 'error' : 'warning',
        text: res.data.message,
        confidence: data.confidence
      });
    } catch (err) {
      setResult({ type: 'error', text: err.response?.data?.message || 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  // Review pending
  const handleReview = async (recordId, logId, decision) => {
    try {
      await faceVerificationAPI.review({ recordId, logId, decision });
      setPendingList(prev => prev.filter(p => p.logId !== logId));
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <Head>
        <title>Face Verification - QRcodeKey</title>
      </Head>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white text-sm">
          ← Back
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
          🤳 Face Verification
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Enrolled', value: stats.enrolledMembers || 0, color: 'text-purple-400' },
          { label: 'Passed', value: stats.todayPassed || 0, color: 'text-green-400' },
          { label: 'Failed', value: stats.todayFailed || 0, color: 'text-red-400' },
          { label: 'Pending', value: stats.todayPending || 0, color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <input
          type="text"
          placeholder="Member ID"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <input
          type="text"
          placeholder="Organization ID"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'verify', label: '🔍 Verify', desc: 'Check attendance selfie' },
          { id: 'enroll', label: '📸 Enroll', desc: 'Register face' },
          { id: 'pending', label: '📋 Review', desc: 'Admin review' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'pending' && orgId) fetchPending(); }}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Camera Section - for verify and enroll tabs */}
      {(tab === 'verify' || tab === 'enroll') && (
        <div className="mb-4">
          {/* Camera view */}
          <div className="relative w-full aspect-square max-w-[480px] mx-auto rounded-2xl overflow-hidden bg-black/50 border-2 border-white/10">
            {!capturedPhoto ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-60 border-2 border-dashed border-white/30 rounded-[50%]" />
                </div>
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium"
                    >
                      📷 Start Camera
                    </button>
                  </div>
                )}
              </>
            ) : (
              <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Camera controls */}
          <div className="flex gap-2 mt-3 justify-center">
            {!capturedPhoto ? (
              <button
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold disabled:opacity-40"
              >
                📸 Capture
              </button>
            ) : (
              <>
                <button
                  onClick={retakePhoto}
                  className="px-6 py-3 bg-white/10 rounded-xl text-white font-medium"
                >
                  🔄 Retake
                </button>
                <button
                  onClick={tab === 'enroll' ? handleEnroll : handleVerify}
                  disabled={loading}
                  className={`px-6 py-3 rounded-xl text-white font-bold ${
                    tab === 'enroll'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                      : 'bg-gradient-to-r from-green-500 to-cyan-500'
                  } disabled:opacity-40`}
                >
                  {loading ? '⏳ Processing...' : tab === 'enroll' ? '✅ Enroll Face' : '🔍 Verify Face'}
                </button>
              </>
            )}
          </div>

          {/* Message */}
          {message && (
            <div className="mt-3 text-center text-sm text-yellow-400">{message}</div>
          )}

          {/* Result */}
          {result && (
            <div className={`mt-3 p-4 rounded-xl text-center ${
              result.type === 'success' ? 'bg-green-500/10 border border-green-500/30' :
              result.type === 'error' ? 'bg-red-500/10 border border-red-500/30' :
              'bg-yellow-500/10 border border-yellow-500/30'
            }`}>
              <div className={`font-bold ${
                result.type === 'success' ? 'text-green-400' :
                result.type === 'error' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {result.text}
              </div>
              {result.confidence !== undefined && (
                <div className="text-sm text-gray-400 mt-1">
                  Confidence: {result.confidence}%
                  <div className="w-full bg-white/10 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${
                        result.confidence >= 80 ? 'bg-green-500' :
                        result.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pending Review Tab */}
      {tab === 'pending' && (
        <div>
          {pendingList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">✅</div>
              <div>No pending verifications</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingList.map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-sm font-medium text-white">
                      {item.member?.name || 'Unknown'}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.result === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.result === 'failed' ? '❌ Failed' : '⏳ Pending'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item.confidence}% match
                    </span>
                  </div>
                  {/* Photo comparison */}
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1">
                      <div className="text-[10px] text-gray-500 mb-1">Reference</div>
                      <img src={item.referencePhoto} alt="ref" className="w-full aspect-square rounded-lg object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-gray-500 mb-1">Selfie</div>
                      <img src={item.selfiePhoto} alt="selfie" className="w-full aspect-square rounded-lg object-cover" />
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(item.recordId, item.logId, 'manual_approved')}
                      className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleReview(item.recordId, item.logId, 'manual_rejected')}
                      className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Info */}
      <div className="mt-6 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-center">
        <div className="text-xs text-gray-500">
          🛡️ Face verification prevents proxy attendance. Members must show their face during QR scan.
        </div>
      </div>
    </div>
  );
}
