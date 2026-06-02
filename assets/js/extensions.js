// Extensions System
const EXTENSIONS = {
    'live-preview': { id: 'live-preview', title: 'Live Preview', desc: 'Split screen HTML preview', icon: 'fa-eye' },
    'console': { id: 'console', title: 'Developer Console', desc: 'Built-in console for JS logs', icon: 'fa-terminal' },
    'formatter': { id: 'formatter', title: 'Code Formatter', desc: 'Format messy code (Prettier)', icon: 'fa-wand-magic-sparkles' },
    'linter': { id: 'linter', title: 'Live Code Linter', desc: 'Real-time syntax checking (Red squiggles)', icon: 'fa-spell-check' },
    'color-picker': { id: 'color-picker', title: 'Smart Color Picker', desc: 'Visual color editor for CSS', icon: 'fa-palette' }
};

let enabledExtensions = JSON.parse(localStorage.getItem('formatek_extensions') || '[]');

window.isExtEnabled = function(id) { 
    return enabledExtensions.includes(id); 
};

window.toggleExt = function(id) {
    if (window.isExtEnabled(id)) {
        enabledExtensions = enabledExtensions.filter(e => e !== id);
    } else {
        enabledExtensions.push(id);
    }
    localStorage.setItem('formatek_extensions', JSON.stringify(enabledExtensions));
    window.renderExtensions();
    if (typeof window.applyExtensions === 'function') {
        window.applyExtensions();
    }
};

window.renderExtensions = function() {
    const container = document.getElementById('extensions-container');
    if (!container) return;
    container.innerHTML = '';
    Object.values(EXTENSIONS).forEach(ext => {
        const enabled = window.isExtEnabled(ext.id);
        // Uses i18n text if available by rendering inner div with data-i18n
        container.innerHTML += `
            <div class="extension-card d-flex align-items-center gap-3">
                <div class="extension-icon"><i class="fa-solid ${ext.icon}"></i></div>
                <div class="flex-grow-1">
                    <div class="extension-title" data-i18n="${ext.id}">${ext.title}</div>
                    <div class="extension-desc" data-i18n="${ext.id}_desc">${ext.desc}</div>
                </div>
                <button class="btn btn-sm ${enabled ? 'btn-outline-danger' : 'btn-success'} btn-install" onclick="window.toggleExt('${ext.id}')">
                    ${enabled ? (document.documentElement.lang === 'ar' ? 'إزالة' : document.documentElement.lang === 'fr' ? 'Désinstaller' : 'Disable') : (document.documentElement.lang === 'ar' ? 'تثبيت' : document.documentElement.lang === 'fr' ? 'Installer' : 'Enable')}
                </button>
            </div>
        `;
    });
};

document.addEventListener('DOMContentLoaded', () => {
    window.renderExtensions();
});
