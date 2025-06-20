// config/variables.js - MaxLink V3 Configuration Centralisée
// ============================================================

export const APP_CONFIG = {
    version: '3.0.0',
    name: 'MaxLink Dashboard',
    debug: false // Mettre à true pour activer les logs de debug
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
    'rpi/system/frequency/cpu': 'system.cpu.frequency',
    'rpi/system/frequency/gpu': 'system.gpu.frequency',

    // Températures - CPU GPU
    'rpi/system/temperature/cpu': 'system.temp.cpu',
    'rpi/system/temperature/gpu': 'system.temp.gpu',

    // Mémoire
    'rpi/system/memory/ram': 'system.memory.ram',        // RAM en %
    'rpi/system/memory/swap': 'system.memory.swap',      // Swap en %
    'rpi/system/memory/disk': 'system.memory.disk',      // Disque en %

    // Disque (détails - non utilisés actuellement)
    'rpi/system/disk/total': 'system.disk.total',
    'rpi/system/disk/used': 'system.disk.used',
    'rpi/system/disk/free': 'system.disk.free',
    
    // Network
    'rpi/network/wifi/clients': 'network.wifi.clients',
    'rpi/network/wifi/status': 'network.wifi.status',
    'rpi/network/mqtt/stats': 'network.mqtt.stats',
    'rpi/network/mqtt/topics': 'network.mqtt.topics',
    
    // Test
    'test/result': 'test.result'
};

// Formats de données pour validation
export const DATA_FORMATS = {
    'system.uptime': {
        type: 'number',
        unit: 'seconds'
    },
    'system.cpu.*': {
        type: 'number',
        unit: 'percent',
        min: 0,
        max: 100
    },
    'system.temp.*': {
        type: 'number',
        unit: 'celsius',
        min: 0,
        max: 100
    },
    'system.memory.*': {
        type: 'number',
        unit: 'percent',
        min: 0,
        max: 100
    }
};

// Configuration des widgets
export const WIDGET_CONFIG = {
    loadDelay: 100,        // Délai entre chargement des widgets (ms)
    updateThrottle: 1000,  // Limite de mise à jour (ms)
    maxRetries: 3          // Tentatives de chargement
};

// Configuration du layout
export const LAYOUT_CONFIG = {
    desktop: {
        columns: 4,
        rows: 3
    },
    tablet: {
        columns: 3,
        rows: 4
    },
    mobile: {
        columns: 1,
        rows: 'auto'
    }
};

// Liste des widgets à charger
export const WIDGETS = [
    'logo',
    'clock',
    'esp32stats',
	'test',
	'rebootbutton',
    'uptime',
    'downloadbutton',
	'downloadinfo',
    'servermonitoring',
	'wifistats',
	'mqttstats',
	'mqttlogspochetest',
    'mqttlogs509511'
];