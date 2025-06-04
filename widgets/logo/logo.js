// widgets/logo/logo.js - Widget Logo V3
// =====================================

window.logo = (function() {
    let widgetElement;
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/logo/logo.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Pas de logique MQTT pour ce widget statique
                // Juste afficher le logo
            });
    }
    
    function destroy() {
        // Rien à nettoyer pour un widget statique
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();