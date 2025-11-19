// components/file-card.js

class CustomFileCard extends HTMLElement {
    static get observedAttributes() {
        return ['status'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'status' && oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const name = this.getAttribute('name') || 'Untitled';
        const status = this.getAttribute('status') || 'pending';

        let statusText, statusColor, iconName;

        switch (status) {
            case 'pending':
                statusText = 'Analyzing...';
                statusColor = 'bg-yellow-500';
                iconName = 'clock';
                break;
            case 'safe':
                statusText = 'Secure';
                statusColor = 'bg-green-500';
                iconName = 'check-circle';
                break;
            case 'vulnerable':
                statusText = 'Vulnerable';
                statusColor = 'bg-red-500';
                iconName = 'alert-triangle';
                break;
            case 'error':
                statusText = 'Error';
                statusColor = 'bg-gray-500';
                iconName = 'x-circle';
                break;
            default:
                statusText = 'Unknown';
                statusColor = 'bg-gray-500';
                iconName = 'help-circle';
        }

        // --- IMPROVED ICON RENDERING ---
        // Generates the SVG string directly, which is more reliable in Shadow DOM.
        const getIcon = (name, options = {}) => {
            if (feather.icons[name]) {
                return feather.icons[name].toSvg(options);
            }
            return ''; // Return empty string if icon not found
        };
        
        const headerIcon = getIcon(iconName, { class: 'mr-1', width: 14, height: 14 });
        const bodyIcon = getIcon(status === 'pending' ? 'code' : iconName, { class: 'icon', width: 48, height: 48 });

        this.shadowRoot.innerHTML = `
            <style>
                /* Tailwind-like styles for encapsulation */
                :host { display: block; }
                .mr-1 { margin-right: 0.25rem; }
                .mb-4 { margin-bottom: 1rem; }
                .card { background-color: white; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: all 0.3s ease; }
                .card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
                .card-header { padding: 1.5rem; border-bottom: 1px solid #e5e7eb; }
                .card-title { font-size: 1.25rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .card-body { padding: 1.5rem; display: flex; flex-direction: column; align-items: center; }
                .status { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; color: white; }
                .bg-yellow-500 { background-color: #f59e0b; }
                .bg-green-500 { background-color: #22c55e; }
                .bg-red-500 { background-color: #ef4444; }
                .bg-gray-500 { background-color: #6b7280; }
                .icon { color: #3b82f6; }
                .progress-bar { width: 100%; height: 0.5rem; background-color: #e5e7eb; border-radius: 0.25rem; overflow: hidden; margin-top: 1rem; }
                .progress { height: 100%; background-color: #3b82f6; transition: width 0.5s ease; }
                .progress-pending { width: 50%; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                .progress-done { width: 100%; }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            </style>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">${name}</h3>
                    <div class="status ${statusColor}">
                        ${headerIcon}
                        <span>${statusText}</span>
                    </div>
                </div>
                <div class="card-body">
                    ${bodyIcon}
                    <div class="progress-bar">
                        <div class="progress ${status === 'pending' ? 'progress-pending' : 'progress-done'}"></div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('custom-file-card', CustomFileCard);