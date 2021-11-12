var frontendServer = 'https://ptcg-idle-frontend.s3.amazonaws.com';

var profileId;
var wallet = 0;
var packsOpened = 0;
var cashAdded = 0;
var timeoutFunctions = [];
var lastProfileUpdate = false;
var sessionCash = 5000;

var expansionSet;
var collection = [];
var energyCards = [];
var commonCards = [];
var uncommonCards = [];
var rareCards = {};

var expansions = {
    'SWSH8': {
        name: 'Fusion Strike',
        expansionSet: 'SWSH8',
        energy: 'SWSH',
    },
    'SWSH7': {
        name: 'Evolving Skies',
        expansionSet: 'SWSH7',
        energy: 'SWSH',
    },
    'SWSH6': {
        name: 'Chilling Reign',
        expansionSet: 'SWSH6',
        energy: 'SWSH',
        comingSoon: true,
    },
    'SWSH5': {
        name: 'Battles Styles',
        expansionSet: 'SWSH5',
        energy: 'SWSH',
        comingSoon: true,
    },
    'SWSH4b': {
        name: 'Shining Fates',
        expansionSet: 'SWSH4b',
        energy: 'SWSH',
        comingSoon: true,
    },
    'SWSH4': {
        name: 'Vivid Voltage',
        expansionSet: 'SWSH4',
        energy: 'SWSH',
        comingSoon: true,
    },
    'SWSH3': {
        name: 'Darkness Ablaze',
        expansionSet: 'SWSH3',
        energy: 'SWSH',
        comingSoon: true,
    },
    'SWSH2': {
        name: 'Rebel Clash',
        expansionSet: 'SWSH2',
        energy: 'SWSH',
    },
    'SWSH1': {
        name: 'Sword & Shield',
        expansionSet: 'SWSH1',
        energy: 'SWSH',
        comingSoon: true,
    },
    'SM12': {
        name: 'Cosmic Eclipse',
        expansionSet: 'SM12',
        energy: 'SMb',
    },
    'SM11': {
        name: 'Unified Minds',
        expansionSet: 'SM11',
        energy: 'SMb',
        comingSoon: true,
    },
    'SM10': {
        name: 'Unbroken Bonds',
        expansionSet: 'SM10',
        energy: 'SMb',
        comingSoon: true,
    },
    'SM9': {
        name: 'Team Up',
        expansionSet: 'SM9',
        energy: 'SMb',
    },
    'SM8': {
        name: 'Lost Thunder',
        expansionSet: 'SM8',
        energy: 'SMb',
        comingSoon: true,
    },
/* TODO: this card has no "regular rares" which is crashing the app! fix it.
Here may be why: "You can’t buy single booster packs of Dragon Majesty... they only sell them in
collector sets or 3 packs." */
    'SM7b': {
        name: 'Dragon Majesty',
        expansionSet: 'SM7b',
        energy: 'SMb',
        comingSoon: true,
    },
    'SM7': {
        name: 'Celestial Storm',
        expansionSet: 'SM7',
        energy: 'SMb',
        comingSoon: true,
    },
    'SM6': {
        name: 'Forbidden Light',
        expansionSet: 'SM6',
        energy: 'SMb',
        comingSoon: true,
    },
    'SM5': {
        name: 'Ultra Prism',
        expansionSet: 'SM5',
        energy: 'SMb',
        comingSoon: true,
    },
};

var preloadedCards = [];
var preloadsRemaining = 0;
  
$(document).ready(function() {
    $('#pack').slick();
    $('#open-pack').click(function() {
        activateSection('pack');
        if (wallet < 4) {
            $('#status-message').html('Not enough money in your wallet! Packs cost $4.00');
            return;
        }
        if (!expansionSet) {
            $('#status-message').html('Which expansion pack do you want?');
            return;
        }

        playSound('#magic-spell');
        var pack = addPackToCollection();

        // render the generated pack!
        const rareCard = pack.pop();
        pack = shuffle(pack);
        pack.push(rareCard);
        renderCards(pack, 125, '#pack');
        $('#pack').slick('unslick');
        $('#pack').slick({
            arrows: false
        });

        // @see https://stackoverflow.com/questions/19012495/smooth-scroll-to-div-id-jquery
        $('html, body').animate({
            scrollTop: $("#pack").offset().top
        }, 1000);

        wallet -= 4;
        packsOpened++;
        updateStats();
    });

    $('#view-pack').click(function() {
        activateSection('pack');

        // @see https://stackoverflow.com/questions/19012495/smooth-scroll-to-div-id-jquery
        $('html, body').animate({
            scrollTop: $("#pack").offset().top
        }, 1000);
    });

    $('#view-collection').click(function() {
        collection = compileCollection(collection);

        activateSection('collection');
        renderCards(collection, 0, '#collection');
        // @see https://stackoverflow.com/questions/19012495/smooth-scroll-to-div-id-jquery
        $('html, body').animate({
            scrollTop: $("#collection").offset().top
        }, 1000);
    });

    $('#main-actions').on('click', '#view-battle-deck', function() {
        loadedBattleDeck = compileCollection(loadedBattleDeck);

        activateSection('battle-deck');
        renderCards(loadedBattleDeck, 50, '#battle-deck');
    });

    $('nav').on('click', 'button.navbar-toggler', function() {
        $('div.navbar-collapse').toggleClass('collapse');
    });

    $('#pack').on('swipe', function(slick, direction) {
        if ($('.slick-active img').hasClass('rare')) {
            playSound('#bigwhoosh');
            return;
        }

        playSound('#whoosh');
    });

    $('.add-cash').click(function() {
        var amountToAdd = 0.25;
        if (amountToAdd > sessionCash) {
            $(this).removeClass('btn-outline-success');
            $(this).addClass('btn-outline-danger');
            return;
        }

        cashAdded += amountToAdd;
        wallet += amountToAdd;
        sessionCash -= amountToAdd;
        updateStats();

        $('.add-cash').hide();
    });

    $('.load-profile').click(function() {
        var apiEndpoint = apiHome + '/load_profile.php';
        profileId = $(this).text().toLowerCase();
        
        $.getJSON(
            apiEndpoint,
            {name: profileId},
            function(data) {
                if (data.status == 'error') {
                    console.log(data);
                    profileId = null;
                    return;
                }
                wallet = data.wallet ?? 0;
                packsOpened = data.packsOpened ?? 0;
                cashAdded = data.cashAdded ?? 0;
                collection = data.collection ?? [];

                const awayCash = getAwayCash(data.lastUpdated);
                wallet += awayCash;

                updateStats();
                activateSection('pack');
                if (awayCash) {
                    $('#status-message').html(`You gained $${awayCash.toFixed(2)} while you were away!`);
                }

                let name = profileId.charAt(0).toUpperCase() + profileId.slice(1);
                $("<span>Hello " + name + "!</span>")
                    .insertAfter($('.load-profile').last());
                $('.load-profile').hide();
            }
        );
    });

    $('.expansions').on('click', 'img', function() {
        if (expansions[$(this).data('expansion')].comingSoon) {
            alert('Coming soon!');
            return;
        }
        loadCards($(this).data('expansion'));
    });

    const filterKeyUp = debounce(
        function() {
            if ($(this).val().length < 3) { return; }
            console.log('searching...');
            const needle = $(this).val().toUpperCase();
            
            // Loop through all list items, and hide those who don't match the search query
            $('.collection').find('.card-wrapper').each(function (index, element) {
                const haystack = $(element).find('img').attr('src').split('/').pop();
                
                if (haystack.toUpperCase().match(needle)) {
                    $(element).show();
                    return;
                }
                
                $(element).hide();
            });
        },
        250
    );
    $('#filterQuery').on('keyup', filterKeyUp);

    for (let key in expansions) {
        const value = expansions[key];
        let comingSoonAttr = '';
        if (value.comingSoon) {
            continue; // TODO: decide whether this short-circuit is permanent
            comingSoonAttr = 'class="coming-soon"'
        }
        $('.top.container').find('.expansions').append(`
            <img
                src="${frontendServer}/logos/${value.expansionSet}_Logo_EN.png"
                id="expansion-${value.expansionSet}"
                title="${htmlentities.encode(value.name)}"
                data-expansion="${value.expansionSet}"
                ${comingSoonAttr}
            />
        `);
    }

    $('.spinner-border').hide();
});
