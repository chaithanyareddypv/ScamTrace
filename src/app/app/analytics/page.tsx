'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface AnalyticsPayload {
  datasetCounts: {
    scamReports: number;
    urlDomainIndicators: number;
    phoneIndicators: number;
    emailIndicators: number;
    upiOtherIndicators: number;
    messageSamples: number;
    transactionRecords: number;
    investigationCases: number;
    evidenceArtifacts: number;
  };
  charts: {
    activityOverTime: Array<{
      date: string;
      reports: number;
      critical: number;
      high: number;
      avgScore: number;
    }>;
    categoryDistribution: Array<{
      category: string;
      label: string;
      count: number;
      highRisk: number;
      totalLoss: number;
    }>;
    riskDistribution: Array<{
      level: string;
      key: string;
      count: number;
      color: string;
    }>;
    caseStatusDistribution: Array<{
      status: string;
      label: string;
      count: number;
    }>;
    topPatterns: Array<{
      code: string;
      name: string;
      detectionCount: number;
      weeklyGrowthPct: number;
    }>;
    rulePerformance: Array<{
      code: string;
      name: string;
      matchCount: number;
      scoreWeight: number;
      precisionEstimate: number;
    }>;
  };
}

export default function RiskAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('60d');
  const [category, setCategory] = useState('ALL');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard?timeRange=${encodeURIComponent(
          timeRange
        )}&category=${encodeURIComponent(category)}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [timeRange, category]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const indicatorFrequencyData = data
    ? [
        { type: 'URLs & Domains', count: data.datasetCounts.urlDomainIndicators },
        { type: 'Phone Numbers', count: data.datasetCounts.phoneIndicators },
        { type: 'Email Addresses', count: data.datasetCounts.emailIndicators },
        { type: 'Message Samples', count: data.datasetCounts.messageSamples },
        { type: 'Transactions', count: data.datasetCounts.transactionRecords },
        { type: 'UPI Handles', count: data.datasetCounts.upiOtherIndicators },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Date-Range Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#635BFF]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
              Risk Analytics & Detection Telemetry
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Executive analytical suite comparing scam categories, daily reporting trends, rule precision, and case resolution metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
            {[
              { id: '7d', label: 'Last 7 Days' },
              { id: '14d', label: 'Last 14 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '60d', label: 'Full 60 Days' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  timeRange === t.id
                    ? 'bg-[#635BFF] text-white'
                    : 'text-slate-600 hover:text-[#0A2540]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="PHISHING">Phishing</option>
            <option value="UPI_FRAUD">UPI Fraud</option>
            <option value="FAKE_JOB">Fake Job</option>
            <option value="INVESTMENT_SCAM">Investment Scam</option>
            <option value="DELIVERY_SCAM">Delivery Scam</option>
            <option value="IMPERSONATION">Impersonation</option>
            <option value="PAYMENT_REQUEST">Payment Request</option>
            <option value="TECH_SUPPORT">Tech Support</option>
          </select>

          <button
            onClick={fetchAnalytics}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <a
            href={`/api/export?type=reports&category=${encodeURIComponent(category)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540]"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Dataset CSV</span>
          </a>
        </div>
      </div>

      {/* Row 1: Daily Scam Reporting Trends & Average Risk Score Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="radar-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0A2540]">
              Daily Scam Reporting & High-Severity Volume
            </h2>
            <p className="text-xs text-slate-500">
              Time-series comparison of total submitted reports vs. High and Critical detections
            </p>
          </div>
          <div className="h-64 w-full">
            {data?.charts.activityOverTime ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts.activityOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="reports"
                    name="Total Reports"
                    stroke="#635BFF"
                    fill="#635BFF"
                    fillOpacity={0.18}
                  />
                  <Area
                    type="monotone"
                    dataKey="high"
                    name="High Risk"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.18}
                  />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    name="Critical Risk"
                    stroke="#F43F5E"
                    fill="#F43F5E"
                    fillOpacity={0.22}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        <div className="radar-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0A2540]">
              Mean Explainable Risk Score Trajectory (0–100)
            </h2>
            <p className="text-xs text-slate-500">
              Rolling average risk score across evaluated submissions in selected window
            </p>
          </div>
          <div className="h-64 w-full">
            {data?.charts.activityOverTime ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.activityOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    name="Mean Risk Score (/100)"
                    stroke="#0A2540"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#635BFF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Row 2: Scam Category Comparison & Indicator Type Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="radar-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0A2540]">
              Scam Category Comparison (Incident Volume vs. High Risk)
            </h2>
            <p className="text-xs text-slate-500">
              Cross-category comparison of total reports and high-severity concentration
            </p>
          </div>
          <div className="h-64 w-full">
            {data?.charts.categoryDistribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.categoryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#0A2540' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="count" name="Total Reports" fill="#635BFF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="highRisk" name="High/Critical" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        <div className="radar-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0A2540]">
              Indicator & Telemetry Corpus Frequency
            </h2>
            <p className="text-xs text-slate-500">
              Distribution of stored digital indicators across modalities
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={indicatorFrequencyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  type="category"
                  dataKey="type"
                  width={120}
                  tick={{ fontSize: 11, fill: '#0A2540' }}
                />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Bar dataKey="count" name="Database Records" fill="#00D4B6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Detection Rule Performance & Investigation Resolution Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 radar-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0A2540]">
              Detection Rule Trigger Frequency & Precision Performance
            </h2>
            <p className="text-xs text-slate-500">
              Top 10 explainable detection rules ranked by cumulative match count
            </p>
          </div>
          <div className="h-64 w-full">
            {data?.charts.rulePerformance ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.rulePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="code"
                    tick={{ fontSize: 9, fill: '#0A2540' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="matchCount"
                    name="Cumulative Rule Matches"
                    fill="#4F46E5"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-5 radar-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0A2540]">
              Investigation Resolution & Risk Tier Distribution
            </h2>
            <p className="text-xs text-slate-500">
              Proportion of Low, Medium, High, and Critical findings
            </p>
          </div>
          <div className="h-52 w-full">
            {data?.charts.riskDistribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.riskDistribution}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label
                  >
                    {data.charts.riskDistribution.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

