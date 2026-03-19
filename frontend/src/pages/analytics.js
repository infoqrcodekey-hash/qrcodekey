// ============================================
// pages/analytics.js - Analytics Dashboard
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { analyticsAPI } from '../lib/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Link from 'next/link';

// SVG Chart Components
const ScanTrendChart = ({ data = [] }) => {
  if (!data || data.length === 0) return null;

  const maxScans = Math.max(...data.map(d => d.count || 0), 1);
  const chartWidth = 300;
  const chartHeight = 150;
  const barWidth = chartWidth / data.length;
  const padding = 30;

  return (
    <svg width={chartWidth + padding * 2} height={chartHeight + padding} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={`grid-${i}`}
          x1={padding}
          y1={padding + (i * chartHeight) / 4}
          x2={chartWidth + padding}
          y2={padding + (i * chartHeight) / 4}
          stroke="rgba(99,102,241,0.1)"
          strokeDasharray="4"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      {[0, 1, 2, 3, 4].map((i) => {
        const value = Math.round((maxScans * (4 - i)) / 4);
        return (
          <text
            key={`label-${i}`}
            x={padding - 5}
            y={padding + (i * chartHeight) / 4 + 4}
            fontSize="10"
            fill="rgba(156,163,175,0.7)"
            textAnchor="end"
          >
            {value}
          </text>
        );
      })}

      {/* Bars with gradient */}
      <defs>
        <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(99,102,241,0.8)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0.6)" />
        </linearGradient>
      </defs>

      {data.map((item, i) => {
        const barHeight = (item.count / maxScans) * chartHeight;
        const x = padding + i * barWidth + barWidth / 4;
        const y = padding + chartHeight - barHeight;

        return (
          <g key={`bar-${i}`}>
            <rect
              x={x}
              y={y}
              width={barWidth / 2}
              height={barHeight}
              fill="url(#barGradient)"
              rx="2"
            />
          </g>
        );
      })}

      {/* X-axis */}
      <line
        x1={padding}
        y1={padding + chartHeight}
        x2={chartWidth + padding}
        y2={padding + chartHeight}
        stroke="rgba(99,102,241,0.3)"
        strokeWidth="1"
      />
    </svg>
  );
};

const DeviceBreakdownChart = ({ data = {} }) => {
  const total = (data.mobile || 0) + (data.desktop || 0) + (data.tablet || 0);
  if (total === 0) return null;

  const mobilePercent = ((data.mobile || 0) / total) * 100;
  const desktopPercent = ((data.desktop || 0) / total) * 100;
  const tabletPercent = ((data.tablet || 0) / total) * 100;

  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  let mobileOffset = 0;
  let desktopOffset = (mobilePercent / 100) * circumference;
  let tabletOffset = desktopOffset + (desktopPercent / 100) * circumference;

  return (
    <div className="flex items-center justify-center gap-8">
      <svg width="200" height="200" className="w-32 h-32">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(99,102,241,0.15)"
          strokeWidth="4"
        />

        {/* Mobile segment */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(99,102,241,0.9)"
          strokeWidth="4"
          strokeDasharray={`${(mobilePercent / 100) * circumference} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
        />

        {/* Desktop segment */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(139,92,246,0.9)"
          strokeWidth="4"
          strokeDasharray={`${(desktopPercent / 100) * circumference} ${circumference}`}
          strokeDashoffset={-desktopOffset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
        />

        {/* Tablet segment */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(34,197,94,0.9)"
          strokeWidth="4"
          strokeDasharray={`${(tabletPercent / 100) * circumference} ${circumference}`}
          strokeDashoffset={-tabletOffset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
        />

        <text x="100" y="100" textAnchor="middle" dy="-8" fontSize="20" fill="#e0e0f0" fontWeight="bold">
          {total}
        </text>
        <text x="100" y="100" textAnchor="middle" dy="12" fontSize="10" fill="rgba(156,163,175,0.8)">
          Total
        </text>
      </svg>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[rgba(99,102,241,0.9)]" />
          <div className="text-xs text-gray-400">
            Mobile <span className="font-bold text-white">{mobilePercent.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[rgba(139,92,246,0.9)]" />
          <div className="text-xs text-gray-400">
            Desktop <span className="font-bold text-white">{desktopPercent.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[rgba(34,197,94,0.9)]" />
          <div className="text-xs text-gray-400">
            Tablet <span className="font-bold text-white">{tabletPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const HorizontalBarChart = ({ data = [], maxValue = 100 }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const percentage = (item.value / maxValue) * 100;
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 font-medium">{item.label}</span>
              <span className="text-xs text-gray-500">{item.value}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Loading Skeleton
const Skeleton = ({ className = '' }) => (
  <div className={`bg-white/5 animate-pulse rounded-lg ${className}`} />
);

export default function Analytics() {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn && !authLoading) {
      router.push('/login');
      return;
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await analyticsAPI.getDashboard();
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isLoggedIn]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pb-24 bg-[#0a0a1a]">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Skeleton className="w-40 h-6" />
            <Skeleton className="w-10 h-10" />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-5 pt-8">
          <div className="space-y-6">
            <Skeleton className="w-48 h-8 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-48 mt-8" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const analytics = data?.data || data || {};
  const overview = analytics.overview || {};
  const scanTrend = analytics.scanTrend || [];
  const topLocations = analytics.topLocations || [];
  const deviceBreakdown = analytics.deviceBreakdown || {};
  const browserBreakdown = analytics.browserBreakdown || [];
  const osBreakdown = analytics.osBreakdown || [];
  const categoryDistribution = analytics.categoryDistribution || [];
  const hourlyDistribution = analytics.hourlyDistribution || [];
  const countryDistribution = analytics.countryDistribution || [];
  const recentActivity = analytics.recentActivity || [];

  // Get max values for charts (with safety checks)
  const maxBrowser = browserBreakdown?.length > 0 ? Math.max(...browserBreakdown.map(b => b.count || 0), 1) : 1;
  const maxOS = osBreakdown?.length > 0 ? Math.max(...osBreakdown.map(o => o.count || 0), 1) : 1;
  const maxHourly = hourlyDistribution?.length > 0 ? Math.max(...hourlyDistribution.map(h => h.count || 0), 1) : 1;

  const browserChartData = browserBreakdown.slice(0, 5).map(b => ({
    label: b.browser || 'Unknown',
    value: b.count
  }));

  const osChartData = osBreakdown.slice(0, 5).map(o => ({
    label: o.os || 'Unknown',
    value: o.count
  }));

  const hourlyChartData = hourlyDistribution.map(h => ({
    label: `${h.hour}h`,
    value: h.count
  }));

  return (
    <div className="min-h-screen pb-24 bg-[#0a0a1a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold gradient-text">📊 {t('analytics') || 'Analytics Dashboard'}</h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 pt-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Overview Cards Row */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 ml-1">{t('overview') || 'Overview'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: t('totalQR') || 'Total QR', value: overview.totalQR || 0, icon: '📱', gradient: 'from-indigo-500 to-purple-500' },
              { label: t('activeQR') || 'Active QR', value: overview.activeQR || 0, icon: '✅', gradient: 'from-emerald-500 to-teal-500' },
              { label: t('totalScans') || 'Total Scans', value: overview.totalScans || 0, icon: '👁️', gradient: 'from-pink-500 to-rose-500' },
              { label: t('todayScans') || 'Today Scans', value: overview.todayScans || 0, icon: '📈', gradient: 'from-orange-500 to-amber-500' },
              { label: t('weekScans') || 'Week Scans', value: overview.weekScans || 0, icon: '📊', gradient: 'from-blue-500 to-cyan-500' },
              { label: t('monthScans') || 'Month Scans', value: overview.monthScans || 0, icon: '📅', gradient: 'from-violet-500 to-indigo-500' },
            ].map((card, i) => (
              <div
                key={i}
                className={`card p-5 bg-gradient-to-br ${card.gradient} bg-opacity-5 border border-white/10 hover:border-white/20 transition-all group`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-2">{card.label}</div>
                    <div className="text-3xl font-black text-white group-hover:scale-105 transition-transform">
                      {card.value.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-3xl opacity-60 group-hover:opacity-100 transition-opacity">{card.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scan Trend Chart */}
        <div className="card p-6 mb-8 border-white/10">
          <h3 className="text-sm font-bold text-white mb-4">📈 {t('scanTrend') || 'Scan Trend (Last 30 Days)'}</h3>
          <div className="overflow-x-auto">
            <ScanTrendChart data={scanTrend} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Locations */}
          <div className="lg:col-span-2 card p-6 border-white/10">
            <h3 className="text-sm font-bold text-white mb-4">🌍 {t('topLocations') || 'Top Locations'}</h3>
            <div className="space-y-2">
              {topLocations.slice(0, 10).map((loc, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{loc.countryFlag || '🌐'}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-200">{loc.city || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{loc.country || 'Unknown'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-indigo-400">{loc.count}</div>
                    <div className="text-xs text-gray-500">scans</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="card p-6 border-white/10">
            <h3 className="text-sm font-bold text-white mb-4">📱 {t('deviceBreakdown') || 'Device Breakdown'}</h3>
            <DeviceBreakdownChart data={deviceBreakdown} />
          </div>
        </div>

        {/* Browser & OS Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card p-6 border-white/10">
            <h3 className="text-sm font-bold text-white mb-4">🌐 {t('browserStats') || 'Browser Stats'}</h3>
            <HorizontalBarChart data={browserChartData} maxValue={maxBrowser} />
          </div>

          <div className="card p-6 border-white/10">
            <h3 className="text-sm font-bold text-white mb-4">⚙️ {t('osStats') || 'OS Stats'}</h3>
            <HorizontalBarChart data={osChartData} maxValue={maxOS} />
          </div>
        </div>

        {/* Category Distribution */}
        {categoryDistribution.length > 0 && (
          <div className="card p-6 mb-8 border-white/10">
            <h3 className="text-sm font-bold text-white mb-4">📂 {t('categoryDistribution') || 'Category Distribution'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryDistribution.map((cat, i) => {
                const colors = ['bg-indigo-500/20 border-indigo-500/30', 'bg-purple-500/20 border-purple-500/30', 'bg-pink-500/20 border-pink-500/30', 'bg-emerald-500/20 border-emerald-500/30'];
                return (
                  <div key={i} className={`p-4 rounded-lg border ${colors[i % colors.length]}`}>
                    <div className="text-xs text-gray-400 mb-2">{cat.category || 'Uncategorized'}</div>
                    <div className="text-2xl font-black text-white">{cat.count}</div>
                    <div className="text-xs text-gray-500 mt-1">{t('codes') || 'codes'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hourly Activity */}
        <div className="card p-6 mb-8 border-white/10">
          <h3 className="text-sm font-bold text-white mb-4">⏰ {t('hourlyActivity') || 'Hourly Activity (24h)'}</h3>
          <div className="overflow-x-auto">
            <HorizontalBarChart data={hourlyChartData} maxValue={maxHourly} />
          </div>
        </div>

        {/* Country Distribution & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Country Distribution */}
          <div className="card p-6 border-white/10">
            <h3 className="text-sm font-bold text-white mb-4">🌎 {t('countryDistribution') || 'Country Distribution'}</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {countryDistribution.slice(0, 15).map((country, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-white/3 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{country.countryFlag || '🌐'}</span>
                    <span className="text-sm text-gray-300">{country.country || 'Unknown'}</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-400">{country.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-6 border-white/10">
            <h3 className="text-sm font-bold text-white mb-4">🔔 {t('recentActivity') || 'Recent Activity'}</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.slice(0, 10).map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-lg hover:bg-white/5 transition-colors text-xs">
                  <div className="text-lg mt-0.5">📍</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-200">{activity.location?.city || 'Unknown Location'}</div>
                    <div className="text-gray-500">{activity.location?.country || 'Unknown'} • {activity.device?.browser || 'Unknown'} ({activity.device?.os || ''})</div>
                    <div className="text-gray-600 mt-1">{activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-[rgba(10,10,30,0.92)] backdrop-blur-xl border-t border-[rgba(99,102,241,0.12)] py-2 px-4">
        <div className="max-w-lg mx-auto flex justify-around">
          {[
            { icon: '🏠', label: t('home') || 'Home', href: '/' },
            { icon: '➕', label: t('generate') || 'Generate', href: '/generate' },
            { icon: '📍', label: t('track') || 'Track', href: '/track' },
            { icon: '📊', label: t('analytics') || 'Analytics', href: '/analytics' },
            { icon: '📋', label: t('dashboard') || 'Dashboard', href: '/dashboard' },
          ].map((item, i) => (
            <Link key={i} href={item.href} className={`nav-item ${router.pathname === item.href ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`}>
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
