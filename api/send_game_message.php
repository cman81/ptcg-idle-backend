<?php

    require_once "PokemonDB.class.php";
    include_once "helpers.php";

    extract($_POST); // $gameId, $from, $to, $type, $data

    switch ($type) {
        case 'load_game': exit(json_encode(load_game_state($gameId, $from)));
        case 'shuffle': exit(json_encode(shuffle_card_group($gameId, $from, $data)));
        case 'moveTop': exit(json_encode(move_top_card($gameId, $from, $data)));
        case 'moveSpecific': exit(json_encode(move_specific_card($gameId, $from, $data)));
        case 'moveAll': exit(json_encode(move_all($gameId, $from, $data)));
        case 'tuck': exit(json_encode(tuck_card($gameId, $from, $data)));
        case 'showPokemon': exit(json_encode(show_pokemon($gameId, $from)));
        case 'swapCardGroups': exit(json_encode(swapCardGroups($gameId, $from, $data)));
        case 'useDeck': exit(json_encode(use_deck($gameId, $from, $data)));
        case 'setDamageHP': exit(json_encode(set_damage_hp($gameId, $from, $data)));
        case 'setSpecialConditions': exit(json_encode(set_special_conditions($gameId, $from, $data)));
    }

    function load_game_state($game_id, $player_id = FALSE) {
        $db = new PokemonDB();
        $db->busyTimeout(250);

        $sql = "SELECT game_id, game_state FROM games WHERE game_id = :game_id";
        $stmt = $db->prepare($sql);

        // passing values to the parameters
        $stmt->bindValue(':game_id', $game_id);

        $ret = $stmt->execute();
        $result = $ret->fetchArray(SQLITE3_ASSOC);
        $db->close();

        if (empty($result)) {
            $result['game_state'] = json_encode(create_new_game_state($game_id));
        }

        $game_state = json_decode($result['game_state'], TRUE);
        if (!$player_id) {
            return $game_state;
        }

        clear_game_messages($game_id, $player_id);

        $partial_game_state = [
            'player1' => [
                'is_pokemon_hidden' => $game_state['player1']['is_pokemon_hidden'],
                'collection_name' => $game_state['player1']['collection_name'],
            ],
            'player2' => [
                'is_pokemon_hidden' => $game_state['player2']['is_pokemon_hidden'],
                'collection_name' => $game_state['player2']['collection_name'],
            ],
        ];

        $card_groups = [
            'deck',
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
            'lost-zone',
        ];
        $opponent_id = get_opponent_player_id($player_id);
        foreach ($card_groups as $group) {
            if (!empty($game_state[$player_id][$group])) {
                $partial_game_state[$player_id][$group] =
                    render_card_group($game_state, $player_id, $group);
            }

            if (!empty($game_state[$opponent_id][$group])) {
                $partial_game_state[$opponent_id][$group] =
                    render_card_group($game_state, $opponent_id, $group, TRUE);
            }
        }

        return $partial_game_state;
    }

    function get_opponent_player_id($my_player_id) {
        if ($my_player_id == 'player1') {
            return 'player2';
        }

        return 'player1';
    }

    function create_new_game_state($game_id) {
        $db = new PokemonDB();
        $db->busyTimeout(250);

        $sql = "
            INSERT INTO games
            (game_id, game_name, game_state)
            VALUES
            (:game_id, :game_name, :game_state)
        ";
        $stmt = $db->prepare($sql);

        // passing values to the parameters
        $stmt->bindValue(':game_id', $game_id);

        $game_state = initialize_game_state();
        $stmt->bindValue(':game_state', json_encode($game_state));
        
        $stmt->execute();
        $db->close();
        unset($db);

        game_log($game_id, "Game started at " . date("d/m/Y"));

        return $game_state;
    }

    function game_log($game_id, $log_message) {
        $db = new PokemonDB();
        $db->busyTimeout(250);

        $sql = "
            INSERT INTO game_log
            (game_id, timestamp, message)
            VALUES
            (:game_id, :timestamp, :message)
        ";
        $stmt = $db->prepare($sql);

        // passing values to the parameters
        $stmt->bindValue(':game_id', $game_id);
        $stmt->bindValue(':timestamp', time());

        $log_message = trim(preg_replace('/\n\s*/', "\n", $log_message));
        $stmt->bindValue(':message', $log_message);

        $stmt->execute();
        $db->close();
        unset($db);
    }

    function shuffle_card_group($game_id, $player_id, $card_group) {
        $game_state = load_game_state($game_id);

        $old = $new = $game_state[$player_id][$card_group]['cards'];
        shuffle($new);
        $game_state[$player_id][$card_group]['cards'] = $new;

        save_game_state($game_id, $game_state);

        game_log(
            $game_id,
            "
                {$player_id} suffled their
                {$card_group} from
                " . json_encode($old) . "
                to
                " . json_encode($new) . "
            "
        );

        return true;
    }

    function save_game_state($game_id, $game_state) {
        $db = new PokemonDB();
        $db->busyTimeout(250);

        $sql = "
            UPDATE games
            SET game_state = :game_state
            WHERE game_id = :game_id
        ";
        $stmt = $db->prepare($sql);

        // passing values to the parameters
        $stmt->bindValue(':game_id', $game_id);
        $stmt->bindValue(':game_state', json_encode($game_state));
        
        $stmt->execute();
        $db->close();
        unset($db);
    }

    function move_top_card($game_id, $player_id, $data) {
        $game_state = load_game_state($game_id);
        $from = $data['from'];
        $to = $data['to'];

        $this_card = array_pop($game_state[$player_id][$from]['cards']);
        if ($this_card === NULL) { return FALSE; }
        $game_state[$player_id][$to]['cards'][] = $this_card;

        game_log(
            $game_id,
            "
                {$player_id} moved
                {$this_card} from 
                {$from}
                to
                {$to}
            "
        );

        $game_state = process_empty_pokemon_stack($game_state, $player_id, $from);
        
        save_game_state($game_id, $game_state);

        update_opponent_card_group($game_state, $game_id, $player_id, $from);
        update_opponent_card_group($game_state, $game_id, $player_id, $to);

        return [
            $from => render_card_group($game_state, $player_id, $from),
            $to => render_card_group($game_state, $player_id, $to),
        ];
    }

    /**
     * If a card group is revealed (most card groups), return an array of cards. Otherwise, return
     * the number of cards in the group
     */
    function render_card_group($game_state, $player_id, $group_name, $is_opponent = FALSE) {
        $data = $game_state[$player_id][$group_name] ?? [
            'count' => 0,
            'cards' => [],
        ];

        if ($group_name == 'deck') {
            return [
                'count' => count($data['cards'])
            ];
        }

        if ($group_name == 'prize-cards') {
            return [
                'count' => count($data['cards'])
            ];
        }

        if (!$is_opponent) {
            return $data;
        }
        
        if (strpos($group_name, 'hand') !== FALSE) {
            // do not reveal your hand to your opponent
            return [
                'count' => count($data['cards'])
            ];
        }

        if (empty($game_state[$player_id]['is_pokemon_hidden'])) {
            // show pokemon to your opponent when you are ready
            return $data;
        }


        if (strpos($group_name, 'pokemon') !== FALSE) {
            // do not show pokemon at the beginning of the game
            return [
                'count' => count($data['cards'])
            ];
        }

        return $data;
    }

    function move_specific_card($game_id, $player_id, $data) {
        $game_state = load_game_state($game_id);
        $from = $data['from'];
        $card_position = $data['position'];
        $to = $data['to'];
        $reveal = ($data['reveal'] == 'true');

        $card_pick = $game_state[$player_id][$from]['cards'][$card_position];
        unset($game_state[$player_id][$from]['cards'][$card_position]);
        $game_state[$player_id][$from]['cards'] = array_values($game_state[$player_id][$from]['cards']);

        $game_state[$player_id][$to]['cards'][] = $card_pick;

        $game_state = process_empty_pokemon_stack($game_state, $player_id, $from);

        save_game_state($game_id, $game_state);

        update_opponent_card_group($game_state, $game_id, $player_id, $from);
        update_opponent_card_group($game_state, $game_id, $player_id, $to);

        if ($reveal) {
            reveal_card_to_opponent($game_id, $player_id, $card_pick);
        }

        return [
            $from => render_card_group($game_state, $player_id, $from),
            $to => render_card_group($game_state, $player_id, $to),
        ];
    }

    function reveal_card_to_opponent($game_id, $my_player_id, $card_pick) {
        enqueue_game_message(
            $game_id,
            'judge',
            get_opponent_player_id($my_player_id),
            'revealCard',
            $card_pick
        );
    }

    function move_all($game_id, $player_id, $data) {
        $game_state = load_game_state($game_id);
        $from = $data['from'];
        $to = $data['to'];

        $cards = $game_state[$player_id][$from]['cards'];
        $game_state[$player_id][$from]['cards'] = [];
        $game_state[$player_id][$to]['cards'] = array_merge($game_state[$player_id][$to]['cards'], $cards);

        $game_state = process_empty_pokemon_stack($game_state, $player_id, $from);
        
        save_game_state($game_id, $game_state);

        update_opponent_card_group($game_state, $game_id, $player_id, $from);
        update_opponent_card_group($game_state, $game_id, $player_id, $to);

        return [
            $from => render_card_group($game_state, $player_id, $from),
            $to => render_card_group($game_state, $player_id, $to),
        ];
    }

    /**
     * When a player discards all cards from a pokemon stack, reset status, i.e.: damage, conditions
     */
    function process_empty_pokemon_stack($game_state, $player_id, $group) {
        if (strpos($group, 'pokemon') === FALSE) { return $game_state; }
        if (!empty($game_state[$player_id][$group]['cards'])) { return $game_state; }

        if ($group != 'active-pokemon') {
            $game_state[$player_id][$group]['status'] = [];
            return $game_state;
        }

        $game_state[$player_id][$group]['status'] = [
            'conditions' => [
                'asleep' => false,
                'paralyzed' => false,
                'confused' => false,
                'poisoned' => false,
                'burned' => false,
            ],
        ];

        return $game_state;
    }

    function tuck_card($game_id, $player_id, $card_group) {
        $game_state = load_game_state($game_id);

        $card_pick = array_pop($game_state[$player_id][$card_group]['cards']);
        array_unshift($game_state[$player_id][$card_group]['cards'], $card_pick);

        save_game_state($game_id, $game_state);

        update_opponent_card_group($game_state, $game_id, $player_id, $card_group);

        return $game_state[$player_id][$card_group];
    }

    function show_pokemon($game_id, $player_id) {
        $game_state = load_game_state($game_id);

        $game_state[$player_id]['is_pokemon_hidden'] = FALSE;

        save_game_state($game_id, $game_state);

        foreach ($game_state[$player_id] as $group_name => $card_group) {
            if (strpos($group_name, 'pokemon') === FALSE) {
                continue;
            }

            if (empty($card_group['cards'])) {
                continue;
            }

            update_opponent_card_group($game_state, $game_id, $player_id, $group_name);
        }
        
        return TRUE;
    }

    function update_opponent_card_group($game_state, $game_id, $my_player_id, $group_name) {
        enqueue_game_message(
            $game_id,
            'judge',
            get_opponent_player_id($my_player_id),
            'renderCardGroup',
            [
                $group_name => render_card_group($game_state, $my_player_id, $group_name, TRUE)
            ]
        );
    }

    function enqueue_game_message($game_id, $from, $to, $type, $data) {
        $db = new PokemonDB();
        $db->busyTimeout(250);

        $sql = "
            INSERT INTO game_message_queue
            (game_id, timestamp_value, message_from, message_to, type, data)
            VALUES
            (:game_id, :timestamp_value, :message_from, :message_to, :type, :data)
        ";
        $stmt = $db->prepare($sql);

        // passing values to the parameters
        $stmt->bindValue(':game_id', $game_id);
        $stmt->bindValue(':timestamp_value', time());
        $stmt->bindValue(':message_from', $from);
        $stmt->bindValue(':message_to', $to);
        $stmt->bindValue(':type', $type);
        $stmt->bindValue(':data', json_encode($data));
        
        $stmt->execute();
        $db->close();
        unset($db);
    }

    function swapCardGroups($game_id, $player_id, $data) {
        $game_state = load_game_state($game_id);
        $groupA = $data['groupA'];
        $groupB = $data['groupB'];

        $temp = $game_state[$player_id][$groupA];
        $game_state[$player_id][$groupA] = $game_state[$player_id][$groupB];
        $game_state[$player_id][$groupB] = $temp;

        if ($groupA != 'active-pokemon') {
            unset($game_state[$player_id][$groupA]['status']['conditions']);
        }
        if ($groupB != 'active-pokemon') {
            unset($game_state[$player_id][$groupB]['status']['conditions']);
        }
        
        save_game_state($game_id, $game_state);

        update_opponent_card_group($game_state, $game_id, $player_id, $groupA);
        update_opponent_card_group($game_state, $game_id, $player_id, $groupB);

        return [
            $groupA => render_card_group($game_state, $player_id, $groupA),
            $groupB => render_card_group($game_state, $player_id, $groupB),
        ];
    }

    function use_deck($game_id, $my_player_id, $data) {
        $game_state = load_game_state($game_id);
        $collection_name = $data['collectionName'];

        $game_state[$my_player_id]['collection_name'] = $collection_name;

        save_game_state($game_id, $game_state);

        enqueue_game_message(
            $game_id,
            'judge',
            get_opponent_player_id($my_player_id),
            'setOpponentDeck',
            $collection_name
        );

        return $collection_name;
    }

    function set_damage_hp($game_id, $my_player_id, $data) {
        $game_state = load_game_state($game_id);
        $target_player_id = $data['targetPlayerId'];
        $card_group = $data['cardGroup'];
        $damage = $data['damage'];
        $hp = $data['hp'];

        $game_state[$target_player_id][$card_group]['status']['damage'] = $damage;
        $game_state[$target_player_id][$card_group]['status']['hp'] = $hp;
        
        save_game_state($game_id, $game_state);

        enqueue_game_message(
            $game_id,
            'judge',
            get_opponent_player_id($my_player_id),
            'setDamageHP',
            $data
        );

        return TRUE;
    }

    function set_special_conditions($game_id, $my_player_id, $data) {
        $game_state = load_game_state($game_id);
        $target_player_id = $data['playerId'];

        $sanitized_data = [];
        foreach ($data as $key => $value) {
            if ($value == 'true') {
                $sanitized_data[$key] = TRUE;
                continue;
            }
            if ($value == 'false') {
                $sanitized_data[$key] = FALSE;
                continue;
            }
            $sanitized_data[$key] = $value;
        }

        $game_state[$target_player_id]['active-pokemon']['status']['conditions'] = [
            'asleep' => $sanitized_data['asleep'],
            'paralyzed' => $sanitized_data['paralyzed'],
            'confused' => $sanitized_data['confused'],
            'poisoned' => $sanitized_data['poisoned'],
            'burned' => $sanitized_data['burned'],
        ];

        save_game_state($game_id, $game_state);

        enqueue_game_message(
            $game_id,
            'judge',
            get_opponent_player_id($my_player_id),
            'setSpecialConditions',
            $sanitized_data
        );

        return TRUE;
    }
