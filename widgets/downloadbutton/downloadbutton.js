/**
 * Widget Download Button - Compatible avec le système de chargement MaxLink
 * Pattern identique aux autres widgets (rebootbutton, etc.)
 * Version 3.0 - Popup moderne avec 52 semaines
 */

window.downloadbutton = (function() {
    'use strict';

    // Variables du widget
    let widgetElement;
    let elements = {};
    let state = {
        isLoading: false,
        archivesData: null,
        selectedYear: null,
        selectedWeek: null,
        isPopupOpen: false
    };

    // Configuration
    const CONFIG = {
        API_ENDPOINTS: {
            LIST: '/archives-list.php',
            DOWNLOAD: '/download-archive.php'
        }
    };

    /**
     * Initialisation du widget - Fonction appelée par le système
     */
    function init(element) {
        widgetElement = element;
        
        console.log('[DownloadWidget] Initialisation du widget...');
        
        // Charger le HTML du widget
        fetch('widgets/downloadbutton/downloadbutton.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Cache des éléments après chargement HTML
                cacheElements();
                
                // Liaison des événements
                bindEvents();
                
                console.log('[DownloadWidget] Widget initialisé avec succès');
            })
            .catch(error => {
                console.error('[DownloadWidget] Erreur chargement HTML:', error);
                widgetElement.innerHTML = '<div style="padding: 20px; color: var(--nord11);">Erreur chargement widget</div>';
            });
    }

    /**
     * Cache les éléments DOM pour performance
     */
    function cacheElements() {
        elements = {
            button: widgetElement.querySelector('#download-button'),
            overlay: widgetElement.querySelector('#download-overlay'),
            modal: widgetElement.querySelector('.download-modal'),
            closeBtn: widgetElement.querySelector('#download-close-btn'),
            yearSelect: widgetElement.querySelector('#downloadYearSelect'),
            weekSelect: widgetElement.querySelector('#downloadWeekSelect'),
            selectionInfo: widgetElement.querySelector('#downloadSelectionInfo'),
            selectionTitle: widgetElement.querySelector('#downloadSelectionTitle'),
            selectionPeriod: widgetElement.querySelector('#downloadSelectionPeriod'),
            fileCount: widgetElement.querySelector('#downloadFileCount'),
            fileSize: widgetElement.querySelector('#downloadFileSize'),
            downloadAll: widgetElement.querySelector('#downloadIndividual'),
            downloadFiles: widgetElement.querySelector('#downloadFileSelector'),
            status: widgetElement.querySelector('#downloadStatus'),
            loading: widgetElement.querySelector('#downloadLoading'),
            error: widgetElement.querySelector('#downloadError'),
            errorMessage: widgetElement.querySelector('#downloadErrorMessage')
        };
    }

    /**
     * Liaison des événements
     */
    function bindEvents() {
        // Bouton principal
        if (elements.button) {
            elements.button.addEventListener('click', showDownloadModal);
        }

        // Bouton de fermeture
        if (elements.closeBtn) {
            elements.closeBtn.addEventListener('click', hideDownloadModal);
        }

        // Sélecteurs
        if (elements.yearSelect) {
            elements.yearSelect.addEventListener('change', onYearChange);
        }

        if (elements.weekSelect) {
            elements.weekSelect.addEventListener('change', onWeekChange);
        }

        // Boutons d'action
        if (elements.downloadAll) {
            elements.downloadAll.addEventListener('click', downloadWeekArchives);
        }

        if (elements.downloadFiles) {
            elements.downloadFiles.addEventListener('click', showFileSelector);
        }

        // Fermeture avec Escape
        document.addEventListener('keydown', handleKeydown);
        
        // Fermeture en cliquant sur l'overlay
        if (elements.overlay) {
            elements.overlay.addEventListener('click', handleOverlayClick);
        }
    }

    /**
     * Affiche la modal de téléchargement avec animation
     */
    function showDownloadModal() {
        if (state.isAnimating || state.isPopupOpen) return;
        
        state.isAnimating = true;
        state.isPopupOpen = true;
        
        // Animation du bouton (comme rebootbutton)
        if (elements.button) {
            elements.button.classList.add('clicked');
            setTimeout(() => elements.button.classList.remove('clicked'), 150);
        }
        
        // Ajouter la classe pour gérer les z-index
        document.body.classList.add('download-modal-open');
        
        // Afficher l'overlay
        if (elements.overlay) {
            elements.overlay.style.display = 'flex';
            
            // Forcer un reflow avant d'ajouter la classe show
            elements.overlay.offsetHeight;
            
            // Démarrer l'animation d'apparition
            setTimeout(() => {
                elements.overlay.classList.add('show');
                state.isAnimating = false;
            }, 10);
        }
        
        // Charger les données
        loadArchivesData();
    }

    /**
     * Cache la modal de téléchargement avec animation
     */
    function hideDownloadModal() {
        if (state.isAnimating || !state.isPopupOpen) return;
        
        state.isAnimating = true;
        
        if (elements.overlay) {
            // Démarrer l'animation de fermeture
            elements.overlay.classList.remove('show');
            
            // Attendre la fin de l'animation avant de cacher
            setTimeout(() => {
                elements.overlay.style.display = 'none';
                document.body.classList.remove('download-modal-open');
                state.isAnimating = false;
                state.isPopupOpen = false;
                
                // Reset du formulaire
                resetForm();
            }, 300);
        }
    }

    /**
     * Ferme la modal (alias pour compatibilité)
     */
    function closePopup() {
        hideDownloadModal();
    }

    /**
     * Charge les données d'archives depuis l'API
     */
    async function loadArchivesData() {
        if (state.isLoading) return;

        try {
            setLoading(true);
            hideError();

            const response = await fetch(CONFIG.API_ENDPOINTS.LIST);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || typeof data !== 'object') {
                throw new Error('Format de données invalide');
            }

            state.archivesData = data;
            populateYearSelector(data);
            
        } catch (error) {
            console.error('[DownloadWidget] Erreur chargement données:', error);
            showError('Impossible de charger la liste des archives');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Remplit le sélecteur d'années
     */
    function populateYearSelector(data) {
        if (!elements.yearSelect) return;

        // Effacer les options existantes
        elements.yearSelect.innerHTML = '<option value="">Choisir une année...</option>';

        // Extraire les années disponibles
        const years = new Set();
        
        if (data.archives && Array.isArray(data.archives)) {
            data.archives.forEach(archive => {
                if (archive.year) {
                    years.add(archive.year);
                }
            });
        }

        // Trier les années par ordre décroissant
        const sortedYears = Array.from(years).sort((a, b) => b - a);

        // Ajouter les options
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year} ${year === new Date().getFullYear() ? '(Année courante)' : ''}`;
            elements.yearSelect.appendChild(option);
        });

        // Sélectionner l'année courante par défaut si disponible
        const currentYear = new Date().getFullYear();
        if (sortedYears.includes(currentYear)) {
            elements.yearSelect.value = currentYear;
            onYearChange();
        }
    }

    /**
     * Gestionnaire changement d'année
     */
    function onYearChange() {
        const year = elements.yearSelect?.value;
        
        if (!year) {
            resetWeekSelector();
            hideSelectionInfo();
            return;
        }

        state.selectedYear = parseInt(year);
        populateWeekSelector(year);
    }

    /**
     * Remplit le sélecteur de semaines
     */
    function populateWeekSelector(year) {
        if (!elements.weekSelect || !state.archivesData) return;

        // Effacer les options existantes
        elements.weekSelect.innerHTML = '<option value="">Choisir une semaine...</option>';
        elements.weekSelect.disabled = false;

        // Filtrer les archives pour l'année sélectionnée
        const yearArchives = state.archivesData.archives?.filter(archive => 
            archive.year === parseInt(year)
        ) || [];

        if (yearArchives.length === 0) {
            elements.weekSelect.innerHTML = '<option value="">Aucune archive pour cette année</option>';
            elements.weekSelect.disabled = true;
            return;
        }

        // Regrouper par trimestre
        const quarters = [
            { name: 'T1 - Janvier à Mars', start: 1, end: 13 },
            { name: 'T2 - Avril à Juin', start: 14, end: 26 },
            { name: 'T3 - Juillet à Septembre', start: 27, end: 39 },
            { name: 'T4 - Octobre à Décembre', start: 40, end: 52 }
        ];

        quarters.forEach(quarter => {
            const quarterArchives = yearArchives.filter(archive => 
                archive.week >= quarter.start && archive.week <= quarter.end
            ).sort((a, b) => a.week - b.week);

            if (quarterArchives.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = quarter.name;

                quarterArchives.forEach(archive => {
                    const option = document.createElement('option');
                    option.value = archive.week;
                    
                    const startDate = getWeekStartDate(year, archive.week);
                    const endDate = getWeekEndDate(year, archive.week);
                    const fileCount = archive.files?.length || 0;
                    
                    option.textContent = `Semaine ${archive.week.toString().padStart(2, '0')} • ${startDate} au ${endDate} • ${fileCount} fichiers`;
                    option.dataset.archive = JSON.stringify(archive);
                    
                    optgroup.appendChild(option);
                });

                elements.weekSelect.appendChild(optgroup);
            }
        });
    }

    /**
     * Gestionnaire changement de semaine
     */
    function onWeekChange() {
        const weekValue = elements.weekSelect?.value;
        
        if (!weekValue) {
            hideSelectionInfo();
            disableDownloadButtons();
            return;
        }

        state.selectedWeek = parseInt(weekValue);
        
        // Récupérer les données de l'archive depuis l'option sélectionnée
        const selectedOption = elements.weekSelect.querySelector(`option[value="${weekValue}"]`);
        if (selectedOption && selectedOption.dataset.archive) {
            try {
                const archiveData = JSON.parse(selectedOption.dataset.archive);
                updateSelectionInfo(archiveData);
                enableDownloadButtons();
            } catch (error) {
                console.error('[DownloadWidget] Erreur parsing archive data:', error);
                showError('Erreur lors de la sélection de la semaine');
            }
        }
    }

    /**
     * Met à jour les informations de sélection
     */
    function updateSelectionInfo(archiveData) {
        if (!elements.selectionInfo) return;

        const { year, week, files = [] } = archiveData;
        const startDate = getWeekStartDate(year, week);
        const endDate = getWeekEndDate(year, week);
        const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

        // Mise à jour des éléments
        if (elements.selectionTitle) {
            elements.selectionTitle.textContent = `Semaine ${week.toString().padStart(2, '0')} - ${year}`;
        }

        if (elements.selectionPeriod) {
            elements.selectionPeriod.textContent = `Période: du ${startDate} au ${endDate}`;
        }

        if (elements.fileCount) {
            elements.fileCount.textContent = `📁 ${files.length} fichiers CSV`;
        }

        if (elements.fileSize) {
            elements.fileSize.textContent = `💾 ${formatFileSize(totalSize)}`;
        }

        showElement(elements.selectionInfo);
    }

    /**
     * Télécharge tous les fichiers de la semaine
     */
    async function downloadWeekArchives() {
        if (!state.selectedYear || !state.selectedWeek) return;

        try {
            const url = `${CONFIG.API_ENDPOINTS.DOWNLOAD}?week=${state.selectedWeek}&year=${state.selectedYear}`;
            
            // Ouvrir dans un nouvel onglet pour déclencher le téléchargement
            window.open(url, '_blank');
            
            // Optionnel: fermer la modal après téléchargement
            setTimeout(() => {
                hideDownloadModal();
            }, 1000);

        } catch (error) {
            console.error('[DownloadWidget] Erreur téléchargement semaine:', error);
            showError('Erreur lors du téléchargement');
        }
    }

    /**
     * Affiche le sélecteur de fichiers individuels
     */
    async function showFileSelector() {
        if (!state.selectedYear || !state.selectedWeek) return;

        try {
            // Récupérer la liste des fichiers pour la semaine
            const response = await fetch(
                `${CONFIG.API_ENDPOINTS.DOWNLOAD}?week=${state.selectedWeek}&year=${state.selectedYear}`
            );

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.files && Array.isArray(data.files)) {
                showFileSelectionDialog(data.files);
            } else {
                throw new Error('Liste de fichiers indisponible');
            }

        } catch (error) {
            console.error('[DownloadWidget] Erreur sélecteur fichiers:', error);
            showError('Impossible de charger la liste des fichiers');
        }
    }

    /**
     * Affiche un dialog de sélection de fichiers
     */
    function showFileSelectionDialog(files) {
        const fileList = files.map(file => `• ${file.name} (${formatFileSize(file.size || 0)})`).join('\n');
        
        const message = `📋 Fichiers disponibles pour la semaine ${state.selectedWeek} - ${state.selectedYear}:\n\n${fileList}\n\nNote: Pour l'instant, utilisez "Télécharger tout" pour obtenir tous les fichiers.\nLa sélection individuelle sera disponible dans une prochaine version.`;
        
        alert(message);
    }

    /**
     * Utilitaires de dates et formatage
     */
    function getWeekStartDate(year, week) {
        const date = new Date(year, 0, 1 + (week - 1) * 7);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }

    function getWeekEndDate(year, week) {
        const date = new Date(year, 0, 1 + (week - 1) * 7 + 6);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Gestion des événements
     */
    function handleKeydown(event) {
        if (event.key === 'Escape' && state.isPopupOpen) {
            closePopup();
        }
    }

    function handleOverlayClick(event) {
        if (event.target === elements.popup) {
            closePopup();
        }
    }

    /**
     * Utilitaires de l'interface
     */
    function setLoading(loading) {
        state.isLoading = loading;
        
        if (loading) {
            showElement(elements.status);
            showElement(elements.loading);
        } else {
            hideElement(elements.loading);
            if (!elements.error?.style.display || elements.error.style.display === 'none') {
                hideElement(elements.status);
            }
        }
    }

    function showError(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
        }
        
        showElement(elements.status);
        showElement(elements.error);
        hideElement(elements.loading);
    }

    function hideError() {
        hideElement(elements.error);
        if (!state.isLoading) {
            hideElement(elements.status);
        }
    }

    function resetForm() {
        state.selectedYear = null;
        state.selectedWeek = null;
        
        if (elements.yearSelect) {
            elements.yearSelect.value = '';
        }
        
        resetWeekSelector();
        hideSelectionInfo();
        disableDownloadButtons();
        hideError();
    }

    function resetWeekSelector() {
        if (elements.weekSelect) {
            elements.weekSelect.innerHTML = '<option value="">Sélectionner d\'abord une année...</option>';
            elements.weekSelect.disabled = true;
        }
    }

    function hideSelectionInfo() {
        hideElement(elements.selectionInfo);
    }

    function enableDownloadButtons() {
        if (elements.downloadAll) {
            elements.downloadAll.disabled = false;
        }
        if (elements.downloadFiles) {
            elements.downloadFiles.disabled = false;
        }
    }

    function disableDownloadButtons() {
        if (elements.downloadAll) {
            elements.downloadAll.disabled = true;
        }
        if (elements.downloadFiles) {
            elements.downloadFiles.disabled = true;
        }
    }

    function showElement(element) {
        if (element) {
            element.style.display = '';
        }
    }

    function hideElement(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    // API publique - OBLIGATOIRE pour le système de chargement
    return {
        init,
        hideDownloadModal,  // Exposé pour fermeture externe si nécessaire
        closePopup: hideDownloadModal  // Alias pour compatibilité
    };

})();