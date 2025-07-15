/**
 * Widget Download Button - Logique harmonisée avec rebootbutton
 * Animations et comportements identiques (sans timer auto-close)
 */

window.downloadbutton = (function() {
    'use strict';

    // Variables du widget
    let widgetElement;
    let elements = {};
    let isAnimating = false; // Prévenir les animations multiples - IDENTIQUE REBOOTBUTTON
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
     * Initialisation du widget - PATTERN IDENTIQUE REBOOTBUTTON
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
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('downloadbutton', {
                        update: () => {} // Pas de mise à jour pour ce widget
                    }, []);
                }
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
            cancelBtn: widgetElement.querySelector('#download-cancel-btn'),
            confirmBtn: widgetElement.querySelector('#download-confirm-btn'),
            yearSelect: widgetElement.querySelector('#downloadYearSelect'),
            weekSelect: widgetElement.querySelector('#downloadWeekSelect'),
            selectionInfo: widgetElement.querySelector('#downloadSelectionInfo'),
            selectionTitle: widgetElement.querySelector('#downloadSelectionTitle'),
            selectionPeriod: widgetElement.querySelector('#downloadSelectionPeriod'),
            fileCount: widgetElement.querySelector('#downloadFileCount'),
            fileSize: widgetElement.querySelector('#downloadFileSize'),
            progressContainer: widgetElement.querySelector('#downloadProgressContainer'),
            progressFill: widgetElement.querySelector('#downloadProgressFill'),
            progressText: widgetElement.querySelector('#downloadProgressText')
        };
    }

    /**
     * Liaison des événements - PATTERN IDENTIQUE REBOOTBUTTON
     */
    function bindEvents() {
        // Bouton principal
        if (elements.button) {
            elements.button.addEventListener('click', showDownloadModal);
        }
        
        // Bouton Annuler
        if (elements.cancelBtn) {
            elements.cancelBtn.addEventListener('click', hideDownloadModal);
        }
        
        // Bouton Télécharger
        if (elements.confirmBtn) {
            elements.confirmBtn.addEventListener('click', executeDownload);
        }
        
        // Fermeture par clic en dehors - IDENTIQUE REBOOTBUTTON
        if (elements.overlay) {
            elements.overlay.addEventListener('click', function(e) {
                if (e.target === elements.overlay) {
                    hideDownloadModal();
                }
            });
        }
        
        // Sélecteurs
        if (elements.yearSelect) {
            elements.yearSelect.addEventListener('change', handleYearChange);
        }
        
        if (elements.weekSelect) {
            elements.weekSelect.addEventListener('change', handleWeekChange);
        }
        
        // Support global du clavier - IDENTIQUE REBOOTBUTTON
        document.addEventListener('keydown', handleGlobalKeyPress);
        
        // Charger les données d'archives au démarrage
        loadArchivesData();
    }

    /**
     * Affichage de la modal - LOGIQUE IDENTIQUE REBOOTBUTTON
     */
    function showDownloadModal() {
        console.log('[DownloadWidget] Ouverture de la modal de téléchargement');
        
        if (elements.overlay && !isAnimating) {
            isAnimating = true;
            
            // IMPORTANT : Ajouter la classe modal-open au body pour gérer les z-index
            document.body.classList.add('modal-open');
            
            // Afficher la modal (display flex d'abord)
            elements.overlay.style.display = 'flex';
            
            // Reset des valeurs
            resetModalState();
            
            // Forcer un reflow pour que le navigateur traite le display: flex
            elements.overlay.offsetHeight;
            
            // Puis ajouter la classe show pour déclencher l'animation
            setTimeout(() => {
                elements.overlay.classList.add('show');
                isAnimating = false;
                state.isPopupOpen = true;
            }, 10);
        }
    }

    /**
     * Fermeture de la modal - LOGIQUE IDENTIQUE REBOOTBUTTON
     */
    function hideDownloadModal() {
        console.log('[DownloadWidget] Fermeture de la modal de téléchargement');
        
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
                state.isPopupOpen = false;
                
                // Reset de l'état de téléchargement
                hideProgressContainer();
            }, 300); // Correspond à la durée de transition CSS
        }
    }

    /**
     * Reset de l'état de la modal
     */
    function resetModalState() {
        if (elements.yearSelect) elements.yearSelect.value = '';
        if (elements.weekSelect) {
            elements.weekSelect.value = '';
            elements.weekSelect.disabled = true;
        }
        if (elements.confirmBtn) elements.confirmBtn.disabled = true;
        if (elements.selectionInfo) elements.selectionInfo.style.display = 'none';
        hideProgressContainer();
    }

    /**
     * Gestion des touches globales - IDENTIQUE REBOOTBUTTON
     */
    function handleGlobalKeyPress(e) {
        if (state.isPopupOpen) {
            if (e.key === 'Escape') {
                e.preventDefault();
                hideDownloadModal();
            }
        }
    }

    /**
     * Changement d'année
     */
    function handleYearChange() {
        const selectedYear = elements.yearSelect.value;
        
        if (selectedYear && state.archivesData && state.archivesData[selectedYear]) {
            // Activer et remplir le sélecteur de semaine
            elements.weekSelect.disabled = false;
            elements.weekSelect.innerHTML = '<option value="">Choisir une semaine...</option>';
            
            // Trier les semaines par numéro
            const weeks = Object.keys(state.archivesData[selectedYear]).sort((a, b) => {
                return parseInt(a.replace('week_', '')) - parseInt(b.replace('week_', ''));
            });
            
            weeks.forEach(weekKey => {
                const weekData = state.archivesData[selectedYear][weekKey];
                const weekNumber = weekKey.replace('week_', '');
                const option = document.createElement('option');
                option.value = weekKey;
                option.textContent = `Semaine ${weekNumber} (${weekData.start_date} → ${weekData.end_date})`;
                elements.weekSelect.appendChild(option);
            });
            
            state.selectedYear = selectedYear;
        } else {
            elements.weekSelect.disabled = true;
            elements.weekSelect.innerHTML = '<option value="">Sélectionner d\'abord une année...</option>';
            state.selectedYear = null;
        }
        
        // Reset de la sélection de semaine
        state.selectedWeek = null;
        elements.confirmBtn.disabled = true;
        elements.selectionInfo.style.display = 'none';
    }

    /**
     * Changement de semaine
     */
    function handleWeekChange() {
        const selectedWeek = elements.weekSelect.value;
        
        if (selectedWeek && state.selectedYear && state.archivesData[state.selectedYear][selectedWeek]) {
            const weekData = state.archivesData[state.selectedYear][selectedWeek];
            state.selectedWeek = selectedWeek;
            
            // Afficher les informations de sélection
            updateSelectionInfo(weekData);
            elements.selectionInfo.style.display = 'block';
            elements.confirmBtn.disabled = false;
        } else {
            state.selectedWeek = null;
            elements.selectionInfo.style.display = 'none';
            elements.confirmBtn.disabled = true;
        }
    }

    /**
     * Mise à jour des informations de sélection
     */
    function updateSelectionInfo(weekData) {
        const weekNumber = state.selectedWeek.replace('week_', '');
        
        elements.selectionTitle.textContent = `Semaine ${weekNumber} - Année ${state.selectedYear}`;
        elements.selectionPeriod.textContent = `Période: du ${weekData.start_date} au ${weekData.end_date}`;
        elements.fileCount.textContent = `📁 ${weekData.file_count} fichiers`;
        elements.fileSize.textContent = `💾 ${formatFileSize(weekData.total_size)}`;
    }

    /**
     * Formatage de la taille des fichiers
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Exécution du téléchargement
     */
    function executeDownload() {
        if (!state.selectedYear || !state.selectedWeek) {
            console.error('[DownloadWidget] Aucune sélection valide pour le téléchargement');
            return;
        }
        
        console.log(`[DownloadWidget] Début du téléchargement - Année: ${state.selectedYear}, Semaine: ${state.selectedWeek}`);
        
        // Afficher la progression
        showProgressContainer();
        
        // Désactiver le bouton de téléchargement
        elements.confirmBtn.disabled = true;
        
        // Construire l'URL de téléchargement
        const downloadUrl = `${CONFIG.API_ENDPOINTS.DOWNLOAD}?year=${encodeURIComponent(state.selectedYear)}&week=${encodeURIComponent(state.selectedWeek)}`;
        
        // Simuler une progression puis déclencher le téléchargement
        simulateProgress(() => {
            // Créer un lien de téléchargement invisible
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `archives_${state.selectedYear}_${state.selectedWeek}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Fermer la modal après un délai
            setTimeout(() => {
                hideDownloadModal();
            }, 1000);
        });
    }

    /**
     * Affichage du conteneur de progression
     */
    function showProgressContainer() {
        if (elements.progressContainer) {
            elements.progressContainer.style.display = 'block';
            elements.progressFill.style.width = '0%';
            elements.progressText.textContent = '0%';
        }
    }

    /**
     * Masquage du conteneur de progression
     */
    function hideProgressContainer() {
        if (elements.progressContainer) {
            elements.progressContainer.style.display = 'none';
        }
        if (elements.confirmBtn) {
            elements.confirmBtn.disabled = (state.selectedYear && state.selectedWeek) ? false : true;
        }
    }

    /**
     * Simulation de progression
     */
    function simulateProgress(callback) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                if (callback) callback();
            }
            
            if (elements.progressFill) {
                elements.progressFill.style.width = progress + '%';
            }
            if (elements.progressText) {
                elements.progressText.textContent = Math.round(progress) + '%';
            }
        }, 200);
    }

    /**
     * Chargement des données d'archives
     */
    function loadArchivesData() {
        console.log('[DownloadWidget] Chargement des données d\'archives...');
        
        fetch(CONFIG.API_ENDPOINTS.LIST)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                state.archivesData = data;
                populateYearSelector();
                console.log('[DownloadWidget] Données d\'archives chargées avec succès');
            })
            .catch(error => {
                console.error('[DownloadWidget] Erreur lors du chargement des archives:', error);
                
                // Données de fallback pour les tests
                state.archivesData = generateFallbackData();
                populateYearSelector();
            });
    }

    /**
     * Remplissage du sélecteur d'année
     */
    function populateYearSelector() {
        if (!elements.yearSelect || !state.archivesData) return;
        
        elements.yearSelect.innerHTML = '<option value="">Choisir une année...</option>';
        
        const years = Object.keys(state.archivesData).sort().reverse();
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            elements.yearSelect.appendChild(option);
        });
    }

    /**
     * Génération de données de fallback pour les tests
     */
    function generateFallbackData() {
        const fallbackData = {};
        const currentYear = new Date().getFullYear();
        
        for (let year = currentYear - 1; year <= currentYear; year++) {
            fallbackData[year] = {};
            for (let week = 1; week <= 52; week++) {
                const startDate = getWeekStart(year, week);
                const endDate = getWeekEnd(year, week);
                
                fallbackData[year][`week_${week}`] = {
                    start_date: startDate,
                    end_date: endDate,
                    file_count: Math.floor(Math.random() * 50) + 10,
                    total_size: Math.floor(Math.random() * 10000000) + 1000000
                };
            }
        }
        
        return fallbackData;
    }

    /**
     * Calcul du début d'une semaine
     */
    function getWeekStart(year, week) {
        const firstDayOfYear = new Date(year, 0, 1);
        const days = (week - 1) * 7;
        const weekStart = new Date(firstDayOfYear.getTime() + days * 24 * 60 * 60 * 1000);
        return weekStart.toISOString().split('T')[0];
    }

    /**
     * Calcul de la fin d'une semaine
     */
    function getWeekEnd(year, week) {
        const firstDayOfYear = new Date(year, 0, 1);
        const days = (week - 1) * 7 + 6;
        const weekEnd = new Date(firstDayOfYear.getTime() + days * 24 * 60 * 60 * 1000);
        return weekEnd.toISOString().split('T')[0];
    }

    // Interface publique
    return {
        init: init
    };

})();