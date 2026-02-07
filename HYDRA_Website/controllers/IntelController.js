class IntelController {
    constructor(model, view) {
        this.model = model;
        // View is the document/DOM interactions in this simple case
    }

    async init() {
        console.log('Intel Controller Initialized');

        // 1. Load Feeds
        this.loadAbuseIPDBFeed();
        this.loadOTXFeed();

        // 2. Bind VirusTotal Manual Lookup
        const vtBtn = document.getElementById('vt-lookup-btn');
        if (vtBtn) {
            vtBtn.addEventListener('click', () => this.handleVTLookup());
        }
    }

    async loadAbuseIPDBFeed() {
        const container = document.getElementById('abuseipdb-feed');
        if (!container) return;

        container.innerHTML = '<div class="text-center py-4"><i data-feather="loader" class="animate-spin w-4 h-4 mx-auto"></i></div>';
        if (window.feather) feather.replace();

        // Bypass API for debugging
        let data = await this.model.apiService.fetchAbuseIPDBFeed();

        // Force Mock Data
        // let data = { ... }

        // Fallback to mock data if API fails (for demo/offline)
        if (!data || !data.data) {
            data = {
                data: [
                    { ip: '192.168.1.100', score: 95, country: 'US', reportDate: new Date() },
                    { ip: '10.0.0.5', score: 88, country: 'CN', reportDate: new Date() },
                    { ip: '172.16.0.1', score: 75, country: 'RU', reportDate: new Date() }
                ]
            };
        }

        if (data && data.data) {
            container.innerHTML = ''; // Clear loading
            data.data.forEach(item => {
                const el = document.createElement('div');
                el.className = 'border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0';
                el.innerHTML = `
                    <div class="flex justify-between items-start">
                        <p class="font-mono break-all font-bold text-teal-600 dark:text-teal-400">${item.ip}</p>
                        <span class="text-xs bg-red-100 text-red-800 px-1 rounded">${item.score}% Confidence</span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Country: ${item.country || 'N/A'} • Reported: ${new Date(item.reportDate).toLocaleDateString()}</p>
                `;
                container.appendChild(el);
            });
        }
    }

    async loadOTXFeed() {
        const container = document.getElementById('otx-feed');
        if (!container) return;

        container.innerHTML = '<div class="text-center py-4"><i data-feather="loader" class="animate-spin w-4 h-4 mx-auto"></i></div>';
        if (window.feather) feather.replace();

        // Bypass API for debugging
        let data = await this.model.apiService.fetchOTXFeed();

        // Force Mock Data
        // let data = { ... }

        // Fallback to mock data if API fails (for demo/offline)
        if (!data || !data.data) {
            data = {
                data: [
                    { name: 'Mock Pulse: Ransomware Wave', author: 'AlienVault', created: new Date(), tags: ['ransomware', 'malware'] },
                    { name: 'Mock Pulse: Java Exploit', author: 'System', created: new Date(), tags: ['cve', 'exploit'] }
                ]
            };
        }

        if (data && data.data) {
            container.innerHTML = '';
            data.data.forEach(item => {
                const el = document.createElement('div');
                el.className = 'border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0';
                el.innerHTML = `
                    <div class="flex justify-between items-start">
                        <p class="font-bold text-sm truncate w-3/4">${item.name}</p>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">By ${item.author} • ${new Date(item.created).toLocaleDateString()}</p>
                    <div class="mt-1 flex gap-1 flex-wrap">
                        ${(item.tags || []).map(t => `<span class="text-[10px] bg-gray-100 dark:bg-gray-700 px-1 rounded">${t}</span>`).join('')}
                    </div>
                `;
                container.appendChild(el);
            });
        }
    }

    async handleVTLookup() {
        const input = document.getElementById('vt-input');
        const resultDiv = document.getElementById('vt-result');
        const hash = input.value.trim();

        if (!hash) return;

        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = '<i data-feather="loader" class="animate-spin w-4 h-4 mr-2"></i> Checking...';
        if (window.feather) feather.replace();

        const data = await this.model.apiService.fetchVirusTotal('hash', hash);

        if (data.error) {
            resultDiv.innerHTML = `<span class="text-red-500 text-sm">Error: ${data.error}</span>`;
        } else {
            const risk = data.risk;
            let color = 'text-green-500';
            if (risk === 'high') color = 'text-red-500';
            if (risk === 'medium') color = 'text-orange-500';

            resultDiv.innerHTML = `
                <div class="mt-2 text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
                    <p class="font-bold ${color} capitalize">Risk: ${risk}</p>
                    <p class="text-gray-500 text-xs">${data.summary}</p>
                </div>
            `;
        }
    }
}
