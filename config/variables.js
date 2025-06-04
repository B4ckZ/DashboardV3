// config/variables.js - MaxLink V3 Configuration Centralisée
// ============================================================

export const APP_CONFIG = {
    version: '3.0.0',
    name: 'MaxLink Dashboard',
    debug: false // Production mode
};

// Configuration MQTT
export const MQTT_CONFIG = {
    host: window.location.hostname || '192.168.4.1',
    port: 9001,
    path: '/mqtt',
    clientId: `maxlink-v3-${Math.random().toString(16).substr(2, 8)}`,
    username: 'mosquitto',
    password: 'mqtt',
    keepAlive: 60,
    cleanSession: true,
    timeout: 3,
    useSSL: false,
    reconnectDelay: 5000
};

// Mapping des topics MQTT vers identifiants internes
export const TOPIC_MAPPING = {

	// System - Topics corrigés
	'rpi/system/uptime': 'system.uptime',
	'rpi/system/cpu/core1': 'system.cpu.core1',
	'rpi/system/cpu/core2': 'system.cpu.core2',
	'rpi/system/cpu/core3': 'system.cpu.core3',
	'rpi/system/cpu/core4': 'system.cpu.core4',

	// Fréquences
	'rpi/system/frequency/cpu': 'system.cpu.frequency',  // Au lieu de 'rpi/system/cpu/freq'
	'rpi/system/frequency/gpu': 'system.gpu.frequency',  // Nouveau

	// Températures - CPU GPU
	'rpi/system/temperature/cpu': 'system.temp.cpu',
	'rpi/system/temperature/gpu': 'system.temp.gpu',

	// Mémoire
	'rpi/system/memory/ram': 'system.memory.ram',        // RAM en %
	'rpi/system/memory/swap': 'system.memory.swap',      // Swap en %

	// Disque
	'rpi/system/disk/total': 'system.disk.total',
	'rpi/system/disk/used': 'system.disk.used',
	'rpi/system/disk/free': 'system.disk.free',
    
    // Network
    'rpi/network/wifi/clients': 'network.wifi.clients',
    'rpi/network/wifi/status': 'network.wifi.status',
    'rpi/network/mqtt/stats': 'network.mqtt.stats',
    'rpi/network/mqtt/topics': 'network.mqtt.topics',
    
    // Test Results
    'weri/device/+/result': 'test.result',
    
    // Commands
    'weri/system/reboot': 'command.reboot',
    
    // MQTT System Topics
    '$SYS/broker/clients/connected': 'mqtt.clients.connected',
    '$SYS/broker/messages/received': 'mqtt.messages.received',
    '$SYS/broker/messages/sent': 'mqtt.messages.sent',
    '$SYS/broker/uptime': 'mqtt.broker.uptime'
};

// Widgets à charger (comme dans V1)
export const WIDGETS = [
    'logo',
    'clock', 
    'uptime',
    'rebootbutton',
    'downloadbutton',
    'servermonitoring',
    'mqttlogs509511',
    'wifistats',
    'mqttstats'
];

// Formats de données
export const DATA_FORMATS = {
    uptime: {
        parse: (seconds) => {
            const d = Math.floor(seconds / 86400);
            const h = Math.floor((seconds % 86400) / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            return { days: d, hours: h, minutes: m, seconds: s };
        },
        format: (data) => `${data.days}j ${data.hours}h ${data.minutes}m ${data.seconds}s`
    },
    
    percentage: {
        parse: (value) => parseFloat(value),
        format: (value) => `${value.toFixed(1)}%`
    },
    
    temperature: {
        parse: (value) => parseFloat(value),
        format: (value) => `${value.toFixed(1)}°C`
    },
    
    frequency: {
        parse: (value) => parseFloat(value),
        format: (value) => `${(value / 1000).toFixed(2)} GHz`
    },
    
    bytes: {
        parse: (value) => parseInt(value),
        format: (bytes) => {
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let i = 0;
            while (bytes >= 1024 && i < units.length - 1) {
                bytes /= 1024;
                i++;
            }
            return `${bytes.toFixed(2)} ${units[i]}`;
        }
    },
    
    timestamp: {
        parse: (value) => new Date(value),
        format: (date) => date.toLocaleString('fr-FR')
    }
};

// Classes CSS communes
export const CSS_CLASSES = {
    widget: 'widget',
    widgetHeader: 'widget-header',
    widgetBody: 'widget-body',
    widgetTitle: 'widget-title',
    widgetContent: 'widget-content',
    
    // États
    loading: 'loading',
    error: 'error',
    success: 'success',
    warning: 'warning',
    
    // Animations
    fadeIn: 'fade-in',
    fadeOut: 'fade-out',
    pulse: 'pulse',
    
    // Thème
    neumorphic: 'neumorphic',
    neumorphicInset: 'neumorphic-inset',
    
    // Valeurs
    metricValue: 'metric-value',
    metricLabel: 'metric-label',
    metricUnit: 'metric-unit',
    
    // États des valeurs
    valueStable: 'value-stable',
    valueIncreasing: 'value-increasing',
    valueDecreasing: 'value-decreasing',
    
    // Alertes
    alert: 'alert',
    alertDanger: 'alert-danger',
    alertWarning: 'alert-warning',
    alertInfo: 'alert-info'
};

// Seuils d'alerte
export const ALERT_THRESHOLDS = {
    cpu: {
        warning: 70,
        danger: 90
    },
    temperature: {
        warning: 70,
        danger: 80
    },
    memory: {
        warning: 80,
        danger: 95
    },
    disk: {
        warning: 80,
        danger: 95
    }
};

// Messages d'erreur
export const ERROR_MESSAGES = {
    mqtt: {
        connectionFailed: 'Impossible de se connecter au broker MQTT',
        connectionLost: 'Connexion MQTT perdue',
        subscriptionFailed: 'Échec de l\'abonnement au topic',
        publishFailed: 'Échec de l\'envoi du message'
    },
    widget: {
        loadFailed: 'Impossible de charger le widget',
        initFailed: 'Échec de l\'initialisation du widget',
        updateFailed: 'Échec de la mise à jour du widget'
    },
    data: {
        parseFailed: 'Impossible de parser les données',
        invalidFormat: 'Format de données invalide',
        missingField: 'Champ requis manquant'
    }
};

// Icônes (utilisation avec Lucide ou autre bibliothèque)
export const ICONS = {
    system: {
        cpu: 'cpu',
        memory: 'memory-stick',
        disk: 'hard-drive',
        temperature: 'thermometer',
        uptime: 'clock'
    },
    network: {
        wifi: 'wifi',
        mqtt: 'radio',
        connected: 'link',
        disconnected: 'link-off'
    },
    status: {
        ok: 'check-circle',
        warning: 'alert-triangle',
        error: 'x-circle',
        info: 'info'
    },
    actions: {
        reboot: 'refresh-cw',
        download: 'download',
        settings: 'settings',
        close: 'x'
    }
};

// Couleurs du thème Nord
export const NORD_COLORS = {
    // Polar Night
    nord0: '#2E3440',
    nord1: '#3B4252',
    nord2: '#434C5E',
    nord3: '#4C566A',
    
    // Snow Storm
    nord4: '#D8DEE9',
    nord5: '#E5E9F0',
    nord6: '#ECEFF4',
    
    // Frost
    nord7: '#8FBCBB',
    nord8: '#88C0D0',
    nord9: '#81A1C1',
    nord10: '#5E81AC',
    
    // Aurora
    nord11: '#BF616A', // Rouge
    nord12: '#D08770', // Orange
    nord13: '#EBCB8B', // Jaune
    nord14: '#A3BE8C', // Vert
    nord15: '#B48EAD'  // Violet
};

// Utilitaires
export const UTILS = {
    // Debounce pour optimiser les performances
    debounceDelay: 100,
    
    // Throttle pour limiter les mises à jour
    throttleDelay: 250,
    
    // Taille maximale du cache
    maxCacheSize: 1000,
    
    // Durée de vie du cache local
    localCacheExpiry: 86400000, // 24 heures
    
    // Nombre max de reconnexions
    maxReconnectAttempts: 10
};

// Export par défaut
export default {
    APP_CONFIG,
    MQTT_CONFIG,
    TOPIC_MAPPING,
    WIDGETS,
    DATA_FORMATS
};