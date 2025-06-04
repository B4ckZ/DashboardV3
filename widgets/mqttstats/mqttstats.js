// widgets/mqttstats/mqttstats.js - Widget MQTT Stats V3
// =====================================================

window.mqttstats = (function() {
    let widgetElement;
    let elements = {};
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/mqttstats/mqttstats.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer les éléments
                elements = {
                    clients: widgetElement.querySelector('[data-metric="mqtt-clients"]'),
                    messagesReceived: widgetElement.querySelector('[data-metric="mqtt-messages-received"]'),
                    messagesSent: widgetElement.querySelector('[data-metric="mqtt-messages-sent"]'),
                    uptime: widgetElement.querySelector('[data-metric="mqtt-uptime"]'),
                    topicsList: widgetElement.querySelector('.mqtt-topics-list'),
                    topicsCount: widgetElement.querySelector('.topics-count')
                };
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('mqttstats', {
                        update: updateMetric
                    }, [
                        'mqtt.clients.connected',
                        'mqtt.messages.received',
                        'mqtt.messages.sent',
                        'mqtt.broker.uptime',
                        'network.mqtt.stats',
                        'network.mqtt.topics'
                    ]);
                }
            });
    }
    
    function updateMetric(topic, data) {
        switch(topic) {
            case 'mqtt.clients.connected':
                if (elements.clients) {
                    elements.clients.textContent = data.value || '0';
                }
                break;
                
            case 'mqtt.messages.received':
                if (elements.messagesReceived) {
                    elements.messagesReceived.textContent = formatNumber(data.value || 0);
                }
                break;
                
            case 'mqtt.messages.sent':
                if (elements.messagesSent) {
                    elements.messagesSent.textContent = formatNumber(data.value || 0);
                }
                break;
                
            case 'mqtt.broker.uptime':
                if (elements.uptime) {
                    elements.uptime.textContent = data.formatted || '--';
                }
                break;
                
            case 'network.mqtt.topics':
                if (data.topics) {
                    updateTopicsList(data.topics);
                }
                break;
                
            case 'network.mqtt.stats':
                if (data.stats) {
                    updateAllStats(data.stats);
                }
                break;
        }
    }
    
    function updateTopicsList(topics) {
        if (!elements.topicsList) return;
        
        // Mettre à jour le compteur
        if (elements.topicsCount) {
            elements.topicsCount.textContent = topics.length;
        }
        
        // Vider et reconstruire la liste
        elements.topicsList.innerHTML = '';
        
        topics.forEach(topic => {
            const item = document.createElement('div');
            item.className = 'topic-item';
            item.innerHTML = `
                <span class="topic-name">${topic.name}</span>
                <span class="topic-messages">${topic.messages || 0} msg</span>
            `;
            elements.topicsList.appendChild(item);
        });
    }
    
    function updateAllStats(stats) {
        if (stats.clients && elements.clients) {
            elements.clients.textContent = stats.clients;
        }
        if (stats.messagesReceived && elements.messagesReceived) {
            elements.messagesReceived.textContent = formatNumber(stats.messagesReceived);
        }
        if (stats.messagesSent && elements.messagesSent) {
            elements.messagesSent.textContent = formatNumber(stats.messagesSent);
        }
    }
    
    function formatNumber(num) {
        if (num > 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num > 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
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