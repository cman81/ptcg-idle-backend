<?php
    require_once "PokemonDB.class.php";
    header('Content-Type: application/json; charset=utf-8');

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
        WHERE expansion_set = %s
        OR expansion_set = %s
    ";

    $db = new PokemonDB();
    $results = $db->query(
        $sql,
        $_GET['expansionSet'],
        $_GET['energyExpansion']
    );
    foreach ($results as $row) {
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