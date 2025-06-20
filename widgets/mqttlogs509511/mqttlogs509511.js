// widgets/mqttlogs509511/mqttlogs509511.js - Widget MQTT Logs V3
// ==============================================================

window.mqttlogs509511 = (function() {
    let widgetElement;
    let elements = {};
    let logs = [];
    const MAX_LOGS = 100;
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/mqttlogs509511/mqttlogs509511.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                elements.logContainer = widgetElement.querySelector('.mqtt-logs-container');
                elements.logCount = widgetElement.querySelector('.log-count');
                elements.clearButton = widgetElement.querySelector('.clear-logs-button');
                elements.filterButtons = widgetElement.querySelectorAll('.filter-button');
                
                // Événements
                if (elements.clearButton) {
                    elements.clearButton.addEventListener('click', clearLogs);
                }
                
                if (elements.filterButtons) {
                    elements.filterButtons.forEach(btn => {
                        btn.addEventListener('click', () => filterLogs(btn.dataset.filter));
                    });
                }
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('mqttlogs509511', {
                        update: addLog
                    }, ['test.result']);
                }
            });
    }
    
    function addLog(topic, data) {
        if (topic !== 'test.result') return;
        
        // Créer l'entrée de log
        const logEntry = {
            timestamp: new Date(),
            team: data.team || 'Unknown',
            barcode: data.barcode || 'N/A',
            result: data.result || 'Unknown',
            raw: data.raw || data
        };
        
        // Ajouter au début du tableau
        logs.unshift(logEntry);
        
        // Limiter le nombre de logs
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(0, MAX_LOGS);
        }
        
        // Mettre à jour l'affichage
        updateDisplay();
    }
    
    function updateDisplay() {
        if (!elements.logContainer) return;
        
        // Mettre à jour le compteur
        if (elements.logCount) {
            elements.logCount.textContent = logs.length;
        }
        
        // Reconstruire l'affichage des logs
        elements.logContainer.innerHTML = '';
        
        logs.forEach(log => {
            const logElement = createLogElement(log);
            elements.logContainer.appendChild(logElement);
        });
    }
    
    function createLogElement(log) {
        const div = document.createElement('div');
        div.className = `log-entry log-${getResultClass(log.result)}`;
        
        const time = log.timestamp.toLocaleTimeString('fr-FR');
        const date = log.timestamp.toLocaleDateString('fr-FR');
        
        div.innerHTML = `
            <div class="log-header">
                <span class="log-time">${time}</span>
                <span class="log-date">${date}</span>
                <span class="log-team">Équipe ${log.team}</span>
            </div>
            <div class="log-body">
                <span class="log-barcode">${log.barcode}</span>
                <span class="log-result ${getResultClass(log.result)}">${getResultText(log.result)}</span>
            </div>
        `;
        
        return div;
    }
    
    function getResultClass(result) {
        switch(result) {
            case '1':
            case 'OK':
                return 'success';
            case '2':
            case 'FV':
                return 'warning';
            case '3':
            case 'FP':
                return 'error';
            default:
                return 'unknown';
        }
    }
    
    function getResultText(result) {
        switch(result) {
            case '1':
            case 'OK':
                return '✓ OK';
            case '2':
            case 'FV':
                return '⚠ Fuite Vanne';
            case '3':
            case 'FP':
                return '✗ Fuite Poche';
            default:
                return '? Inconnu';
        }
    }
    
    function clearLogs() {
        logs = [];
        updateDisplay();
    }
    
    function filterLogs(filter) {
        // Mettre à jour les boutons actifs
        elements.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Appliquer le filtre (à implémenter selon les besoins)
        // Pour l'instant, on affiche tous les logs
        updateDisplay();
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('mqttlogs509511');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();