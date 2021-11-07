<?php
    require_once "PokemonDB.class.php";

    $out = [
        'energyCards' => [],
        'commonCards' => [],
        'uncommonCards' => [],
        'rareCards' => [],
        'rareHoloCards' => [],
        'rareUltraCards' => [],
        'rareSecretCards' => [],
    ];

    $json_field_map = [
        '00 energy' => 'energyCards',
        '01 common' => 'commonCards',
        '02 uncommon' => 'uncommonCards',
        '03 rare' => 'rareCards',
        '04 rare holo' => 'rareHoloCards',
        '05 rare ultra' => 'rareUltraCards',
        '06 rare secret' => 'rareSecretCards',
    ];

    $sql = "
        SELECT *
        FROM cards
        WHERE expansion_set = :expansion_set
        OR expansion_set = :energy_expansion
    ";

    $db = new PokemonDB();
    $stmt = $db->prepare($sql);

    // passing values to the parameters
    $stmt->bindValue(':expansion_set', $_GET['expansionSet']);
    $stmt->bindValue(':energy_expansion', $_GET['energyExpansion']);

    $ret = $stmt->execute();
    while ($row = $ret->fetchArray(SQLITE3_ASSOC)) {
        $rarity = $row['rarity'];
        $key = $json_field_map[$rarity];
        $out[$key][] = [
            'expansionSet' => $row['expansion_set'],
            'cardId' => $row['card_id'],
            'marketValue' => $row['market_value'],
            'imgSrc' => $row['img_src']
        ];
    }

    exit(json_encode($out));