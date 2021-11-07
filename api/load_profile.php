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

    if ($_GET['name'] == 'dad') {
        load_parent_profile($db);
    }

    $out = [];

    $sql = "SELECT * FROM profiles WHERE profile_id = '" . $_GET['name'] . "'";
    $ret = $db->query($sql);
    while($row = $ret->fetchArray(SQLITE3_ASSOC) ) {
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

    function load_parent_profile($db) {
        $out = [
            'profileId' => 'dad',
            'cashAdded' => 0,
            'wallet' => 0,
            'packsOpened' => 0,
            'collection' => []
        ];

        $sql = "
            SELECT c.card_id, c.rarity, c.market_value, c.expansion_set, c.img_src
            FROM cards c
        ";
        $stmt = $db->prepare($sql);
        $ret = $stmt->execute();

        while($row = $ret->fetchArray(SQLITE3_ASSOC) ) {
            $out['collection'][] = [
                'cardId' => $row['card_id'],
                'rarity' => get_friendly_rarity_name($row['rarity']),
                'quantity' => 1,
                'marketValue' => $row['market_value'] ?? 0,
                'expansionSet' => $row['expansion_set'],
                'imgSrc' => $row['img_src'],
            ];
        }

        exit(json_encode($out));
    }
