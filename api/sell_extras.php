<?php
    require_once "PokemonDB.class.php";

    $db = new PokemonDB();
    if(!$db) {
        $out = [
            'status' => 'error',
            'statusMessage' => 'cannot connect to database'
        ];
        exit(json_encode($out));
    }

    $sql = "
        DELETE FROM card_collection_map
        WHERE ownership_id IN (
            SELECT ownership_id
            FROM card_collection_map
            WHERE collection_id = :collection_id
            AND card = :card
            LIMIT :quantity
        );
    ";
    $stmt = $db->prepare($sql);

    // passing values to the parameters
    $stmt->bindValue(':collection_id', $_GET['name']);
    $stmt->bindValue(':card', $_GET['cardId']);
    $stmt->bindValue(':quantity', $_GET['sellQty']);

    // execute the update statement
    $stmt->execute();

    $out = [
        'status' => 'success',
        'statusMessage' => "{$_GET['sellQty']} cards sold from the collection of {$_GET['name']}"
    ];
    exit(json_encode($out));
