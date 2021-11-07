<?php
    require_once "db.class.php";

    class PokemonDB extends MeekroDB {
        function __construct() {
            // mysql://[user]:[pw]@[host]/[dbname]?reconnect=true
            list($junk, $connection_string) = explode('mysql://', $_ENV['CLEARDB_DATABASE_URL']);
            list($credentials, $host) = explode('@', $connection_string);
            
            // [user]:[pw]
            list($user, $password) = explode(':', $credentials);
            
            // [host]/[dbname]?reconnect=true
            list($host, $db_name) = explode('/', $host);
            
            // [dbname]?reconnect=true
            list($db_name, $junk) = explode('?', $db_name);
            parent::__construct($host, $user, $password, $db_name);
        }
    }