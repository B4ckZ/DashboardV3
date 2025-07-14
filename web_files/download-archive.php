<?php
/**
 * MaxLink Dashboard - Téléchargement d'archives
 * Crée un ZIP avec tous les fichiers CSV d'une semaine donnée
 * Version ultra-simple PHP pur
 */

// Configuration
$archivesPath = '/home/prod/Documents/traçabilité/Archives';

// Récupérer les paramètres
$year = isset($_GET['year']) ? intval($_GET['year']) : 0;
$week = isset($_GET['week']) ? intval($_GET['week']) : 0;

// Validation des paramètres
if ($year < 2020 || $year > 2030) {
    http_response_code(400);
    die('Année invalide');
}

if ($week < 1 || $week > 53) {
    http_response_code(400);
    die('Semaine invalide');
}

try {
    // Chemin du dossier de l'année
    $yearPath = $archivesPath . '/' . $year;
    
    if (!is_dir($yearPath)) {
        http_response_code(404);
        die('Année non trouvée dans les archives');
    }
    
    // Chercher tous les fichiers de cette semaine
    $weekPattern = sprintf('S%02d_%d_*.csv', $week, $year);
    $weekFiles = glob($yearPath . '/' . $weekPattern);
    
    if (empty($weekFiles)) {
        http_response_code(404);
        die('Aucun fichier trouvé pour cette semaine');
    }
    
    // Créer un fichier ZIP temporaire
    $tempZip = tempnam(sys_get_temp_dir(), 'maxlink_archive_');
    $zip = new ZipArchive();
    
    if ($zip->open($tempZip, ZipArchive::CREATE) !== TRUE) {
        http_response_code(500);
        die('Impossible de créer le fichier ZIP');
    }
    
    // Ajouter tous les fichiers au ZIP
    foreach ($weekFiles as $filePath) {
        $fileName = basename($filePath);
        $zip->addFile($filePath, $fileName);
    }
    
    $zip->close();
    
    // Préparer le téléchargement
    $zipFileName = sprintf('MaxLink_S%02d_%d_Archives.zip', $week, $year);
    
    // Headers pour le téléchargement
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
    header('Content-Length: ' . filesize($tempZip));
    header('Cache-Control: no-cache, must-revalidate');
    header('Expires: 0');
    
    // Envoyer le fichier
    readfile($tempZip);
    
    // Nettoyer le fichier temporaire
    unlink($tempZip);
    
} catch (Exception $e) {
    http_response_code(500);
    die('Erreur serveur: ' . $e->getMessage());
}
?>