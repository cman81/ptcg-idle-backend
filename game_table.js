var battleDecks;
var profileId;
var deckImages = {
    player1: [],
    player2: [],
}
var gameState = {
    gameId: 0,
    player1: {
        'is_pokemon_hidden': true
    },
    player2: {
        'is_pokemon_hidden': true
    },
};
var cardGroups = [
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
    'lost-zone'
];
var hoverIntentDelay = 400;
var hoverTimeout;
var pingInterval = 500;
var pingTimeout = setInterval(
    () => { pingServerMessages(); },
    pingInterval
);

$(function() {
    let initialGameId = randomizeGameId();
    $('#game-id').val(initialGameId);
    $('.top.container').on('click', '#randomize-game-id', function() {
        $('#game-id').val(randomizeGameId());
    });
    
    $('body').on('click', 'button', function() {
        const operation = $(this).data('operation');
        if (!operation) {
            return;
        }

        if (operation == 'sitAtTable') {
            if (!getPlayerId('myself')) {
                return;
            }

            gameState.gameId = $('#game-id').val();

            function initializePlayers() {
                const whichPlayers = ['myself', 'opponent'];
                for (let key in whichPlayers) {
                    const whichPlayer = whichPlayers[key];
                    $(`.${whichPlayer}`).addClass(getPlayerId(whichPlayer));

                    initializePokemonStatus(whichPlayer);

                    const collectionName = gameState[getPlayerId(whichPlayer)]['collection_name'];
                    if (!collectionName) { continue; }
    
                    loadCollection(collectionName)
                        .then(function(compressedCardCollection) {
                            unpackCardCollection(whichPlayer, collectionName, compressedCardCollection);
                        });
                }
            };

            sendGameMessage(getPlayerId('myself'), 'judge', 'load_game', gameState.gameId)
                .then(function(data) {
                    gameState[getPlayerId('myself')] = data[getPlayerId('myself')];
                    gameState[getPlayerId('opponent')] = data[getPlayerId('opponent')];
                    initializePlayers();
                });

            renderContainers([
                'deck',
                'hand 1',
                'hand 2',
                'active pokemon',
                'bench pokemon 1',
                'bench pokemon 2',
                'bench pokemon 3',
                'bench pokemon 4',
                'bench pokemon 5',
                'stadium',
                'prize cards',
                'discard',
                'lost zone',
            ]);

            $('.border .action-expand').hide();
            $('.border')
            .off('click', '.collapse-control')
            .on('click', '.collapse-control', function() {
                $(this).parent().find('.collapse-control').toggle();
            });
            $('#this-game-id').html(gameState.gameId);

            renderDeckContainers();
            renderHandContainers();
            renderOtherCardGroupContainers();
            renderPrizeCardContainers();

            $('.top.container > .row').toggleClass('d-none');

        }

        if (operation == 'shuffle') {
            const whichPlayer = $(this).data('player');

            sendGameMessage(
                getPlayerId(whichPlayer),
                'judge',
                operation,
                $(this).data('card-group')
            )
            .then(function() {
                alert('Your deck has been shuffled');
            });
        }

        if (operation == 'moveTop') {
            const moveFrom = $(this).data('from');
            const moveTo = $(this).data('to');
            const whichPlayer = $(this).data('player');

            sendGameMessage(
                getPlayerId(whichPlayer),
                'judge',
                operation,
                {
                    from: moveFrom,
                    to: moveTo
                }
            )
            .then(function(groups) {
                if (!groups) { return; }
                renderCardGroups(whichPlayer, groups);
            });
        }

        if (operation == 'tuck') {
            const whichPlayer = $(this).data('player');
            const cardGroup = $(this).data('card-group');

            sendGameMessage(
                getPlayerId(whichPlayer),
                'judge',
                operation,
                cardGroup
            )
            .then(function(data) {
                gameState[getPlayerId(whichPlayer)][cardGroup] = data;
                renderCardGroup(whichPlayer, cardGroup);
            });
        }

        if (operation == 'moveAll') {
            const moveFrom = $(this).data('from');
            const moveTo = $(this).data('to');
            const whichPlayer = $(this).data('player');

            sendGameMessage(
                getPlayerId(whichPlayer),
                'judge',
                operation,
                {
                    from: moveFrom,
                    to: moveTo
                }
            )
            .then(function(groups) {
                renderCardGroups(whichPlayer, groups);
            });
        }

        if (operation == 'flipCoin') {
            const rand = randomizeGameId();
            const result = (rand % 2 == 1) ? 'tails' :' heads';
            $('#coin-flip').html(`${result} (${rand})`);
        }

        if (operation == 'showPokemon') {
            const whichPlayer = $(this).data('player');

            sendGameMessage(
                getPlayerId(whichPlayer),
                'judge',
                operation
            )
            .then((groups) => {
                $(this).hide();
                gameState[getPlayerId(whichPlayer)].is_pokemon_hidden = false;
                alert('Your opponent can now see your Pokemon!');
            });
        }

        if (operation == 'pingServerMessages') {
            if (pingTimeout) {
                clearInterval(pingTimeout);
                pingTimeout = false;
                alert('Pinging disabled.');
                
                return;
            }

            pingTimeout = setInterval(
                () => { pingServerMessages(); },
                pingInterval
            );
            alert('Pinging enabled.');
        }

        if (operation == 'swapCardGroups') {
            const whichPlayer = $(this).data('player');
            const groupA = $(this).data('group-a');
            const groupB = $(this).data('group-b');

            sendGameMessage(
                getPlayerId(whichPlayer),
                'judge',
                operation,
                {
                    groupA: groupA,
                    groupB: groupB,
                }
            )
            .then(function(groups) {
                renderCardGroups(whichPlayer, groups);
            });
        }
    })
    .on('mouseenter', '.pokemon-card, #pokemonModal .deck-item img', function() {
        // @see https://stackoverflow.com/a/15576031
        // @see https://stackoverflow.com/a/20078582
        hoverTimeout = setTimeout(() => {
            $(this).addClass('hover');
        }, hoverIntentDelay);
    })
    .on('mouseleave', '.pokemon-card, #pokemonModal .deck-item img', function() {
        $(this).removeClass('hover');
        clearTimeout(hoverTimeout);
    })
    .on('change', '.pokemon-stats input:checkbox', function() {
        statusChangeCallback($(this));
    });
});

function initializePokemonStatus(whichPlayer) {
    for (let key in cardGroups) {
        const group = cardGroups[key];
        updatePokemonStatus(whichPlayer, group);
    }
}

function updatePokemonStatus(whichPlayer, group) {
    if (gameState[getPlayerId(whichPlayer)].is_pokemon_hidden) {
        return;
    }

    if (!group.match('pokemon')) {
        return;
    }

    // damage / hp
    let $sliderDiv = $(`#${whichPlayer}-${group}-damage-hp-range`);

    const damage = gameState[getPlayerId(whichPlayer)][group].status.damage ?? 0;
    $sliderDiv.slider("values", 0, damage);

    const hp = gameState[getPlayerId(whichPlayer)][group].status.hp ?? 0;
    $sliderDiv.slider("values", 1, hp);

    let $sliderText = $(`#${whichPlayer}-${group}-damage-hp`);
    $sliderText.val(`${damage} / ${hp} HP`);

    if (group != 'active-pokemon') { return; }

    // special conditions: asleep, poisoned, etc.
    const conditions = {
        ...gameState[getPlayerId(whichPlayer)][group].status.conditions
    };
    for (let conditionName in conditions) {
        const hasCondition = conditions[conditionName];
        $(`#${whichPlayer}-${group}-${conditionName}`).prop('checked', hasCondition);
    }
}

function statusChangeCallback($checkbox) {
    filterSpecialConditions($checkbox);
    setSpecialConditions($checkbox);
}

function filterSpecialConditions($checkbox) {
    // do not apply to unchecked event
    if (!$checkbox.prop("checked")) { return; }
    
    // do not apply to burned or poisoned
    const checkboxVal = $checkbox.val();
    if ($.inArray(checkboxVal, ['poisoned', 'burned'])) { return; }
    
    let checkBoxId = $checkbox.attr('id');
    let idParts = checkBoxId.split('-');
    idParts.pop();
    
    const idPrefix = idParts.join('-');
    for (let key in concernedValues) {
        const value = concernedValues[key];
        if (checkboxVal != value) {
            $(`#${idPrefix}-${value}`).prop('checked', false);
        }
    }
}

function setSpecialConditions($checkbox) {
    let idParts = $checkbox.attr('id').split('-');
    const whichPlayer = idParts[0];
    const targetPlayerId = getPlayerId(whichPlayer);

    idParts.pop();
    const idPrefix = idParts.join('-');

    gameState[targetPlayerId]['active-pokemon'].status.conditions = {
        'asleep': $(`#${idPrefix}-asleep`).prop('checked'),
        'paralyzed': $(`#${idPrefix}-paralyzed`).prop('checked'),
        'confused': $(`#${idPrefix}-confused`).prop('checked'),
        'poisoned': $(`#${idPrefix}-poisoned`).prop('checked'),
        'burned': $(`#${idPrefix}-burned`).prop('checked'),
    }

    let specialConditions = {
        ...gameState[targetPlayerId]['active-pokemon'].status.conditions,
        'playerId': targetPlayerId,
    };

    sendGameMessage(getPlayerId('myself'), 'judge', 'setSpecialConditions', specialConditions);
}

function sendGameMessage(from, to, type, data) {
    var apiEndpoint = apiHome + '/send_game_message.php';
    return $.post(
        apiEndpoint,
        {
            gameId: gameState.gameId,
            from: from,
            to: to,
            type: type,
            data: data ?? {}
        },
        function (data) {
            return data;
        },
        'json'
    );
}

function expandIcon() {
    return `
        <svg class="bi bi-arrows-expand" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M2 8a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11A.5.5 0 012 8zm6-1.5a.5.5 0 00.5-.5V1.5a.5.5 0 00-1 0V6a.5.5 0 00.5.5z" clip-rule="evenodd"/>
            <path fill-rule="evenodd" d="M10.354 3.854a.5.5 0 000-.708l-2-2a.5.5 0 00-.708 0l-2 2a.5.5 0 10.708.708L8 2.207l1.646 1.647a.5.5 0 00.708 0zM8 9.5a.5.5 0 01.5.5v4.5a.5.5 0 01-1 0V10a.5.5 0 01.5-.5z" clip-rule="evenodd"/>
            <path fill-rule="evenodd" d="M10.354 12.146a.5.5 0 010 .708l-2 2a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L8 13.793l1.646-1.647a.5.5 0 01.708 0z" clip-rule="evenodd"/>
        </svg>
    `;
}
function collapseIcon() {
    return `
        <svg class="bi bi-arrows-collapse" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M2 8a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11A.5.5 0 012 8zm6-7a.5.5 0 01.5.5V6a.5.5 0 01-1 0V1.5A.5.5 0 018 1z" clip-rule="evenodd"/>
            <path fill-rule="evenodd" d="M10.354 3.646a.5.5 0 010 .708l-2 2a.5.5 0 01-.708 0l-2-2a.5.5 0 11.708-.708L8 5.293l1.646-1.647a.5.5 0 01.708 0zM8 15a.5.5 0 00.5-.5V10a.5.5 0 00-1 0v4.5a.5.5 0 00.5.5z" clip-rule="evenodd"/>
            <path fill-rule="evenodd" d="M10.354 12.354a.5.5 0 000-.708l-2-2a.5.5 0 00-.708 0l-2 2a.5.5 0 00.708.708L8 10.707l1.646 1.647a.5.5 0 00.708 0z" clip-rule="evenodd"/>
        </svg>
    `;
}
var buttons = {
    expand: function(whichPlayer, cssClass) {
        return `
            <button
                class="btn btn-secondary btn-sm float-right collapse-control action-expand"
                type="button"
                data-toggle="collapse"
                data-target=".${whichPlayer} .${cssClass} .body"
                aria-expanded="true"
                aria-controls="collapse">
                ${expandIcon()}
            </button>
        `
    },
    collapse: function(whichPlayer, cssClass) {
        return `
            <button
                class="btn btn-secondary btn-sm float-right collapse-control action-collapse"
                type="button"
                data-toggle="collapse"
                data-target=".${whichPlayer} .${cssClass} .body"
                aria-expanded="true"
                aria-controls="collapse">
                ${collapseIcon()}
            </button>
        `;
    },
    moveSpecificCard: function(whichPlayer, from, to, label, reveal) {
        reveal = reveal ?? false;
        let revealStr = (reveal) ? 'true' :'false';

        return `
            <button type="button" class="btn btn-primary btn-sm" data-toggle="modal"
                data-target="#pokemonModal" data-operation="gameMoveSpecificCard"
                data-which-player="${whichPlayer}" data-from="${from}" data-to="${to}"
                data-reveal="${revealStr}">
                ${label}
            </button>
        `
    },
    loadDeck: function(whichPlayer) {
        return `
            <button type="button" class="btn btn-warning" data-toggle="modal"
                data-target="#pokemonModal" data-operation="gameLoadDeck"
                data-player="${whichPlayer}">
                Load Deck
            </button>
        `;
    },
    shuffle: function(whichPlayer, cardGroup) {
        return `
            <button type="button" class="btn btn-primary" data-operation="shuffle"
                data-player="${whichPlayer}" data-card-group="${cardGroup}">
                Shuffle
            </button>
        `;
    },
    moveTop: function(whichPlayer, from, to, label) {
        return `
            <button type="button" class="btn btn-primary btn-sm" data-operation="moveTop"
                data-player="${whichPlayer}" data-from="${from}" data-to="${to}">
                ${label}
            </button>
        `;
    },
    tuck: function (whichPlayer, group, label) {
        return `
            <button type="button" class="btn btn-secondary btn-sm" data-operation="tuck"
                data-player="${whichPlayer}" data-card-group="${group}">
                ${label}
            </button>
        `;
    },
    moveAll: function(whichPlayer, from, to, label) {
        return `
            <button type="button" class="btn btn-danger btn-sm" data-operation="moveAll"
                data-player="${whichPlayer}" data-from="${from}" data-to="${to}">
                ${label}
            </button>
        `;
    },
    showPokemon: function(whichPlayer) {
        return `
            <button type="button" class="btn btn-outline-primary btn-sm" data-operation="showPokemon"
                data-player="${whichPlayer}">
                Show Pokemon
            </button>
        `;
    },
    modalRevealedCard: function(buttonId, cardIdx) {
        return `
            <button type="button" class="d-none" data-toggle="modal"
                data-target="#pokemonModal" data-operation="revealOpponentCard"
                data-opponent-card="${cardIdx}" id="revealCard-${buttonId}">
                Hidden Button
            </button>
        `;
    },
    switchWithActive: function(whichPlayer, benchGroup) {
        return `
            <button type="button" class="btn btn-outline-primary btn-sm" data-operation="swapCardGroups"
                data-player="${whichPlayer}" data-group-a="${benchGroup}" data-group-b="active-pokemon">
                Switch with Active
            </button>
        `;
    }
};

function renderContainers(labels) {
    let playerClass = ['myself', 'opponent'];
    let headingWeight = ['h2', 'h3'];

    for (let k in playerClass) {
        let whichPlayer = playerClass[k];
        let heading = headingWeight[k];

        for (let key in labels) {
            let label = labels[key];
            let cssClass = label.replace(/ /g, '-');
            // @see https://flaviocopes.com/how-to-uppercase-first-letter-javascript/
            let title = label.charAt(0).toUpperCase() + label.slice(1)
    
            $(`.${whichPlayer} > .container`).append(`
                <div class="row">
                    <div class="col ${cssClass} border">
                        <div class="header">
                            <span class="${heading}">${title}</span>
                            ${buttons.expand(whichPlayer, cssClass)}
                            ${buttons.collapse(whichPlayer, cssClass)}
                        </div>
                        <div class="body collapse show">Nothing to see here!</div>
                    </div>
                </div>
            `);
        }
    }
}

function renderDeckContainers() {
    let playerClass = ['myself', 'opponent'];
    for (let key in playerClass) {
        let whichPlayer = playerClass[key];
        $(`.${whichPlayer} .deck .body`).html(`
            <div class="actions"></div>
            <div>Cards in deck: <span class="count">0</span></div> 
        `);

        if (whichPlayer == 'myself') {
            $(`.${whichPlayer} .deck .body .actions`).append(`
                <p>Deal to:</p>
                <p>
                    ${buttons.moveTop(whichPlayer, 'deck', 'hand-1', 'Hand 1')}
                    ${buttons.moveTop(whichPlayer, 'deck', 'hand-2', 'Hand 2')}
                    ${buttons.moveAll(whichPlayer, 'deck', 'hand-2', 'Hand 2 (All)')}
                    ${buttons.moveTop(whichPlayer, 'deck', 'prize-cards', 'Prize Cards')}
                </p>
                <p>Other actions:</p>
                <p>
                    ${buttons.loadDeck(whichPlayer)}
                    ${buttons.shuffle(whichPlayer, 'deck')}
                </p>
            `);
        }
    }
}

function renderPrizeCardContainers() {
    let playerClass = ['myself', 'opponent'];
    for (let key in playerClass) {
        let whichPlayer = playerClass[key];

        $(`.${whichPlayer} .prize-cards .body`).html('');
        if (whichPlayer == 'myself') {
            $(`.${whichPlayer} .prize-cards .body`).append(`
                <div class="actions">
                    <p>Deal to:</p>
                    <p>
                        ${buttons.moveTop(whichPlayer, 'prize-cards', 'hand-1', 'Hand 1')}
                        ${buttons.moveTop(whichPlayer, 'prize-cards', 'deck', 'Deck')}
                        ${buttons.moveTop(whichPlayer, 'prize-cards', 'discard', 'Discard')}
                    </p>
                </div>
            `);
        }
        $(`.${whichPlayer} .prize-cards .body`).append(`
            <div>Prize cards remaining: <span class="count">0</span></div> 
        `);
    }
}

function renderHandContainers() {
    let playerClass = ['myself', 'opponent'];
    for (let key in playerClass) {
        let whichPlayer = playerClass[key];
        for (let pos = 1; pos <= 2; pos++) {
            let cardGroup = `hand-${pos}`;
            renderHandContainer(whichPlayer, cardGroup);
        }
    }
}

function renderHandContainer(whichPlayer, cardGroup) {
    $(`.${whichPlayer} .${cardGroup} .body`).html('');
    if (whichPlayer == 'opponent') {
        $(`.${whichPlayer} .${cardGroup} .body`).append(`
                <div>Cards in hand: <span class="count">0</span></div> 
        `);
        
        return;
    }
    $(`.${whichPlayer} .${cardGroup} .body`).append(`
        <div class="actions">
            <p>Play to:</p>
            <p>
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'active-pokemon', 'Active')}
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'bench-pokemon-1', 'Bench 1')}
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'bench-pokemon-2', 'Bench 2')}
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'bench-pokemon-3', 'Bench 3')}
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'bench-pokemon-4', 'Bench 4')}
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'bench-pokemon-5', 'Bench 5')}
            </p>
            <p>
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'discard', 'Discard')}
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'stadium', 'Stadium')}
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'lost-zone', 'Lost Zone')}
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'deck', 'Deck')}
                ${buttons.moveSpecificCard(whichPlayer, cardGroup, 'prize-cards', 'Prize Cards')}
            </p>
            <p>Other Actions:</p>
            <p class="other">
                ${buttons.moveAll(whichPlayer, cardGroup, 'deck', 'Return All > Deck')}
            </p>
        </div>
        <div class="count"></div>
        <div class="cards clearfix"></div>
    `);

    if (cardGroup == 'hand-1') { return; }

    $(`.${whichPlayer} .${cardGroup} .body .actions .other`).append(`
        ${buttons.moveSpecificCard(whichPlayer, 'hand-2', 'hand-1', 'Reveal and Keep 1', true)}
        ${buttons.moveSpecificCard(whichPlayer, 'hand-2', 'hand-1', 'Keep 1')}
    `);
}

/**
 * "Other" card groups include the following:
 * - discard
 * - active pokemon
 * - bench pokemon (multiple)
 * - stadium
 * - lost zone
 */
function renderOtherCardGroupContainers() {
    let playerClass = ['myself', 'opponent'];
    let otherCardGroups = [
        'discard',
        'active-pokemon',
        'bench-pokemon-1',
        'bench-pokemon-2',
        'bench-pokemon-3',
        'bench-pokemon-4',
        'bench-pokemon-5',
        'stadium',
        'lost-zone'
    ];
    for (let key in playerClass) {
        for (let k in otherCardGroups) {
            let group = otherCardGroups[k];
            let whichPlayer = playerClass[key];
            let $groupBody = $(`.${whichPlayer} .${group} .body`);

            $groupBody.html('');

            if (whichPlayer == 'myself') {
                $groupBody.append(`
                    <div class="actions">
                        <p>Move to:</p>
                    </div>
                `);

                if (!group.match('pokemon')) {
                    $groupBody.find('.actions').append(`
                        <p>
                            ${buttons.moveSpecificCard(whichPlayer, group, 'active-pokemon', 'Active')}
                            ${buttons.moveSpecificCard(whichPlayer, group, 'bench-pokemon-1', 'Bench 1')}
                            ${buttons.moveSpecificCard(whichPlayer, group, 'bench-pokemon-2', 'Bench 2')}
                            ${buttons.moveSpecificCard(whichPlayer, group, 'bench-pokemon-3', 'Bench 3')}
                            ${buttons.moveSpecificCard(whichPlayer, group, 'bench-pokemon-4', 'Bench 4')}
                            ${buttons.moveSpecificCard(whichPlayer, group, 'bench-pokemon-5', 'Bench 5')}
                        </p>
                    `);
                }

                $groupBody.find('.actions').append(`
                    <p>
                        ${buttons.moveSpecificCard(whichPlayer, group, 'discard', 'Discard')}
                        ${buttons.moveSpecificCard(whichPlayer, group, 'stadium', 'Stadium')}
                        ${buttons.moveSpecificCard(whichPlayer, group, 'lost-zone', 'Lost Zone')}
                        ${buttons.moveSpecificCard(whichPlayer, group, 'deck', 'Deck')}
                        ${buttons.moveSpecificCard(whichPlayer, group, 'prize-cards', 'Prize Cards')}
                    </p>
                    <p>Other actions:</p>
                    <p class="other">
                        ${buttons.tuck(whichPlayer, group, 'Tuck')}
                        ${buttons.moveAll(whichPlayer, group, 'discard', 'Discard all')}
                    </p>
                `);
            }

            $groupBody.append(`<div class="cards clearfix"></div>`);

            if (!group.match('pokemon')) {
                continue;
            }

            if (whichPlayer == 'myself' && group == 'active-pokemon') {
                $groupBody.find('.actions .other').append(`
                    ${buttons.showPokemon(whichPlayer)}
                `);
            }

            if (whichPlayer == 'myself' && group.match('bench-pokemon')) {
                $groupBody.find('.actions .other').append(`
                    ${buttons.switchWithActive(whichPlayer, group)}
                `);
            }

            renderPokemonStatus($groupBody, whichPlayer, group);
        }
    }
}

function renderPokemonStatus($groupBody, whichPlayer, group) {
    $groupBody.append(`
        <div class="pokemon-stats">
            <h4>
                <label for="${whichPlayer}-${group}-damage-hp">Damage:</label>
                <input type="text" id="${whichPlayer}-${group}-damage-hp" readonly style="border:0; color:#f6931f; font-weight:bold;">
            </h4>
            <div class="slider" id="${whichPlayer}-${group}-damage-hp-range"></div>
        </div>
    `);

    let $sliderDiv = $(`#${whichPlayer}-${group}-damage-hp-range`);
    let $sliderText = $(`#${whichPlayer}-${group}-damage-hp`);
    $sliderDiv.slider({
        range: true,
        min: 0,
        max: 400,
        step: 10,
        values: [0, 0],
        slide: function (event, ui) {
            const damage = ui.values[0];
            const totalHP = ui.values[1];
            $sliderText.val(`${damage} / ${totalHP} HP`);
        },
    });
    $sliderDiv.on('slidechange', function(event, ui) {
        damageSliderChangeCallback(ui, whichPlayer, group);
    });
    
    const damage = $sliderDiv.slider("values", 0);
    const totalHP = $sliderDiv.slider("values", 1);
    $sliderText.val(`${damage} / ${totalHP} HP`);

    if (group != 'active-pokemon') { return; }

    $groupBody.find('.pokemon-stats').append(`
        <h4>Special Conditions:</h4>
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="${whichPlayer}-${group}-asleep" value="asleep" />
            <label class="form-check-label" for="${whichPlayer}-${group}-asleep">Asleep</label>
        </div>
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="${whichPlayer}-${group}-paralyzed" value="paralyzed" />
            <label class="form-check-label" for="${whichPlayer}-${group}-paralyzed">Paralyzed</label>
        </div>
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="${whichPlayer}-${group}-confused" value="confused" />
            <label class="form-check-label" for="${whichPlayer}-${group}-confused">Confused</label>
        </div>
        <br />
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="${whichPlayer}-${group}-poisoned" value="poisoned" />
            <label class="form-check-label" for="${whichPlayer}-${group}-poisoned">Poisoned</label>
        </div>
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="${whichPlayer}-${group}-burned" value="burned" />
            <label class="form-check-label" for="${whichPlayer}-${group}-burned">Burned</label>
        </div>
    `);
}

function damageSliderChangeCallback(ui, whichPlayer, group) {
    sendGameMessage(
        getPlayerId('myself'),
        'judge',
        'setDamageHP',
        {
            targetPlayerId: getPlayerId(whichPlayer),
            cardGroup: group,
            damage: ui.values[0],
            hp: ui.values[1],
        }
    )
};

function randomizeGameId() {
    // generate a random number between 100000 and 999999
    return Math.floor(Math.random() * 899999) + 100000; // roll a D144
}

/**
 * Returns 'player1' or 'player2'
 */
function getPlayerId(whichPlayer) {
    const selectedValue = $('#player-select').val();
    if (selectedValue.substr(0, 6) != 'player') {
        alert('Please select a player before continuing');
        return false;
    }

    if (whichPlayer == 'myself') {
        return selectedValue;
    }

    if (selectedValue == 'player1') {
        return 'player2';
    }

    return 'player1';
}

/**
 * Returns 'myself' or 'opponent'
 */
function getWhichPlayer(playerId) {
    if (playerId == getPlayerId('myself')) {
        return 'myself';
    }

    return 'opponent';
}

function renderCardGroup(whichPlayer, group) {
    const groupData = gameState[getPlayerId(whichPlayer)][group] ?? {
        cards: [],
        count: 0
    };

    if (groupData.count || groupData.count === 0) {
        $(`.${whichPlayer} .${group} .count`).html(groupData.count);
        return;
    }

    $(`.${whichPlayer} .${group} .cards`).html('');
    for (let key in groupData.cards) {
        const cardIdx = groupData.cards[key];
        const imgSrc = deckImages[getPlayerId(whichPlayer)][cardIdx];

        let cssClass = 'card-wrapper';
        if (group.match('pokemon')) {
            if (key == 0) {
                cssClass += ' pokemon-top';
            } else {
                cssClass += ' pokemon-attachment';
            }
        }

        $(`.${whichPlayer} .${group} .cards`).append(`
            <div class="${cssClass}">
                <img src="cards/${imgSrc}" class="pokemon-card front"/>
            </div>
        `);
    }

    updatePokemonStatus(whichPlayer, group);
}

function renderCardGroups(whichPlayer, groups) {
    for (let groupKey in groups) {
        let thisGroup = groups[groupKey];
        gameState[getPlayerId(whichPlayer)][groupKey] = thisGroup;
        renderCardGroup(whichPlayer, groupKey);
    }
}

function pingServerMessages() {
    if (!gameState.gameId) { return; }

    let apiEndpoint = apiHome + '/get_game_messages.php';

    return $.getJSON(
        apiEndpoint,
        {
            gameId: gameState.gameId,
            recipient: getPlayerId('myself')
        },
        function(messages) {
            for (let key in messages) {
                let message = messages[key];
                processServerMessage(message);
            }
        }
    );
}

function processServerMessage(message) {
    if (message.type == 'renderCardGroup') {
        for (let cardGroup in message.data) {
            if (gameState[getPlayerId('opponent')].is_pokemon_hidden && cardGroup.match('pokemon')) {
                gameState[getPlayerId('opponent')].is_pokemon_hidden = false;    
            }

            const value = message.data[cardGroup];
            gameState[getPlayerId('opponent')][cardGroup] = value;
            renderCardGroup('opponent', cardGroup);
            break; // only 1 iteration
        }

        return;
    }

    if (message.type == 'revealCard') {
        const buttonId = randomizeGameId();
        // create a button
        $('body').append(buttons.modalRevealedCard(buttonId, message.data));

        // click the button
        $(`#revealCard-${buttonId}`).click();

        // destroy the button
        $(`#revealCard-${buttonId}`).remove();
        
        return;
    }

    if (message.type == 'setOpponentDeck') {
        const collectionName = message.data;
        loadCollection(collectionName)
            .then(function(compressedCardCollection) {
                unpackCardCollection('opponent', collectionName, compressedCardCollection);
            });
    }

    if (message.type == 'setDamageHP') {
        const targetPlayerId = message.data.targetPlayerId;
        const whichPlayer = getWhichPlayer(targetPlayerId);
        const cardGroup = message.data.cardGroup;
        const damage = message.data.damage ?? 0;
        const hp = message.data.hp ?? 0;

        gameState[targetPlayerId][cardGroup].status.damage = damage ?? 0;
        gameState[targetPlayerId][cardGroup].status.hp = hp ?? 0;

        const $sliderDiv = $(`#${whichPlayer}-${cardGroup}-damage-hp-range`);
        $sliderDiv.off('slidechange');
        $sliderDiv.slider("values", 0, damage);
        $sliderDiv.slider("values", 1, hp);
        $sliderDiv.on('slidechange', function(event, ui) {
            damageSliderChangeCallback(ui, whichPlayer, cardGroup);
        });
        
        const $sliderText = $(`#${whichPlayer}-${cardGroup}-damage-hp`);
        $sliderText.val(`${damage} / ${hp} HP`);
    }

    if (message.type == 'setSpecialConditions') {
        const targetPlayerId = message.data.playerId;
        const conditions = {
            'asleep': message.data.asleep,
            'paralyzed': message.data.paralyzed,
            'confused': message.data.confused,
            'poisoned': message.data.poisoned,
            'burned': message.data.burned,
        };

        gameState[targetPlayerId]['active-pokemon'].status.conditions = { ...conditions };

        $('body').off('change', '.pokemon-stats input:checkbox');

        const whichPlayer = getWhichPlayer(targetPlayerId);
        for (let conditionName in conditions) {
            const hasCondition = conditions[conditionName];
            $(`#${whichPlayer}-active-pokemon-${conditionName}`).prop('checked', hasCondition);
        }

        $('body').on('change', '.pokemon-stats input:checkbox', function() {
            statusChangeCallback($(this));
        })
    }
}

function unpackCardCollection(whichPlayer, collectionName, compressedCardCollection) {
    if (deckImages[getPlayerId(whichPlayer)].length) { return; }

    deckImages[getPlayerId(whichPlayer)] = expandDeck(compressedCardCollection);

    for (let key in cardGroups) {
        const cardGroup = cardGroups[key];
        renderCardGroup(whichPlayer, cardGroup);
    }

    alert(`The deck "${collectionName}" has been loaded for ${getPlayerId(whichPlayer)}`);
};
