<?php
    require_once "PokemonDB.class.php";

    $out = [];

    $sql = "SELECT * FROM collections WHERE collection_type = :collection_type";

    $db = new PokemonDB();
    $stmt = $db->prepare($sql);

    // passing values to the parameters
    $stmt->bindValue(':collection_type', 'deck');

    $ret = $stmt->execute();
    while ($row = $ret->fetchArray(SQLITE3_ASSOC)) {
        $out[] = [
            'collectionId' => $row['collection_id'],
            'profileId' => $row['profile_id'],
            'collectionName' => $row['collection_name'],
            'boxArt' => $row['box_art'],
        ];
    }

    exit(json_encode($out));
