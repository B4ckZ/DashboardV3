/**
 * Widget Download Button - Version Ultra-Simplifiée
 * Compatible avec le nouveau système de téléchargement direct CSV
 * MaxLink Dashboard v3.0 - Sans ZIP, téléchargement direct
 */

window.downloadbutton = (function() {
    'use strict';
    
    let widgetElement;
    let downloadButton;
    let popupElement = null;
    let archivesData = {};
    let downloader = null;
    
    function init(element) {
        widgetElement = element;
        
        // Initialiser le gestionnaire de téléchargement
        if (window.maxlinkDownloader) {
            downloader = window.maxlinkDownloader;
        }
        
        // Charger le HTML du widget
        fetch('widgets/downloadbutton/downloadbutton.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                downloadButton = widgetElement.querySelector('#download-button');
                
                if (downloadButton) {
                    downloadButton.addEventListener('click', showDownloadPopup);
                }
                
                console.log('Download button widget initialized (nouveau système CSV)');
            })
            .catch(error => {
                console.error('Erreur chargement download button widget:', error);
            });
    }
    
    async function showDownloadPopup() {
        console.log('Opening download popup...');
        
        // Effet visuel sur le bouton
        if (downloadButton) {
            downloadButton.classList.add('clicked');
            setTimeout(() => downloadButton.classList.remove('clicked'), 150);
        }
        
        // Charger la liste des archives
        await loadArchivesList();
        
        // Créer et afficher la popup
        createDownloadPopup();
        showPopup();
    }
    
    async function loadArchivesList() {
        try {
            const response = await fetch('/archives-list.php?' + Date.now());
            
            if (response.ok) {
                archivesData = await response.json();
                console.log('Archives loaded:', archivesData);
            } else {
                throw new Error('Archives non trouvées (HTTP ' + response.status + ')');
            }
        } catch (error) {
            console.error('Erreur chargement archives:', error);
            archivesData = {};
            showNotification('Erreur de chargement des archives', 'warning');
        }
    }
    
    function createDownloadPopup() {
        if (popupElement) {
            popupElement.remove();
        }
        
        popupElement = document.createElement('div');
        popupElement.className = 'reboot-popup-overlay';
        
        popupElement.innerHTML = `
            <div class="reboot-popup">
                <div class="reboot-popup-content">
                    <h3>📁 Téléchargement Archives CSV</h3>
                    <div class="reboot-options">
                        ${createArchivesSelect()}
                        <div class="download-type-selection">
                            <div class="download-option">
                                <input type="radio" id="download-individual" name="download-type" value="individual" checked>
                                <label for="download-individual">Fichier individuel</label>
                            </div>
                            <div class="download-option">
                                <input type="radio" id="download-all" name="download-type" value="all">
                                <label for="download-all">Tous les CSV de la semaine</label>
                            </div>
                        </div>
                        <div id="file-selection" class="file-selection">
                            <!-- Rempli dynamiquement -->
                        </div>
                        <div class="reboot-buttons">
                            <button class="reboot-btn reboot-btn-cancel" onclick="downloadbutton.hidePopup()">
                                Annuler
                            </button>
                            <button class="reboot-btn reboot-btn-download" onclick="downloadbutton.downloadSelected()">
                                📥 Télécharger
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popupElement);
        
        // Ajouter les événements
        setupPopupEvents();
    }
    
    function setupPopupEvents() {
        const weekSelect = document.getElementById('week-select');
        const radioButtons = document.querySelectorAll('input[name="download-type"]');
        
        // Événement changement de semaine
        if (weekSelect) {
            weekSelect.addEventListener('change', updateFileSelection);
        }
        
        // Événements changement de type de téléchargement
        radioButtons.forEach(radio => {
            radio.addEventListener('change', updateFileSelection);
        });
        
        // Mise à jour initiale
        updateFileSelection();
    }
    
    function updateFileSelection() {
        const weekSelect = document.getElementById('week-select');
        const downloadType = document.querySelector('input[name="download-type"]:checked')?.value;
        const fileSelectionDiv = document.getElementById('file-selection');
        
        if (!weekSelect || !weekSelect.value || !fileSelectionDiv) return;
        
        const [year, week] = weekSelect.value.split('-');
        const weekData = findWeekData(year, parseInt(week));
        
        if (!weekData) {
            fileSelectionDiv.innerHTML = '<p class="no-files">Aucun fichier trouvé pour cette semaine</p>';
            return;
        }
        
        if (downloadType === 'individual') {
            // Mode fichier individuel
            let filesHtml = '<div class="file-list"><h4>Choisir un fichier :</h4>';
            weekData.files.forEach((file, index) => {
                filesHtml += `
                    <div class="file-item">
                        <input type="radio" id="file-${index}" name="selected-file" value="${file.filename}">
                        <label for="file-${index}">
                            <span class="file-name">${file.filename}</span>
                            <span class="file-size">${file.sizeFormatted}</span>
                            <span class="file-machine">${file.machine}</span>
                        </label>
                    </div>
                `;
            });
            filesHtml += '</div>';
            fileSelectionDiv.innerHTML = filesHtml;
        } else {
            // Mode tous les fichiers
            fileSelectionDiv.innerHTML = `
                <div class="week-summary">
                    <h4>📊 Semaine ${week}/${year}</h4>
                    <p><strong>${weekData.fileCount} fichiers CSV</strong> (${weekData.totalSizeFormatted})</p>
                    <div class="file-preview">
                        ${weekData.files.map(file => 
                            `<div class="preview-file">• ${file.filename} (${file.sizeFormatted})</div>`
                        ).join('')}
                    </div>
                    <p class="download-info">
                        ℹ️ Tous les fichiers seront téléchargés automatiquement
                    </p>
                </div>
            `;
        }
    }
    
    function findWeekData(year, week) {
        if (!archivesData[year]) return null;
        return archivesData[year].find(w => w.week === week);
    }
    
    function createArchivesSelect() {
        const years = Object.keys(archivesData);
        
        if (years.length === 0) {
            return `
                <div class="archive-info">
                    <p>Aucune archive disponible</p>
                </div>
            `;
        }
        
        let options = '<option value="">-- Sélectionner une semaine --</option>';
        
        years.sort((a, b) => b - a).forEach(year => {
            const weeks = archivesData[year];
            weeks.forEach(weekData => {
                const week = weekData.week;
                const label = `S${week.toString().padStart(2, '0')} ${year} (${weekData.fileCount} fichiers)`;
                const value = `${year}-${week}`;
                options += `<option value="${value}">${label}</option>`;
            });
        });
        
        return `
            <div class="archive-info">
                <p>Sélectionnez une semaine :</p>
            </div>
            <div class="archive-select-container">
                <select id="week-select" class="archive-select">
                    ${options}
                </select>
            </div>
        `;
    }
    
    function showPopup() {
        if (popupElement) {
            popupElement.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
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
    
    async function downloadSelected() {
        const weekSelect = document.getElementById('week-select');
        const downloadType = document.querySelector('input[name="download-type"]:checked')?.value;
        
        if (!weekSelect || !weekSelect.value) {
            showNotification('Veuillez sélectionner une semaine', 'warning');
            return;
        }
        
        const [year, week] = weekSelect.value.split('-');
        
        if (downloadType === 'individual') {
            // Téléchargement fichier individuel
            const selectedFile = document.querySelector('input[name="selected-file"]:checked')?.value;
            
            if (!selectedFile) {
                showNotification('Veuillez sélectionner un fichier', 'warning');
                return;
            }
            
            showNotification(`Téléchargement de ${selectedFile}...`, 'info');
            
            if (downloader) {
                downloader.downloadSingleFile(selectedFile, year);
            } else {
                // Fallback manuel
                const link = document.createElement('a');
                link.href = `/download-archive.php?file=${encodeURIComponent(selectedFile)}&year=${year}`;
                link.download = selectedFile;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            hidePopup();
            setTimeout(() => showNotification('Téléchargement terminé !', 'success'), 1000);
            
        } else {
            // Téléchargement de tous les fichiers de la semaine
            showNotification(`Téléchargement de tous les CSV S${week}/${year}...`, 'info');
            
            if (downloader) {
                try {
                    await downloader.downloadWeekFiles(parseInt(week), parseInt(year));
                    hidePopup();
                } catch (error) {
                    showNotification('Erreur lors du téléchargement multiple', 'error');
                }
            } else {
                showNotification('Gestionnaire de téléchargement non disponible', 'error');
            }
        }
    }
    
    function showNotification(message, type = 'info') {
        if (window.notifications && typeof window.notifications.show === 'function') {
            window.notifications.show(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // Notification visuelle simple
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : type === 'error' ? '#e74c3c' : '#3498db'};
                color: white;
                padding: 10px 15px;
                border-radius: 6px;
                z-index: 10001;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }
    
    // API publique
    return {
        init: init,
        hidePopup: hidePopup,
        downloadSelected: downloadSelected
    };
})();