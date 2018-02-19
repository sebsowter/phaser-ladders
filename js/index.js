/**
 * Phaser platformer prototype, with ladders
 *
 * @author Seb Eynott
 * https://github.com/SebEynott/phaser-ladders
 */

/**
 * Container
 *
 * @method PhaserGame
 * @return { Object } public methods
 */
var PhaserGame = (function() {
    function init(elementId) {
        var game = new Phaser.Game(256, 224, Phaser.CANVAS, elementId);
        game.state.add('Game', Game);
        game.state.start('Game');
    }

    return {
        init: init
    };

})();

// Define the various states that the player can be in
var PlayerState = {
    STANDING: 'standing',
    FALLING: 'falling',
    LADDER: 'ladder',
    CROUCHING: 'crouching',
    JUMPING: 'jumping',
    WALKING: 'walking',
    CLIMBING: 'climbing'
};

// Store in the indexes of important tiles
var Tiles = {
    FLOOR: 2,
    BRICK: 8,
    LADDER: 9,
    LADDER_TOP: 3
};

/*
 * --------------------------------------------------------------------------------
 * Game
 * --------------------------------------------------------------------------------
 */

/**
 * Game
 *
 * @constructor
 */
Game = function() {
    this.debug = false;
    this.map = null;
    this.layerMain = null;
    this.player = null;
    this.keys = null;
};

/**
 * @method init
 */
Game.prototype.init = function() {

    // Create keys
    this.keys = {
        jump: this.game.input.keyboard.addKey(Phaser.Keyboard.W),
        up: this.game.input.keyboard.addKey(Phaser.Keyboard.UP),
        down: this.game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
        left: this.game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
        right: this.game.input.keyboard.addKey(Phaser.Keyboard.RIGHT)
    };

    // Set game scale
    var scale = 2;

    this.game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
    this.game.scale.setUserScale(scale, scale);
    this.game.renderer.renderSession.roundPixels = true;  

    Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);
};

/**
 * @method preload
 */
Game.prototype.preload = function() {

    // Load tilemap
    this.game.load.tilemap('level', 'js/tilemap.json', null, Phaser.Tilemap.TILED_JSON);

    // Load tiles image
    this.game.load.image('tiles', 'images/tiles.gif');

    // Load player spritesheet
    this.game.load.spritesheet('player', 'images/player.gif', 16, 32);
};

/**
 * @method create
 */
Game.prototype.create = function() {
    this.createLevel();
    this.createPlayer();
};

/**
 * @method createLevel
 */
Game.prototype.createLevel = function() {

    // Start arcade physics
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.physics.arcade.gravity.y = 512;

    // Create tilemap
    this.map = this.game.add.tilemap('level');
    this.map.addTilesetImage('tilesetMain', 'tiles');

    // Create layer
    this.layerMain = this.map.createLayer('layerMain');
    this.layerMain.resizeWorld();
    this.layerMain.debug = this.debug;

    // Set collision tiles
    this.map.setCollision(Tiles.FLOOR, true, 'layerMain');
    this.map.setCollision(Tiles.BRICK, true, 'layerMain');
    this.map.setCollision(Tiles.LADDER_TOP, true, 'layerMain');
};

/**
 * @method createPlayer
 */
Game.prototype.createPlayer = function() {

    // Create player sprite
    var sprite = this.game.add.sprite(2 * 16, 11 * 16, 'player');

    // Create player
    this.player = new Player(sprite, this.keys);
    
    // Enable physics
    this.game.physics.enable(sprite);

    // Init body
    this.player.initBody();

    // Set camera to follow player
    this.game.camera.follow(sprite);
};

/**
 * @method update
 */
Game.prototype.update = function() {

    // Call player preUpdate
    this.player.preUpdate();

    // Call physics overlap and collision
    this.game.physics.arcade.overlap(this.player.sprite, this.layerMain, this.handleOverlap.bind(this));
    this.game.physics.arcade.collide(this.player.sprite, this.layerMain, this.handleCollide.bind(this));

    // Call player update
    this.player.update();
}

/**
 * @method handleCollide
 * @param { Phaser.Sprite } sprite
 * @param { Phaser.Tile } tile
 */
Game.prototype.handleCollide = function(sprite, tile) {
    // handleCollide
};

/**
 * @method handleOverlap
 * @param { Phaser.Sprite } sprite
 * @param { Phaser.Tile } tile
 */
Game.prototype.handleOverlap = function(sprite, tile) {
    var delta = new Phaser.Point(
        Math.abs(sprite.position.x - tile.worldX - 8),
        Math.abs(sprite.position.y - tile.worldY + 16)
    );
    
    switch (tile.index) {
        case Tiles.LADDER_TOP:
            if (delta.x <= 8 && delta.y <= 2) {
                sprite.data.isOnLadderTop = true;
            }
        case Tiles.LADDER:
            if (delta.x <= 8) {
                sprite.data.isOnLadderTile = true;
            }
            break;
        default:
            break;
    }
};

/**
 * @method render
 */
Game.prototype.render = function() {
    if (this.debug) {
        this.game.debug.body(this.player.sprite);
    }
};

/*
 * --------------------------------------------------------------------------------
 * Player
 * --------------------------------------------------------------------------------
 */

/**
 * Player
 *
 * @constructor
 * @param { Phaser.Sprite } sprite
 * @param { Object } keys
 */
Player = function(sprite, keys) {

    // Keys
    this.keys = keys;

    // Direction the player is facing (1 or -1)
    this.facing = 1;

    // Walking speed of the player
    this.speed = 96;

    // Climbing speed of the player
    this.speedClimbing = 64;

    // Strength
    this.strength = 0.1;

    // Current state
    this.state = PlayerState.STANDING;

    // Jump timer
    this.jumpTimer = null;

    // Sprite
    this.sprite = sprite;

    // Give sprite full health
    this.sprite.health = 1;

    // Set anchor to center
    this.sprite.anchor.setTo(0.5, 0.5);

    // Store tile overlaps in sprite data
    this.sprite.data.isOnLadderTop = false;
    this.sprite.data.isOnLadderTile = false;

    // Animations
    this.sprite.animations.add('stand', [0]);
    this.sprite.animations.add('walk', [0, 1, 2, 1], 12, true);
    this.sprite.animations.add('jump', [2]);
    this.sprite.animations.add('fall', [2]);
    this.sprite.animations.add('crouch', [3]);
    this.sprite.animations.add('climb', [4, 5], 12, true);
    this.sprite.animations.add('ladder', [4]);
};

/**
 * @method initBody
 */
Player.prototype.initBody = function() {
    this.setBodySize();

    this.sprite.body.bounce.y = 0;
    this.sprite.body.collideWorldBounds = true;
};

/*
 * --------------------------------------------------------------------------------
 * Update
 * --------------------------------------------------------------------------------
 */

/**
 * @method preUpdate
 */
Player.prototype.preUpdate = function() {
    this.sprite.data.isOnLadderTile = false;
    this.sprite.data.isOnLadderTop = false;
};

/**
 * @method update
 */
Player.prototype.update = function() {
    this.updateState();
    this.updateVelocity();
};

/**
 * @method updateState
 */
Player.prototype.updateState = function() {

    // Check for state changes
    switch (this.state) {
        case PlayerState.FALLING:
            if (this.isClimbing()) {
                this.setState(PlayerState.CLIMBING);
            } else if (this.isOnFloor()) {
                this.setState(PlayerState.STANDING);
            }
            break;
        case PlayerState.STANDING:
            if (this.isJumping()) {
                this.setState(PlayerState.JUMPING);
            } else if (this.isWalking()) {
                this.setState(PlayerState.WALKING);
            } else if (this.isClimbing()) {
                this.setState(PlayerState.CLIMBING);
            } else if (this.isOnLadder()) {
                this.setState(PlayerState.LADDER);
            } else if (this.isCrouching()) {
                this.setState(PlayerState.CROUCHING);
            } else if (this.isFalling()) {
                this.setState(PlayerState.FALLING);
            }
            break;
        case PlayerState.JUMPING:
            if (this.isOnFloor()) {
                this.setState(PlayerState.STANDING);
            }
            break;
        case PlayerState.WALKING:
            if (this.isJumping()) {
                this.setState(PlayerState.JUMPING);
            } else if (this.isClimbing()) {
                this.setState(PlayerState.CLIMBING);
            } else if (this.isOnLadder()) {
                this.setState(PlayerState.LADDER);
            } else if (this.isFalling()) {
                this.setState(PlayerState.FALLING);
            } else if (!this.isWalking()) {
                this.setState(PlayerState.STANDING);
            }
            break;
        case PlayerState.CLIMBING:
            if (this.isJumping()) {
                this.setState(PlayerState.JUMPING);
            } else if (!this.isClimbing() && this.isOnLadder()) {
                this.setState(PlayerState.LADDER);
            } else if (!this.isClimbing()) {
                this.setState(PlayerState.STANDING);
            }
            break;
        case PlayerState.LADDER:
            if (this.isJumping()) {
                this.setState(PlayerState.JUMPING);
            } else if (this.isClimbing()) {
                this.setState(PlayerState.CLIMBING);
            } else if (!this.isOnLadder()) {
                this.setState(PlayerState.FALLING);
            }
            break;
        case PlayerState.CROUCHING:
            if (this.isJumping()) {
                this.setState(PlayerState.JUMPING);
            } else if (this.isClimbing()) {
                this.setState(PlayerState.CLIMBING);
            } else if (!this.isCrouching()) {
                this.setState(PlayerState.STANDING);
            } else if (this.isFalling()) {
                this.setState(PlayerState.FALLING);
            }
            break;
        default:
            break;
    }
};

/**
 * @method updateVelocity
 */
Player.prototype.updateVelocity = function() {
    var direction = new Phaser.Point(
        this.keys.left.isDown ? -1 : this.keys.right.isDown ? 1 : 0,
        this.keys.up.isDown ? -1 : this.keys.down.isDown ? 1 : 0
    );

    // Set direction
    this.sprite.scale.x = this.facing = direction.x === 0 ? this.facing : direction.x;

    // Update velocity
    switch (this.state) {
        case PlayerState.CLIMBING:
            this.sprite.body.velocity.x = 0;
            this.sprite.body.velocity.y = direction.y * this.speedClimbing;
            this.sprite.x = this.getLockX(this.sprite.x);
            break;
        case PlayerState.LADDER:
            this.sprite.body.velocity.x = 0;
            this.sprite.body.velocity.y = 0;
            this.sprite.x = this.getLockX(this.sprite.x);
            break;
        case PlayerState.WALKING:
            this.sprite.body.velocity.y = 0;
        case PlayerState.FALLING:
        case PlayerState.JUMPING:
            this.sprite.body.velocity.x = direction.x * this.speed;
            break;
        case PlayerState.STANDING:
        case PlayerState.CROUCHING:
            this.sprite.body.velocity.x = 0;
            this.sprite.body.velocity.y = 0;
            break;
        default:
            break;
    }
};

/*
 * --------------------------------------------------------------------------------
 * Setters
 * --------------------------------------------------------------------------------
 */

/**
 * @method setState
 * @param { String } state
 */
Player.prototype.setState = function(state) {
    console.log('[PlayerState]: ' + state);

    this.state = state;

    switch (this.state) {
        case PlayerState.FALLING:
            this.setBodySize();
            this.setOnLadder(false);
            this.setAnimation('fall');
            break;
        case PlayerState.STANDING:
            this.setBodySize();
            this.setOnLadder(false);
            this.setAnimation('stand');
            this.endJump();
            break;
        case PlayerState.JUMPING:
            this.setBodySize();
            this.setOnLadder(false);
            this.setAnimation('jump');
            this.startJump();
            break;
        case PlayerState.WALKING:
            this.setBodySize();
            this.setOnLadder(false);
            this.setAnimation('walk');
            break;
        case PlayerState.CLIMBING:
            this.setBodySize();
            this.setOnLadder(true);
            this.setAnimation('climb');
            break;
        case PlayerState.LADDER:
            this.setBodySize();
            this.setOnLadder(true);
            this.setAnimation('ladder');
            break;
        case PlayerState.CROUCHING:
            this.setBodySize('small');
            this.setOnLadder(false);
            this.setAnimation('crouch');
            break;
        default:
            break;
    }
};

/**
 * @method setBodySize
 * @param { String } size
 */
Player.prototype.setBodySize = function(size = 'large') {
    switch (size) {

        // For crouching and crawling
        case 'small':
            this.sprite.body.setSize(16, 16, 0, 16);
            break;

        // Default body size
        case 'large':
        default:
            this.sprite.body.setSize(16, 24, 0, 8);
            break;
    }
};

/**
 * @method setGravity
 * @param { Boolean } bool
 */
Player.prototype.setGravity = function(bool) {
    this.sprite.body.allowGravity = bool;
};

/**
 * @method setAnimation
 * @param { String } anim
 */
Player.prototype.setAnimation = function(anim) {
    this.sprite.animations.play(anim);
};

/**
 * @method setOnLadder
 * @param { Boolean } bool
 */
Player.prototype.setOnLadder = function(bool) {
    this.setGravity(!bool);
    this.setLadderTopsCollide(!bool);
};

/**
 * @method setLadderTopsCollide
 * @param { Boolean } bool
 */
Player.prototype.setLadderTopsCollide = function(bool) {
    var map = this.sprite.game.world.children[0].map;

    this.setTileCollides(map, Tiles.LADDER_TOP, bool);
};

/**
 * @method setTileCollides
 * @param { Phaser.Tilemap } map
 * @param { Number } index
 * @param { Boolean } bool
 */
Player.prototype.setTileCollides = function(map, index, bool) {
    for (var x = 0; x < map.width; x++) {
        for (var y = 0; y < map.height; y++) {
            var tile = map.getTile(x, y);

            if (tile.index === index) {
                tile.setCollision(bool, bool, bool, bool);
            }
        }
    }
};

/*
 * --------------------------------------------------------------------------------
 * Getters
 * --------------------------------------------------------------------------------
 */

/**
 * @method getLockX
 * @param { Number } x
 */
Player.prototype.getLockX = function(x) {
    return Math.floor(x / 16) * 16 + 8;
};

/*
 * --------------------------------------------------------------------------------
 * Jump
 * --------------------------------------------------------------------------------
 */

/**
 * @method startJump
 */
Player.prototype.startJump = function() {
    this.sprite.body.velocity.y = -224;
    this.jumpTimer = this.sprite.game.time.events.add(Phaser.Timer.SECOND * 0.5, function() {
        this.setState(PlayerState.FALLING);
    }, this);
};

/**
 * @method endJump
 */
Player.prototype.endJump = function() {
     this.sprite.game.time.events.remove(this.jumpTimer);
};

/*
 * --------------------------------------------------------------------------------
 * Check state
 * --------------------------------------------------------------------------------
 */

/**
 * @method isWalking
 * @return { Boolean }
 */
Player.prototype.isWalking = function() {
    return this.isOnFloor() && (this.keys.left.isDown || this.keys.right.isDown);
};

/**
 * @method isJumping
 * @return { Boolean }
 */
Player.prototype.isJumping = function() {
    return (this.isOnFloor() || this.sprite.data.isOnLadderTile) && this.keys.jump.isDown;
};

/**
 * @method isCrouching
 * @return { Boolean }
 */
Player.prototype.isCrouching = function() {
    return this.isOnFloor() && this.keys.down.isDown;
};

/**
 * @method isFalling
 * @return { Boolean }
 */
Player.prototype.isFalling = function() {
    return !this.isOnFloor();
};

/**
 * @method isClimbing
 * @return { Boolean }
 */
Player.prototype.isClimbing = function() {
    return this.isTryingToClimbUp() || this.isTryingToClimbDown() || this.isTryingToClimb();
};

/**
 * @method isTryingToClimb
 * @return { Boolean }
 */
Player.prototype.isTryingToClimb = function() {
    return this.isOnLadder() && (this.keys.up.isDown || this.keys.down.isDown);
};

/**
 * @method isTryingToClimbDown
 * @return { Boolean }
 */
Player.prototype.isTryingToClimbDown = function() {
    return this.sprite.data.isOnLadderTop && this.keys.down.isDown;
};

/**
 * @method isTryingToClimbUp
 * @return { Boolean }
 */
Player.prototype.isTryingToClimbUp = function() {
    return this.sprite.data.isOnLadderTile && this.isOnFloor() && !this.sprite.data.isOnLadderTop && this.keys.up.isDown;
};

/**
 * @method isOnLadder
 * @return { Boolean }
 */
Player.prototype.isOnLadder = function() {
    return this.sprite.data.isOnLadderTile && !this.isOnFloor() && !this.sprite.data.isOnLadderTop;
};

/**
 * @method isOnFloor
 * @return { Boolean }
 */
Player.prototype.isOnFloor = function() {
    return this.sprite.body.onFloor();
};

