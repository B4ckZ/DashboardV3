// Server Monitoring Widget
window.servermonitoring = (function() {
    let widgetElement;
    let elements = {};
	const widgetId = 'Surveillance du Serveur RPI';
    
    function init(element) {
		console.log(`✅​️ ${widgetId} initialisé.​`);
        widgetElement = element;
        
        fetch('widgets/servermonitoring/servermonitoring.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer tous les éléments de métriques
                const metrics = [
                    'cpu-core1', 'cpu-core2', 'cpu-core3', 'cpu-core4',
                    'temp-cpu', 'temp-gpu', 'freq-cpu', 'freq-gpu',
                    'memory-ram', 'memory-swap', 'memory-disk', 'memory-usb'
                ];
                
                metrics.forEach(metric => {
                    const row = widgetElement.querySelector(`[data-metric="${metric}"]`);
                    if (row) {
                        elements[metric] = {
                            bar: row.querySelector('.progress-bar'),
                            value: row.querySelector('.progress-value')
                        };
                    }
                });
                
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('servermonitoring', {
                        update: updateMetric
                    }, [
                        'system.cpu.*',
                        'system.gpu.*',
                        'system.temp.*',
                        'system.memory.*'
                    ]);
                }
            });
    }
    
    function updateMetric(topic, data) {
        switch (topic) {
            case 'system.cpu.core1':
                updateProgressBar('cpu-core1', data.raw, data.formatted);
                break;
            case 'system.cpu.core2':
                updateProgressBar('cpu-core2', data.raw, data.formatted);
                break;
            case 'system.cpu.core3':
                updateProgressBar('cpu-core3', data.raw, data.formatted);
                break;
            case 'system.cpu.core4':
                updateProgressBar('cpu-core4', data.raw, data.formatted);
                break;
            case 'system.cpu.frequency':
                const freqPercent = (data.raw / 2.4) * 100;
                updateProgressBar('freq-cpu', freqPercent, data.formatted);
                break;
            case 'system.gpu.frequency':
                const gpuPercent = (data.raw / 900) * 100;
                updateProgressBar('freq-gpu', gpuPercent, data.formatted);
                break;
            case 'system.temp.cpu':
                const tempCpuPercent = (data.raw / 85) * 100;
                updateProgressBar('temp-cpu', tempCpuPercent, data.formatted);
                break;
            case 'system.temp.gpu':
                const tempGpuPercent = (data.raw / 85) * 100;
                updateProgressBar('temp-gpu', tempGpuPercent, data.formatted);
                break;
            case 'system.memory.ram':
                updateProgressBar('memory-ram', data.raw, data.formatted);
                break;
            case 'system.memory.swap':
                updateProgressBar('memory-swap', data.raw, data.formatted);
                break;
            case 'system.memory.disk':
                updateProgressBar('memory-disk', data.raw, data.formatted);
                break;
            case 'system.memory.usb':
                if (data.raw === -1) {
                    updateProgressBar('memory-usb', 0, 'N/A', false);
                } else {
                    updateProgressBar('memory-usb', data.raw, data.formatted, true);
                }
                break;
        }
    }
    
    function updateProgressBar(metric, value, formattedValue, isAvailable = true) {
        const element = elements[metric];
        if (!element || !element.bar || !element.value) return;
        
        if (isAvailable) {
            const clampedValue = Math.max(0, Math.min(100, value));
            element.bar.style.width = clampedValue + '%';
            element.bar.classList.remove('unavailable');
        } else {
            element.bar.style.width = '0%';
            element.bar.classList.add('unavailable');
        }
        
        element.value.textContent = formattedValue;
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('servermonitoring');
        }
    }
    
    return { init, destroy };
})();