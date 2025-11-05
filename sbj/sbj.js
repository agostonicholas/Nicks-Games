import { saveScore, getLeaderboard } from '../backend-functions.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas?.getContext('2d');

if (!canvas || !ctx) {
  throw new Error('Game canvas not found. Make sure sbj.html includes a canvas with id "game-canvas".');
}

const GAME_CONFIG = {
  tileSize: 64,
  checkerColors: ['#d6c7b7', '#c4b5a3'],
  groutColor: '#b6a99a',
  ingredientShadowColor: 'rgba(0, 0, 0, 0.25)',
  ingredientTargetSize: 120,
  ingredientPadding: 72,
  ingredientShadowBlur: 16,
  ingredientShadowOffsetY: 6,
};

const INGREDIENT_DEFINITIONS = [
  { key: 'bacon', tray: 'bacon.png', portion: 'bacon.png' },
  { key: 'cheese', tray: 'cheese_full.png', portion: 'cheese.png' },
  { key: 'egg', tray: 'eggs_full.png', portion: 'egg.png' },
  { key: 'jalapenos', tray: 'jalapenos_full.png', portion: 'jalapenos.png' },
  { key: 'ketchup', tray: 'ketchup_full.png', portion: 'ketchup.png' },
  { key: 'mayo', tray: 'mayo_full.png', portion: 'mayo.png' },
  { key: 'onion', tray: 'onion_full.png', portion: 'onion.png' },
  { key: 'tomato', tray: 'tomato_full.png', portion: 'tomato.png' },
  { key: 'top_bun', tray: 'top_bun.png', portion: 'top_bun.png' },
];

const ingredientDefinitions = INGREDIENT_DEFINITIONS.map((definition) => {
  const traySprite = createIngredientSprite(definition.tray);
  const portionSprite = createIngredientSprite(definition.portion, { participatesInLayout: false });
  return {
    ...definition,
    traySprite,
    portionSprite,
  };
});

const ingredientSlots = ingredientDefinitions.map((definition) => ({
  key: definition.key,
  center: { x: 0, y: 0 },
  bounds: { x: 0, y: 0, width: 0, height: 0 },
  definition,
}));

const defaultTrayDisplayOrder = ingredientDefinitions.map((_, index) => index);
let trayDisplayOrder = defaultTrayDisplayOrder.slice();

const EFFECT_TYPES = ['invisible', 'shuffle', 'monster'];
const EFFECT_DISPLAY_NAMES = {
  invisible: 'Invisible Orders!',
  shuffle: 'Tray Shuffle!',
  monster: 'Monster Rush!',
  none: 'None',
};

const EFFECT_SOUND_KEYS = {
  invisible: 'effectInvisible',
  shuffle: 'effectShuffle',
  monster: 'effectMonster',
};

const effectState = {
  type: 'none',
  remainingTickets: 0,
  warningMs: 0,
  visibilityMs: 0,
  ticketsUntilNextRoll: 5,
};

const ORDERABLE_INGREDIENTS = ingredientDefinitions.filter((definition) => definition.key !== 'top_bun');
const ORDERABLE_INGREDIENT_KEYS = ORDERABLE_INGREDIENTS.map((definition) => definition.key);

const internalSize = {
  width: canvas.width,
  height: canvas.height,
};

const SANDWICH_CONFIG = {
  baseX: canvas.width / 2,
  baseLineY: canvas.height - (GAME_CONFIG.ingredientPadding + 140),
  layerSpacing: 28,
  resetDelayMs: 700,
  stackShadowColor: 'rgba(0, 0, 0, 0.2)',
  stackShadowBlur: 12,
  stackShadowOffsetY: 8,
};

const GAME_RULES = {
  startingLives: 3,
  minTicketTimeMs: 8000,
  midTicketTimeMs: 9000,
  largeTicketFloorMs: 11000,
  maxTicketTimeMs: 17000,
  monsterTicketTimeMs: 17000,
  baseTipThreshold: 0.6,
  tipThresholdStep: 0.03,
  maxTipThreshold: 0.95,
};

const SOUND_DEFINITIONS = {
  newOrder: 'new_order.wav',
  ingredientPlaced: 'ingredient_placed.wav',
  orderComplete: 'order_complete.wav',
  tipEarned: 'tip_earned.wav',
  effectInvisible: 'invisible_tickets.wav',
  effectShuffle: 'shuffle.wav',
  effectMonster: 'massive_tickets.wav',
  failure: 'game_over.mp3',
};

let ingredientSprites = [];

const pointerState = {
  x: 0,
  y: 0,
  isInside: false,
  hoverIndex: null,
};

const dragState = {
  active: false,
  slotIndex: null,
  sprite: null,
  pointerId: null,
  x: 0,
  y: 0,
};

const loopState = {
  lastFrame: performance.now(),
  animationHandle: null,
};

const bottomBunSprite = createIngredientSprite('bottom_bun.png', { participatesInLayout: false });
ingredientSprites = ingredientDefinitions.map((definition) => definition.traySprite);
const ingredientPlacements = [];

const sandwichState = {
  layers: [],
  stackLog: [],
  uniqueIngredients: new Set(),
  ingredientCounts: new Map(),
  isComplete: false,
  resetTimer: null,
  lastBounds: null,
};

const ticketState = {
  score: 0,
  currentTicket: null,
  history: [],
  lastResult: null,
  remainingMs: 0,
};

let ticketIdCounter = 1;
let audioUnlocked = false;

const leaderboardState = {
  submittedForSession: false,
};

const sounds = Object.fromEntries(
  Object.entries(SOUND_DEFINITIONS).map(([key, file]) => [key, loadSound(file)]),
);

const gameState = {
  started: false,
  lives: GAME_RULES.startingLives,
  completedTickets: 0,
  gameOver: false,
};

const startScreenImage = loadStaticImage('./sbj_thumbnail.png');

function createIngredientSprite(filename, options = {}) {
  const participatesInLayout = options.participatesInLayout !== false;
  const image = new Image();
  const sprite = {
    filename,
    image,
    loaded: false,
    drawWidth: 0,
    drawHeight: 0,
    renderWidth: 0,
    renderHeight: 0,
    participatesInLayout,
  };

  image.src = new URL(`./assets/sprites/sbj_sprites/${filename}`, import.meta.url).href;

  if (image.complete) {
    finalizeIngredientSprite(sprite);
  } else {
    image.addEventListener('load', () => finalizeIngredientSprite(sprite));
  }

  return sprite;
}

function loadStaticImage(relativePath) {
  const image = new Image();
  const sprite = { image, loaded: false };
  image.src = new URL(relativePath, import.meta.url).href;
  if (image.complete) {
    sprite.loaded = true;
  } else {
    image.addEventListener('load', () => {
      sprite.loaded = true;
    });
  }
  return sprite;
}

function finalizeIngredientSprite(sprite) {
  sprite.loaded = true;
  const { ingredientTargetSize } = GAME_CONFIG;
  const maxDimension = Math.max(sprite.image.width, sprite.image.height, 1);
  const scale = Math.min(1.5, ingredientTargetSize / maxDimension);
  sprite.drawWidth = sprite.image.width * scale;
  sprite.drawHeight = sprite.image.height * scale;
  sprite.renderWidth = sprite.drawWidth;
  sprite.renderHeight = sprite.drawHeight;
  refreshSandwichLayersForSprite(sprite);
  if (sprite.participatesInLayout) {
    recalculateIngredientLayout();
  }
}

function getBaseSpriteDimensions(sprite) {
  const fallback = GAME_CONFIG.ingredientTargetSize;
  const width = sprite.drawWidth > 0 ? sprite.drawWidth : fallback;
  const height = sprite.drawHeight > 0 ? sprite.drawHeight : fallback;
  return { width, height };
}

function getSpriteRenderDimensions(sprite) {
  const base = getBaseSpriteDimensions(sprite);
  const width = sprite.renderWidth > 0 ? sprite.renderWidth : base.width;
  const height = sprite.renderHeight > 0 ? sprite.renderHeight : base.height;
  return { width, height };
}

function refreshSandwichLayersForSprite(sprite) {
  sandwichState.layers.forEach((layer) => {
    if (layer.sprite === sprite) {
      const { width, height } = getSpriteRenderDimensions(sprite);
      layer.width = width;
      layer.height = height;
    }
  });
}

function loadSound(relativePath) {
  const audio = new Audio(new URL(`./assets/sounds/${relativePath}`, import.meta.url).href);
  audio.preload = 'auto';
  return audio;
}

function unlockAudio() {
  if (audioUnlocked) {
    return;
  }
  audioUnlocked = true;

  Object.values(sounds).forEach((audio) => {
    if (!audio) {
      return;
    }
    audio.muted = true;
    const attempt = audio.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => {
        audio.muted = false;
      });
    } else {
      audio.muted = false;
    }
  });
}

function playSound(name) {
  if (!audioUnlocked) {
    return;
  }
  const audio = sounds[name];
  if (!audio) {
    return;
  }
  try {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  } catch (err) {
    console.warn('Unable to play sound', name, err);
  }
}

function getStoredUsername() {
  const username = window.localStorage?.getItem('username');
  const trimmed = typeof username === 'string' ? username.trim() : '';
  return trimmed.length ? trimmed : 'Guest';
}

async function submitFinalScore(rawScore) {
  if (leaderboardState.submittedForSession) {
    return;
  }

  const score = Number.isFinite(rawScore) ? Math.max(0, Math.round(rawScore)) : 0;
  leaderboardState.submittedForSession = true;

  if (score <= 0) {
    return;
  }

  const username = getStoredUsername();

  try {
    await saveScore(username, score);
  } catch (error) {
    console.error('Failed to save score:', error);
    return;
  }

  try {
    const data = await getLeaderboard();
    const top5 = data?.top5 ?? [];
    if (typeof window.renderLeaderboard === 'function') {
      window.renderLeaderboard(top5);
    } else if (typeof renderLeaderboard === 'function') {
      renderLeaderboard(top5);
    }
  } catch (error) {
    console.error('Failed to refresh leaderboard:', error);
  }
}

function computeTicketTimeMs(effectType = effectState.type, ingredientCount = ticketState.currentTicket?.ingredients.length ?? 0) {
  if (effectType === 'monster') {
    return GAME_RULES.monsterTicketTimeMs;
  }

  const count = Math.max(1, ingredientCount);

  if (count <= 3) {
    return GAME_RULES.minTicketTimeMs;
  }

  if (count <= 5) {
    return GAME_RULES.midTicketTimeMs;
  }

  const clamped = Math.min(count, 10);
  const normalized = (clamped - 6) / 4; // maps 6..10 -> 0..1
  const duration = GAME_RULES.largeTicketFloorMs
    + normalized * (GAME_RULES.maxTicketTimeMs - GAME_RULES.largeTicketFloorMs);
  return Math.round(Math.min(GAME_RULES.maxTicketTimeMs, Math.max(GAME_RULES.largeTicketFloorMs, duration)));
}

function loseLife(reason) {
  if (gameState.gameOver) {
    return;
  }

  gameState.lives = Math.max(0, gameState.lives - 1);

  ticketState.lastResult = {
    status: 'life_lost',
    reason,
    remainingLives: gameState.lives,
  };

  playSound('failure');

  if (gameState.lives <= 0) {
    gameState.gameOver = true;
    ticketState.currentTicket = null;
    ticketState.remainingMs = 0;
    effectState.type = 'none';
    effectState.remainingTickets = 0;
    effectState.warningMs = 0;
    effectState.visibilityMs = 0;
    effectState.ticketsUntilNextRoll = 5;
    trayDisplayOrder = defaultTrayDisplayOrder.slice();
    recalculateIngredientLayout();
    submitFinalScore(ticketState.score);
  }
}

function startGame() {
  if (sandwichState.resetTimer !== null) {
    clearTimeout(sandwichState.resetTimer);
    sandwichState.resetTimer = null;
  }

  dragState.active = false;
  dragState.slotIndex = null;
  dragState.sprite = null;
  dragState.pointerId = null;

  gameState.started = true;
  gameState.gameOver = false;
  gameState.lives = GAME_RULES.startingLives;
  gameState.completedTickets = 0;

  ticketState.score = 0;
  ticketState.currentTicket = null;
  ticketState.history.length = 0;
  ticketState.lastResult = null;
  ticketState.remainingMs = 0;
  ticketIdCounter = 1;
  leaderboardState.submittedForSession = false;

  effectState.type = 'none';
  effectState.remainingTickets = 0;
  effectState.warningMs = 0;
  effectState.visibilityMs = 0;
  effectState.ticketsUntilNextRoll = 5;

  trayDisplayOrder = defaultTrayDisplayOrder.slice();
  recalculateIngredientLayout();

  resetSandwich();
  assignNextTicket();
  renderFrame();
}

function handleTicketExpired() {
  if (!gameState.started || gameState.gameOver) {
    return;
  }

  const ticket = ticketState.currentTicket;
  if (!ticket || ticketState.remainingMs > 0) {
    return;
  }

  const expected = ticket.ingredients.slice();
  const actual = getSandwichCoreIngredients();

  ticketState.history.push({
    status: 'timeout',
    ticketId: ticket.id,
    expected,
    actual,
  });

  if (dragState.active) {
    endDrag();
  }

  loseLife('timeout');
  resetSandwich();

  if (!gameState.gameOver) {
    assignNextTicket();
  }
}

function updateTicketTimer(deltaMs) {
  if (!gameState.started || gameState.gameOver) {
    return;
  }

  if (effectState.warningMs > 0) {
    effectState.warningMs = Math.max(0, effectState.warningMs - deltaMs);
  }

  if (effectState.visibilityMs > 0) {
    effectState.visibilityMs = Math.max(0, effectState.visibilityMs - deltaMs);
  }

  if (!ticketState.currentTicket || ticketState.remainingMs <= 0) {
    return;
  }

  ticketState.remainingMs = Math.max(0, ticketState.remainingMs - deltaMs);

  if (ticketState.remainingMs === 0) {
    handleTicketExpired();
  }
}

function formatIngredientKey(key) {
  if (typeof key !== 'string' || !key.length) {
    return '';
  }
  const withSpaces = key.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function shuffleArray(items) {
  const array = items.slice();
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function determineTicketSize() {
  if (!ORDERABLE_INGREDIENT_KEYS.length) {
    return 0;
  }
  const minIngredients = Math.min(3, ORDERABLE_INGREDIENT_KEYS.length);
  const maxIngredients = Math.min(5, ORDERABLE_INGREDIENT_KEYS.length);
  if (maxIngredients <= minIngredients) {
    return maxIngredients;
  }
  const range = maxIngredients - minIngredients + 1;
  return minIngredients + Math.floor(Math.random() * range);
}

function getTipThreshold() {
  const threshold = GAME_RULES.baseTipThreshold + gameState.completedTickets * GAME_RULES.tipThresholdStep;
  return Math.min(GAME_RULES.maxTipThreshold, threshold);
}

function getEffectDisplayName(type) {
  if (!type || type === 'none') {
    return EFFECT_DISPLAY_NAMES.none;
  }
  return EFFECT_DISPLAY_NAMES[type] ?? EFFECT_DISPLAY_NAMES.none;
}

function activateEffect(type) {
  effectState.type = type;
  effectState.remainingTickets = 5;
  effectState.warningMs = 3000;
  effectState.visibilityMs = 0;
  const soundKey = EFFECT_SOUND_KEYS[type];
  if (soundKey) {
    playSound(soundKey);
  }
}

function activateRandomEffect() {
  const type = EFFECT_TYPES[Math.floor(Math.random() * EFFECT_TYPES.length)];
  activateEffect(type);
}

function createTicket({ ingredientCount, allowDuplicates }) {
  if (!ORDERABLE_INGREDIENT_KEYS.length || ingredientCount <= 0) {
    return {
      id: ticketIdCounter++,
      ingredients: [],
    };
  }

  let ingredients = [];

  if (allowDuplicates) {
    for (let i = 0; i < ingredientCount; i += 1) {
      const choice = ORDERABLE_INGREDIENT_KEYS[Math.floor(Math.random() * ORDERABLE_INGREDIENT_KEYS.length)];
      ingredients.push(choice);
    }
  } else {
    const pool = shuffleArray(ORDERABLE_INGREDIENT_KEYS);
    ingredients = pool.slice(0, Math.min(ingredientCount, pool.length));
    while (ingredients.length < ingredientCount) {
      ingredients.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  return {
    id: ticketIdCounter++,
    ingredients,
  };
}

function assignNextTicket() {
  if (!gameState.started || gameState.gameOver) {
    ticketState.currentTicket = null;
    ticketState.remainingMs = 0;
    return;
  }

  if (effectState.ticketsUntilNextRoll > 0) {
    effectState.ticketsUntilNextRoll -= 1;
  }

  const shouldSpinEffect = effectState.ticketsUntilNextRoll <= 0 && effectState.remainingTickets <= 0;

  if (shouldSpinEffect) {
    activateRandomEffect();
    effectState.ticketsUntilNextRoll = 5;
  }

  let ticketOptions = { ingredientCount: determineTicketSize(), allowDuplicates: false };
  const activeEffect = effectState.type;

  if (activeEffect === 'monster') {
    ticketOptions = { ingredientCount: 10, allowDuplicates: true };
  } else if (activeEffect === 'invisible') {
    ticketOptions = { ingredientCount: Math.min(determineTicketSize(), 5), allowDuplicates: false };
  }

  if (activeEffect === 'shuffle') {
    trayDisplayOrder = shuffleArray(defaultTrayDisplayOrder);
  } else {
    trayDisplayOrder = defaultTrayDisplayOrder.slice();
  }

  ticketState.currentTicket = createTicket(ticketOptions);
  ticketState.currentTicket.effectType = activeEffect;
  ticketState.lastResult = null;
  ticketState.remainingMs = computeTicketTimeMs(activeEffect, ticketState.currentTicket.ingredients.length);
  effectState.visibilityMs = activeEffect === 'invisible' ? 3000 : 0;

  console.log('New ticket:', ticketState.currentTicket);
  playSound('newOrder');

  recalculateIngredientLayout();

  if (effectState.remainingTickets > 0) {
    effectState.remainingTickets -= 1;
    if (effectState.remainingTickets <= 0) {
      effectState.type = 'none';
      effectState.remainingTickets = 0;
      effectState.visibilityMs = 0;
    }
  }
}

function getSandwichCoreIngredients() {
  return sandwichState.stackLog.filter((key) => key !== 'bottom_bun' && key !== 'top_bun');
}

function evaluateSandwichAgainstTicket() {
  const ticket = ticketState.currentTicket;
  const actual = getSandwichCoreIngredients();

  if (!ticket) {
    const result = { status: 'no_ticket', matches: false, expected: [], actual };
    ticketState.lastResult = result;
    return result;
  }

  const expected = ticket.ingredients.slice();
  const matches = expected.length === actual.length && expected.every((key, index) => key === actual[index]);
  const ticketEffect = ticket.effectType ?? effectState.type;
  const timeBudget = computeTicketTimeMs(ticketEffect, ticket.ingredients.length);
  const remainingFraction = timeBudget > 0 ? ticketState.remainingMs / timeBudget : 0;
  const tipThreshold = getTipThreshold();
  const qualifiesForTip = matches && remainingFraction >= tipThreshold;

  if (matches) {
    ticketState.score += 1;
    gameState.completedTickets += 1;
    playSound('orderComplete');
    if (qualifiesForTip) {
      playSound('tipEarned');
    }
  } else {
    ticketState.score = Math.max(0, ticketState.score - 1);
    playSound('failure');
  }

  const result = {
    status: 'evaluated',
    ticketId: ticket.id,
    matches,
    expected,
    actual,
  };

  ticketState.lastResult = result;
  ticketState.history.push(result);
  ticketState.currentTicket = null;

  if (matches) {
    console.log(`Ticket #${ticket.id} completed! Score: ${ticketState.score}`);
  } else {
    console.log(`Ticket #${ticket.id} failed. Expected ${expected.join(', ')} but got ${actual.join(', ')}.`);
  }

  ticketState.remainingMs = 0;

  return result;
}

function recalculateIngredientLayout() {
  const count = ingredientSprites.length;
  ingredientPlacements.length = count;

  if (!count) {
    return;
  }

  const bottomPadding = GAME_CONFIG.ingredientPadding;
  const baseBottomY = internalSize.height - bottomPadding;

  const minX = GAME_CONFIG.ingredientPadding;
  const maxX = internalSize.width - GAME_CONFIG.ingredientPadding;
  const spanX = Math.max(0, maxX - minX);

  const baseDimensions = ingredientSprites.map((sprite) => getBaseSpriteDimensions(sprite));
  const baseWidths = baseDimensions.map((dim) => dim.width);
  const baseHeights = baseDimensions.map((dim) => dim.height);
  const baseTotalWidth = baseWidths.reduce((sum, width) => sum + width, 0);

  const desiredSpacing = count > 1 ? 32 : 0;
  const desiredTotalSpan = baseTotalWidth + desiredSpacing * Math.max(0, count - 1);
  let scale = desiredTotalSpan > 0 ? spanX / desiredTotalSpan : 1;
  if (!Number.isFinite(scale) || scale <= 0) {
    scale = 1;
  }
  scale = Math.min(1, scale);

  const scaledWidths = baseWidths.map((width) => width * scale);
  const scaledHeights = baseHeights.map((height) => height * scale);
  let spacing = count > 1 ? desiredSpacing * scale : 0;
  const scaledTotalWidth = scaledWidths.reduce((sum, width) => sum + width, 0);

  if (count > 1) {
    const spacingNumerator = spanX - scaledTotalWidth;
    if (spacingNumerator <= 0) {
      spacing = 0;
    } else {
      const equalSpacing = spacingNumerator / (count - 1);
      spacing = Math.min(spacing, equalSpacing);
    }
  }

  const usedSpan = scaledTotalWidth + spacing * Math.max(0, count - 1);
  const startX = minX + Math.max(0, (spanX - usedSpan) / 2);

  let currentX = startX;
  const positions = [];

  for (let orderIndex = 0; orderIndex < trayDisplayOrder.length; orderIndex += 1) {
    const spriteIndex = trayDisplayOrder[orderIndex];
    const width = scaledWidths[spriteIndex];
    const height = scaledHeights[spriteIndex];
    const centerX = currentX + width / 2;
    const centerY = baseBottomY - height / 2;

    positions.push({ spriteIndex, centerX, centerY, width, height });
    currentX += width + spacing;
  }

  positions.forEach(({ spriteIndex, centerX, centerY, width, height }) => {
    const sprite = ingredientSprites[spriteIndex];
    sprite.renderWidth = width;
    sprite.renderHeight = height;

    ingredientPlacements[spriteIndex] = { x: centerX, y: centerY };

    const slot = ingredientSlots[spriteIndex];
    if (slot) {
      slot.center.x = centerX;
      slot.center.y = centerY;
      slot.bounds.x = centerX - width / 2;
      slot.bounds.y = centerY - height / 2;
      slot.bounds.width = width;
      slot.bounds.height = height;
    }
  });

  updatePointerHover();
}

function createSandwichLayer(key, sprite) {
  const { width, height } = getSpriteRenderDimensions(sprite);
  return {
    key,
    sprite,
    width,
    height,
  };
}

function resetSandwich() {
  if (sandwichState.resetTimer !== null) {
    clearTimeout(sandwichState.resetTimer);
    sandwichState.resetTimer = null;
  }

  sandwichState.layers.length = 0;
  sandwichState.stackLog = [];
  sandwichState.uniqueIngredients = new Set();
  sandwichState.ingredientCounts = new Map();
  sandwichState.isComplete = false;
  sandwichState.lastBounds = null;
  sandwichState.layers.push(createSandwichLayer('bottom_bun', bottomBunSprite));
  sandwichState.stackLog.push('bottom_bun');
  sandwichState.uniqueIngredients.add('bottom_bun');
  sandwichState.ingredientCounts.set('bottom_bun', 1);
  updatePointerHover();
}

function markSandwichComplete() {
  const evaluation = evaluateSandwichAgainstTicket();
  sandwichState.isComplete = true;

  if (sandwichState.resetTimer !== null) {
    clearTimeout(sandwichState.resetTimer);
  }

  sandwichState.resetTimer = setTimeout(() => {
    resetSandwich();
    if (!gameState.gameOver) {
      assignNextTicket();
    }
    renderFrame();
  }, SANDWICH_CONFIG.resetDelayMs);
}

function placeIngredientFromSlot(slotIndex) {
  if (!gameState.started || sandwichState.isComplete || gameState.gameOver) {
    return;
  }

  const slot = ingredientSlots[slotIndex];
  const definition = slot?.definition ?? ingredientDefinitions[slotIndex];
  const sprite = definition?.portionSprite;

  if (!slot || !definition || !sprite) {
    return;
  }

  const layerKey = definition.key;
  const isTopBun = layerKey === 'top_bun';

  if (isTopBun) {
    const alreadyHasTopBun = sandwichState.layers.some((layer) => layer.key === 'top_bun');
    if (alreadyHasTopBun) {
      return;
    }
  }

  const layer = createSandwichLayer(layerKey, sprite);
  sandwichState.layers.push(layer);
  sandwichState.stackLog.push(layerKey);
  sandwichState.uniqueIngredients.add(layerKey);
  sandwichState.ingredientCounts.set(layerKey, (sandwichState.ingredientCounts.get(layerKey) || 0) + 1);
  playSound('ingredientPlaced');

  if (isTopBun) {
    markSandwichComplete();
  }
}

function findIngredientUnderPointer(x, y) {
  for (let index = ingredientSlots.length - 1; index >= 0; index -= 1) {
    const slot = ingredientSlots[index];
    if (!slot) {
      continue;
    }
    const { bounds } = slot;
    if (bounds.width <= 0 || bounds.height <= 0) {
      continue;
    }
    if (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    ) {
      return index;
    }
  }

  return null;
}

function updatePointerHover() {
  if (!pointerState.isInside) {
    pointerState.hoverIndex = null;
    return;
  }

  pointerState.hoverIndex = dragState.active ? null : findIngredientUnderPointer(pointerState.x, pointerState.y);
}

function getSandwichBounds(margin = 28) {
  const expand = Math.max(0, margin);

  const anchor = getStackAnchor();

  if (!sandwichState.layers.length) {
    const dims = getSpriteRenderDimensions(bottomBunSprite);
    const baseMinX = anchor.x - dims.width / 2;
    const baseMaxX = anchor.x + dims.width / 2;
    const baseMinY = anchor.y - dims.height / 2;
    const baseMaxY = anchor.y + dims.height / 2;
    const fallbackBounds = {
      minX: baseMinX - expand,
      maxX: baseMaxX + expand,
      minY: baseMinY - expand,
      maxY: baseMaxY + expand,
    };
    sandwichState.lastBounds = fallbackBounds;
    return fallbackBounds;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  sandwichState.layers.forEach((layer) => {
    const sprite = layer.sprite;
    if (!sprite) {
      return;
    }

    const dims = getSpriteRenderDimensions(sprite);
    const width = layer.width > 0 ? layer.width : dims.width;
    const height = layer.height > 0 ? layer.height : dims.height;
    const drawX = anchor.x - width / 2;
    const drawY = anchor.y - height / 2;

    minX = Math.min(minX, drawX);
    maxX = Math.max(maxX, drawX + width);
    minY = Math.min(minY, drawY);
    maxY = Math.max(maxY, drawY + height);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    const dims = getSpriteRenderDimensions(bottomBunSprite);
    const fallbackBounds = {
      minX: anchor.x - dims.width / 2 - expand,
      maxX: anchor.x + dims.width / 2 + expand,
      minY: anchor.y - dims.height / 2 - expand,
      maxY: anchor.y + dims.height / 2 + expand,
    };
    sandwichState.lastBounds = fallbackBounds;
    return fallbackBounds;
  }

  const bounds = {
    minX: minX - expand,
    maxX: maxX + expand,
    minY: minY - expand,
    maxY: maxY + expand,
  };

  sandwichState.lastBounds = bounds;
  return bounds;
}

function shouldDropOnSandwich(x, y) {
  const bounds = getSandwichBounds();
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function getStackAnchor() {
  const dims = getSpriteRenderDimensions(bottomBunSprite);
  return {
    x: SANDWICH_CONFIG.baseX,
    y: SANDWICH_CONFIG.baseLineY - dims.height / 2,
  };
}

function beginDrag(slotIndex, pointerId = null) {
  if (!gameState.started || sandwichState.isComplete || gameState.gameOver) {
    return;
  }

  const definition = ingredientDefinitions[slotIndex];
  const sprite = definition?.portionSprite;

  if (!definition || !sprite) {
    return;
  }

  dragState.active = true;
  dragState.slotIndex = slotIndex;
  dragState.sprite = sprite;
  dragState.pointerId = pointerId;
  dragState.x = pointerState.x;
  dragState.y = pointerState.y;

  updatePointerHover();
}

function updateDragPosition(x, y) {
  if (!dragState.active) {
    return;
  }

  dragState.x = x;
  dragState.y = y;
}

function endDrag() {
  dragState.active = false;
  dragState.slotIndex = null;
  dragState.sprite = null;
  dragState.pointerId = null;
}

function buildTicketStatusList(expected, actual) {
  const items = [];
  const maxLength = Math.max(expected.length, actual.length);

  for (let index = 0; index < maxLength; index += 1) {
    const expectedKey = expected[index];
    const actualKey = actual[index];
    let textKey = expectedKey ?? actualKey;
    if (!textKey) {
      continue;
    }

    let color = '#000000';
    let suffix = '';

    if (actualKey === undefined) {
      color = '#000000';
      suffix = ' (waiting)';
    } else if (expectedKey === undefined) {
      color = '#e74c3c';
      suffix = ' (extra)';
    } else if (expectedKey === actualKey) {
      color = '#2ecc71';
      suffix = ' (ok)';
    } else {
      color = '#e74c3c';
      suffix = ` (expected ${formatIngredientKey(expectedKey)})`;
    }

    const label = formatIngredientKey(actualKey ?? expectedKey);
    items.push({ color, text: `${label}${suffix}` });
  }

  return items;
}

function drawCheckerboard() {
  const { tileSize, checkerColors, groutColor } = GAME_CONFIG;
  const cols = Math.ceil(internalSize.width / tileSize);
  const rows = Math.ceil(internalSize.height / tileSize);

  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, internalSize.width, internalSize.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const colorIndex = (row + col) % checkerColors.length;
      ctx.fillStyle = checkerColors[colorIndex];
      const x = col * tileSize;
      const y = row * tileSize;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
    }
  }
}

function drawIngredients() {
  const { ingredientShadowColor, ingredientShadowBlur, ingredientShadowOffsetY } = GAME_CONFIG;

  ingredientSprites.forEach((sprite, index) => {
    if (!sprite.loaded) {
      return;
    }

    const placement = ingredientPlacements[index];
    if (!placement) {
      return;
    }

    const { width, height } = getSpriteRenderDimensions(sprite);
    const x = placement.x - width / 2;
    const y = placement.y - height / 2;

    ctx.save();
    ctx.shadowColor = ingredientShadowColor;
    ctx.shadowBlur = ingredientShadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = ingredientShadowOffsetY;
    ctx.drawImage(sprite.image, x, y, width, height);
    ctx.restore();

    if (pointerState.hoverIndex === index && pointerState.isInside) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
      ctx.shadowBlur = 8;
      ctx.strokeRect(x - 6, y - 6, width + 12, height + 12);
      ctx.restore();
    }

    const slot = ingredientSlots[index];
    if (slot) {
      slot.bounds.x = x;
      slot.bounds.y = y;
      slot.bounds.width = width;
      slot.bounds.height = height;
    }
  });
}

function drawSandwich() {
  if (!sandwichState.layers.length) {
    return;
  }

  const anchor = getStackAnchor();
  const shadowColor = SANDWICH_CONFIG.stackShadowColor;
  const shadowBlur = SANDWICH_CONFIG.stackShadowBlur;
  const shadowOffsetY = SANDWICH_CONFIG.stackShadowOffsetY;

  sandwichState.layers.forEach((layer) => {
    const sprite = layer.sprite;
    if (!sprite) {
      return;
    }

    const dimensions = getSpriteRenderDimensions(sprite);
    const width = layer.width > 0 ? layer.width : dimensions.width;
    const height = layer.height > 0 ? layer.height : dimensions.height;

    if (layer.width !== width || layer.height !== height) {
      layer.width = width;
      layer.height = height;
    }

    const drawX = anchor.x - width / 2;
    const drawY = anchor.y - height / 2;

    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadowOffsetY;
    ctx.drawImage(sprite.image, drawX, drawY, width, height);
    ctx.restore();
  });
}

function drawDragPreview() {
  if (!dragState.active || !dragState.sprite || !dragState.sprite.loaded) {
    return;
  }

  const { sprite } = dragState;
  const { width, height } = getSpriteRenderDimensions(sprite);
  const x = dragState.x - width / 2;
  const y = dragState.y - height / 2;

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;
  ctx.drawImage(sprite.image, x, y, width, height);
  ctx.restore();
}

function drawStartScreen() {
  ctx.save();
  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const title = "Sara's Burger Joint";
  ctx.font = "28px 'Press Start 2P', monospace";
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, canvas.width / 2, 60);

  const imageAreaWidth = Math.min(420, canvas.width * 0.8);
  const imageAreaHeight = Math.min(320, canvas.height * 0.55);
  const imageX = (canvas.width - imageAreaWidth) / 2;
  const imageY = (canvas.height - imageAreaHeight) / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(imageX, imageY, imageAreaWidth, imageAreaHeight);

  if (startScreenImage.loaded) {
    const { image } = startScreenImage;
    const aspect = image.width / Math.max(image.height, 1);
    let drawWidth = imageAreaWidth;
    let drawHeight = drawWidth / Math.max(aspect, 0.0001);

    if (drawHeight > imageAreaHeight) {
      drawHeight = imageAreaHeight;
      drawWidth = drawHeight * aspect;
    }

    const drawX = canvas.width / 2 - drawWidth / 2;
    const drawY = imageY + (imageAreaHeight - drawHeight) / 2;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  } else {
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Loading preview...', canvas.width / 2, imageY + imageAreaHeight / 2 - 8);
  }

  ctx.font = "16px 'Press Start 2P', monospace";
  ctx.fillStyle = '#ffeb3b';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Click anywhere to start', canvas.width / 2, canvas.height - 60);

  ctx.restore();
}

function formatScore(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const score = Math.max(0, Math.round(value));
  return String(score);
}

function formatTimer(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const seconds = Math.max(0, totalSeconds);
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  return `${String(minutesPart).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`;
}

function renderLives() {
  const heart = '\u2665';
  if (gameState.lives <= 0) {
    return `${heart} × 0`;
  }
  const hearts = heart.repeat(gameState.lives);
  return gameState.lives === GAME_RULES.startingLives ? hearts : `${hearts} (x${gameState.lives})`;
}

function drawTicketOverlay() {
  if (!gameState.started) {
    return;
  }
  const ticket = ticketState.currentTicket;
  const actual = getSandwichCoreIngredients();
  const statusItems = ticket
    ? buildTicketStatusList(ticket.ingredients, actual)
    : [];
  const ticketEffectType = ticket?.effectType ?? effectState.type ?? 'none';
  const effectLabel = getEffectDisplayName(ticketEffectType);

  const overlayWidth = 280;
  const margin = 16;
  const padding = 12;
  const headerHeight = 18;
  const scoreHeight = 14;
  const infoHeight = 14;
  const lineSpacing = 14;
  const itemsHeight = statusItems.length * lineSpacing;
  const emptyHeight = ticket ? 0 : lineSpacing;
  const infoLines = 4;
  const extraSpacingAfterInfo = 8;
  const boxHeight = padding * 2 + headerHeight + scoreHeight + infoHeight * infoLines + extraSpacingAfterInfo + Math.max(itemsHeight, emptyHeight);
  const startX = canvas.width - overlayWidth - margin;
  const startY = margin;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillRect(startX, startY, overlayWidth, boxHeight);
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, overlayWidth, boxHeight);

  ctx.font = "14px 'Press Start 2P', monospace";
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  let textY = startY + padding;
  ctx.fillText(ticket ? `Ticket #${ticket.id}` : 'Ticket', startX + padding, textY);

  ctx.font = "11px 'Press Start 2P', monospace";
  textY += headerHeight;
  ctx.fillText(`Score: ${formatScore(ticketState.score)}`, startX + padding, textY);

  textY += scoreHeight;
  ctx.fillText(`Lives: ${renderLives()}`, startX + padding, textY);

  textY += infoHeight;
  ctx.fillText(`Timer: ${formatTimer(ticketState.remainingMs)}`, startX + padding, textY);

  textY += infoHeight;
  ctx.fillText(`Effect: ${effectLabel}`, startX + padding, textY);

  textY += infoHeight + extraSpacingAfterInfo;

  if (!ticket) {
    ctx.fillStyle = '#000000';
    ctx.fillText('Awaiting order...', startX + padding, textY);
    ctx.restore();
    return;
  }

  const showIngredients = !(ticketEffectType === 'invisible' && effectState.visibilityMs <= 0);

  if (!showIngredients) {
    ctx.fillStyle = '#ff5c5c';
    ctx.fillText('Ticket hidden!', startX + padding, textY);
  } else {
    statusItems.forEach(({ color, text }) => {
      ctx.fillStyle = color;
      ctx.fillText(text, startX + padding, textY);
      textY += lineSpacing;
    });
  }

  ctx.restore();
}

function drawEffectWarning() {
  if (!gameState.started || effectState.warningMs <= 0 || effectState.type === 'none') {
    return;
  }

  const label = getEffectDisplayName(effectState.type);
  if (!label) {
    return;
  }

  const width = Math.min(canvas.width * 0.7, 360);
  const height = 80;
  const x = (canvas.width - width) / 2;
  const y = canvas.height * 0.18 - height / 2;

  ctx.save();
  ctx.globalAlpha = Math.max(0.2, Math.min(1, effectState.warningMs / 3000));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#ffeb3b';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#ffeb3b';
  ctx.font = "18px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, y + height / 2);

  ctx.restore();
}

function drawGameOverOverlay() {
  if (!gameState.gameOver) {
    return;
  }

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.font = "36px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = "18px 'Press Start 2P', monospace";
  ctx.fillText(`Final Score: ${formatScore(ticketState.score)}`, canvas.width / 2, canvas.height / 2 + 10);

  ctx.font = "14px 'Press Start 2P', monospace";
  ctx.fillText('Click to restart', canvas.width / 2, canvas.height / 2 + 60);
  ctx.restore();
}

function drawPointerHighlight() {
  if (!pointerState.isInside) {
    return;
  }

  const radius = 28;
  const gradient = ctx.createRadialGradient(pointerState.x, pointerState.y, 0, pointerState.x, pointerState.y, radius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(pointerState.x, pointerState.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = internalSize.width / rect.width;
  const scaleY = internalSize.height / rect.height;

  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;

  pointerState.x = rawX * scaleX;
  pointerState.y = rawY * scaleY;
  pointerState.isInside = rawX >= 0 && rawX <= rect.width && rawY >= 0 && rawY <= rect.height;
  updatePointerHover();
}

function clearPointer() {
  pointerState.isInside = false;
  pointerState.hoverIndex = null;
}

function handlePointerDown(event) {
  event.preventDefault();
  updatePointer(event);
  unlockAudio();

  if (!gameState.started || gameState.gameOver) {
    startGame();
    return;
  }

  if (!pointerState.isInside) {
    return;
  }

  const slotIndex = pointerState.hoverIndex;
  if (slotIndex === null || slotIndex === undefined) {
    return;
  }

  beginDrag(slotIndex, event.pointerId ?? null);
}

function handlePointerMove(event) {
  if (!gameState.started || gameState.gameOver) {
    return;
  }
  updatePointer(event);

  if (dragState.active) {
    updateDragPosition(pointerState.x, pointerState.y);
  }
}

function handlePointerUp(event) {
  if (!gameState.started || gameState.gameOver) {
    return;
  }
  if (!dragState.active) {
    return;
  }

  updatePointer(event);

  const { slotIndex } = dragState;
  if (slotIndex !== null && slotIndex !== undefined && shouldDropOnSandwich(pointerState.x, pointerState.y)) {
    placeIngredientFromSlot(slotIndex);
  }

  endDrag();
  updatePointerHover();
}

function handlePointerCancel() {
  if (!dragState.active) {
    return;
  }
  endDrag();
  updatePointerHover();
}

function renderFrame() {
  if (!gameState.started) {
    drawStartScreen();
    return;
  }

  drawCheckerboard();
  drawSandwich();
  drawIngredients();
  drawDragPreview();
  drawPointerHighlight();
  drawEffectWarning();
  drawTicketOverlay();
  drawGameOverOverlay();
}

function tickFrame(timestamp) {
  const delta = timestamp - loopState.lastFrame;
  loopState.lastFrame = timestamp;

  updateTicketTimer(delta);

  renderFrame();
  loopState.animationHandle = requestAnimationFrame(tickFrame);
}

function init() {
  resetSandwich();
  recalculateIngredientLayout();
  assignNextTicket();

  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mouseleave', clearPointer);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);
  window.addEventListener('mouseleave', handlePointerCancel);
  window.addEventListener('blur', handlePointerCancel);

  window.sbjGame = {
    ingredientSlots,
    ingredientSprites,
    findIngredientUnderPointer,
    pointerState,
    sandwichState,
    gameState,
    effectState,
    resetSandwich,
    placeIngredientFromSlot,
    dragState,
    ingredientDefinitions,
    ticketState,
    assignNextTicket,
    evaluateSandwichAgainstTicket,
    getSandwichCoreIngredients,
    loseLife,
    startGame,
  };

  renderFrame();
  loopState.animationHandle = requestAnimationFrame(tickFrame);
}

function teardown() {
  if (loopState.animationHandle !== null) {
    cancelAnimationFrame(loopState.animationHandle);
    loopState.animationHandle = null;
  }

  canvas.removeEventListener('mouseleave', clearPointer);
  canvas.removeEventListener('mousedown', handlePointerDown);
  window.removeEventListener('mousemove', handlePointerMove);
  window.removeEventListener('mouseup', handlePointerUp);
  window.removeEventListener('mouseleave', handlePointerCancel);
  window.removeEventListener('blur', handlePointerCancel);
}

window.addEventListener('beforeunload', teardown);

init();
