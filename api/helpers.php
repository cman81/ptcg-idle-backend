<?php

function delete_cards_from_collection($collection_id) {
    $db = $GLOBALS['db'];

    $sql = "
        DELETE FROM card_collection_map
        WHERE collection_id = :collection_id
    ";
    $stmt = $db->prepare($sql);

    // passing values to the parameters
    $stmt->bindValue(':collection_id', $collection_id);

    // execute the update statement
    if (!$stmt->execute()) {
        return [
            'status' => 'error',
            'statusMessage' => 'unable to delete cards from collection'
        ];   
    }

    return true;
}

function create_collection($collection_id, $profile_id, $box_art) {
    $db = $GLOBALS['db'];

    $sql = "
        INSERT INTO collections
        (profile_id, collection_name, collection_type, box_art)
        VALUES
        (:profile_id, :collection_name, :collection_type, :box_art)
    ";
    $stmt = $db->prepare($sql);

    // passing values to the parameters
    $stmt->bindValue(':profile_id', $profile_id);
    $stmt->bindValue(':collection_name', $collection_id);
    $stmt->bindValue(':collection_type', 'deck');
    $stmt->bindValue(':box_art', $box_art);

    // execute the update statement
    if (!$stmt->execute()) {
        return [
            'status' => 'error',
            'statusMessage' => 'unable to create collection'
        ];   
    }

    return true;
}

function load_collection($collection_id) {
    $db = $GLOBALS['db'];

    $collection = [];
    $sql = "
        SELECT ccm.collection_id, ccm.card, c.rarity, c.market_value, c.expansion_set, c.img_src
        FROM card_collection_map ccm
        INNER JOIN cards c ON c.card_id = ccm.card
        WHERE ccm.collection_id = :collection_id
    ";

    $stmt = $db->prepare($sql);

    // passing values to the parameters
    $stmt->bindValue(':collection_id', $collection_id);

    $ret = $stmt->execute();

    while($row = $ret->fetchArray(SQLITE3_ASSOC) ) {
        $key = $row['card'];

        if (isset($collection[$key])) {
            // this card is a duplicate
            $collection[$key]['quantity']++;
            continue;
        }

        // this card is a unique
        $collection[$key] = [
            'cardId' => $row['card'],
            'rarity' => get_friendly_rarity_name($row['rarity']),
            'quantity' => 1,
            'marketValue' => $row['market_value'] ?? 0,
            'expansionSet' => $row['expansion_set'],
            'imgSrc' => $row['img_src'],
        ];
    }

    return array_values($collection);
}

function get_friendly_rarity_name($rarity_id) {
    return substr($rarity_id, 3);
}

function flip_coin() {
    return rand(0, 1) == 1;
}

function initialize_game_state() {
    $player1_deck = range(0, 59);
    shuffle($player1_deck);

    $player2_deck = range(0, 59);
    shuffle($player2_deck);

    $game_state = [
        'isPlayer1sTurn' => flip_coin(),
        'player1' => [
            'collection_name' => '',
            'is_pokemon_hidden' => TRUE,
            'deck' => [
                'cards' => $player1_deck,
            ],
        ],
        'player2' => [
            'collection_name' => '',
            'is_pokemon_hidden' => TRUE,
            'deck' => [
                'cards' => $player2_deck,
            ],
        ],
    ];

    $cardGroups = [
        'hand-1',
        'hand-2',
        'discard',
        'active-pokemon',
        'bench-pokemon-1',
        'bench-pokemon-2',
        'bench-pokemon-3',
        'bench-pokemon-4',
        'bench-pokemon-5',
        'prize-cards',
        'stadium',
        'lost-zone'
    ];
    foreach ($cardGroups as $value) {
        $game_state['player1'][$value] = ['cards' => []];
        $game_state['player2'][$value] = ['cards' => []];

        if (strpos($value, 'pokemon') !== FALSE) {
            $game_state['player1'][$value]['status'] = [];
            $game_state['player2'][$value]['status'] = [];
        }

        if ($value == 'active-pokemon') {
            $game_state['player1'][$value]['status']['conditions'] = [];
            $game_state['player2'][$value]['status']['conditions'] = [];
        }
    }

    return $game_state;
}

function get_game_messages($game_id, $recipient) {
    $out = [];

    $db = new PokemonDB();
    $db->busyTimeout(250);

    $sql = "
        SELECT message_from, type, data
        FROM game_message_queue
        WHERE message_to = :message_to
        AND game_id = :game_id
        ORDER BY timestamp_value ASC
    ";    
    $stmt = $db->prepare($sql);

    // passing values to the parameters
    $stmt->bindValue(':message_to', $recipient);
    $stmt->bindValue(':game_id', $game_id);

    $ret = $stmt->execute();
    while ($row = $ret->fetchArray(SQLITE3_ASSOC)) {
        $out[] = [
            'message_from' => $row['message_from'],
            'type' => $row['type'],
            'data' => json_decode($row['data'], TRUE),
        ];
    }

    clear_game_messages($game_id, $recipient);

    return $out;
}

function clear_game_messages($game_id, $recipient) {
    $db = new PokemonDB();
    $db->busyTimeout(250);    

    $sql = "
        DELETE FROM game_message_queue
        WHERE message_to = :message_to
        AND game_id = :game_id
    ";    
    $stmt = $db->prepare($sql);

    // passing values to the parameters
    $stmt->bindValue(':message_to', $recipient);
    $stmt->bindValue(':game_id', $game_id);

    $stmt->execute();   
}
