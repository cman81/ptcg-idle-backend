var isGameStarted = false;
var startTime;
var intervalFunctions = [];
var cards = [];
var charsCorrect = 0;
var charsCompleted = 0;
var cardsCompleted = 0;
var currentWord = '';
var currentInput = '';
var timeLimit = 300;

$(function () {
    loadTypingCards();

    $(document).on('keypress', function(event) {
        if (!isGameStarted) { beginGame(); }
        if (currentWord.length != currentInput.length) {
            updateInput(event.which);

            return;
        }

        // word has been completed and a new one has been requested
        $('.cards-remaining').html(cards.length);
        currentInput = currentWord = '';
        if (cards.length == 0) { return endGame(); }
        
        renderTypingCard(cards.pop());
    });
    $(document).on('keydown', function(event) {
        // @see https://stackoverflow.com/a/4843502
        if (event.which == 8) {
            // backspace
            updateInput(8);
        }
    });

    $('.main.container .col .timer').html(`${timeLimit}`);
});

function updateInput(charCode) {
    if (charCode == 8) {
        // handle backspace key
        if (!currentInput.length) { return; }

        playSound('#zoop');
        if (isLastCharacterCorrect()) {
            charsCorrect--;
            $('.correct').html(charsCorrect);
        }

        charsCompleted--;
        $('.total').html(charsCompleted);

        currentInput = currentInput.substr(0, currentInput.length - 1);
        $('.main.container .col .keyboard-input .letters').html(currentInput.toUpperCase());
        return;
    }

    charsCompleted++;
    $('.total').html(charsCompleted);

    let char = String.fromCharCode(charCode)
    currentInput += char;

    if (isLastCharacterCorrect()) {
        playSound('#typewriter-key');
        charsCorrect++;
        $('.correct').html(charsCorrect);
    } else {
        playSound('#clang');
    }

    $('.main.container .col .keyboard-input .letters').html(currentInput.toUpperCase());
}

function isLastCharacterCorrect() {
    let inputLength = currentInput.length;
    let inputChar = currentInput.charAt(inputLength - 1);
    let correctChar = currentWord.charAt(inputLength - 1);

    if (inputChar.toUpperCase() == correctChar.toUpperCase()) { return true; }
    return false;
};

function beginGame() {
    isGameStarted = true;
    startTime = Date.now();
    intervalFunctions.push(setInterval(() => {
        const timer = Date.now() - startTime;
        const secondsRemaining = timeLimit - Math.round(timer / 1000);
        $('.main.container .col .timer').html(`${secondsRemaining}`);

        if (secondsRemaining == 0) {
            endGame();
        }
    }, 1000));
}

function endGame() {
    $(document)
        .off('keypress')
        .off('keydown');

    for (let key in intervalFunctions) {
        let value = intervalFunctions[key];
        clearInterval(value);
    }

    $('.blinker').hide();
    playSound('#win-sound');
};

function loadTypingCards() {
    const apiEndpoint = apiHome + '/load_typing_cards.php';
        
    $.getJSON(
        apiEndpoint,
        function(data) {
            cards = data;
            renderTypingCard(cards.pop());
        }
    );
}

function renderTypingCard(card) {
    currentWord = card.cardName;
    $('.main.container .col .card-item').html(`
        <img src="cards/${card.expansionSet}/${card.imgSrc}" class="pokemon-card" />
    `);
    $('.main.container .col .target .letters').html(currentWord.toUpperCase());
    $('.main.container .col .keyboard-input .letters').html('');
    $('.main.container .col .keyboard-input').width(
        $('.main.container .col .target .letters').width()
    );
}
