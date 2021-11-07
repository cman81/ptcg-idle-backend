BEGIN TRANSACTION;
DROP TABLE IF EXISTS "collections";
CREATE TABLE IF NOT EXISTS "collections" (
	"collection_id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"profile_id"	TEXT,
	"collection_name"	TEXT UNIQUE,
	"collection_type"	TEXT,
	"box_art"	TEXT
);
DROP TABLE IF EXISTS "card_collection_map";
CREATE TABLE IF NOT EXISTS "card_collection_map" (
	"ownership_id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"collection_id"	TEXT,
	"card"	TEXT
);
DROP TABLE IF EXISTS "cards";
CREATE TABLE IF NOT EXISTS "cards" (
	"card_id"	TEXT,
	"rarity"	TEXT,
	"expansion_set"	TEXT,
	"market_value"	REAL,
	"series"	TEXT,
	"set_code"	TEXT,
	"card_name"	TEXT,
	"type"	TEXT,
	"img_src"	TEXT,
	PRIMARY KEY("card_id")
);
DROP TABLE IF EXISTS "profiles";
CREATE TABLE IF NOT EXISTS "profiles" (
	"profile_id"	TEXT,
	"cash_added"	NUMERIC,
	"wallet"	NUMERIC,
	"packs_opened"	INTEGER,
	PRIMARY KEY("profile_id")
);

DROP TABLE IF EXISTS "game_log";
CREATE TABLE IF NOT EXISTS `game_log` ( `log_id` INTEGER PRIMARY KEY AUTOINCREMENT, `game_id` INTEGER, `timestamp` INTEGER, `message` TEXT );

DROP TABLE IF EXISTS "games";
CREATE TABLE "games" (
	"game_id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"game_name"	TEXT,
	"game_state"	TEXT
);

DROP TABLE IF EXISTS "game_message_queue";
CREATE TABLE "game_message_queue" (
	"message_id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"game_id"	INTEGER,
	"timestamp_value"	INTEGER,
	"message_from"	TEXT,
	"message_to"	TEXT,
	"type"	TEXT,
	"data"	TEXT
);

COMMIT;
