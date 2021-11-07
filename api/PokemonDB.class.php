<?php
    class PokemonDB extends SQLite3 {
        function __construct() {
            $this->open('../db/pokemon.db');
        }
    }