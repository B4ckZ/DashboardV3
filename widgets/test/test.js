/**
 * Widget Test - Fenêtre de log pour les métriques MQTT
 */
window.test = (function() {
    'use strict';
    
    const widgetId = 'test';
    let widgetElement = null;
    let logContainer = null;
    let maxLogs = 50; // Nombre maximum de logs à conserver
    let autoScroll = true;
    

    
    /**
     * Formate le timestamp
     */
    function formatTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `[${hours}:${minutes}:${seconds}]`;
    }
    
    /**
     * Ajoute une entrée dans le log
     */
    function addLogEntry(topic, value, type = 'info') {
        if (!logContainer) return;
        
        const entry = document.createElement('div');
        entry.className = `test-log-entry ${type}`;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'test-log-timestamp';
        timestamp.textContent = formatTimestamp();
        
        const topicSpan = document.createElement('span');
        topicSpan.className = 'test-log-topic';
        topicSpan.textContent = topic;
        
        const separator = document.createElement('span');
        separator.textContent = ': ';
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'test-log-value';
        valueSpan.textContent = value;
        
        entry.appendChild(timestamp);
        entry.appendChild(topicSpan);
        entry.appendChild(separator);
        entry.appendChild(valueSpan);
        
        logContainer.appendChild(entry);
        
        // Limiter le nombre de logs
        while (logContainer.children.length > maxLogs) {
            logContainer.removeChild(logContainer.firstChild);
        }
        
        // Auto-scroll vers le bas
        if (autoScroll) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    
    /**
     * Initialisation du widget
     */
    function init(element) {
        console.log(`[${widgetId}] Initialisation`);
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/test/test.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Maintenant récupérer le container de log
                logContainer = widgetElement.querySelector('#test-log-content');
                
                if (!logContainer) {
                    console.error(`[${widgetId}] Container de log non trouvé`);
                    return;
                }
                
                // Détection du scroll manuel
                logContainer.addEventListener('scroll', () => {
                    const isAtBottom = logContainer.scrollHeight - logContainer.scrollTop <= logContainer.clientHeight + 5;
                    autoScroll = isAtBottom;
                });
                
                // Message de démarrage
                addLogEntry('test/init', 'Widget Test MQTT initialisé', 'success');
                addLogEntry('broker/status', 'En attente de connexion...', 'info');
                
                // Ecouter les messages MQTT réels si disponibles
                if (window.orchestrator && window.orchestrator.subscribeToTopic) {
                    // S'abonner à tous les topics de test
                    window.orchestrator.subscribeToTopic('test/#', (topic, message) => {
                        try {
                            const data = JSON.parse(message);
                            addLogEntry(topic, JSON.stringify(data), 'info');
                        } catch (e) {
                            addLogEntry(topic, message, 'info');
                        }
                    });
                    
                    // S'abonner aux métriques système
                    window.orchestrator.subscribeToTopic('system/#', (topic, message) => {
                        addLogEntry(topic, message, 'info');
                    });
                    
                    console.log(`[${widgetId}] Abonné aux topics MQTT`);
                }
            })
            .catch(error => {
                console.error(`[${widgetId}] Erreur lors du chargement du HTML:`, error);
            });
    }
    
    // Fonction destroy pour le nettoyage
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget(widgetId);
        }
    }
    
    // Retourner l'API publique du widget
    return {
        init: init,
        destroy: destroy,
        addLog: addLogEntry,
        clear: () => {
            if (logContainer) {
                logContainer.innerHTML = '';
                addLogEntry('test/clear', 'Logs effacés', 'info');
            }
        },
        setMaxLogs: (max) => {
            maxLogs = max;
            addLogEntry('test/config', `Nombre max de logs: ${max}`, 'info');
        }
    };
})();