<?php
    require_once "PokemonDB.class.php";
    include_once "helpers.php";
    header('Content-Type: application/json; charset=utf-8');

    $db = new PokemonDB();
    if(!$db) {
        $out = [
            'status' => 'error',
            'statusMessage' => 'cannot connect to database'
        ];
        exit(json_encode($out));
    }

    exit(json_encode(load_collection($_GET['collectionId'])));
