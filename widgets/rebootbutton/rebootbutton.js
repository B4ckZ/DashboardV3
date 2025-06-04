// widgets/rebootbutton/rebootbutton.js - Widget Reboot Button V3
// ==============================================================

window.rebootbutton = (function() {
    let widgetElement;
    let elements = {};
    let confirmTimeout;
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/rebootbutton/rebootbutton.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                elements.button = widgetElement.querySelector('.reboot-button');
                elements.confirmDialog = widgetElement.querySelector('.reboot-confirm-dialog');
                elements.confirmYes = widgetElement.querySelector('.confirm-yes');
                elements.confirmNo = widgetElement.querySelector('.confirm-no');
                
                // Événements
                if (elements.button) {
                    elements.button.addEventListener('click', showConfirmDialog);
                }
                
                if (elements.confirmYes) {
                    elements.confirmYes.addEventListener('click', executeReboot);
                }
                
                if (elements.confirmNo) {
                    elements.confirmNo.addEventListener('click', hideConfirmDialog);
                }
                
                // Enregistrer auprès de l'orchestrateur (pas de souscription)
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('rebootbutton', {
                        update: () => {} // Pas de mise à jour pour ce widget
                    }, []);
                }
            });
    }
    
    function showConfirmDialog() {
        if (elements.confirmDialog) {
            elements.confirmDialog.style.display = 'block';
            
            // Auto-hide après 10 secondes
            confirmTimeout = setTimeout(hideConfirmDialog, 10000);
        }
    }
    
    function hideConfirmDialog() {
        if (elements.confirmDialog) {
            elements.confirmDialog.style.display = 'none';
        }
        
        if (confirmTimeout) {
            clearTimeout(confirmTimeout);
        }
    }
    
    function executeReboot() {
        console.log('Reboot command sent');
        
        // Envoyer la commande de reboot via l'orchestrateur
        if (window.orchestrator && window.orchestrator.publish) {
            window.orchestrator.publish('weri/system/reboot', {
                command: 'reboot',
                timestamp: new Date().toISOString()
            });
        }
        
        // Feedback visuel
        if (elements.button) {
            elements.button.classList.add('rebooting');
            elements.button.textContent = 'Redémarrage...';
            elements.button.disabled = true;
        }
        
        hideConfirmDialog();
        
        // Réactiver le bouton après 30 secondes
        setTimeout(() => {
            if (elements.button) {
                elements.button.classList.remove('rebooting');
                elements.button.textContent = 'Redémarrer';
                elements.button.disabled = false;
            }
        }, 30000);
    }
    
    function destroy() {
        if (confirmTimeout) {
            clearTimeout(confirmTimeout);
        }
        
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('rebootbutton');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();