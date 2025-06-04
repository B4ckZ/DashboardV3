// js/orchestrator.js - Orchestrateur Central MaxLink V3
// =====================================================

import { MQTT_CONFIG, TOPIC_MAPPING, DATA_FORMATS } from '../config/variables.js';

class Orchestrator {
    constructor() {
        this.client = null;
        this.connected = false;
        this.widgets = new Map();
        this.subscriptions = new Map();
    }
    
    init() {
        console.log('Orchestrator V3 starting...');
        this.connect();
    }
    
    connect() {
        this.client = new Paho.Client(
            MQTT_CONFIG.host,
            MQTT_CONFIG.port,
            MQTT_CONFIG.path,
            MQTT_CONFIG.clientId
        );
        
        this.client.onConnectionLost = (response) => {
            console.log('Connection lost:', response.errorMessage);
            this.connected = false;
            setTimeout(() => this.connect(), 5000);
        };
        
        this.client.onMessageArrived = (message) => {
            this.handleMessage(message.destinationName, message.payloadString);
        };
        
        this.client.connect({
            onSuccess: () => {
                console.log('Connected to MQTT');
                this.connected = true;
                this.subscribeAll();
            },
            userName: MQTT_CONFIG.username,
            password: MQTT_CONFIG.password
        });
    }
    
    subscribeAll() {
        Object.keys(TOPIC_MAPPING).forEach(topic => {
            this.client.subscribe(topic);
        });
    }
    
    handleMessage(topic, payload) {
        try {
            let data;
            
            // Essayer de parser en JSON
            try {
                data = JSON.parse(payload);
            } catch (jsonError) {
                // Si ce n'est pas du JSON, traiter comme une valeur simple
                // Vérifier si c'est un nombre
                if (!isNaN(payload)) {
                    data = { value: parseFloat(payload) };
                } else {
                    // Sinon c'est une string
                    data = { value: payload };
                }
            }
            
            const internalTopic = this.mapTopic(topic);
            
            if (!internalTopic) {
                console.warn(`Unknown topic: ${topic}`);
                return;
            }
            
            const formatted = this.formatData(internalTopic, data);
            this.distribute(internalTopic, formatted);
            
        } catch (error) {
            console.error(`Error handling message for topic ${topic}:`, error);
            console.error('Payload was:', payload);
        }
    }
    
    mapTopic(mqttTopic) {
        for (const [pattern, internal] of Object.entries(TOPIC_MAPPING)) {
            if (pattern.includes('+')) {
                const regex = new RegExp(pattern.replace(/\+/g, '[^/]+'));
                if (regex.test(mqttTopic)) return internal;
            } else if (pattern === mqttTopic) {
                return internal;
            }
        }
        return null;
    }
    
    formatData(topic, data) {
        let formatted = { ...data };
        
        // Gérer les cas où data.value n'existe pas
        const value = data.value !== undefined ? data.value : data;
        
        if (topic.includes('uptime')) {
            const seconds = parseInt(value) || 0;
            const d = Math.floor(seconds / 86400);
            const h = Math.floor((seconds % 86400) / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            formatted.formatted = `${d}j ${h}h ${m}m ${s}s`;
            formatted.raw = seconds;
        }
        else if (topic.includes('cpu') && topic.includes('core')) {
            const numValue = parseFloat(value) || 0;
            formatted.formatted = `${numValue.toFixed(1)}%`;
            formatted.raw = numValue;
        }
        else if (topic.includes('memory') || topic.includes('swap') || topic.includes('disk')) {
            const numValue = parseFloat(value) || 0;
            formatted.formatted = `${numValue.toFixed(1)}%`;
            formatted.raw = numValue;
        }
        else if (topic.includes('temperature')) {
            const numValue = parseFloat(value) || 0;
            formatted.formatted = `${numValue.toFixed(1)}°C`;
            formatted.raw = numValue;
        }
        else if (topic.includes('frequency')) {
            const numValue = parseFloat(value) || 0;
            
            // Debug
            console.log(`Frequency topic: ${topic}, raw value: ${numValue}`);
            
            // Si c'est pour le CPU, la valeur du collecteur est déjà en GHz
            if (topic.includes('cpu')) {
                formatted.formatted = `${numValue.toFixed(2)} GHz`;
                formatted.raw = numValue;
            } else {
                // GPU est en MHz
                formatted.formatted = `${numValue.toFixed(0)} MHz`;
                formatted.raw = numValue;
            }
        }
        else if (topic === 'network.wifi.clients' || topic === 'network.wifi.status') {
            // Pour les données WiFi, retourner la structure complète
            if (data.timestamp) {
                formatted.timestamp = new Date(data.timestamp).toLocaleString('fr-FR');
            }
            // Pas besoin de réassigner, juste retourner formatted qui contient déjà toutes les données
            return formatted;
        }
        else if (topic.includes('mqtt')) {
            // Pour les stats MQTT, garder les valeurs telles quelles
            formatted.raw = value;
            if (typeof value === 'number') {
                formatted.formatted = value.toString();
            } else {
                formatted.formatted = value;
            }
        }
        else {
            // Par défaut, garder la valeur telle quelle
            formatted.raw = value;
            formatted.formatted = value.toString();
        }
        
        return formatted;
    }
    
    distribute(topic, data) {
        this.subscriptions.forEach((subs, widgetId) => {
            const widget = this.widgets.get(widgetId);
            if (!widget) return;
            
            const matches = subs.some(sub => {
                if (sub.includes('*')) {
                    return topic.startsWith(sub.replace('*', ''));
                }
                return sub === topic;
            });
            
            if (matches && widget.update) {
                widget.update(topic, data);
            }
        });
    }
    
    registerWidget(id, widget, subscribes = []) {
        console.log(`Registering widget: ${id}`);
        this.widgets.set(id, widget);
        this.subscriptions.set(id, subscribes);
    }
    
    unregisterWidget(id) {
        this.widgets.delete(id);
        this.subscriptions.delete(id);
    }
    
    publish(topic, payload) {
        if (!this.connected) {
            console.warn('Not connected, cannot publish');
            return;
        }
        
        const message = new Paho.Message(
            typeof payload === 'string' ? payload : JSON.stringify(payload)
        );
        message.destinationName = topic;
        this.client.send(message);
    }
}

const orchestrator = new Orchestrator();
export default orchestrator;