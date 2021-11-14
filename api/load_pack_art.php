<?php
    require_once "PokemonDB.class.php";
    header('Content-Type: application/json; charset=utf-8');

    $sql = "
        SELECT *
        FROM pack_art
        WHERE expansion_set = %s
    ";

    $db = new PokemonDB();
    $results = $db->query(
        $sql,
        $_GET['expansionSet']
    );
    foreach ($results as $row) {
        $out[] = $row['filename'];
    }

    exit(json_encode($out));