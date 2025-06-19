// widgets/downloadinfo/downloadinfo.js - Widget DownloadInfo
// ==========================================================

window.downloadinfo = (function() {
    let widgetElement;
    let downloadinfoElement;
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/downloadinfo/downloadinfo.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                downloadinfoElement = widgetElement.querySelector('[data-metric="downloadinfo"]');
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('downloadinfo', {
                        update: updateValue
                    }, ['download.info']);
                }
                
                // Afficher une date par défaut pour test
                updateTestDate();
            });
    }
    
    function updateValue(topic, data) {
        if (topic === 'download.info' && downloadinfoElement) {
            downloadinfoElement.textContent = data.date || data.formatted || data;
            downloadinfoElement.classList.add('downloadinfo-value-stable');
        }
    }
    
    // Fonction temporaire pour afficher une date de test
    function updateTestDate() {
        if (downloadinfoElement) {
            const now = new Date();
            const formatted = now.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            downloadinfoElement.textContent = formatted;
            downloadinfoElement.classList.add('downloadinfo-value-stable');
        }
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('downloadinfo');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();