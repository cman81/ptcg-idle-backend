<?php
    require_once "PokemonDB.class.php";

    $sql = "
        SELECT *
        FROM cards
        WHERE type = :pokemon
    ";

    $db = new PokemonDB();
    $stmt = $db->prepare($sql);

    // passing values to the parameters
    $stmt->bindValue(':pokemon', 'pokemon');

    $ret = $stmt->execute();
    while ($row = $ret->fetchArray(SQLITE3_ASSOC)) {
        $result[] = [
            'expansionSet' => $row['expansion_set'],
            'imgSrc' => $row['img_src'],
            'cardName' => $row['card_name'],
        ];
    }

    shuffle($result);

    // nothing longer than 25 characters
    $out = [];
    foreach ($result as $value) {
        if (count($out) == 10) { break; }
        if (strlen($value['cardName']) <= 25) { $out[] = $value; }
    }

    exit(json_encode($out));
