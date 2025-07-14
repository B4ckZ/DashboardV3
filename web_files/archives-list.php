<?php
/**
 * MaxLink Dashboard - Liste des archives disponibles
 * Scanne le dossier Archives et retourne la structure JSON
 * Version ultra-simple PHP pur
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Configuration
$archivesPath = '/home/prod/Documents/traçabilité/Archives';

try {
    $archives = [];
    
    // Vérifier que le dossier existe
    if (!is_dir($archivesPath)) {
        echo json_encode([]);
        exit;
    }
    
    // Scanner les dossiers d'années
    $yearDirs = glob($archivesPath . '/*', GLOB_ONLYDIR);
    
    foreach ($yearDirs as $yearDir) {
        $year = basename($yearDir);
        
        // Vérifier que c'est bien une année (4 chiffres)
        if (!preg_match('/^\d{4}$/', $year)) {
            continue;
        }
        
        $weeks = [];
        
        // Scanner les fichiers CSV de cette année
        $csvFiles = glob($yearDir . '/S*_' . $year . '_*.csv');
        
        foreach ($csvFiles as $csvFile) {
            $filename = basename($csvFile);
            
            // Parser le nom de fichier : S##_YYYY_machine.csv
            if (preg_match('/^S(\d+)_' . $year . '_.*\.csv$/', $filename, $matches)) {
                $week = intval($matches[1]);
                if ($week >= 1 && $week <= 53) {
                    $weeks[] = $week;
                }
            }
        }
        
        // Supprimer les doublons et trier par semaine décroissante
        $weeks = array_unique($weeks);
        rsort($weeks);
        
        if (!empty($weeks)) {
            $archives[$year] = $weeks;
        }
    }
    
    // Trier par année décroissante
    krsort($archives);
    
    echo json_encode($archives);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lecture archives: ' . $e->getMessage()]);
}
?>