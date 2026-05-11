const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }

  return shuffle(deck);
}

function shuffle(cards) {
  const deck = [...cards];

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function draw(game) {
  if (game.deck.length === 0) {
    game.deck = buildDeck();
  }

  return game.deck.pop();
}

function handValue(cards) {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      aces += 1;
      total += 11;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

function startGame(bet) {
  const game = {
    status: "playing",
    bet,
    deck: buildDeck(),
    player: [],
    dealer: [],
    result: null,
    payout: 0
  };

  game.player.push(draw(game), draw(game));
  game.dealer.push(draw(game), draw(game));

  if (isBlackjack(game.player) || isBlackjack(game.dealer)) {
    settle(game);
  }

  return game;
}

function hit(game) {
  ensurePlaying(game);
  game.player.push(draw(game));

  if (handValue(game.player) >= 21) {
    settle(game);
  }

  return game;
}

function stand(game) {
  ensurePlaying(game);

  while (handValue(game.dealer) < 17) {
    game.dealer.push(draw(game));
  }

  settle(game);
  return game;
}

function settle(game) {
  const playerTotal = handValue(game.player);
  const dealerTotal = handValue(game.dealer);

  game.status = "complete";

  if (playerTotal > 21) {
    game.result = "loss";
    game.payout = -game.bet;
  } else if (dealerTotal > 21) {
    game.result = "win";
    game.payout = game.bet;
  } else if (isBlackjack(game.player) && !isBlackjack(game.dealer)) {
    game.result = "blackjack";
    game.payout = Math.floor(game.bet * 1.5);
  } else if (isBlackjack(game.dealer) && !isBlackjack(game.player)) {
    game.result = "loss";
    game.payout = -game.bet;
  } else if (playerTotal > dealerTotal) {
    game.result = "win";
    game.payout = game.bet;
  } else if (playerTotal < dealerTotal) {
    game.result = "loss";
    game.payout = -game.bet;
  } else {
    game.result = "push";
    game.payout = 0;
  }

  return game;
}

function publicGame(game, revealDealer = false) {
  if (!game) {
    return null;
  }

  const shouldRevealDealer = revealDealer || game.status === "complete";
  const visibleDealerCards = shouldRevealDealer ? game.dealer : [game.dealer[0], { hidden: true }];
  const visibleDealerTotal = shouldRevealDealer ? handValue(game.dealer) : "?";

  return {
    status: game.status,
    bet: game.bet,
    result: game.result,
    payout: game.payout,
    playerCards: game.player,
    dealerCards: visibleDealerCards,
    playerTotal: handValue(game.player),
    dealerTotal: visibleDealerTotal
  };
}

function ensurePlaying(game) {
  if (!game || game.status !== "playing") {
    throw new Error("No active hand is currently being played.");
  }
}

module.exports = {
  handValue,
  hit,
  publicGame,
  stand,
  startGame
};
