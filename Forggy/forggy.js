// feel like we should set some ground rules for forggy before coding
// goal is to get as far as you can like frogger
// it is endless
// you get points each time you progress a tile
// hit by car == game over
// fall in river == game over
// randomly generated logs and cars
// radnomly generated worlds
// world is on a grid and scrolls up with each tile  you cross
// player moves one tile at a time
// cars do not move on grid, they move smoothly
// logs move smoothly
// you can only jump on logs
// cars can only spawn on road tiles
// logs can only spawn on river tiles
// there are 4 types of tiles: road, river, grass, tree,
// grass is safe to stand on
// tree is meant to block your way, you cannot stand on it
// you can only move up down left or right. no diagonal movement you cannot move off screen
// each tile is 50x50 pixels (size of frog sprite)
// up one tile == 1 point
// roads can stack and rivers can stack but there must be at least one grass tile between them
// every 20 points the likelyhood of a stacked road and or river increases
// the likelyhood of long grass patches decreases
// sport car moves very fast, truck moves slow, car moves medium
// trees can spawn on stack on tiles next to them however they can only spawn on grass tiles and they cannot block the path forward
// logs get a random speed
// somehow need to ensure that there is always a way forward

// Grab the playfield so everything that follows has somewhere to show up.
const canvas = document.getElementById('game-canvas');
const ctx = canvas?.getContext('2d');

if (!canvas || !ctx) {
  throw new Error('Game canvas not found. Make sure forggy.html includes a canvas with id "game-canvas".');
}

const TILE_SIZE = 50;
const GRID_COLUMNS = Math.floor(canvas.width / TILE_SIZE);
const GRID_ROWS = Math.floor(canvas.height / TILE_SIZE);
const FROG_CENTER_ROW = Math.floor(GRID_ROWS / 2);

// Tile type labels keep the rest of the code readable and allow the generation
// logic to reason about “grass lane versus river lane” without magic strings.
const TILE_TYPES = {
  GRASS: 'grass',
  ROAD: 'road',
  RIVER: 'river',
  TREE: 'tree',
};

const HAZARD_TILES = new Set([TILE_TYPES.ROAD, TILE_TYPES.RIVER]);

// Simple sprite loader that resolves relative URLs and exposes a “loaded” flag
// so the rendering code can fall back to colored rectangles if the texture has
// not completely finished decoding yet.
function loadSprite(relativePath) {
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

// Textures and odds-and-ends that paint the board and keep it lively.
const roadSprite = loadSprite('./assets/sprites/road.png');
const treeSprite = loadSprite('./assets/sprites/Tree.png');
const logSprite = loadSprite('./assets/sprites/log.png');
const sportCarSprite = loadSprite('./assets/sprites/sport_car.png');
const sedanCarSprite1 = loadSprite('./assets/sprites/1_car.png');
const sedanCarSprite2 = loadSprite('./assets/sprites/2_car.png');
const sedanCarSprite3 = loadSprite('./assets/sprites/3_car.png');
const sedanCarSprite4 = loadSprite('./assets/sprites/4_car.png');
const truckCarSprite = loadSprite('./assets/sprites/truck_car.png');

const SOUND_DEFINITIONS = {
  jump: './assets/sounds/jump.wav',
  logJump: './assets/sounds/log_jump.wav',
  waterDeath: './assets/sounds/fell_in_water.wav',
  carDeath: './assets/sounds/hit_by_car.wav',
  truckHorn: './assets/sounds/truck_horn.wav',
};

const CAR_FLY_BY_FILES = [
  './assets/sounds/car_fly_by.wav',
  './assets/sounds/car_fly_by_2.wav',
  './assets/sounds/car_fly_by_3.wav',
  './assets/sounds/car_fly_by_4.wav',
];

const SCORE_SOUND_CONFIG = [
  { points: 100, file: './assets/sounds/100_pts.wav' },
  { points: 20, file: './assets/sounds/20_pts.wav' },
];

function loadSound(relativePath) {
  const audio = new Audio(new URL(relativePath, import.meta.url).href);
  audio.preload = 'auto';
  return audio;
}

const sounds = Object.fromEntries(
  Object.entries(SOUND_DEFINITIONS).map(([key, path]) => [key, loadSound(path)]),
);

const carFlyBySounds = CAR_FLY_BY_FILES.map((path) => loadSound(path));

const scoreSoundThresholds = SCORE_SOUND_CONFIG.slice()
  .sort((a, b) => b.points - a.points)
  .map(({ points, file }) => ({
    points,
    audio: loadSound(file),
  }));
const WATER_FRAME_FILES = ['water1.png', 'water2.png', 'water3.png', 'water4.png', 'water5.png', 'water6.png'];
const waterSprites = WATER_FRAME_FILES.map((file) => loadSprite(`./assets/sprites/${file}`));

// World-generation dials. Adjusting these values lets us quickly rebalance the
// feel of the game (how narrow the grass corridors are, how forgiving log jumps
// are, how fast the river pushes you, etc.) without hunting through the logic.
const MIN_PATH_WIDTH = Math.max(1, Math.min(2, GRID_COLUMNS));
const MAX_PATH_WIDTH = Math.max(MIN_PATH_WIDTH, Math.min(4, GRID_COLUMNS));
const TREE_SPAWN_CHANCE = 0.45;
const LOG_LANDING_TOLERANCE = TILE_SIZE * 0.2;
const LOG_MIN_SPEED = 65;
const LOG_MAX_SPEED = 120;
const LOG_MIN_LENGTH_TILES = 3;
const LOG_MAX_LENGTH_TILES = 3;
const LOG_MIN_GAP = TILE_SIZE * 1.75;
const LOG_MAX_GAP = TILE_SIZE * 3.5;
const CAR_MIN_SPEED = 120;
const CAR_MAX_SPEED = 210;
const CAR_MIN_GAP = TILE_SIZE * 3.5;
const CAR_MAX_GAP = TILE_SIZE * 5.5;
const CAR_WIDTH = TILE_SIZE * 2;

const CAR_TYPE_DEFINITIONS = {
  sedan1: {
    key: 'sedan1',
    sprite: sedanCarSprite1,
    widthTiles: 2,
    heightScale: 0.85,
    weight: 6,
    speedMultiplier: 1,
  },
  sedan2: {
    key: 'sedan2',
    sprite: sedanCarSprite2,
    widthTiles: 2,
    heightScale: 0.85,
    weight: 6,
    speedMultiplier: 1,
  },
  sedan3: {
    key: 'sedan3',
    sprite: sedanCarSprite3,
    widthTiles: 2,
    heightScale: 0.85,
    weight: 6,
    speedMultiplier: 1.05,
  },
  sedan4: {
    key: 'sedan4',
    sprite: sedanCarSprite4,
    widthTiles: 2,
    heightScale: 0.85,
    weight: 6,
    speedMultiplier: 0.95,
  },
  truck: {
    key: 'truck',
    sprite: truckCarSprite,
    widthTiles: 2.4,
    heightScale: 0.95,
    weight: 3,
    speedMultiplier: 0.75,
  },
  sport: {
    key: 'sport',
    sprite: sportCarSprite,
    widthTiles: 2,
    heightScale: 0.8,
    weight: 1,
    speedMultiplier: 1.85,
  },
};
let lastGrassPathWidth = Math.min(3, MAX_PATH_WIDTH);
let lastGrassPathStart = Math.max(0, Math.floor((GRID_COLUMNS - lastGrassPathWidth) / 2));
const TILE_DEFINITIONS = {
  [TILE_TYPES.GRASS]: {
    color: '#69cc76',
    walkable: true,
    hazardType: null,
    spawns: ['tree'],
  },
  [TILE_TYPES.ROAD]: {
    color: '#4a4a4a',
    walkable: true,
    hazardType: 'vehicles',
    spawns: ['car', 'truck', 'sport_car'],
    sprite: roadSprite,
  },
  [TILE_TYPES.RIVER]: {
    color: '#2f6db0',
    walkable: false,
    hazardType: 'water',
    spawns: ['log'],
    spriteFrames: waterSprites,
    conveyor: true,
  },
  [TILE_TYPES.TREE]: {
    color: '#275930',
    walkable: false,
    hazardType: null,
    blocksMovement: true,
    sprite: treeSprite,
  },
};
const WATER_FRAME_DURATION = 150;
let waterFrameIndex = 0;
let waterFrameTimer = 0;

// Animate the water background by stepping through the cached PNG sequence
// using the elapsed time between frames. This keeps the river shimmering even
// while the rest of the world scrolls.
function updateWaterAnimation(deltaTime) {
  if (waterSprites.length === 0) {
    return;
  }
  if (!Number.isFinite(deltaTime)) {
    return;
  }
  waterFrameTimer += deltaTime;
  while (waterFrameTimer >= WATER_FRAME_DURATION) {
    waterFrameTimer -= WATER_FRAME_DURATION;
    waterFrameIndex = (waterFrameIndex + 1) % waterSprites.length;
  }
}

// Tiny record that tells us what a tile is and what it might be carrying around.
function createTile(tileType = TILE_TYPES.GRASS) {
  const definition = TILE_DEFINITIONS[tileType];
  return {
    type: tileType,
    definition,
    state: {}, // dynamic data holder (vehicles, logs, etc.)
  };
}

function createRow(tileType = TILE_TYPES.GRASS) {
  return Array.from({ length: GRID_COLUMNS }, () => createTile(tileType));
}

// Utility helpers: one for bounded random integers (tiles, rows), one for
// clamping values back into the grid, and a float variant for smooth motion
// (log speed, offsets, spacing).
function randomInt(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function playSound(audio, volume = 1) {
  if (!audio) {
    return;
  }
  const instance = audio.cloneNode();
  instance.volume = Math.min(1, Math.max(0, volume));
  try {
    instance.currentTime = 0;
  } catch (error) {
    // ignore if cannot set currentTime
  }
  instance.play().catch(() => {});
}

function handleScoreMilestone(newScore) {
  if (newScore <= 0) {
    return;
  }
  for (const { points, audio } of scoreSoundThresholds) {
    if (newScore % points === 0) {
      playSound(audio);
      break;
    }
  }
}

function createSecondPath(mainPath) {
  const minGap = 2;
  const maxAttempts = 8;
  const minWidth = Math.min(2, GRID_COLUMNS);
  const maxWidth = Math.min(3, GRID_COLUMNS);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const width = clamp(randomInt(minWidth, maxWidth), 1, GRID_COLUMNS);
    const start = randomInt(0, GRID_COLUMNS - width);
    const end = start + width;

    const mainStart = mainPath.start;
    const mainEnd = mainPath.start + mainPath.width;

    const separatedFromLeft = end <= mainStart - minGap;
    const separatedFromRight = start >= mainEnd + minGap;

    if (separatedFromLeft || separatedFromRight) {
      return { start, width };
    }
  }

  return null;
}

function createGrassLaneMetadata() {
  // The main corridor wiggles left/right and shrinks or widens gradually so
  // the player has to keep adjusting routes. We base every new width off the
  // previous one to avoid sudden impossible jumps.
  const widthOptions = [
    clamp(lastGrassPathWidth - 1, MIN_PATH_WIDTH, MAX_PATH_WIDTH),
    clamp(lastGrassPathWidth, MIN_PATH_WIDTH, MAX_PATH_WIDTH),
    clamp(lastGrassPathWidth + 1, MIN_PATH_WIDTH, MAX_PATH_WIDTH),
  ];

  const width = widthOptions[randomInt(0, widthOptions.length - 1)];
  const maxStart = GRID_COLUMNS - width;
  const lowerBound = clamp(lastGrassPathStart - 1, 0, maxStart);
  const upperBound = clamp(lastGrassPathStart + 1, 0, maxStart);
  const startMin = Math.min(lowerBound, upperBound);
  const startMax = Math.max(lowerBound, upperBound);
  const start = randomInt(startMin, startMax);

  lastGrassPathWidth = width;
  lastGrassPathStart = start;

  const mainPath = { start, width };
  const paths = [mainPath];

  if (GRID_COLUMNS >= 6 && Math.random() < 0.6) {
    const secondary = createSecondPath(mainPath);
    if (secondary) {
      // A second path gives the player an alternate escape route, making
      // tree-heavy sections less punishing and reducing soft locks.
      paths.push(secondary);
    }
  }

  return {
    pathStart: start,
    pathWidth: width,
    paths,
  };
}

// Rivers carry metadata (direction, speed, log count, etc.) so every row in a
// lane behaves consistently while it scrolls up the board.
function createRiverLaneMetadata() {
  const direction = Math.random() < 0.5 ? -1 : 1;
  const speed = randomFloat(LOG_MIN_SPEED, LOG_MAX_SPEED) * direction;
  const logLengthTiles = randomInt(LOG_MIN_LENGTH_TILES, LOG_MAX_LENGTH_TILES);
  const logHalfWidth = (logLengthTiles * TILE_SIZE) / 2;
  const averageGap = (LOG_MIN_GAP + LOG_MAX_GAP) / 2;
  const estimatedSpan = logHalfWidth * 2 + averageGap;
  const logCount = Math.max(2, Math.round(canvas.width / estimatedSpan));
  return {
    type: 'river',
    direction,
    speed,
    logLengthTiles,
    logHalfWidth,
    logCount,
    gapMin: LOG_MIN_GAP,
    gapMax: LOG_MAX_GAP,
    startOffset: Math.random() * TILE_SIZE * 2,
  };
}

function createRoadLaneMetadata() {
  const direction = Math.random() < 0.5 ? -1 : 1;
  const baseSpeed = randomFloat(CAR_MIN_SPEED, CAR_MAX_SPEED) * direction;
  const sportProbability = Math.min(0.5, Math.floor(score / 20) * 0.05 + 0.05);
  return {
    type: 'road',
    direction,
    baseSpeed,
    carGapMin: CAR_MIN_GAP,
    carGapMax: CAR_MAX_GAP,
    lastSpawnType: null,
    sportProbability,
  };
}

function pickCarType(metadata) {
  const types = Object.values(CAR_TYPE_DEFINITIONS);
  let totalWeight = 0;
  const weights = [];
  const sportChance = metadata?.sportProbability ?? 0.05;

  for (const type of types) {
    if (type.key === 'sport' && metadata?.lastSpawnType === 'sport') {
      weights.push(0);
      continue;
    }
    let weight = type.weight;
    if (type.key === 'sport') {
      weight = Math.max(weight, sportChance * 10);
    }
    weights.push(weight);
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return CAR_TYPE_DEFINITIONS.sedan1;
  }

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < types.length; i += 1) {
    const weight = weights[i];
    if (weight <= 0) {
      continue;
    }
    if (roll < weight) {
      return types[i];
    }
    roll -= weight;
  }

  return types[0];
}

function getLaneLength(tileType) {
  switch (tileType) {
    case TILE_TYPES.ROAD:
    case TILE_TYPES.RIVER:
      return randomInt(4, 6);
    case TILE_TYPES.GRASS:
      return randomInt(3, 5);
    case TILE_TYPES.TREE:
      return randomInt(2, 4);
    default:
      return 4;
  }
}

// Lane scheduler decides what kind of stretch comes next as the world scrolls.
// The global log list below is treated similarly to an entity pool so the
// moving platforms survive row churn without needing to regenerate every frame.
const laneQueue = [];
let lastScheduledLane = null;
let grassBufferRemaining = 0;
let nextLaneSafeGrass = false;
const logs = [];
let nextLogId = 1;
const cars = [];
let nextCarId = 1;
let score = 0;
let gameStarted = false;

function scheduleLane(tileType, length = getLaneLength(tileType), metadata) {
  let laneMetadata = metadata;
  if (tileType === TILE_TYPES.GRASS) {
    if (nextLaneSafeGrass) {
      laneMetadata = {
        paths: [{ start: 0, width: GRID_COLUMNS }],
        safeGrass: true,
      };
      nextLaneSafeGrass = false;
    } else {
      laneMetadata = laneMetadata ?? createGrassLaneMetadata();
    }
  } else if (tileType === TILE_TYPES.RIVER) {
    laneMetadata = laneMetadata ?? createRiverLaneMetadata();
  } else if (tileType === TILE_TYPES.ROAD) {
    laneMetadata = laneMetadata ?? createRoadLaneMetadata();
  }

  // Each entry in the lane queue represents a “stack” of identical rows that
  // should spawn consecutively. As rows scroll off the bottom we decrement the
  // counter and eventually schedule a new lane type to keep the world fresh.
  laneQueue.push({
    type: tileType,
    length,
    rowsRemaining: length,
    rowsGenerated: 0,
    metadata: laneMetadata ?? {},
  });

  lastScheduledLane = tileType;
}

function pickNextLaneType() {
  // Never schedule two hazards in a row without a grass breather; this prevents
  // impossible sections and matches the design notes up top.
  if (lastScheduledLane && HAZARD_TILES.has(lastScheduledLane)) {
    return TILE_TYPES.GRASS;
  }

  const roll = Math.random();
  if (roll < 0.4) {
    return TILE_TYPES.ROAD;
  }
  if (roll < 0.8) {
    return TILE_TYPES.RIVER;
  }
  return TILE_TYPES.GRASS;
}

function ensureLanePlanned() {
  // Keep at least one lane queued up so the generator never runs dry when the
  // player scrolls the world quicker than expected.
  if (laneQueue.length > 0) {
    return;
  }
  const nextType = pickNextLaneType();
  scheduleLane(nextType);
}

// Grass lanes get dressed with trees while keeping one or more escape routes clear.
function decorateLaneRow(lane, row) {
  if (lane.type !== TILE_TYPES.GRASS) {
    return;
  }

  if (lane.metadata?.safeGrass) {
    return;
  }

  // Trees populate grass lanes while leaving a guaranteed corridor clear.
  const metadata = lane.metadata ?? createGrassLaneMetadata();
  lane.metadata = metadata;
  const paths = Array.isArray(metadata.paths) && metadata.paths.length > 0
    ? metadata.paths
    : [{ start: metadata.pathStart ?? 0, width: metadata.pathWidth ?? GRID_COLUMNS }];

  const pathMask = new Array(GRID_COLUMNS).fill(false);
  for (const segment of paths) {
    const segStart = clamp(segment.start ?? 0, 0, GRID_COLUMNS);
    const segWidth = clamp(segment.width ?? GRID_COLUMNS, 1, GRID_COLUMNS);
    const segEnd = Math.min(GRID_COLUMNS, segStart + segWidth);
    for (let col = segStart; col < segEnd; col += 1) {
      pathMask[col] = true;
    }
  }

  for (let col = 0; col < GRID_COLUMNS; col += 1) {
    const isPath = pathMask[col];
    if (isPath) {
      continue;
    }

    if (Math.random() < TREE_SPAWN_CHANCE) {
      const leftIsTree = col > 0 && row[col - 1]?.type === TILE_TYPES.TREE;
      if (leftIsTree) {
        continue;
      }
      row[col] = createTile(TILE_TYPES.TREE);
    }
  }
}

function generateNextRow() {
  ensureLanePlanned();
  const lane = laneQueue[0];
  const row = createRow(lane.type);
  decorateLaneRow(lane, row);
  // Stash a pointer to the lane type + metadata so downstream hooks (like log
  // spawning) know what to do when this row hits the visible play area.
  row.laneType = lane.type;
  row.laneMetadata = lane.metadata;
  lane.rowsRemaining -= 1;
  lane.rowsGenerated += 1;
  if (lane.rowsRemaining <= 0) {
    laneQueue.shift();
  }
  ensureLanePlanned();
  return row;
}

function spawnLogsForRiverRow(row, rowIndex) {
  const metadata = row.laneMetadata ?? createRiverLaneMetadata();
  const logCount = metadata.logCount ?? 3;
  const halfWidth = metadata.logHalfWidth ?? (LOG_MIN_LENGTH_TILES * TILE_SIZE) / 2;
  const direction = metadata.direction ?? 1;
  const gapMin = metadata.gapMin ?? LOG_MIN_GAP;
  const gapMax = metadata.gapMax ?? LOG_MAX_GAP;
  let offset = metadata.startOffset ?? 0;

  for (let i = 0; i < logCount; i += 1) {
    const gap = randomFloat(gapMin, gapMax);
    const baseSpacing = halfWidth * 2 + gap;
    const altSpacing = baseSpacing + randomFloat(0.5, 1.5) * TILE_SIZE;
    const spacing = i % 2 === 0 ? baseSpacing : altSpacing;
    const travelDistance = i * spacing + randomFloat(-gap * 0.4, gap * 0.4);
    let x;
    if (direction > 0) {
      x = -halfWidth - offset - travelDistance;
    } else {
      x = canvas.width + halfWidth + offset + travelDistance;
    }

    if (direction > 0) {
      while (x + halfWidth < 0) {
        x += spacing;
      }
    } else {
      while (x - halfWidth > canvas.width) {
        x -= spacing;
      }
    }

    const alignedLeftEdge = Math.round((x - halfWidth) / TILE_SIZE) * TILE_SIZE;
    x = alignedLeftEdge + halfWidth;

    const baseSpeed = metadata.speed ?? direction * 90;
    const speedVariance = randomFloat(0.7, 1.3);
    const speed = baseSpeed * speedVariance;

    // Logs keep a unique id (handy for debugging) plus references to spacing
    // settings so we can respawn them later with the same personality.
    const id = nextLogId;
    nextLogId += 1;
    logs.push({
      id,
      row: rowIndex,
      x,
      halfWidth,
      width: halfWidth * 2,
      speed,
      direction,
      gapMin,
      gapMax,
      metadata,
    });
  }
  // Keep nudging the shared offset so each subsequent river row starts with a
  // slightly different phase. This prevents perfectly vertical log stacks.
  metadata.startOffset = (metadata.startOffset ?? 0) + randomFloat(gapMin * 0.25, gapMax * 0.5);
}

function spawnCarsForRoadRow(row, rowIndex) {
  const metadata = row.laneMetadata ?? createRoadLaneMetadata();
  if (gameStarted) {
    metadata.sportProbability = Math.min(0.5, Math.floor(score / 20) * 0.05 + 0.05);
  }
  const direction = metadata.direction ?? 1;
  const speedBase = metadata.baseSpeed ?? direction * randomFloat(CAR_MIN_SPEED, CAR_MAX_SPEED);
  const gapMin = metadata.carGapMin ?? CAR_MIN_GAP;
  const gapMax = metadata.carGapMax ?? CAR_MAX_GAP;
  const carCount = randomInt(1, 2);
  const offset = randomFloat(0, gapMax);

  let lastType = metadata.lastSpawnType ?? null;

  for (let i = 0; i < carCount; i += 1) {
    const carType = pickCarType({ ...metadata, lastSpawnType: lastType });
    if (!carType) {
      continue;
    }

    const carWidth = TILE_SIZE * (carType.widthTiles ?? 2);
    const carHalfWidth = carWidth / 2;
    const carHeight = TILE_SIZE * (carType.heightScale ?? 0.85);

    const gap = randomFloat(gapMin, gapMax);
    const baseSpacing = carHalfWidth * 2 + gap;
    const extraSpacing = baseSpacing + randomFloat(0.5, 1.5) * TILE_SIZE;
    const spacing = i % 2 === 0 ? baseSpacing : extraSpacing;
    const travelDistance = i * spacing + offset + randomFloat(-gap * 0.35, gap * 0.35);
    let x;
    if (direction > 0) {
      x = -carHalfWidth - travelDistance;
    } else {
      x = canvas.width + carHalfWidth + travelDistance;
    }

    const baseSpeed = speedBase * (carType.speedMultiplier ?? 1);
    const varianceMin = carType.key === 'sport' ? 1.05 : 0.85;
    const varianceMax = carType.key === 'sport' ? 1.3 : 1.15;
    const speedVariance = randomFloat(varianceMin, varianceMax);
    const speed = baseSpeed * speedVariance;

    const id = nextCarId;
    nextCarId += 1;
    const useFlyBy = carType.key !== 'truck' && Math.random() < (carType.key === 'sport' ? 0.65 : 0.35);
    const flyBySound = useFlyBy ? pickRandom(carFlyBySounds) : null;
    const truckHornSound = carType.key === 'truck' && Math.random() < 0.6 ? sounds.truckHorn : null;
    cars.push({
      id,
      row: rowIndex,
      x,
      halfWidth: carHalfWidth,
      width: carWidth,
      height: carHeight,
      speed,
      direction,
      gapMin,
      gapMax,
      type: carType.key,
      sprite: carType.sprite ?? sportCarSprite,
      flyBySound,
      flyByPlayed: false,
      truckHornSound,
      truckHornPlayed: false,
    });

    lastType = carType.key;
  }

  metadata.lastSpawnType = lastType;
}

function initializeRowEntities(row, rowIndex) {
  if (!row) {
    return;
  }
  if (row.laneType === TILE_TYPES.RIVER) {
    spawnLogsForRiverRow(row, rowIndex);
  }
  if (row.laneType === TILE_TYPES.ROAD) {
    spawnCarsForRoadRow(row, rowIndex);
  }
}

function removeLogsAtRow(rowIndex) {
  let deathTriggered = false;
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    const log = logs[i];
    if (log.row !== rowIndex) {
      continue;
    }
    if (frog.onLog && frog.ridingLog === log) {
      handleFrogDeath('washed away');
      deathTriggered = true;
      break;
    }
    logs.splice(i, 1);
  }
  return deathTriggered;
}

function removeCarsAtRow(rowIndex) {
  for (let i = cars.length - 1; i >= 0; i -= 1) {
    if (cars[i].row === rowIndex) {
      cars.splice(i, 1);
    }
  }
}

function wrapLogToOppositeSide(log) {
  const gap = randomFloat(log.gapMin ?? LOG_MIN_GAP, log.gapMax ?? LOG_MAX_GAP);
  if (log.direction > 0) {
    const leftEdge = -gap - log.width;
    const alignedLeft = Math.round(leftEdge / TILE_SIZE) * TILE_SIZE;
    log.x = alignedLeft + log.halfWidth;
  } else {
    const leftEdge = canvas.width + gap;
    const alignedLeft = Math.round(leftEdge / TILE_SIZE) * TILE_SIZE;
    log.x = alignedLeft + log.halfWidth;
  }
}

function wrapCarToOppositeSide(car) {
  const gap = randomFloat(car.gapMin ?? CAR_MIN_GAP, car.gapMax ?? CAR_MAX_GAP);
  if (car.direction > 0) {
    const leftEdge = -gap - car.width;
    const alignedLeft = Math.round(leftEdge / TILE_SIZE) * TILE_SIZE;
    car.x = alignedLeft + car.halfWidth;
  } else {
    const leftEdge = canvas.width + gap;
    const alignedLeft = Math.round(leftEdge / TILE_SIZE) * TILE_SIZE;
    car.x = alignedLeft + car.halfWidth;
  }
  if (car.type === 'truck') {
    car.flyBySound = null;
    car.truckHornSound = Math.random() < 0.6 ? sounds.truckHorn : null;
  } else {
    const chance = car.type === 'sport' ? 0.65 : 0.35;
    car.flyBySound = Math.random() < chance ? pickRandom(carFlyBySounds) : null;
    car.truckHornSound = null;
  }
  car.flyByPlayed = false;
  car.truckHornPlayed = false;
}

function updateLogs(deltaTimeMs) {
  if (!Number.isFinite(deltaTimeMs) || logs.length === 0) {
    return;
  }

  const deltaSeconds = deltaTimeMs / 1000;

  for (const log of logs) {
    log.x += log.speed * deltaSeconds;
    const left = log.x - log.halfWidth;
    const right = log.x + log.halfWidth;

    if (frog.onLog && frog.ridingLog === log) {
      frog.row = log.row;
      frog.pixelY = frog.row * TILE_SIZE;
      const tileCount = Math.max(1, Math.round(log.width / TILE_SIZE));
      let tileIndex = clamp(frog.logTileIndex ?? Math.floor(tileCount / 2), 0, tileCount - 1);
      const leftEdge = log.x - log.halfWidth;
      const tileCenter = leftEdge + (tileIndex + 0.5) * TILE_SIZE;
      frog.pixelX = tileCenter - TILE_SIZE / 2;
      frog.col = clamp(Math.floor(tileCenter / TILE_SIZE), 0, GRID_COLUMNS - 1);

      // Riding a log looks great until it slips completely off screen. Once
      // that happens we flag a death so the player cannot cling to invisible
      // platforms.
      if (right < 0 || left > canvas.width) {
        handleFrogDeath('swept off log');
        return;
      }
    }

    if (right < -TILE_SIZE || left > canvas.width + TILE_SIZE) {
      wrapLogToOppositeSide(log);
    }
  }

  enforceLogSpacing();
}

function enforceLogSpacing() {
  // Prevent faster logs from visually merging into slower ones by nudging them
  // forward until a minimum gap is restored. This keeps the river lane readable
  // even with individual speed variance.
  if (logs.length < 2) {
    return;
  }

  const logsByRow = new Map();
  for (const log of logs) {
    if (!logsByRow.has(log.row)) {
      logsByRow.set(log.row, []);
    }
    logsByRow.get(log.row).push(log);
  }

  for (const rowLogs of logsByRow.values()) {
    if (rowLogs.length < 2) {
      continue;
    }
    const direction = rowLogs[0].direction ?? 1;
    rowLogs.sort(direction > 0 ? (a, b) => a.x - b.x : (a, b) => b.x - a.x);
    for (let i = 1; i < rowLogs.length; i += 1) {
      const previous = rowLogs[i - 1];
      const current = rowLogs[i];
      const minGap = Math.min(current.gapMin ?? LOG_MIN_GAP, current.gapMax ?? LOG_MAX_GAP);
      if (direction > 0) {
        const desiredX = previous.x + previous.halfWidth + minGap + current.halfWidth;
        if (current.x < desiredX) {
          current.x = desiredX;
        }
      } else {
        const desiredX = previous.x - previous.halfWidth - minGap - current.halfWidth;
        if (current.x > desiredX) {
          current.x = desiredX;
        }
      }
    }
  }

  for (const log of logs) {
    const left = log.x - log.halfWidth;
    const right = log.x + log.halfWidth;
    if (right < -TILE_SIZE || left > canvas.width + TILE_SIZE) {
      wrapLogToOppositeSide(log);
    }
  }
}

function updateCars(deltaTimeMs) {
  if (!Number.isFinite(deltaTimeMs) || cars.length === 0) {
    return;
  }

  const deltaSeconds = deltaTimeMs / 1000;
  const enableAudio = gameStarted;
  const frogCenterX = enableAudio ? frog.pixelX + TILE_SIZE / 2 : 0;

  for (const car of cars) {
    car.x += car.speed * deltaSeconds;
    const left = car.x - car.halfWidth;
    const right = car.x + car.halfWidth;

    if (right < -car.width || left > canvas.width + car.width) {
      wrapCarToOppositeSide(car);
    }

    const onScreen = right > 0 && left < canvas.width;

    if (enableAudio && onScreen && car.flyBySound && !car.flyByPlayed && car.type !== 'truck') {
      if (Math.abs(car.x - frogCenterX) < TILE_SIZE * 2.5) {
        playSound(car.flyBySound, 0.85);
        car.flyByPlayed = true;
      }
    }

    if (enableAudio && onScreen && car.truckHornSound && !car.truckHornPlayed) {
      if (Math.abs(car.x - frogCenterX) < TILE_SIZE * 2.5) {
        playSound(car.truckHornSound, 0.9);
        car.truckHornPlayed = true;
      }
    }
  }

  enforceCarSpacing();
}

function enforceCarSpacing() {
  if (cars.length < 2) {
    return;
  }

  const carsByRow = new Map();
  for (const car of cars) {
    if (!carsByRow.has(car.row)) {
      carsByRow.set(car.row, []);
    }
    carsByRow.get(car.row).push(car);
  }

  for (const rowCars of carsByRow.values()) {
    if (rowCars.length < 2) {
      continue;
    }
    const direction = rowCars[0].direction ?? 1;
    rowCars.sort(direction > 0 ? (a, b) => a.x - b.x : (a, b) => b.x - a.x);
    for (let i = 1; i < rowCars.length; i += 1) {
      const prev = rowCars[i - 1];
      const curr = rowCars[i];
      const minGap = Math.min(curr.gapMin ?? CAR_MIN_GAP, curr.gapMax ?? CAR_MAX_GAP);
      if (direction > 0) {
        const desiredX = prev.x + prev.halfWidth + minGap + curr.halfWidth;
        if (curr.x < desiredX) {
          curr.x = desiredX;
        }
      } else {
        const desiredX = prev.x - prev.halfWidth - minGap - curr.halfWidth;
        if (curr.x > desiredX) {
          curr.x = desiredX;
        }
      }
    }
  }
}

function drawCars() {
  if (cars.length === 0) {
    return;
  }
  for (const car of cars) {
    const centerX = car.x;
    const centerY = car.row * TILE_SIZE + TILE_SIZE / 2;
    const drawWidth = car.width;
    const drawHeight = car.height ?? TILE_SIZE * 0.85;
    const sprite = car.sprite ?? sportCarSprite;
    const rotation = car.direction < 0 ? Math.PI : 0;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    if (sprite.loaded) {
      ctx.drawImage(sprite.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = car.type === 'truck' ? '#d6c57a' : car.type === 'sport' ? '#ff1f4c' : '#4f9ddb';
      ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    }
    ctx.restore();
  }
}

function checkFrogCarCollision() {
  if (!gameStarted) {
    return;
  }
  const tile = getTile(frog.row, frog.col);
  if (!tile || tile.type !== TILE_TYPES.ROAD) {
    return;
  }

  const frogLeft = frog.pixelX;
  const frogRight = frog.pixelX + TILE_SIZE;
  const frogTop = frog.pixelY;
  const frogBottom = frog.pixelY + TILE_SIZE;

  for (const car of cars) {
    if (car.row !== frog.row) {
      continue;
    }
    const carLeft = car.x - car.halfWidth;
    const carRight = car.x + car.halfWidth;
    const carTop = car.row * TILE_SIZE;
    const carBottom = carTop + TILE_SIZE;

    if (frogRight > carLeft && frogLeft < carRight && frogBottom > carTop && frogTop < carBottom) {
      handleFrogDeath('hit by car');
      return;
    }
  }
}

function drawLogs() {
  if (logs.length === 0) {
    return;
  }
  for (const log of logs) {
    const x = log.x - log.halfWidth;
    const y = log.row * TILE_SIZE;
    if (logSprite.loaded) {
      ctx.drawImage(logSprite.image, x, y, log.width, TILE_SIZE);
    } else {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(x, y, log.width, TILE_SIZE);
    }
  }
}

function findLogForLanding(row, landingCenterX) {
  // Search for the closest log whose expanded bounds cover the landing centre.
  // The tolerance gives the player a little wiggle room so jumps do not need
  // to land perfectly pixel-aligned with the log sprite.
  let bestLog = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const log of logs) {
    if (log.row !== row) {
      continue;
    }
    const left = log.x - log.halfWidth - LOG_LANDING_TOLERANCE;
    const right = log.x + log.halfWidth + LOG_LANDING_TOLERANCE;
    if (landingCenterX < left || landingCenterX > right) {
      continue;
    }
    const distance = Math.abs(log.x - landingCenterX);
    if (distance < bestDistance) {
      bestLog = log;
      bestDistance = distance;
    }
  }
  return bestLog;
}

const grid = [];
const frogImage = new Image();
frogImage.src = new URL('./assets/sprites/Frog.png', import.meta.url).href;

let frogImageLoaded = false;
frogImage.addEventListener('load', () => {
  frogImageLoaded = true;
});

function scrollWorld() {
  const deathTriggered = removeLogsAtRow(GRID_ROWS - 1);
  if (deathTriggered) {
    return;
  }
  removeCarsAtRow(GRID_ROWS - 1);
  grid.pop();
  for (const log of logs) {
    log.row += 1;
  }
  for (const car of cars) {
    car.row += 1;
  }
  const newRow = generateNextRow();
  grid.unshift(newRow);
  initializeRowEntities(newRow, 0);
  score += 1;
  handleScoreMilestone(score);
  frog.row = FROG_CENTER_ROW;
  frog.pixelY = frog.row * TILE_SIZE;
  if (!frog.onLog) {
    frog.pixelX = frog.col * TILE_SIZE;
  }
}

const frog = {
  col: Math.floor(GRID_COLUMNS / 2),
  row: FROG_CENTER_ROW,
  angle: 0,
  pixelX: Math.floor(GRID_COLUMNS / 2) * TILE_SIZE,
  pixelY: FROG_CENTER_ROW * TILE_SIZE,
  onLog: false,
  ridingLog: null,
  logTileIndex: null,
  lastLandingType: null,
};

function getTile(row, col) {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLUMNS) {
    return null;
  }
  return grid[row]?.[col] ?? null;
}

function tileBlocksMovement(tile) {
  return Boolean(tile?.definition?.blocksMovement);
}

function tileIsWater(tile) {
  return tile?.type === TILE_TYPES.RIVER;
}

function setFrogGridPosition(row, col) {
  frog.row = clamp(row, 0, GRID_ROWS - 1);
  frog.col = clamp(col, 0, GRID_COLUMNS - 1);
  frog.pixelX = frog.col * TILE_SIZE;
  frog.pixelY = frog.row * TILE_SIZE;
}

function attachFrogToLog(log, landingCenterX) {
  frog.onLog = true;
  frog.ridingLog = log;
  const tileCount = Math.max(1, Math.round(log.width / TILE_SIZE));
  const leftEdge = log.x - log.halfWidth;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < tileCount; i += 1) {
    const tileCenter = leftEdge + (i + 0.5) * TILE_SIZE;
    const distance = Math.abs(tileCenter - landingCenterX);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  const targetCenter = leftEdge + (bestIndex + 0.5) * TILE_SIZE;
  frog.row = log.row;
  frog.pixelY = frog.row * TILE_SIZE;
  frog.pixelX = targetCenter - TILE_SIZE / 2;
  frog.col = clamp(Math.floor(targetCenter / TILE_SIZE), 0, GRID_COLUMNS - 1);
  frog.logTileIndex = bestIndex;
  frog.lastLandingType = 'log';
}

function detachFrogFromLog() {
  if (!frog.onLog) {
    return;
  }
  frog.onLog = false;
  frog.ridingLog = null;
  frog.logTileIndex = null;
  frog.pixelX = frog.col * TILE_SIZE;
  frog.pixelY = frog.row * TILE_SIZE;
}

function resolveFrogLanding(row, col, landingCenterX) {
  const tile = getTile(row, col);
  if (!tile) {
    handleFrogDeath('void');
    return false;
  }

  if (tileIsWater(tile)) {
    const log = findLogForLanding(row, landingCenterX);
    if (!log) {
      handleFrogDeath('water');
      return false;
    }
    attachFrogToLog(log, landingCenterX);
    return true;
  }

  detachFrogFromLog();
  setFrogGridPosition(row, col);
  frog.lastLandingType = 'ground';
  checkFrogCarCollision();
  return true;
}

// Simple movement map so arrow keys and WASD all trigger the same hops.
const directions = {
  ArrowUp: { dx: 0, dy: -1, angle: 0 },
  ArrowDown: { dx: 0, dy: 1, angle: Math.PI },
  ArrowLeft: { dx: -1, dy: 0, angle: -Math.PI / 2 },
  ArrowRight: { dx: 1, dy: 0, angle: Math.PI / 2 },
  w: { dx: 0, dy: -1, angle: 0 },
  s: { dx: 0, dy: 1, angle: Math.PI },
  a: { dx: -1, dy: 0, angle: -Math.PI / 2 },
  d: { dx: 1, dy: 0, angle: Math.PI / 2 },
};

// Handle one-tile hops and trigger world scrolling once the frog pushes upward.
window.addEventListener('keydown', (event) => {
  if (!gameStarted) {
    event.preventDefault();
    gameStarted = true;
    resetGameState();
    return;
  }

  const move = directions[event.key];
  if (!move || event.repeat) {
    return;
  }

  event.preventDefault();

  frog.angle = move.angle;
  // Precompute the horizontal centre of whichever column we are considering so
  // log collision checks can use a consistent point of reference.
  const landingCenter = (col) => col * TILE_SIZE + TILE_SIZE / 2;

  let moveSuccessful = false;

  if (move.dy === -1) {
    const currentCol = frog.col;
    if (frog.row > FROG_CENTER_ROW) {
      const nextRow = Math.max(frog.row - 1, FROG_CENTER_ROW);
      const targetTile = getTile(nextRow, frog.col);
      if (tileBlocksMovement(targetTile)) {
        return;
      }
      if (!resolveFrogLanding(nextRow, currentCol, landingCenter(currentCol))) {
        return;
      }
      moveSuccessful = true;
    } else {
      const targetRow = FROG_CENTER_ROW - 1;
      const targetTile = getTile(targetRow, frog.col);
      if (tileBlocksMovement(targetTile)) {
        return;
      }
      scrollWorld();
      if (!resolveFrogLanding(frog.row, currentCol, landingCenter(currentCol))) {
        return;
      }
      moveSuccessful = true;
    }
  } else if (move.dy === 1) {
    const nextRow = frog.row + 1;
    if (nextRow >= GRID_ROWS) {
      return;
    }
    const targetTile = getTile(nextRow, frog.col);
    if (tileBlocksMovement(targetTile)) {
      return;
    }
    if (!resolveFrogLanding(nextRow, frog.col, landingCenter(frog.col))) {
      return;
    }
    moveSuccessful = true;
  } else {
    const nextCol = frog.col + move.dx;
    if (nextCol < 0 || nextCol >= GRID_COLUMNS) {
      return;
    }

    const targetTile = getTile(frog.row, nextCol);
    if (tileBlocksMovement(targetTile)) {
      return;
    }
    if (!resolveFrogLanding(frog.row, nextCol, landingCenter(nextCol))) {
      return;
    }
    moveSuccessful = true;
  }

  if (moveSuccessful) {
    if (frog.lastLandingType === 'log') {
      playSound(sounds.logJump, 0.9);
    } else {
      playSound(sounds.jump, 0.8);
    }
    frog.lastLandingType = null;
  }
});

// Redraw the entire playfield every frame so tiles, water, and trees stay in sync.
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLUMNS; col += 1) {
      const tile = grid[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      if (!tile) {
        continue;
      }

      const tileType = tile.type;
      const definition = tile.definition ?? TILE_DEFINITIONS[tileType];

      // Rivers prefer animated frames, roads use a static sprite, and anything
      // else falls back to a flat colour so we always have visible terrain even
      // if assets fail to load.
      if (definition?.spriteFrames?.length) {
        const frames = definition.spriteFrames;
        const frame = frames[waterFrameIndex % frames.length];
        if (frame && frame.loaded) {
          ctx.drawImage(frame.image, x, y, TILE_SIZE, TILE_SIZE);
        } else if (definition.color) {
          ctx.fillStyle = definition.color;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
        continue;
      }

      if (definition?.sprite) {
        const sprite = definition.sprite;
        if (sprite.loaded) {
          ctx.drawImage(sprite.image, x, y, TILE_SIZE, TILE_SIZE);
        } else if (definition.color) {
          ctx.fillStyle = definition.color;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
        continue;
      }

      if (definition?.color) {
        ctx.fillStyle = definition.color;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        continue;
      }

      ctx.fillStyle = '#69cc76';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }
}

// Drop the frog on top after the background so it never disappears behind scenery.
function drawFrog() {
  if (!gameStarted) {
    return;
  }
  const x = frog.pixelX;
  const y = frog.pixelY;
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;

  // Rendering always happens after the background and logs so the frog remains
  // visually on top of every hazard and platform.
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(frog.angle);
  if (frogImageLoaded) {
    ctx.drawImage(frogImage, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  } else {
    ctx.fillStyle = '#274029';
    ctx.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  }
  ctx.restore();
}

function drawStartOverlay() {
  const title = 'FORGGY';
  const prompt = 'Press any key to start';
  const instructions = [
    'Controls:',
    'Arrow Keys / WASD - hop',
    'Avoid cars & water!',
    'Ride logs to cross rivers.',
    '+1 score each scroll.',
  ];

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '48px "Press Start 2P", monospace';
  ctx.fillText(title, canvas.width / 2, canvas.height * 0.28);
  ctx.font = '18px "Press Start 2P", monospace';
  ctx.fillText(prompt, canvas.width / 2, canvas.height * 0.42);

  ctx.textAlign = 'left';
  ctx.font = '12px "Press Start 2P", monospace';
  const textWidth = Math.max(...instructions.map((line) => ctx.measureText(line).width));
  const paddingX = 16;
  const paddingY = 14;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = instructions.length * 18 + paddingY * 2;
  const boxX = 16;
  const boxY = canvas.height - boxHeight - 24;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = '#ffffff';
  let textY = boxY + paddingY;
  const textX = boxX + paddingX;
  for (const line of instructions) {
    ctx.fillText(line, textX, textY);
    textY += 18;
  }

  ctx.restore();
}

function drawHud() {
  if (!gameStarted) {
    return;
  }
  const label = typeof window !== 'undefined' && window?.playerName
    ? `P${window.playerName}`
    : 'P1';
  const text = `${label}: ${score}`;

  ctx.save();
  ctx.font = '16px "Press Start 2P", monospace';
  const metrics = ctx.measureText(text);
  const paddingX = 12;
  const paddingY = 10;
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = 32;

  ctx.fillStyle = '#000000aa';
  ctx.fillRect(8, 8, boxWidth, boxHeight);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(text, 8 + paddingX, 12);
  ctx.restore();
}

function buildStartScreen() {
  gameStarted = false;
  score = 0;
  laneQueue.length = 0;
  logs.length = 0;
  cars.length = 0;
  lastScheduledLane = null;
  grassBufferRemaining = 0;
  nextLaneSafeGrass = false;
  grid.length = 0;
  nextLogId = 1;
  nextCarId = 1;
  const prevPathWidth = lastGrassPathWidth;
  const prevPathStart = lastGrassPathStart;

  const laneTypes = [TILE_TYPES.GRASS, TILE_TYPES.ROAD, TILE_TYPES.RIVER];
  for (let rowIndex = 0; rowIndex < GRID_ROWS; rowIndex += 1) {
    const tileType = laneTypes[randomInt(0, laneTypes.length - 1)];
    const rowTiles = createRow(tileType);
    let metadata = null;
    if (tileType === TILE_TYPES.GRASS) {
      metadata = createGrassLaneMetadata();
    } else if (tileType === TILE_TYPES.RIVER) {
      metadata = createRiverLaneMetadata();
    } else if (tileType === TILE_TYPES.ROAD) {
      metadata = createRoadLaneMetadata();
    }
    rowTiles.laneType = tileType;
    rowTiles.laneMetadata = metadata;
    if (tileType === TILE_TYPES.GRASS) {
      decorateLaneRow({ type: TILE_TYPES.GRASS, metadata }, rowTiles);
      rowTiles.laneMetadata = metadata;
    }
    grid.push(rowTiles);
    initializeRowEntities(rowTiles, rowIndex);
  }

  lastGrassPathWidth = prevPathWidth;
  lastGrassPathStart = prevPathStart;

  setFrogGridPosition(FROG_CENTER_ROW, Math.floor(GRID_COLUMNS / 2));
  frog.angle = 0;
  frog.onLog = false;
  frog.ridingLog = null;
  frog.logTileIndex = null;
  frog.lastLandingType = null;
  lastFrameTime = 0;
}

// Lightweight main loop: update animation timing, redraw, repeat.
let lastFrameTime = 0;
function gameLoop(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  updateWaterAnimation(deltaTime);
  updateLogs(deltaTime);
  updateCars(deltaTime);
  drawGrid();
  drawLogs();
  drawCars();

  if (!gameStarted) {
    drawStartOverlay();
    window.requestAnimationFrame(gameLoop);
    return;
  }

  // Order matters: update logic first, then redraw everything so visuals match
  // the latest state before scheduling the next frame.
  drawFrog();
  drawHud();
  checkFrogCarCollision();
  window.requestAnimationFrame(gameLoop);
}

window.requestAnimationFrame(gameLoop);
function resetLanePlanner() {
  laneQueue.length = 0;
  lastScheduledLane = null;
  const safeRows = Math.max(3, FROG_CENTER_ROW);
  grassBufferRemaining = 0;
  nextLaneSafeGrass = false;
  logs.length = 0;
  nextLogId = 1;
  cars.length = 0;
  nextCarId = 1;
  lastGrassPathWidth = Math.min(3, MAX_PATH_WIDTH);
  lastGrassPathStart = Math.max(0, Math.floor((GRID_COLUMNS - lastGrassPathWidth) / 2));

  scheduleLane(TILE_TYPES.GRASS, safeRows, {
    paths: [{ start: 0, width: GRID_COLUMNS }],
    safeGrass: true,
  });
  scheduleLane(TILE_TYPES.ROAD, 5);
  scheduleLane(TILE_TYPES.GRASS, 3);
  scheduleLane(TILE_TYPES.RIVER, 5);
}

function rebuildGrid() {
  grid.length = 0;
  while (grid.length < GRID_ROWS) {
    const row = generateNextRow();
    grid.push(row);
    initializeRowEntities(row, grid.length - 1);
  }
}

function resetFrog() {
  const centerCol = Math.floor(GRID_COLUMNS / 2);
  setFrogGridPosition(FROG_CENTER_ROW, centerCol);
  frog.angle = 0;
  frog.onLog = false;
  frog.ridingLog = null;
  frog.logTileIndex = null;
  frog.lastLandingType = null;
}

function handleFrogDeath(reason) {
  console.log(`Frog croaked: ${reason}`);
  const normalizedReason = typeof reason === 'string' ? reason.toLowerCase() : '';
  if (normalizedReason.includes('car')) {
    playSound(sounds.carDeath, 0.9);
  } else if (
    normalizedReason.includes('water') ||
    normalizedReason.includes('washed') ||
    normalizedReason.includes('swept') ||
    normalizedReason.includes('void')
  ) {
    playSound(sounds.waterDeath, 0.9);
  }
  resetLanePlanner();
  rebuildGrid();
  resetFrog();
  lastFrameTime = 0;
  score = 0;
}

function resetGameState() {
  resetLanePlanner();
  rebuildGrid();
  resetFrog();
  lastFrameTime = 0;
  score = 0;
}

buildStartScreen();

// Future work: hook up scoring, lives, and UI feedback so resets transition
// smoothly instead of instantly snapping the level back to its starting state.
