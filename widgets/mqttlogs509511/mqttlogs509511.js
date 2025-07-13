// widgets/mqttlogs509511/mqttlogs509511.js - Widget MQTT Logs V5
// Version modifiée pour lire depuis les fichiers CSV persistés
// Topic unique : SOUFFLAGE/ESP32/RTP/CONFIRMED
// ==============================================================

window.mqttlogs509511 = (function() {
    'use strict';
    
    const widgetId = 'mqttlogs509511';
    let widgetElement = null;
    let logsContainer = null;
    let logs = [];
    const MAX_LOGS = 50;
    const TARGET_MACHINES = ['509', '511']; // Machines à afficher
    
    /**
     * Initialise le widget
     */
    function init(element) {
        console.log(`[${widgetId}] Initialisation - Version CSV sécurisée`);
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
                addSystemMessage("En attente des résultats confirmés et persistés...");
                
                // S'abonner au topic unique de confirmation CSV
                if (window.orchestrator && window.orchestrator.subscribeToTopic) {
                    // NOUVEAU: Topic unique pour toutes les machines
                    const topic = "SOUFFLAGE/ESP32/RTP/CONFIRMED";
                    window.orchestrator.subscribeToTopic(topic, handleConfirmedResult);
                    console.log(`[${widgetId}] Abonné au topic unique: ${topic}`);
                    console.log(`[${widgetId}] Filtrage pour machines: ${TARGET_MACHINES.join(', ')}`);
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
     * Gère la réception d'un résultat confirmé et persisté
     */
    function handleConfirmedResult(topic, data) {
        console.log(`[${widgetId}] Résultat confirmé reçu:`, topic, data);
        
        try {
            // Les données arrivent directement en format CSV string
            const csv_line = typeof data === 'string' ? data.trim() : data.toString().trim();
            console.log(`[${widgetId}] Ligne CSV reçue: "${csv_line}"`);
            
            // Parser la ligne CSV: date,heure,équipe,codebarre,résultat
            const csv_fields = csv_line.split(',');
            
            if (csv_fields.length !== 5) {
                console.error(`[${widgetId}] Format CSV invalide: ${csv_fields.length} champs au lieu de 5`);
                return;
            }
            
            const [date, heure, equipe, codebarre, resultat] = csv_fields;
            
            // NOUVEAU: Extraire l'ID machine du code-barres (positions 7,8,9)
            if (codebarre.length < 9) {
                console.error(`[${widgetId}] Code-barres trop court: ${codebarre}`);
                return;
            }
            
            const machineId = codebarre.substring(6, 9); // Positions 7,8,9 (indices 6,7,8)
            console.log(`[${widgetId}] Machine extraite du code-barres: "${machineId}"`);
            
            // NOUVEAU: Filtrer uniquement les machines 509 et 511
            if (!TARGET_MACHINES.includes(machineId)) {
                console.log(`[${widgetId}] Machine ${machineId} filtrée (non ciblée)`);
                return;
            }
            
            // Convertir le résultat numérique en texte
            const resultText = getResultText(resultat);
            
            // Créer l'entrée de log avec timestamp formaté
            const logEntry = {
                id: Date.now(),
                timestamp: formatTimestamp(date, heure),
                machine: machineId,
                team: equipe || '?',
                barcode: codebarre,
                result: resultText,
                confirmed: true
            };
            
            console.log(`[${widgetId}] Entrée de log créée:`, logEntry);
            
            // Ajouter le log
            addLog(logEntry);
            
        } catch (error) {
            console.error(`[${widgetId}] Erreur lors du traitement:`, error);
        }
    }
    
    /**
     * Convertit le résultat numérique en texte
     */
    function getResultText(resultat) {
        switch (resultat.toString().trim()) {
            case '0':
                return 'OK';
            case '1':
                return 'FUITE VANNE';
            case '2':
                return 'FUITE POCHE';
            default:
                return resultat; // Garder tel quel si pas reconnu
        }
    }
    
    /**
     * Formate le timestamp à partir de date et heure CSV
     */
    function formatTimestamp(date, heure) {
        // Format attendu: date="08/07/2025", heure="14H46"
        // Convertir en format pour affichage: "08-07-2025T14:46:00"
        try {
            const dateParts = date.split('/');
            if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                const timePart = heure.replace('H', ':') + ':00';
                return `${day}-${month}-${year}T${timePart}`;
            }
        } catch (e) {
            console.warn(`[${widgetId}] Erreur formatage timestamp:`, e);
        }
        
        // Fallback
        return `${date}T${heure}`;
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
        
        // Formater la date et l'heure pour affichage
        const [date, time] = formatTimestampForDisplay(log.timestamp);
        
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
     * Formate le timestamp pour l'affichage
     */
    function formatTimestampForDisplay(timestamp) {
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
            // Se désabonner du topic unique
            const topic = "SOUFFLAGE/ESP32/RTP/CONFIRMED";
            // Note: unsubscribe si la méthode existe
            if (window.orchestrator.unsubscribeFromTopic) {
                window.orchestrator.unsubscribeFromTopic(topic);
            }
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