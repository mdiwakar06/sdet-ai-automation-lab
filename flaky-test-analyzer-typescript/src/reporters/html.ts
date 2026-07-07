import { writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import { TraceRCAReport } from '../types';

export function generateHtmlReport(reports: TraceRCAReport[], outputPath: string): void {
  // Ensure the directory exists
  const dir = path.dirname(outputPath);
  mkdirSync(dir, { recursive: true });

  const escapedJson = JSON.stringify(reports)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const html = `<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-950 text-slate-100">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraceRCA failure Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    body {
      font-family: 'Inter', sans-serif;
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
    }
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0b0f19;
    }
    ::-webkit-scrollbar-thumb {
      background: #1e293b;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #334155;
    }
  </style>
</head>
<body class="h-full flex flex-col overflow-hidden">
  <!-- Top Navbar -->
  <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
    <div class="flex items-center space-x-3">
      <div class="h-8 w-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
        <svg class="h-5 w-5 text-slate-950 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div>
        <h1 class="text-lg font-bold tracking-tight text-white">TraceRCA</h1>
        <p class="text-xs text-slate-400">Automated QA Failure Investigation & Root-Cause Analyzer</p>
      </div>
    </div>
    <div class="text-right">
      <div class="text-sm font-semibold text-slate-300" id="generated-date">Loading...</div>
      <div class="text-xs text-slate-500">Run Diagnostics Log</div>
    </div>
  </header>

  <!-- Main Workspace -->
  <main class="flex flex-1 overflow-hidden">
    <!-- Left Sidebar: Test list and filter controls -->
    <aside class="w-96 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 overflow-hidden">
      <!-- Search & Filters -->
      <div class="p-4 border-b border-slate-800 space-y-3 shrink-0">
        <input 
          type="text" 
          id="search-input" 
          placeholder="Search test name or file..." 
          class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        
        <div class="flex flex-wrap gap-1.5" id="filter-buttons">
          <button onclick="setFilter('all')" id="btn-filter-all" class="px-2.5 py-1 rounded text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">
            All (<span id="count-all">0</span>)
          </button>
          <button onclick="setFilter('App Bug')" id="btn-filter-app" class="px-2.5 py-1 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
            App Bug (<span id="count-app">0</span>)
          </button>
          <button onclick="setFilter('Test Bug')" id="btn-filter-test" class="px-2.5 py-1 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
            Test Bug (<span id="count-test">0</span>)
          </button>
          <button onclick="setFilter('Infra Flake')" id="btn-filter-infra" class="px-2.5 py-1 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
            Infra (<span id="count-infra">0</span>)
          </button>
          <button onclick="setFilter('Unclassified')" id="btn-filter-unclassified" class="px-2.5 py-1 rounded text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20 transition-colors">
            Other (<span id="count-unclassified">0</span>)
          </button>
        </div>
      </div>

      <!-- Test Cases List -->
      <div class="flex-1 overflow-y-auto divide-y divide-slate-800/40" id="test-list">
        <!-- Rendered dynamically -->
      </div>
    </aside>

    <!-- Right Content Area: Detailed test results -->
    <section class="flex-1 flex flex-col overflow-hidden bg-slate-950" id="detail-panel">
      <!-- Empty State -->
      <div class="flex-grow flex flex-col items-center justify-center p-8 text-center text-slate-500" id="empty-state">
        <svg class="h-12 w-12 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-base font-semibold text-slate-400">No Failure Selected</h3>
        <p class="text-sm max-w-sm mt-1">Select a test from the left sidebar to view trace details, network analysis, and Gemini AI Root Cause insights.</p>
      </div>

      <!-- Detail View (Initially Hidden) -->
      <div class="flex-grow flex flex-col overflow-hidden hidden" id="detail-content">
        <!-- Detail Header -->
        <div class="p-6 bg-slate-900 border-b border-slate-800 shrink-0">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-xl font-bold text-white tracking-tight" id="detail-title">Test Name</h2>
              <p class="text-sm text-slate-400 mt-1 mono truncate max-w-3xl" id="detail-filepath">filePath</p>
            </div>
            <div id="detail-badge-container">
              <!-- Classification badge -->
            </div>
          </div>
        </div>

        <!-- Scrollable Details -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- AI RCA Card -->
          <div id="ai-card" class="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl shadow-black/30">
            <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div class="flex items-center space-x-2.5">
                <div class="h-6 w-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">AI</div>
                <h3 class="text-sm font-bold text-slate-200">Gemini Root Cause Analysis</h3>
              </div>
              <div class="flex items-center space-x-2.5">
                <span class="text-xs text-slate-400">Confidence:</span>
                <span id="ai-confidence" class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">High</span>
              </div>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Summary</h4>
                <p class="text-sm text-slate-200 mt-1.5 font-medium border-l-2 border-cyan-500 pl-3 py-0.5" id="ai-summary">Summary content</p>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-slate-950/40 p-4 rounded-lg border border-slate-800/40">
                  <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detailed Analysis</h4>
                  <div class="text-sm text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed" id="ai-detailed">Detailed Analysis content</div>
                </div>
                <div class="bg-slate-950/40 p-4 rounded-lg border border-slate-800/40">
                  <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Fix</h4>
                  <div class="text-sm text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed" id="ai-recommended">Recommended Fix content</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Error Message Block -->
          <div class="rounded-xl border border-red-900/20 bg-red-950/10 overflow-hidden" id="error-block">
            <div class="px-5 py-3 border-b border-red-900/20 bg-red-950/20 text-xs font-semibold text-red-400 uppercase tracking-wider">
              Failure Error & Stack Trace
            </div>
            <div class="p-5">
              <p class="text-sm font-semibold text-red-300" id="error-message">Error Message</p>
              <pre class="mt-3 bg-black/40 border border-slate-800/50 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto mono max-h-72 whitespace-pre-wrap leading-normal" id="error-stack">Stack trace</pre>
            </div>
          </div>

          <!-- Telemetry Tabs -->
          <div class="space-y-4">
            <!-- Tab Headers -->
            <div class="border-b border-slate-850 flex space-x-6 text-sm font-medium">
              <button onclick="switchTab('actions')" id="tab-btn-actions" class="pb-3 border-b-2 border-cyan-500 text-cyan-400 transition-colors">Action Trail</button>
              <button onclick="switchTab('console')" id="tab-btn-console" class="pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-300 transition-colors">Console Logs</button>
              <button onclick="switchTab('network')" id="tab-btn-network" class="pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-300 transition-colors">Network Requests</button>
            </div>

            <!-- Tab Panels -->
            <div id="tab-panel-actions" class="tab-panel space-y-2">
              <!-- Action list -->
            </div>

            <div id="tab-panel-console" class="tab-panel hidden">
              <div class="bg-black/50 border border-slate-800 rounded-lg p-5 mono text-xs leading-relaxed max-h-96 overflow-y-auto space-y-1.5" id="console-logs-list">
                <!-- Console messages -->
              </div>
            </div>

            <div id="tab-panel-network" class="tab-panel space-y-3">
              <!-- Network requests -->
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <script>
    // Injected diagnostic reports
    const reports = ${escapedJson};
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedReportId = null;

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('generated-date').textContent = new Date().toLocaleString();
      
      // Setup Search Listener
      const searchInput = document.getElementById('search-input');
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderSidebar();
      });

      // Compute statistics and filter buttons
      computeStats();
      renderSidebar();
    });

    function computeStats() {
      const stats = {
        all: reports.length,
        app: 0,
        test: 0,
        infra: 0,
        unclassified: 0
      };

      reports.forEach(r => {
        const cls = r.aiAnalysis?.classification;
        if (cls === 'App Bug') stats.app++;
        else if (cls === 'Test Bug') stats.test++;
        else if (cls === 'Infra Flake') stats.infra++;
        else stats.unclassified++;
      });

      document.getElementById('count-all').textContent = stats.all;
      document.getElementById('count-app').textContent = stats.app;
      document.getElementById('count-test').textContent = stats.test;
      document.getElementById('count-infra').textContent = stats.infra;
      document.getElementById('count-unclassified').textContent = stats.unclassified;
    }

    function setFilter(filter) {
      currentFilter = filter;
      
      // Update button styling
      const buttons = {
        all: 'btn-filter-all',
        'App Bug': 'btn-filter-app',
        'Test Bug': 'btn-filter-test',
        'Infra Flake': 'btn-filter-infra',
        'Unclassified': 'btn-filter-unclassified'
      };

      Object.entries(buttons).forEach(([key, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (key === filter) {
          btn.className = btn.className.replace(/bg-\\w+-500\\/10 text-\\w+-400 border-\\w+-500\\/20/g, '').replace('text-slate-400 bg-slate-500/10 border-slate-500/20', '');
          
          if (key === 'all') btn.className = btn.className.replace('hover:bg-cyan-500/20', 'bg-cyan-500 text-slate-950 font-bold border-cyan-500 hover:bg-cyan-600');
          else if (key === 'App Bug') btn.className = btn.className.replace('hover:bg-red-500/20', 'bg-red-500 text-white font-bold border-red-500 hover:bg-red-600');
          else if (key === 'Test Bug') btn.className = btn.className.replace('hover:bg-yellow-500/20', 'bg-yellow-550 text-slate-950 font-bold border-yellow-500 hover:bg-yellow-600');
          else if (key === 'Infra Flake') btn.className = btn.className.replace('hover:bg-purple-500/20', 'bg-purple-500 text-white font-bold border-purple-500 hover:bg-purple-600');
          else btn.className = btn.className.replace('hover:bg-slate-500/20', 'bg-slate-500 text-white font-bold border-slate-500 hover:bg-slate-600');
        } else {
          // Revert to outline/fade style
          btn.className = btn.className.replace(/bg-cyan-500 text-slate-950 font-bold border-cyan-500 hover:bg-cyan-600/g, 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20');
          btn.className = btn.className.replace(/bg-red-500 text-white font-bold border-red-500 hover:bg-red-600/g, 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20');
          btn.className = btn.className.replace(/bg-yellow-550 text-slate-950 font-bold border-yellow-500 hover:bg-yellow-600/g, 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20');
          btn.className = btn.className.replace(/bg-purple-500 text-white font-bold border-purple-500 hover:bg-purple-600/g, 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20');
          btn.className = btn.className.replace(/bg-slate-500 text-white font-bold border-slate-500 hover:bg-slate-600/g, 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20');
        }
      });

      renderSidebar();
    }

    function renderSidebar() {
      const container = document.getElementById('test-list');
      container.innerHTML = '';

      const filteredReports = reports.filter(r => {
        // Filter by category
        const cls = r.aiAnalysis?.classification || 'Unclassified';
        if (currentFilter !== 'all') {
          if (currentFilter === 'Unclassified' && cls !== 'Unclassified') return false;
          if (currentFilter !== 'Unclassified' && cls !== currentFilter) return false;
        }

        // Filter by Search Query
        if (searchQuery) {
          const matchName = r.testName.toLowerCase().includes(searchQuery);
          const matchFile = r.filePath?.toLowerCase().includes(searchQuery) || false;
          return matchName || matchFile;
        }

        return true;
      });

      if (filteredReports.length === 0) {
        container.innerHTML = \`
          <div class="p-8 text-center text-sm text-slate-500">
            No failures match the filter criteria.
          </div>
        \`;
        return;
      }

      filteredReports.forEach(r => {
        const isSelected = r.testId === selectedReportId;
        const cls = r.aiAnalysis?.classification || 'Unclassified';
        
        let badgeColor = 'bg-slate-800/60 text-slate-400 border-slate-700';
        if (cls === 'App Bug') badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
        else if (cls === 'Test Bug') badgeColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        else if (cls === 'Infra Flake') badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';

        const item = document.createElement('div');
        item.className = \`p-4 cursor-pointer hover:bg-slate-800/40 border-l-4 transition-colors \${
          isSelected ? 'bg-slate-800/50 border-cyan-500' : 'border-transparent'
        }\`;
        
        item.onclick = () => selectTest(r.testId);

        item.innerHTML = \`
          <div class="flex items-start justify-between gap-3">
            <span class="text-xs font-semibold px-2 py-0.5 rounded border \${badgeColor}">\${cls}</span>
            <span class="text-slate-500 text-[10px] mono shrink-0">\${new Date(r.timestamp).toLocaleTimeString()}</span>
          </div>
          <h4 class="text-sm font-semibold text-slate-200 mt-2.5 truncate">\${r.testName}</h4>
          <p class="text-xs text-slate-500 mt-1 mono truncate">\${r.filePath ? r.filePath.split('/').pop() : 'Unknown file'}</p>
        \`;

        container.appendChild(item);
      });
    }

    function selectTest(testId) {
      selectedReportId = testId;
      renderSidebar();

      const report = reports.find(r => r.testId === testId);
      if (!report) return;

      document.getElementById('empty-state').classList.add('hidden');
      document.getElementById('detail-content').classList.remove('hidden');

      // Populate Title & File
      document.getElementById('detail-title').textContent = report.testName;
      document.getElementById('detail-filepath').textContent = report.filePath || 'Unknown file';

      // Populate Classification Badge
      const badgeContainer = document.getElementById('detail-badge-container');
      const cls = report.aiAnalysis?.classification || 'Unclassified';
      let badgeHtml = '';
      if (cls === 'App Bug') {
        badgeHtml = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white border border-red-600 shadow-md shadow-red-500/10">App Bug</span>';
      } else if (cls === 'Test Bug') {
        badgeHtml = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-slate-950 border border-yellow-600 shadow-md shadow-yellow-500/10">Test Bug</span>';
      } else if (cls === 'Infra Flake') {
        badgeHtml = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500 text-white border border-purple-600 shadow-md shadow-purple-500/10">Infra Flake</span>';
      } else {
        badgeHtml = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-200 border border-slate-600">Unclassified</span>';
      }
      badgeContainer.innerHTML = badgeHtml;

      // Populate AI Analysis Card
      const aiCard = document.getElementById('ai-card');
      if (report.aiAnalysis) {
        aiCard.classList.remove('hidden');
        document.getElementById('ai-confidence').textContent = report.aiAnalysis.confidence;
        
        // Confidence badge styling
        const confBadge = document.getElementById('ai-confidence');
        if (report.aiAnalysis.confidence === 'High') {
          confBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20';
        } else if (report.aiAnalysis.confidence === 'Medium') {
          confBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
        } else {
          confBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20';
        }

        document.getElementById('ai-summary').textContent = report.aiAnalysis.summary;
        document.getElementById('ai-detailed').textContent = report.aiAnalysis.detailedAnalysis;
        document.getElementById('ai-recommended').textContent = report.aiAnalysis.recommendedFix;
      } else {
        aiCard.classList.add('hidden');
      }

      // Populate Error block
      const errorBlock = document.getElementById('error-block');
      const errMsg = report.rawContext.errorMessage || report.error;
      if (errMsg) {
        errorBlock.classList.remove('hidden');
        document.getElementById('error-message').textContent = errMsg;
        document.getElementById('error-stack').textContent = report.rawContext.stackTrace || 'No stack trace captured.';
      } else {
        errorBlock.classList.add('hidden');
      }

      // Populate Actions tab content
      const actionsContainer = document.getElementById('tab-panel-actions');
      actionsContainer.innerHTML = '';
      if (report.rawContext.recentActions && report.rawContext.recentActions.length > 0) {
        report.rawContext.recentActions.forEach(a => {
          const isFailed = a.status === 'failed';
          const indicatorBg = isFailed ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300';
          
          const actionDiv = document.createElement('div');
          actionDiv.className = \`flex items-start gap-4 p-3.5 rounded-lg border bg-slate-900/20 border-slate-900/50 \${
            isFailed ? 'border-red-900/20 bg-red-950/5' : ''
          }\`;
          
          actionDiv.innerHTML = \`
            <div class="h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 \${indicatorBg}">
              \${a.step}
            </div>
            <div class="flex-grow min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-200">\${a.action}</span>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">\${a.duration ? a.duration + 'ms' : ''}</span>
              </div>
              \${a.selector ? \`<div class="text-xs text-slate-400 mt-1 truncate">Selector: <span class="mono text-slate-300 font-medium">\${a.selector}</span></div>\` : ''}
              \${a.value ? \`<div class="text-xs text-slate-400 mt-1 truncate">Value: <span class="mono text-slate-300 font-medium">\${a.value}</span></div>\` : ''}
            </div>
          \`;
          actionsContainer.appendChild(actionDiv);
        });
      } else {
        actionsContainer.innerHTML = '<div class="p-6 text-center text-slate-500 text-sm">No action trail captured.</div>';
      }

      // Populate Console Logs Tab
      const consoleContainer = document.getElementById('console-logs-list');
      consoleContainer.innerHTML = '';
      if (report.rawContext.consoleLogs && report.rawContext.consoleLogs.length > 0) {
        report.rawContext.consoleLogs.forEach(l => {
          let lvlColor = 'text-slate-400';
          if (l.level === 'error') lvlColor = 'text-red-400';
          else if (l.level === 'warning' || l.level === 'warn') lvlColor = 'text-yellow-400';
          
          const entry = document.createElement('div');
          entry.className = \`flex gap-2.5 \${lvlColor}\`;
          entry.innerHTML = \`
            <span class="font-bold opacity-60">[\${l.level.toUpperCase()}]</span>
            <span class="break-all">\${l.text}</span>
          \`;
          consoleContainer.appendChild(entry);
        });
      } else {
        consoleContainer.innerHTML = '<div class="text-slate-500">No console logs captured.</div>';
      }

      // Populate Network Requests Tab
      const networkContainer = document.getElementById('tab-panel-network');
      networkContainer.innerHTML = '';
      if (report.rawContext.failedRequests && report.rawContext.failedRequests.length > 0) {
        report.rawContext.failedRequests.forEach((req, idx) => {
          const reqDiv = document.createElement('div');
          reqDiv.className = 'border border-slate-800 rounded-lg bg-slate-900/30 overflow-hidden';
          
          const reqId = \`network-details-\${idx}\`;
          
          reqDiv.innerHTML = \`
            <div class="px-4 py-3 bg-slate-900/60 flex items-center justify-between cursor-pointer" onclick="toggleNetworkDetails('\${reqId}')">
              <div class="flex items-center space-x-3 min-w-0">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-300 shrink-0">\${req.method}</span>
                <span class="text-sm font-semibold text-slate-300 truncate max-w-xl">\${req.url}</span>
              </div>
              <span class="px-2.5 py-0.5 rounded font-bold text-xs bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">\${req.status}</span>
            </div>
            
            <div id="\${reqId}" class="hidden p-4 bg-slate-950/60 border-t border-slate-900 space-y-3.5 text-xs">
              <div>
                <h5 class="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">Request Headers</h5>
                <pre class="bg-black/30 p-2.5 border border-slate-800 rounded text-slate-300 overflow-x-auto leading-normal">\${JSON.stringify(req.requestHeaders || {}, null, 2)}</pre>
              </div>
              \${req.requestBody ? \`
                <div>
                  <h5 class="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">Request Body</h5>
                  <pre class="bg-black/30 p-2.5 border border-slate-800 rounded text-slate-300 overflow-x-auto leading-normal">\${req.requestBody}</pre>
                </div>
              \` : ''}
              <div>
                <h5 class="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">Response Headers</h5>
                <pre class="bg-black/30 p-2.5 border border-slate-800 rounded text-slate-300 overflow-x-auto leading-normal">\${JSON.stringify(req.responseHeaders || {}, null, 2)}</pre>
              </div>
              <div>
                <h5 class="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">Response Body</h5>
                <pre class="bg-black/30 p-2.5 border border-slate-800 rounded text-slate-300 overflow-x-auto leading-normal max-h-48 overflow-y-auto whitespace-pre-wrap">\${req.responseBody || 'None'}</pre>
              </div>
            </div>
          \`;
          networkContainer.appendChild(reqDiv);
        });
      } else {
        networkContainer.innerHTML = '<div class="p-6 text-center text-slate-500 text-sm">No failed network requests captured.</div>';
      }

      // Reset to first tab
      switchTab('actions');
    }

    function switchTab(tabName) {
      // Hide all panels
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      
      // Remove active tab button classes
      const btns = {
        actions: 'tab-btn-actions',
        console: 'tab-btn-console',
        network: 'tab-btn-network'
      };
      
      Object.entries(btns).forEach(([key, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (key === tabName) {
          btn.className = 'pb-3 border-b-2 border-cyan-500 text-cyan-400 transition-colors';
          document.getElementById(\`tab-panel-\${key}\`).classList.remove('hidden');
        } else {
          btn.className = 'pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-300 transition-colors';
        }
      });
    }

    function toggleNetworkDetails(elementId) {
      const el = document.getElementById(elementId);
      if (el) {
        el.classList.toggle('hidden');
      }
    }
  </script>
</body>
</html>
`;

  writeFileSync(outputPath, html, 'utf-8');
}
