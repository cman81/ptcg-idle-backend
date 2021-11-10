<?php
    require_once "PokemonDB.class.php";
    header('Content-Type: application/json; charset=utf-8');

    $db = new PokemonDB();
    if(!$db) {
        $out = [
            'status' => 'error',
            'statusMessage' => 'cannot connect to database'
        ];
        exit(json_encode($out));
    }

    // SQL statement to update status of a task to completed
    $sql = "
        UPDATE profiles
        SET cash_added = %d,
            wallet = %d,
            packs_opened = %i,
            last_updated = %i,
        WHERE profile_id = %s
    ";
    $db->query(
        $sql,
        $_POST['cashAdded'],
        $_POST['wallet'],
        $_POST['packsOpened'],
        time(),
        $_POST['name']
    );

    $out = [
        'status' => 'success',
        'statusMessage' => 'profile updated'
    ];
    exit(json_encode($out));
