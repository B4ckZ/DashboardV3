// widgets/mqttstats/mqttstats.js - Widget MQTT Stats V3
// =====================================================

window.mqttstats = (function() {
    let widgetElement;
    let elements = {};
    let currentTopics = [];
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/mqttstats/mqttstats.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer les éléments avec data-metric
                elements = {
                    messagesReceived: widgetElement.querySelector('[data-metric="mqtt-messages-received"]'),
                    messagesSent: widgetElement.querySelector('[data-metric="mqtt-messages-sent"]'),
                    uptime: widgetElement.querySelector('[data-metric="mqtt-uptime"]'),
                    latency: widgetElement.querySelector('[data-metric="mqtt-latency"]'),
                    statusIndicator: widgetElement.querySelector('#mqtt-status-indicator'),
                    topicsContainer: widgetElement.querySelector('#mqtt-topics-container')
                };
                
                // Ajouter les classes de stabilisation
                if (elements.messagesReceived) {
                    elements.messagesReceived.classList.add('mqtt-stats-value-stable');
                }
                if (elements.messagesSent) {
                    elements.messagesSent.classList.add('mqtt-stats-value-stable');
                }
                if (elements.uptime) {
                    elements.uptime.classList.add('mqtt-info-value-stable');
                }
                if (elements.latency) {
                    elements.latency.classList.add('mqtt-info-value-stable');
                }
                
                console.log('MQTT Stats elements:', elements);
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('mqttstats', {
                        update: updateData
                    }, [
                        'network.mqtt.stats',
                        'network.mqtt.topics'
                    ]);
                }
            });
    }
    
    function updateData(topic, data) {
        console.log('MQTT Stats update:', topic, data);
        
        if (topic === 'network.mqtt.stats') {
            updateStats(data);
        }
        else if (topic === 'network.mqtt.topics') {
            updateTopics(data);
        }
    }
    
    function updateStats(data) {
        // Messages reçus
        if (elements.messagesReceived && data.messages_received !== undefined) {
            elements.messagesReceived.textContent = formatNumber(data.messages_received);
        }
        
        // Messages envoyés
        if (elements.messagesSent && data.messages_sent !== undefined) {
            elements.messagesSent.textContent = formatNumber(data.messages_sent);
        }
        
        // Uptime
        if (elements.uptime && data.uptime !== undefined) {
            // L'uptime peut être un objet ou déjà formaté
            if (typeof data.uptime === 'object') {
                const u = data.uptime;
                elements.uptime.textContent = `${pad(u.days)}j ${pad(u.hours)}h ${pad(u.minutes)}m ${pad(u.seconds)}s`;
            } else if (data.uptime_seconds !== undefined) {
                // Calculer depuis les secondes
                const seconds = data.uptime_seconds;
                const d = Math.floor(seconds / 86400);
                const h = Math.floor((seconds % 86400) / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = seconds % 60;
                elements.uptime.textContent = `${pad(d)}j ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
            }
        }
        
        // Latence
        if (elements.latency && data.latency_ms !== undefined) {
            elements.latency.textContent = `${data.latency_ms}ms`;
        }
        
        // Status indicator
        if (elements.statusIndicator && data.status !== undefined) {
            elements.statusIndicator.classList.remove('status-ok', 'status-error');
            elements.statusIndicator.classList.add(data.status === 'ok' ? 'status-ok' : 'status-error');
        }
    }
    
    function updateTopics(data) {
        if (!elements.topicsContainer) return;
        
        const topics = data.topics || [];
        
        // Si pas de changement, ne pas reconstruire
        if (JSON.stringify(topics) === JSON.stringify(currentTopics)) {
            return;
        }
        
        currentTopics = [...topics];
        
        // Vider et reconstruire
        elements.topicsContainer.innerHTML = '';
        
        if (topics.length === 0) {
            elements.topicsContainer.innerHTML = '<div class="mqtt-topic">Aucun topic actif</div>';
            return;
        }
        
        // Créer les éléments de topic
        topics.forEach((topic, index) => {
            if (index >= 15) return; // Limiter à 15 topics
            
            const topicElement = document.createElement('div');
            topicElement.className = 'mqtt-topic';
            topicElement.textContent = topic;
            
            // Animation d'entrée
            topicElement.style.opacity = '0';
            topicElement.style.transform = 'translateY(10px)';
            
            elements.topicsContainer.appendChild(topicElement);
            
            // Déclencher l'animation
            setTimeout(() => {
                topicElement.style.transition = 'all 0.3s ease';
                topicElement.style.opacity = '1';
                topicElement.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }
    
    function formatNumber(num) {
        // Formater les grands nombres
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    function pad(num) {
        return num.toString().padStart(2, '0');
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('mqttstats');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();