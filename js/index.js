/**
 * Phaser platformer, with ladders
 *
 * @author Seb Eynott
 * https://github.com/SebEynott/phaser-ladders
 */

/**
 * Container
 *
 * @method PhaserGame
 * @return {Object} public methods
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
    WALKING: 'walking',
    CROUCHING: 'crouching',
    JUMPING: 'jumping',
    LADDER: 'ladder',
    FALLING: 'falling',
    CLIMBING: 'climbing'
};

/**
 * Game class
 *
 * @constructor Game
 * @param {Object} game
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
    this.map.setCollision(2, true, 'layerMain');
    this.map.setCollision(3, true, 'layerMain');
    this.map.setCollision(8, true, 'layerMain');
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
    this.player.willUpdate();
    this.checkTiles();

    this.game.physics.arcade.overlap(this.player.sprite, this.layerMain, this.handleOverlap);
    this.game.physics.arcade.collide(this.player.sprite, this.layerMain, this.handleCollide);

    this.player.update();
}

/**
 * @method handleCollide
 */
Game.prototype.handleCollide = function(sprite, tile) {
    switch (tile.index) {
        case 3:
        case 9:
        default:
            break;
    }
};

/**
 * @method handleOverlap
 */
Game.prototype.handleOverlap = function(sprite, tile) {
    var overlapX = Math.abs(sprite.position.x - tile.worldX - 8);
    var overlapY = Math.abs(sprite.position.y - tile.worldY + 16);

    switch (tile.index) {
        case 3:
            if (overlapX <= 8) {
                sprite.data.isOnLadderTile = true;

                if (overlapY <= 2) {
                    sprite.data.isOnLadderTop = true;
                }
            }
            break;
        case 9:
            if (overlapX <= 8) {
                sprite.data.isOnLadderTile = true;
            }
            break;
        default:
            break;
    }
};

/**
 * @method checkTiles
 */
Game.prototype.checkTiles = function() {
    for (var x = 0; x < this.map.width; x++) {
        for (var y = 0; y < this.map.height; y++) {
            var tile = this.map.getTile(x, y);

            this.checkTile(tile);
        }
    }
};

/**
 * @method checkTile
 */
Game.prototype.checkTile = function(tile) {
    switch (tile.index) {
        case 3:
            if (this.player.state === PlayerState.CLIMBING || this.player.state === PlayerState.LADDER) {
                tile.collideUp = false;
                tile.collideDown = false;
                tile.collideLeft = false;
                tile.collideRight = false;
                //tile.alpha = 0.8;
                //this.layerMain.dirty = true;
            } else {
                tile.collideUp = true;
                tile.collideDown = true;
                tile.collideLeft = true;
                tile.collideRight = true;
                //tile.alpha = 0.3;
                //this.layerMain.dirty = true;
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
        //this.game.debug.text(this.game.time.suggestedFps, 32, 32);
    }
};

/**
 * Player class
 *
 * @constructor Player
 * @param {Object} sprite
 * @param {Object} keys
 */
Player = function(sprite, keys) {
    this.keys = keys;
    this.facing = 1;
    this.speed = 100;
    this.strength = 0.1;
    this.state = PlayerState.STANDING;
    this.timer = null;
    this.sprite = sprite;
    this.sprite.health = 1;
    this.sprite.data.isOnLadderTop = false;
    this.sprite.data.isOnLadderTile = false;
    this.sprite.anchor.setTo(0.5, 0.5);
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
    this.sprite.body.setSize(16, 24, 0, 8);
    this.sprite.body.bounce.y = 0;
    this.sprite.body.collideWorldBounds = true;
};

/**
 * @method setState
 */
Player.prototype.setState = function(state) {
    console.log('[PlayerState]: ' + state);
    this.state = state;
};

/**
 * @method willUpdate
 */
Player.prototype.willUpdate = function() {
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
    switch (this.state) {
        case PlayerState.FALLING:
            if (this.isClimbing()) {
                this.climb();
            } else if (this.isOnFloor()) {
                this.stand();
            }
            break;
        case PlayerState.STANDING:
            if (this.isJumping()) {
                this.jump();
            } else if (this.isWalking()) {
                this.walk();
            } else if (this.isClimbing()) {
                this.climb();
            } else if (this.isOnLadder()) {
                this.ladder();
            } else if (this.isCrouching()) {
                this.crouch();
            } else if (this.isFalling()) {
                this.fall();
            }
            break;
        case PlayerState.JUMPING:
            if (this.isOnFloor()) {
                this.stand();
            }
            //else if (this.isClimbing()) {
            //    this.climb();
            //}
            break;
        case PlayerState.WALKING:
            if (this.isJumping()) {
                this.jump();
            } else if (this.isClimbing()) {
                //console.log('isClimbing');
                this.climb();
            } else if (this.isOnLadder()) {
                this.ladder();
            } else if (!this.isWalking()) {
                this.stand();
            } else if (this.isFalling()) {
                this.fall();
            }
            break;
        case PlayerState.CLIMBING:
            if (this.isJumping()) {
                this.jump();
            } else if (!this.isClimbing() && this.isOnLadder()) {
                this.ladder();
            } else if (!this.isClimbing()) {
                this.stand();
            }
            break;
        case PlayerState.LADDER:
            if (this.isJumping()) {
                this.jump();
            } else if (this.isClimbing()) {
                this.climb();
            } else if (!this.isOnLadder()) {
                this.fall();
            }
            break;
        case PlayerState.CROUCHING:
            if (this.isJumping()) {
                this.jump();
            } else if (this.isClimbing()) {
                this.climb();
            } else if (!this.isCrouching()) {
                this.stand();
            } else if (this.isFalling()) {
                this.fall();
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
    var directionX = this.keys.left.isDown ? -1 : this.keys.right.isDown ? 1 : 0;
    var directionY = this.keys.up.isDown ? -1 : this.keys.down.isDown ? 1 : 0;

    this.facing = directionX === 0 ? this.facing : directionX;
    this.sprite.scale.x = this.facing;

    switch (this.state) {
        case PlayerState.FALLING:
        case PlayerState.JUMPING:
        case PlayerState.WALKING:
            this.sprite.body.velocity.x = directionX * this.speed;
            break;
        case PlayerState.CLIMBING:
            this.sprite.x = (Math.floor(this.sprite.x / 16) * 16) + 8;
            this.sprite.body.velocity.y = directionY * this.speed;
            break;
        case PlayerState.LADDER:
            this.sprite.x = (Math.floor(this.sprite.x / 16) * 16) + 8;
            break;
        case PlayerState.STANDING:
        case PlayerState.CROUCHING:
            //this.sprite.body.velocity.x = 0;
            //this.sprite.body.velocity.y = 0;
            break;
        default:
            break;
    }
};

/**
 * Actions
 */

// Stand
Player.prototype.stand = function() {
    this.setState(PlayerState.STANDING);
    this.sprite.body.allowGravity = true;
    this.sprite.body.setSize(16, 24, 0, 8);
    this.sprite.body.velocity.x = 0;
    this.sprite.animations.play('stand');
};

// Walk
Player.prototype.walk = function() {
    this.setState(PlayerState.WALKING);
    this.sprite.body.allowGravity = true;
    this.sprite.body.setSize(16, 24, 0, 8);
    this.sprite.animations.play('walk');
};

// Fall
Player.prototype.fall = function() {
    this.setState(PlayerState.FALLING);
    this.sprite.body.allowGravity = true;
    this.sprite.body.setSize(16, 24, 0, 8);
    this.sprite.animations.play('fall');
};

// Jump
Player.prototype.jump = function() {
    this.setState(PlayerState.JUMPING);
    this.sprite.body.allowGravity = true;
    this.sprite.body.velocity.y = -224;
    this.sprite.body.setSize(16, 24, 0, 8);
    this.sprite.animations.play('jump');
    this.timer = this.sprite.game.time.events.add(Phaser.Timer.SECOND * 0.5, this.fall, this);
};

// Climb
Player.prototype.climb = function() {
    this.setState(PlayerState.CLIMBING);
    this.sprite.body.allowGravity = false;
    this.sprite.body.setSize(16, 24, 0, 8);
    this.sprite.body.velocity.x = 0;
    this.sprite.animations.play('climb');
};

// Ladder
Player.prototype.ladder = function() {
    this.setState(PlayerState.LADDER);
    this.sprite.body.allowGravity = false;
    this.sprite.body.setSize(16, 24, 0, 8);
    this.sprite.body.velocity.x = 0;
    this.sprite.body.velocity.y = 0;
    this.sprite.animations.play('ladder');
};

// Crouch
Player.prototype.crouch = function() {
    this.setState(PlayerState.CROUCHING);
    this.sprite.body.allowGravity = true;
    this.sprite.body.setSize(16, 16, 0, 16);
    this.sprite.body.velocity.x = 0;
    this.sprite.animations.play('crouch');
};

/**
 * Checkers
 */

// Check if walking
Player.prototype.isWalking = function() {
    return this.keys.left.isDown || this.keys.right.isDown;
};

// Check if jumping
Player.prototype.isJumping = function() {
    return this.keys.jump.isDown && (this.isOnFloor() || this.isOnLadderTile());
};

// Check if crouching
Player.prototype.isCrouching = function() {
    return this.keys.down.isDown;
};

// Check if falling
Player.prototype.isFalling = function() {
    return !this.isOnFloor();
};

// Check if climbing
Player.prototype.isClimbing = function() {
    return this.isTryingToClimbUp() || this.isTryingToClimbDown() || this.isTryingToClimb();
};

// Check if on ladder
Player.prototype.isTryingToClimb = function() {
    return this.isOnLadder() && (this.keys.up.isDown || this.keys.down.isDown);
};

// Check if on ladder
Player.prototype.isTryingToClimbDown = function() {
    return this.isOnLadderTop() && this.keys.down.isDown;
};

// Check if on ladder
Player.prototype.isTryingToClimbUp = function() {
    return this.isOnLadderTile() && this.isOnFloor() && !this.isOnLadderTop() && this.keys.up.isDown;
};

// Check if on ladder
Player.prototype.isOnLadder = function() {
    return this.isOnLadderTile() && !this.isOnFloor() && !this.isOnLadderTop();
};

// Check if touching the floor
Player.prototype.isOnFloor = function() {
    return this.sprite.body.onFloor();
};

// Check if ladder in range
Player.prototype.isOnLadderTile = function() {
    return this.sprite.data.isOnLadderTile;
};

// Check if ladder in range
Player.prototype.isOnLadderTop = function() {
    return this.sprite.data.isOnLadderTop;
};
