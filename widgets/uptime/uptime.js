// Uptime Widget
window.uptime = (function() {
    let widgetElement;
    let uptimeElement;
	const widgetId = 'Analyse du temps d\'exécution';
    
    function init(element) {
		console.log(`✅​️ ${widgetId} initialisé.​`);
        widgetElement = element;
        
        fetch('widgets/uptime/uptime.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                uptimeElement = widgetElement.querySelector('[data-metric="uptime"]');
                
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('uptime', {
                        update: updateValue
                    }, ['system.uptime']);
                }
            });
    }
    
    function updateValue(topic, data) {
        if (topic === 'system.uptime' && uptimeElement) {
            // Utiliser data.value qui contient les secondes
            if (data.value && !isNaN(data.value)) {
                uptimeElement.textContent = formatUptime(data.value);
            } else {
                uptimeElement.textContent = "00j 00h 00m 00s";
            }
        }
    }
    
    function formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${days.toString().padStart(2, '0')}j ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('uptime');
        }
    }
    
    return { init, destroy };
})();