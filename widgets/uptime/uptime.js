// widgets/uptime/uptime.js - Widget Uptime V3
// ===========================================

window.uptime = (function() {
    let widgetElement;
    let uptimeElement;
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget (identique à V1)
        fetch('widgets/uptime/uptime.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                uptimeElement = widgetElement.querySelector('[data-metric="uptime"]');
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('uptime', {
                        update: updateValue
                    }, ['system.uptime']);
                }
            });
    }
    
    function updateValue(topic, data) {
        if (topic === 'system.uptime' && uptimeElement) {
            uptimeElement.textContent = data.formatted;
            uptimeElement.classList.add('uptime-value-stable');
        }
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('uptime');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();