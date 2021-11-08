<?php
    require_once "PokemonDB.class.php";
    include_once "helpers.php";

    $db = new PokemonDB();
    if(!$db) {
        $out = [
            'status' => 'error',
            'statusMessage' => 'cannot connect to database'
        ];
        exit(json_encode($out));
    }

    $out = [];

    $sql = "SELECT * FROM profiles WHERE profile_id = %s";
    $results = $db->query(
        $sql,
        $_GET['name']
    );
    foreach ($results as $row) {
        $out['profileId'] = $row['profile_id'];
        $out['cashAdded'] = $row['cash_added'];
        $out['wallet'] = $row['wallet'];
        $out['packsOpened'] = $row['packs_opened'];
        break;
    }

    if (empty($out['profileId'])) {
        $out = [
            'status' => 'error',
            'statusMessage' => 'cannot find user: ' . $_GET['name']
        ];
        exit(json_encode($out));
    }

    $out['collection'] = load_collection($_GET['name']);

    exit(json_encode($out));
