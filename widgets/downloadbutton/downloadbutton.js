// widgets/downloadbutton/downloadbutton.js - Widget Download Button V3
// ===================================================================

window.downloadbutton = (function() {
    let widgetElement;
    let elements = {};
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/downloadbutton/downloadbutton.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                elements.button = widgetElement.querySelector('.download-button');
                elements.menu = widgetElement.querySelector('.download-menu');
                elements.menuItems = widgetElement.querySelectorAll('.download-menu-item');
                
                // Événements
                if (elements.button) {
                    elements.button.addEventListener('click', toggleMenu);
                }
                
                if (elements.menuItems) {
                    elements.menuItems.forEach(item => {
                        item.addEventListener('click', () => handleDownload(item.dataset.type));
                    });
                }
                
                // Fermer le menu si on clique ailleurs
                document.addEventListener('click', (e) => {
                    if (!widgetElement.contains(e.target)) {
                        hideMenu();
                    }
                });
            });
    }
    
    function toggleMenu() {
        if (elements.menu) {
            const isVisible = elements.menu.style.display === 'block';
            elements.menu.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    function hideMenu() {
        if (elements.menu) {
            elements.menu.style.display = 'none';
        }
    }
    
    function handleDownload(type) {
        hideMenu();
        
        // Feedback visuel
        if (elements.button) {
            elements.button.classList.add('downloading');
            elements.button.textContent = 'Téléchargement...';
        }
        
        // Simuler le téléchargement selon le type
        switch(type) {
            case 'logs':
                downloadLogs();
                break;
            case 'config':
                downloadConfig();
                break;
            case 'data':
                downloadData();
                break;
            default:
                console.log('Unknown download type:', type);
        }
        
        // Restaurer le bouton après 2 secondes
        setTimeout(() => {
            if (elements.button) {
                elements.button.classList.remove('downloading');
                elements.button.textContent = 'Télécharger';
            }
        }, 2000);
    }
    
    function downloadLogs() {
        // Créer un lien de téléchargement pour les logs
        const link = document.createElement('a');
        link.href = '/download/logs/system.log';
        link.download = `maxlink_logs_${new Date().toISOString()}.log`;
        link.click();
    }
    
    function downloadConfig() {
        // Créer un lien de téléchargement pour la config
        const link = document.createElement('a');
        link.href = '/download/config/maxlink.conf';
        link.download = 'maxlink_config.conf';
        link.click();
    }
    
    function downloadData() {
        // Créer un lien de téléchargement pour les données
        const link = document.createElement('a');
        link.href = '/download/data/test_results.json';
        link.download = `test_results_${new Date().toISOString()}.json`;
        link.click();
    }
    
    function destroy() {
        // Pas de nettoyage nécessaire pour ce widget
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();