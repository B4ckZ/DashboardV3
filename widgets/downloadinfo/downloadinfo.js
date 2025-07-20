// Download Info Widget
window.downloadinfo = (function() {
    let widgetElement;
    let downloadinfoElement;
	const widgetId = 'Horodatage des archives CSV';
    
    function init(element) {
		console.log(`✅​️ ${widgetId} initialisé.​`);
        widgetElement = element;
        
        fetch('widgets/downloadinfo/downloadinfo.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                downloadinfoElement = widgetElement.querySelector('[data-metric="downloadinfo"]');
                
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('downloadinfo', {
                        update: updateValue
                    }, ['download.info']);
                }
                
                loadLastDownload();
            });
    }
    
    function updateValue(topic, data) {
        if (topic === 'download.info' && downloadinfoElement) {
            const formatted = formatDownloadInfo(data);
            downloadinfoElement.textContent = formatted;
            saveLastDownload(data);
        }
    }
    
    function formatDownloadInfo(data) {
        if (data.date && data.week) {
            return `${data.date} | Semaine ${data.week}`;
        }
        return data.date || data.formatted || data;
    }
    
    function saveLastDownload(data) {
        try {
            localStorage.setItem('lastDownload', JSON.stringify(data));
        } catch (e) {
            // Silently ignore localStorage errors
        }
    }
    
    function loadLastDownload() {
        try {
            const saved = localStorage.getItem('lastDownload');
            if (saved && downloadinfoElement) {
                const data = JSON.parse(saved);
                downloadinfoElement.textContent = formatDownloadInfo(data);
                return;
            }
        } catch (e) {
            // Silently ignore localStorage errors
        }
        
        if (downloadinfoElement) {
            downloadinfoElement.textContent = '--/--/---- | Semaine --';
        }
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('downloadinfo');
        }
    }
    
    return { init, destroy };
})();