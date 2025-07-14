/**
 * Widget Download Button - Version Ultra-Simplifiée
 * Style exact du widget rebootbutton avec menu déroulant des archives
 * MaxLink Dashboard v3.0 - Simplifié
 */

window.downloadbutton = (function() {
    'use strict';
    
    let widgetElement;
    let downloadButton;
    let popupElement = null;
    let archivesData = {};
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/downloadbutton/downloadbutton.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer le bouton
                downloadButton = widgetElement.querySelector('#download-button');
                
                // Événement sur le bouton (exactement comme rebootbutton)
                if (downloadButton) {
                    downloadButton.addEventListener('click', showDownloadPopup);
                }
                
                console.log('Download button widget initialized');
            })
            .catch(error => {
                console.error('Erreur chargement download button widget:', error);
            });
    }
    
    async function showDownloadPopup() {
        console.log('Opening download popup...');
        
        // Effet visuel sur le bouton (exactement comme rebootbutton)
        if (downloadButton) {
            downloadButton.classList.add('clicked');
            setTimeout(() => downloadButton.classList.remove('clicked'), 150);
        }
        
        // Charger la liste des archives
        await loadArchivesList();
        
        // Créer et afficher la popup (style rebootbutton)
        createDownloadPopup();
        showPopup();
    }
    
    async function loadArchivesList() {
        try {
            // Scanner directement le dossier Archives via une requête simple
            const response = await fetch('/archives-list.json?' + Date.now());
            
            if (response.ok) {
                archivesData = await response.json();
                console.log('Archives loaded:', archivesData);
            } else {
                throw new Error('Archives non trouvées');
            }
        } catch (error) {
            console.error('Erreur chargement archives:', error);
            // Données de fallback si pas d'archives
            archivesData = {};
        }
    }
    
    function createDownloadPopup() {
        // Supprimer l'ancienne popup si elle existe
        if (popupElement) {
            popupElement.remove();
        }
        
        // Créer la nouvelle popup (EXACTEMENT comme rebootbutton)
        popupElement = document.createElement('div');
        popupElement.className = 'reboot-popup-overlay';  // Utilise les mêmes classes CSS !
        popupElement.innerHTML = `
            <div class="reboot-popup">
                <div class="reboot-popup-content">
                    <h3>Téléchargement Archives</h3>
                    <div class="reboot-options">
                        ${createArchivesSelect()}
                        <div class="reboot-buttons">
                            <button class="reboot-btn reboot-btn-cancel" onclick="downloadbutton.hidePopup()">
                                Annuler
                            </button>
                            <button class="reboot-btn reboot-btn-download" onclick="downloadbutton.downloadSelected()">
                                Télécharger
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popupElement);
    }
    
    function createArchivesSelect() {
        const archives = Object.keys(archivesData);
        
        if (archives.length === 0) {
            return `
                <div class="archive-info">
                    <p>Aucune archive disponible</p>
                </div>
            `;
        }
        
        // Créer un select avec toutes les semaines disponibles
        let options = '<option value="">-- Sélectionner une semaine --</option>';
        
        // Trier par année puis semaine (plus récent en premier)
        archives.sort((a, b) => b - a).forEach(year => {
            const weeks = archivesData[year].sort((a, b) => b - a);
            weeks.forEach(week => {
                const label = `S${week.toString().padStart(2, '0')} ${year}`;
                const value = `${year}-${week}`;
                options += `<option value="${value}">${label}</option>`;
            });
        });
        
        return `
            <div class="archive-info">
                <p>Sélectionnez une semaine à télécharger :</p>
            </div>
            <div class="archive-select-container">
                <select id="archive-select" class="archive-select">
                    ${options}
                </select>
            </div>
        `;
    }
    
    function showPopup() {
        if (popupElement) {
            popupElement.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Animation d'apparition (comme rebootbutton)
            setTimeout(() => {
                popupElement.classList.add('show');
            }, 10);
        }
    }
    
    function hidePopup() {
        if (popupElement) {
            popupElement.classList.remove('show');
            document.body.style.overflow = '';
            
            setTimeout(() => {
                if (popupElement) {
                    popupElement.remove();
                    popupElement = null;
                }
            }, 300);
        }
    }
    
    function downloadSelected() {
        const select = document.getElementById('archive-select');
        
        if (!select || !select.value) {
            showNotification('Veuillez sélectionner une semaine', 'warning');
            return;
        }
        
        const [year, week] = select.value.split('-');
        const weekPadded = week.padStart(2, '0');
        
        // URL de téléchargement directe
        const downloadUrl = `/download-archive.php?year=${year}&week=${week}`;
        
        showNotification(`Téléchargement S${weekPadded}/${year}...`, 'info');
        
        // Télécharger le fichier
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `MaxLink_S${weekPadded}_${year}_Archives.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Fermer la popup après téléchargement
        setTimeout(() => {
            hidePopup();
            showNotification('Téléchargement terminé !', 'success');
        }, 1000);
    }
    
    function showNotification(message, type = 'info') {
        // Utiliser le même système de notification que rebootbutton
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Styles inline pour éviter les conflits
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '2000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // Couleurs selon le type
        const colors = {
            info: 'linear-gradient(135deg, #5E81AC, #81A1C1)',
            success: 'linear-gradient(135deg, #A3BE8C, #8FBCBB)',
            warning: 'linear-gradient(135deg, #EBCB8B, #D08770)',
            error: 'linear-gradient(135deg, #BF616A, #D08770)'
        };
        
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animation d'apparition
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Suppression automatique
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    function destroy() {
        if (popupElement) {
            popupElement.remove();
            popupElement = null;
        }
        document.body.style.overflow = '';
    }
    
    // Interface publique (minimal)
    return {
        init: init,
        destroy: destroy,
        hidePopup: hidePopup,
        downloadSelected: downloadSelected
    };
})();