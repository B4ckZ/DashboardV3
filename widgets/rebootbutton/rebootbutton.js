// widgets/rebootbutton/rebootbutton.js - Widget Reboot Button V3 avec Confirmation
// Version corrigée avec animations smooth sans flash
// ================================================================================

window.rebootbutton = (function() {
    let widgetElement;
    let elements = {};
    let confirmTimeout;
    let autoCloseTimer;
    let autoCloseInterval;
    let isAnimating = false; // Prévenir les animations multiples
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/rebootbutton/rebootbutton.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer les éléments
                elements.button = widgetElement.querySelector('.reboot-button');
                elements.overlay = widgetElement.querySelector('#reboot-overlay');
                elements.modal = widgetElement.querySelector('.reboot-modal');
                elements.input = widgetElement.querySelector('#reboot-confirmation-input');
                elements.cancelBtn = widgetElement.querySelector('#reboot-cancel-btn');
                elements.confirmBtn = widgetElement.querySelector('#reboot-confirm-btn');
                elements.timerSpan = widgetElement.querySelector('#reboot-timer');
                
                // Événements
                if (elements.button) {
                    elements.button.addEventListener('click', showConfirmModal);
                }
                
                if (elements.cancelBtn) {
                    elements.cancelBtn.addEventListener('click', hideConfirmModal);
                }
                
                if (elements.confirmBtn) {
                    elements.confirmBtn.addEventListener('click', executeReboot);
                }
                
                if (elements.input) {
                    elements.input.addEventListener('input', validateInput);
                    elements.input.addEventListener('keydown', handleKeyPress);
                }
                
                if (elements.overlay) {
                    elements.overlay.addEventListener('click', function(e) {
                        if (e.target === elements.overlay) {
                            hideConfirmModal();
                        }
                    });
                }
                
                // Support global du clavier
                document.addEventListener('keydown', handleGlobalKeyPress);
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('rebootbutton', {
                        update: () => {} // Pas de mise à jour pour ce widget
                    }, []);
                }
            });
    }
    
    function showConfirmModal() {
        console.log('Ouverture de la modal de confirmation de redémarrage');
        
        if (elements.overlay && elements.input && !isAnimating) {
            isAnimating = true;
            
            // IMPORTANT : Ajouter la classe modal-open au body pour gérer les z-index
            document.body.classList.add('modal-open');
            
            // Afficher la modal (display block d'abord)
            elements.overlay.style.display = 'flex';
            
            // Reset des valeurs
            elements.input.value = '';
            elements.confirmBtn.disabled = true;
            elements.input.style.borderLeft = 'none';
            
            // Forcer un reflow pour que le navigateur traite le display: flex
            elements.overlay.offsetHeight;
            
            // Puis ajouter la classe show pour déclencher l'animation
            setTimeout(() => {
                elements.overlay.classList.add('show');
                isAnimating = false;
                
                // Focus sur le champ de saisie après l'animation
                setTimeout(() => {
                    elements.input.focus();
                }, 150);
            }, 10);
            
            // Démarrer le timer de fermeture automatique (30 secondes)
            startAutoCloseTimer();
        }
    }
    
    function hideConfirmModal() {
        console.log('Fermeture de la modal de confirmation');
        
        if (elements.overlay && elements.modal && !isAnimating) {
            isAnimating = true;
            
            // Retirer la classe show pour déclencher l'animation de sortie
            elements.overlay.classList.remove('show');
            
            // Attendre la fin de l'animation avant de masquer complètement
            setTimeout(() => {
                elements.overlay.style.display = 'none';
                
                // IMPORTANT : Retirer la classe modal-open du body
                document.body.classList.remove('modal-open');
                
                isAnimating = false;
            }, 300); // Correspond à la durée de transition CSS
            
            // Arrêter les timers
            clearAutoCloseTimer();
        }
    }
    
    function validateInput() {
        const inputValue = elements.input.value.toLowerCase().trim();
        const isValid = inputValue === 'redémarrer';
        
        elements.confirmBtn.disabled = !isValid;
        
        // Effet visuel sur l'input selon la validité
        if (inputValue.length > 0) {
            if (isValid) {
                elements.input.style.borderLeft = '3px solid var(--nord14)';
            } else {
                elements.input.style.borderLeft = '3px solid var(--nord11)';
            }
        } else {
            elements.input.style.borderLeft = 'none';
        }
    }
    
    function handleKeyPress(e) {
        if (e.key === 'Enter') {
            if (!elements.confirmBtn.disabled) {
                executeReboot();
            }
        } else if (e.key === 'Escape') {
            hideConfirmModal();
        }
    }
    
    function handleGlobalKeyPress(e) {
        // Seulement si la modal est visible et pas en cours d'animation
        if (elements.overlay && 
            elements.overlay.style.display === 'flex' && 
            elements.overlay.classList.contains('show') &&
            !isAnimating) {
            if (e.key === 'Escape') {
                hideConfirmModal();
            }
        }
    }
    
    function executeReboot() {
        console.log('Exécution du redémarrage confirmé');
        
        // Feedback immédiat
        elements.confirmBtn.textContent = 'Redémarrage...';
        elements.confirmBtn.disabled = true;
        elements.cancelBtn.disabled = true;
        elements.input.disabled = true;
        
        // Arrêter le timer pour éviter la fermeture automatique
        clearAutoCloseTimer();
        
        // Envoyer la commande de reboot via l'orchestrateur
        if (window.orchestrator && window.orchestrator.publish) {
            window.orchestrator.publish('maxlink/system/reboot', {
                command: 'reboot',
                timestamp: new Date().toISOString(),
                confirmed: true,
                user_confirmation: 'redémarrer'
            });
            
            console.log('Commande de redémarrage envoyée via MQTT');
        } else {
            console.error('Orchestrateur non disponible pour envoyer la commande');
        }
        
        // Fermer la modal après un délai
        setTimeout(() => {
            hideConfirmModal();
            
            // Feedback visuel sur le bouton principal
            if (elements.button) {
                elements.button.style.opacity = '0.5';
                elements.button.disabled = true;
            }
        }, 2000);
        
        // Réactiver le bouton après 60 secondes (au cas où le redémarrage échoue)
        setTimeout(() => {
            if (elements.button) {
                elements.button.style.opacity = '1';
                elements.button.disabled = false;
                elements.confirmBtn.textContent = 'Redémarrer Maintenant';
                elements.confirmBtn.disabled = false;
                elements.cancelBtn.disabled = false;
                elements.input.disabled = false;
            }
        }, 60000);
    }
    
    function startAutoCloseTimer() {
        let secondsLeft = 30;
        
        // Mettre à jour l'affichage du timer
        updateTimerDisplay(secondsLeft);
        
        // Créer l'intervalle qui se répète chaque seconde
        autoCloseInterval = setInterval(() => {
            secondsLeft--;
            updateTimerDisplay(secondsLeft);
            
            if (secondsLeft <= 0) {
                hideConfirmModal();
            }
        }, 1000);
    }
    
    function updateTimerDisplay(seconds) {
        if (elements.timerSpan) {
            elements.timerSpan.textContent = seconds;
            
            // Changer la couleur quand il reste moins de 10 secondes
            if (seconds <= 10) {
                elements.timerSpan.style.color = 'var(--nord11)';
            } else {
                elements.timerSpan.style.color = 'var(--nord12)';
            }
        }
    }
    
    function clearAutoCloseTimer() {
        if (autoCloseInterval) {
            clearInterval(autoCloseInterval);
            autoCloseInterval = null;
        }
    }
    
    function destroy() {
        clearAutoCloseTimer();
        
        // Nettoyer la classe modal-open si elle existe encore
        document.body.classList.remove('modal-open');
        
        // Supprimer les event listeners globaux
        document.removeEventListener('keydown', handleGlobalKeyPress);
        
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('rebootbutton');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();