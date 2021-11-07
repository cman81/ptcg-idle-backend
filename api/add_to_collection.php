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

    if (filter_var($_POST['isNew'], FILTER_VALIDATE_BOOLEAN)) {
        $status = create_collection($_POST['collectionId'], $_POST['profileId'], $_POST['boxArt']);
        if ($status != true) {
            exit(json_encode($status));
        }
    }
    if (filter_var($_POST['isReplace'], FILTER_VALIDATE_BOOLEAN)) {
        $status = delete_cards_from_collection($_POST['collectionId']);
        if ($status != true) {
            exit(json_encode($status));
        }
    }

    // SQL statement to update status of a task to completed
    $count = 0;
    foreach ($_POST['cards'] as $this_card) {
        if (empty($this_card['quantity'])) {
            continue;
        }

        for ($i = 0; $i < $this_card['quantity']; $i++) {
            $sql = "
                INSERT INTO card_collection_map (collection_id, card)
                VALUES (:collection_id, :card)
            ";
            $stmt = $db->prepare($sql);

            // passing values to the parameters
            $stmt->bindValue(':collection_id', $_POST['collectionId']);
            $stmt->bindValue(':card', $this_card['cardId']);

            // execute the update statement
            if ($stmt->execute()) {
                $count++;
            }
        }
    }

    $out = [
        'status' => 'success',
        'statusMessage' => "{$count} cards added to the collection called: {$_POST['collectionId']}"
    ];
    exit(json_encode($out));
