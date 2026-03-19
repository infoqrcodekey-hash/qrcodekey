// ============================================
// pages/attendance/scan/[groupId].js - Public QR Attendance Page
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useLanguage } from '../../../context/LanguageContext';
import { orgAPI } from '../../../lib/api';
import PasswordInput from '../../../components/PasswordInput';
import toast from 'react-hot-toast';

export default function ScanAttendance() {
  const router = useRouter();
  const { groupId } = router.query;
  const { t } = useLanguage();

  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (groupId) fetchGroupInfo();
  }, [groupId]);

  const fetchGroupInfo = async () => {
    try {
      const { data } = await orgAPI.getGroupForScan(groupId);
      setGroupInfo(data.data);
    } catch (err) {
      toast.error('Invalid QR Code');
    } finally {
      setLoading(false);
    }
  };

  const handleMark = async () => {
    if (!password) { toast.error(t('enterPassword')); return; }
    setSubmitting(true);
    try {
      const { data } = await orgAPI.markAttendance(groupId, { password });
      setResult(data.data);
      setSuccess(true);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">❌</span>
          <h2 className="font-bold text-lg text-gray-200">Invalid QR Code</h2>
          <p className="text-xs text-gray-500 mt-2">This attendance QR code is not valid or has been deactivated.</p>
        </div>
      </div>
    );
  }

  if (success) {
    const summary = result?.summary || {};
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm animate-fadeIn">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 border-2 border-green-500/30 flex items-center justify-center">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="font-bold text-xl gradient-text mb-2">{t('attendanceMarked')}</h2>
          <p className="text-xs text-gray-400 mb-4">{result?.markedCount || 0} {t('membersMarked')}</p>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-green-500/10 rounded-xl p-3">
              <div className="text-2xl font-black text-green-400">{summary.present || 0}</div>
              <div className="text-[9px] text-gray-500">{t('present')}</div>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3">
              <div className="text-2xl font-black text-red-400">{summary.absent || 0}</div>
              <div className="text-[9px] text-gray-500">{t('absent')}</div>
            </div>
          </div>

          <p className="text-[10px] text-gray-600 mt-4">{groupInfo.groupName} • {groupInfo.orgName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="card p-6 text-center relative z-10 animate-fadeIn">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
            <span className="text-3xl">📋</span>
          </div>

          <h1 className="font-black text-xl gradient-text mb-1">{t('markAttendance')}</h1>
          <p className="text-xs text-gray-500 mb-1">{groupInfo.groupName}</p>
          <p className="text-[10px] text-gray-600 mb-5">{groupInfo.orgName} • {groupInfo.orgType}</p>

          <div className="text-left mb-4">
            <label className="label">🔐 {t('sharedPassword')}</label>
            <PasswordInput value={password} onChange={setPassword}
              placeholder={t('enterOrgPassword')} showStrength={false} />
          </div>

          <button onClick={handleMark} disabled={submitting}
            className="btn-primary w-full text-sm py-3">
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                {t('marking')}...
              </span>
            ) : (
              '✅ ' + t('markAllPresent')
            )}
          </button>

          <p className="text-[10px] text-gray-600 mt-3">{t('scanPasswordNote')}</p>
        </div>
      </div>
    </div>
  );
}
