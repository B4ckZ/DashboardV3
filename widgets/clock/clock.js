// widgets/clock/clock.js - Widget Clock V3
// ========================================

window.clock = (function() {
    let widgetElement;
    let elements = {};
    let clockInterval;
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/clock/clock.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer les éléments
                elements.time = widgetElement.querySelector('.clock-time');
                elements.date = widgetElement.querySelector('.clock-date');
                elements.status = widgetElement.querySelector('.connection-status');
                
                // Démarrer l'horloge
                updateClock();
                clockInterval = setInterval(updateClock, 1000);
                
                // Enregistrer pour recevoir le statut de connexion
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('clock', {
                        update: updateStatus
                    }, []);
                }
            });
    }
    
    function updateClock() {
        const now = new Date();
        
        if (elements.time) {
            elements.time.textContent = now.toLocaleTimeString('fr-FR');
        }
        
        if (elements.date) {
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            elements.date.textContent = now.toLocaleDateString('fr-FR', options);
        }
    }
    
    function updateStatus(topic, data) {
        // Peut être utilisé pour afficher le statut de connexion MQTT
        if (elements.status) {
            elements.status.classList.toggle('connected', window.orchestrator.connected);
        }
    }
    
    function destroy() {
        if (clockInterval) {
            clearInterval(clockInterval);
        }
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('clock');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();