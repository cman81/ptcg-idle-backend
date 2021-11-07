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

    $sql = "SELECT * FROM card_collection_map";

    $db = new PokemonDB();
    $stmt = $db->prepare($sql);

    $fix_count = 0;
    $ret = $stmt->execute();
    while ($row = $ret->fetchArray(SQLITE3_ASSOC)) {
        $new_value = $row['card'];
        $new_value = explode('/', $new_value);
        $new_value = $new_value[1];
        if (empty($new_value)) {
            continue;
        }

        $sql = "
            UPDATE card_collection_map
            SET card = :card
            WHERE ownership_id = :ownership_id
        ";
        $stmt = $db->prepare($sql);

        // passing values to the parameters
        $stmt->bindValue(':card', $new_value);
        $stmt->bindValue(':ownership_id', $row['ownership_id']);

        // execute the update statement
        if ($stmt->execute()) {
            $fix_count++;
        }
    }

    echo "{$fix_count} cards fixed.";