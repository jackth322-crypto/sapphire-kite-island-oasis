// Space Hockey - Core Gameplay Prototype
// Side-view 2.5D style with Phaser 3

const config = {
  type: Phaser.AUTO,
  width: 1200,
  height: 700,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // No gravity; hover robots
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

let rink, puck, players = [], goals = [], scoreText, timerText;
let score = { home: 0, away: 0 };
let gameTime = 300; // 5 minutes in seconds
let isOvertime = false;
let gameOver = false;
let controlledPlayer = null;
let cursors;
let keys;

function preload() {
  // For now, no assets; we'll use graphics
}

function create() {
  // Bright, clean aesthetic: neon-ish space theme
  this.cameras.main.setBackgroundColor('#0f0f23');

  // Rink background - ice surface
  rink = this.add.rectangle(600, 400, 1100, 400, 0x87ceeb, 0.8);
  rink.setStrokeStyle(4, 0xffffff);

  // Goals
  goals.push(this.add.rectangle(80, 400, 40, 180, 0xff4444));
  goals.push(this.add.rectangle(1120, 400, 40, 180, 0x4444ff));

  // Center line
  this.add.rectangle(600, 400, 4, 400, 0xffffff);

  // Puck - use circle for visibility
  puck = this.add.circle(600, 400, 12, 0x000000);
  this.physics.add.existing(puck);
  puck.body.setCircle(12);
  puck.body.setBounce(0.8);
  puck.body.setCollideWorldBounds(true);
  puck.body.setMaxVelocity(600, 400);
  puck.setStrokeStyle(2, 0xffffff);

  // Create players - 4 home (left), 4 away (right)
  // Home team: cyan-ish robots
  for (let i = 0; i < 4; i++) {
    const x = 200 + (i % 2) * 80;
    const y = 300 + Math.floor(i / 2) * 100;
    const player = createRobot(this, x, y, 0x00ffff, 'home', i === 0);
    players.push(player);
    if (i === 0) controlledPlayer = player;
  }

  // Away team: magenta robots
  for (let i = 0; i < 4; i++) {
    const x = 900 + (i % 2) * 80;
    const y = 300 + Math.floor(i / 2) * 100;
    const player = createRobot(this, x, y, 0xff00ff, 'away', false);
    players.push(player);
  }

  // Collisions
  this.physics.add.collider(puck, players, hitPuck, null, this);
  this.physics.add.collider(players, players);

  // UI
  scoreText = this.add.text(600, 50, '0 - 0', {
    fontSize: '32px',
    fill: '#ffffff',
    fontFamily: 'Arial'
  }).setOrigin(0.5);

  timerText = this.add.text(600, 90, '5:00', {
    fontSize: '24px',
    fill: '#ffff00',
    fontFamily: 'Arial'
  }).setOrigin(0.5);

  // Controls
  cursors = this.input.keyboard.createCursorKeys();
  keys = this.input.keyboard.addKeys({
    w: Phaser.Input.Keyboard.KeyCodes.W,
    a: Phaser.Input.Keyboard.KeyCodes.A,
    s: Phaser.Input.Keyboard.KeyCodes.S,
    d: Phaser.Input.Keyboard.KeyCodes.D,
    space: Phaser.Input.Keyboard.KeyCodes.SPACE
  });

  // Crowds - simple circles in background
  for (let i = 0; i < 40; i++) {
    const cx = Phaser.Math.Between(50, 1150);
    const cy = Phaser.Math.Between(50, 200);
    this.add.circle(cx, cy, Phaser.Math.Between(4, 8), Phaser.Math.Between(0x4444aa, 0xaaaaff), 0.6);
  }

  // Instructions
  this.add.text(20, 650, 'WASD/Arrows: Move | Space: Boost | Hover robots hit puck with bodies', {
    fontSize: '16px',
    fill: '#aaaaaa'
  });
}

function createRobot(scene, x, y, color, team, isControlled) {
  const robot = scene.add.circle(x, y, 22, color);
  scene.physics.add.existing(robot);
  robot.body.setCircle(22);
  robot.body.setBounce(0.3);
  robot.body.setCollideWorldBounds(true);
  robot.body.setDrag(0.95);
  robot.body.setMaxVelocity(300, 200);
  robot.setStrokeStyle(3, isControlled ? 0xffff00 : 0xffffff);
  robot.team = team;
  robot.isControlled = isControlled;
  robot.hoverOffset = Math.random() * Math.PI * 2; // For slight hover animation
  robot.baseY = y;
  return robot;
}

let gameOver = false;

function hitPuck(puckObj, player) {
  // Body hit: transfer velocity
  const force = 1.2;
  puckObj.body.velocity.x = player.body.velocity.x * force + (puckObj.x - player.x) * 2;
  puckObj.body.velocity.y = player.body.velocity.y * force + (puckObj.y - player.y) * 2;
  
  // Visual flash - change stroke temporarily (circles support this)
  const originalStroke = player.strokeColor;
  player.setStrokeStyle(5, 0xffffff);
  this.time.delayedCall(100, () => {
    player.setStrokeStyle(3, player.isControlled ? 0xffff00 : 0xffffff);
  });
}

function update(time, delta) {
  // Timer
  if (gameTime > 0 && !isOvertime) {
    gameTime -= delta / 1000;
    if (gameTime <= 0) {
      gameTime = 0;
      if (score.home === score.away) {
        isOvertime = true;
        // Golden goal
      }
    }
  }
  const mins = Math.floor(gameTime / 60);
  const secs = Math.floor(gameTime % 60);
  timerText.setText(isOvertime ? 'OT' : `${mins}:${secs.toString().padStart(2, '0')}`);

  // Hover animation
  players.forEach(p => {
    p.y = p.baseY + Math.sin(time / 200 + p.hoverOffset) * 5;
    p.body.y = p.y;
  });

  // Controlled player movement
  if (controlledPlayer) {
    const speed = 250;
    if (cursors.left.isDown || keys.a.isDown) {
      controlledPlayer.body.setVelocityX(-speed);
    } else if (cursors.right.isDown || keys.d.isDown) {
      controlledPlayer.body.setVelocityX(speed);
    } else {
      controlledPlayer.body.setVelocityX(0);
    }
    if (cursors.up.isDown || keys.w.isDown) {
      controlledPlayer.body.setVelocityY(-speed * 0.7);
    } else if (cursors.down.isDown || keys.s.isDown) {
      controlledPlayer.body.setVelocityY(speed * 0.7);
    } else {
      controlledPlayer.body.setVelocityY(0);
    }
    if (keys.space.isDown) {
      // Boost
      controlledPlayer.body.velocity.scale(1.5);
    }
  }

  // Simple AI for other players
  players.forEach(p => {
    if (p.isControlled) return;
    // Chase puck or position
    const dx = puck.x - p.x;
    const dy = puck.y - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 50) {
      const angle = Math.atan2(dy, dx);
      const aiSpeed = p.team === 'home' ? 180 : 160; // Slight home advantage or variance
      p.body.setVelocity(Math.cos(angle) * aiSpeed, Math.sin(angle) * aiSpeed * 0.6);
    } else {
      p.body.setVelocity(0, 0);
    }
  });

  // Goal detection (simple)
  if (puck.x < 100 && Math.abs(puck.y - 400) < 90) {
    score.away++;
    resetPuck();
  } else if (puck.x > 1100 && Math.abs(puck.y - 400) < 90) {
    score.home++;
    resetPuck();
  }
  scoreText.setText(`${score.home} - ${score.away}`);

  // Win condition
  if (!gameOver && (score.home >= 5 || score.away >= 5 || (gameTime <= 0 && !isOvertime && score.home !== score.away))) {
    gameOver = true;
    this.scene.pause();
    this.add.text(600, 350, score.home > score.away ? 'HOME WINS!' : 'AWAY WINS!', {
      fontSize: '48px',
      fill: '#00ff00'
    }).setOrigin(0.5);
  }
}

function resetPuck() {
  puck.setPosition(600, 400);
  puck.body.setVelocity(0, 0);
}
