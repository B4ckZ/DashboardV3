// widgets/mqttlogs509511/mqttlogs509511.js - Widget MQTT Logs V4
// Version modifiée pour afficher uniquement les résultats confirmés
// ==============================================================

window.mqttlogs509511 = (function() {
    'use strict';
    
    const widgetId = 'mqttlogs509511';
    let widgetElement = null;
    let logsContainer = null;
    let logs = [];
    const MAX_LOGS = 50;
    const MACHINES = ['509', '511'];
    
    /**
     * Initialise le widget
     */
    function init(element) {
        console.log(`[${widgetId}] Initialisation`);
        widgetElement = element;
        
        // Charger le HTML
        fetch('widgets/mqttlogs509511/mqttlogs509511.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                logsContainer = widgetElement.querySelector('.logs-container');
                
                if (!logsContainer) {
                    console.error(`[${widgetId}] Container des logs non trouvé`);
                    return;
                }
                
                // Message initial
                addSystemMessage("En attente des résultats confirmés...");
                
                // S'abonner aux topics de confirmation MQTT
                if (window.orchestrator && window.orchestrator.subscribeToTopic) {
                    // S'abonner aux résultats confirmés pour les machines 509 et 511
                    MACHINES.forEach(machine => {
                        const topic = `SOUFFLAGE/${machine}/ESP32/result/confirmed`;
                        window.orchestrator.subscribeToTopic(topic, handleConfirmedResult);
                        console.log(`[${widgetId}] Abonné au topic: ${topic}`);
                    });
                } else {
                    console.error(`[${widgetId}] Orchestrateur non disponible`);
                    addSystemMessage("Erreur: Système MQTT non disponible", 'error');
                }
            })
            .catch(error => {
                console.error(`[${widgetId}] Erreur lors du chargement:`, error);
            });
    }
    
    /**
     * Gère la réception d'un résultat confirmé
     */
    function handleConfirmedResult(topic, data) {
        console.log(`[${widgetId}] Résultat confirmé reçu:`, topic, data);
        
        try {
            // Extraire l'ID de la machine du topic
            const topicParts = topic.split('/');
            const machineId = topicParts[1];
            
            // Vérifier que c'est bien une de nos machines
            if (!MACHINES.includes(machineId)) {
                return;
            }
            
            // Créer l'entrée de log
            const logEntry = {
                id: Date.now(),
                timestamp: data.timestamp || new Date().toISOString(),
                machine: machineId,
                team: data.team || '?',
                barcode: data.barcode || 'Non scanné',
                result: data.result || 'Inconnu',
                confirmed: true
            };
            
            // Ajouter le log
            addLog(logEntry);
            
        } catch (error) {
            console.error(`[${widgetId}] Erreur lors du traitement:`, error);
        }
    }
    
    /**
     * Ajoute un log à l'affichage
     */
    function addLog(logEntry) {
        // Ajouter au début de la liste
        logs.unshift(logEntry);
        
        // Limiter le nombre de logs
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(0, MAX_LOGS);
        }
        
        // Créer l'élément HTML
        const logElement = createLogElement(logEntry);
        
        // Retirer le message initial s'il existe
        const systemMsg = logsContainer.querySelector('.system-message');
        if (systemMsg) {
            systemMsg.remove();
        }
        
        // Ajouter au début du container
        if (logsContainer.firstChild) {
            logsContainer.insertBefore(logElement, logsContainer.firstChild);
        } else {
            logsContainer.appendChild(logElement);
        }
        
        // Retirer les anciens logs si nécessaire
        while (logsContainer.children.length > MAX_LOGS) {
            logsContainer.removeChild(logsContainer.lastChild);
        }
        
        // Animation d'entrée
        setTimeout(() => {
            logElement.classList.add('show');
        }, 10);
    }
    
    /**
     * Crée l'élément HTML pour un log
     */
    function createLogElement(log) {
        const div = document.createElement('div');
        div.className = 'log-line';
        div.classList.add(getResultClass(log.result));
        
        // Formater la date et l'heure
        const [date, time] = formatTimestamp(log.timestamp);
        
        // Créer le contenu HTML
        div.innerHTML = `
            <span class="log-date">${date}</span>
            <span class="log-time">${time}</span>
            <span class="log-device">${log.machine}</span>
            <span class="log-id">${log.barcode}</span>
            <div class="status-indicator ${getStatusClass(log.result)}">${getStatusText(log.result)}</div>
        `;
        
        return div;
    }
    
    /**
     * Formate le timestamp
     */
    function formatTimestamp(timestamp) {
        try {
            // Le timestamp est au format "DD-MM-YYYYTHH:mm:ss"
            const [datePart, timePart] = timestamp.split('T');
            const time = timePart ? timePart.substring(0, 5) : '00:00';
            return [datePart, time];
        } catch (e) {
            return ['--/--/----', '--:--'];
        }
    }
    
    /**
     * Retourne la classe CSS pour le résultat
     */
    function getResultClass(result) {
        switch (result.toUpperCase()) {
            case 'OK':
            case 'POCHE OK':
                return '';
            case 'FUITE VANNE':
            case 'FV':
                return 'log-fuite-vanne';
            case 'FUITE POCHE':
            case 'FP':
                return 'log-fuite-poche';
            default:
                return 'log-unknown';
        }
    }
    
    /**
     * Retourne la classe CSS pour l'indicateur de statut
     */
    function getStatusClass(result) {
        switch (result.toUpperCase()) {
            case 'OK':
            case 'POCHE OK':
                return 'status-ok';
            case 'FUITE VANNE':
            case 'FV':
                return 'status-fuite-vanne';
            case 'FUITE POCHE':
            case 'FP':
                return 'status-fuite-poche';
            default:
                return 'status-unknown';
        }
    }
    
    /**
     * Retourne le texte court pour le statut
     */
    function getStatusText(result) {
        switch (result.toUpperCase()) {
            case 'OK':
            case 'POCHE OK':
                return 'OK';
            case 'FUITE VANNE':
            case 'FV':
                return 'FV';
            case 'FUITE POCHE':
            case 'FP':
                return 'FP';
            default:
                return '?';
        }
    }
    
    /**
     * Ajoute un message système
     */
    function addSystemMessage(message, type = 'info') {
        const div = document.createElement('div');
        div.className = `system-message ${type}`;
        div.textContent = message;
        
        if (logsContainer) {
            logsContainer.innerHTML = '';
            logsContainer.appendChild(div);
        }
    }
    
    /**
     * Destruction du widget
     */
    function destroy() {
        console.log(`[${widgetId}] Destruction`);
        
        if (window.orchestrator) {
            MACHINES.forEach(machine => {
                const topic = `SOUFFLAGE/${machine}/ESP32/result/confirmed`;
                // Note: unsubscribe si la méthode existe
                if (window.orchestrator.unsubscribeFromTopic) {
                    window.orchestrator.unsubscribeFromTopic(topic);
                }
            });
        }
        
        logs = [];
        if (logsContainer) {
            logsContainer.innerHTML = '';
        }
    }
    
    // API publique
    return {
        init: init,
        destroy: destroy
    };
})();