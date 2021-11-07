<?php
    require_once "PokemonDB.class.php";
    include_once "helpers.php";

    $out = get_game_messages($_GET['gameId'], $_GET['recipient']);

    exit(json_encode($out));
