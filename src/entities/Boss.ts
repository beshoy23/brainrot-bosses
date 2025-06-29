import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { Vector2 } from '../utils/Vector2';
import { EnemyTypeConfig } from '../enemies/EnemyType';
import { BossConfig, BossPhase } from '../systems/EncounterSystem';

export enum BossAttack {
  BASIC_ATTACK = 'basic_attack',
  SUMMON_SWARM = 'summon_swarm',
  CHARGE_ATTACK = 'charge_attack',
  BOMB_BARRAGE = 'bomb_barrage',
  CHARGE_SLAM = 'charge_slam',
  MEGA_BOMB = 'mega_bomb',
  ICE_DASH = 'ice_dash',
  FREEZE_WAVE = 'freeze_wave',
  MEGA_FREEZE = 'mega_freeze',
  TRIPLE_DASH = 'triple_dash'
}

export enum MovementPattern {
  STATIONARY = 'stationary',
  CIRCLE = 'circle',
  CHASE = 'chase',
  AGGRESSIVE = 'aggressive',
  BERSERKER = 'berserker',
  SWIMMING = 'swimming',
  AGGRESSIVE_SWIM = 'aggressive_swim',
  FRENZY = 'frenzy'
}

export class Boss extends Enemy {
  public bossConfig: BossConfig;
  public currentPhase: number = 0;
  public lastAttackTime: number = 0;
  public attackCooldown: number = 2000; // 2 seconds between attacks
  public arenaCenter: Vector2;
  public arenaRadius: number;
  
  // Movement pattern properties
  public circleAngle: number = 0;
  public circleSpeed: number = 1; // Radians per second
  public chargeTarget: Vector2 | null = null;
  public isCharging: boolean = false;
  public swimDirection: Vector2 = new Vector2(1, 0);
  public swimTimer: number = 0;
  
  // Visual effects
  private phaseTransitionEffect?: Phaser.GameObjects.Graphics;
  private attackWarning?: Phaser.GameObjects.Graphics;
  private healthBarBg?: Phaser.GameObjects.Graphics;
  private healthBarFill?: Phaser.GameObjects.Graphics;
  private nameText?: Phaser.GameObjects.Text;
  
  constructor(scene: Scene, bossConfig: BossConfig) {
    super(scene);
    
    this.bossConfig = bossConfig;
    this.arenaCenter = bossConfig.position.clone();
    this.arenaRadius = bossConfig.arenaRadius;
    
    // Create boss-specific visuals
    this.createBossUI();
  }

  private createBossUI(): void {
    const scene = this.scene;
    
    // Health bar background
    this.healthBarBg = scene.add.graphics();
    this.healthBarBg.setDepth(100);
    
    // Health bar fill
    this.healthBarFill = scene.add.graphics();
    this.healthBarFill.setDepth(101);
    
    // Boss name text
    this.nameText = scene.add.text(0, 0, this.bossConfig.name, {
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial Black'
    });
    this.nameText.setDepth(102);
    this.nameText.setOrigin(0.5, 1);
    
    // Phase transition effect
    this.phaseTransitionEffect = scene.add.graphics();
    this.phaseTransitionEffect.setDepth(90);
    this.phaseTransitionEffect.setVisible(false);
    
    // Attack warning indicator
    this.attackWarning = scene.add.graphics();
    this.attackWarning.setDepth(89);
    this.attackWarning.setVisible(false);
  }

  spawn(x: number, y: number, enemyType: EnemyTypeConfig): void {
    // Use boss health instead of enemy type health
    super.spawn(x, y, enemyType);
    this.health = this.bossConfig.health;
    this.maxHealth = this.bossConfig.health;
    
    // Boss-specific setup
    this.hitboxRadius = 40; // Larger hitbox for bosses
    this.currentPhase = 0;
    
    // Apply boss scale and visual effects
    this.sprite.setScale(1.5); // Bosses are bigger
    this.sprite.setTint(0xffffff); // Clear any enemy tints
    
    // Position UI elements
    this.updateBossUI();
  }

  update(deltaTime: number, playerPos: Vector2): void {
    // Check for phase transitions
    this.checkPhaseTransition();
    
    // Update movement based on current phase pattern
    this.updateBossMovement(deltaTime, playerPos);
    
    // Handle boss attacks
    this.updateBossAttacks(deltaTime, playerPos);
    
    // Update boss UI
    this.updateBossUI();
    
    // Call parent update for knockback and basic systems
    super.update(deltaTime, playerPos);
  }

  private checkPhaseTransition(): void {
    const healthPercent = this.health / this.maxHealth;
    const currentPhaseConfig = this.bossConfig.phases[this.currentPhase];
    
    // Check if we should advance to next phase
    if (this.currentPhase < this.bossConfig.phases.length - 1) {
      const nextPhaseConfig = this.bossConfig.phases[this.currentPhase + 1];
      if (healthPercent <= nextPhaseConfig.healthThreshold) {
        this.enterNextPhase();
      }
    }
  }

  private enterNextPhase(): void {
    this.currentPhase++;
    console.log(`Boss entering phase ${this.currentPhase + 1}`);
    
    // Visual phase transition effect
    this.showPhaseTransition();
    
    // Reset attack cooldown for immediate phase attack
    this.lastAttackTime = Date.now() - this.attackCooldown;
    
    // Phase-specific effects
    const newPhase = this.bossConfig.phases[this.currentPhase];
    switch (newPhase.movementPattern) {
      case 'berserker':
        this.speed *= 1.5; // Increase speed in berserker phase
        break;
      case 'frenzy':
        this.attackCooldown *= 0.5; // Attack twice as fast
        break;
    }
  }

  private showPhaseTransition(): void {
    if (!this.phaseTransitionEffect) return;
    
    this.phaseTransitionEffect.setVisible(true);
    this.phaseTransitionEffect.clear();
    
    // Draw expanding circle effect
    const expandTween = this.scene.tweens.add({
      targets: { radius: 0 },
      radius: 100,
      duration: 500,
      onUpdate: (tween) => {
        if (!this.phaseTransitionEffect) return;
        this.phaseTransitionEffect.clear();
        this.phaseTransitionEffect.lineStyle(3, 0xff0000, 1);
        this.phaseTransitionEffect.strokeCircle(
          this.sprite.x, 
          this.sprite.y, 
          (tween.targets[0] as any).radius
        );
      },
      onComplete: () => {
        if (this.phaseTransitionEffect) {
          this.phaseTransitionEffect.setVisible(false);
        }
      }
    });
  }

  private updateBossMovement(deltaTime: number, playerPos: Vector2): void {
    if (this.isDying || this.isCharging) return;
    
    const currentPhase = this.bossConfig.phases[this.currentPhase];
    const pattern = currentPhase.movementPattern as MovementPattern;
    
    switch (pattern) {
      case MovementPattern.STATIONARY:
        // Don't move
        break;
        
      case MovementPattern.CIRCLE:
        this.updateCircleMovement(deltaTime);
        break;
        
      case MovementPattern.CHASE:
      case MovementPattern.AGGRESSIVE:
        this.updateChaseMovement(deltaTime, playerPos, pattern === MovementPattern.AGGRESSIVE);
        break;
        
      case MovementPattern.BERSERKER:
        this.updateBerserkerMovement(deltaTime, playerPos);
        break;
        
      case MovementPattern.SWIMMING:
      case MovementPattern.AGGRESSIVE_SWIM:
        this.updateSwimmingMovement(deltaTime, playerPos, pattern === MovementPattern.AGGRESSIVE_SWIM);
        break;
        
      case MovementPattern.FRENZY:
        this.updateFrenzyMovement(deltaTime, playerPos);
        break;
    }
  }

  private updateCircleMovement(deltaTime: number): void {
    this.circleAngle += this.circleSpeed * deltaTime / 1000;
    const radius = 100;
    
    const targetX = this.arenaCenter.x + Math.cos(this.circleAngle) * radius;
    const targetY = this.arenaCenter.y + Math.sin(this.circleAngle) * radius;
    
    // Move toward circle position
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      const moveSpeed = this.speed * 0.7; // Slower circling
      this.sprite.x += (dx / distance) * moveSpeed * deltaTime / 1000;
      this.sprite.y += (dy / distance) * moveSpeed * deltaTime / 1000;
    }
  }

  private updateChaseMovement(deltaTime: number, playerPos: Vector2, aggressive: boolean): void {
    const speed = aggressive ? this.speed * 1.2 : this.speed;
    const dx = playerPos.x - this.sprite.x;
    const dy = playerPos.y - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 60) { // Don't get too close
      this.sprite.x += (dx / distance) * speed * deltaTime / 1000;
      this.sprite.y += (dy / distance) * speed * deltaTime / 1000;
    }
  }

  private updateBerserkerMovement(deltaTime: number, playerPos: Vector2): void {
    // Rapid, erratic movement toward player
    const speed = this.speed * 1.5;
    const dx = playerPos.x - this.sprite.x;
    const dy = playerPos.y - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Add some randomness to movement
    const randomX = (Math.random() - 0.5) * 50;
    const randomY = (Math.random() - 0.5) * 50;
    
    if (distance > 40) {
      this.sprite.x += ((dx + randomX) / distance) * speed * deltaTime / 1000;
      this.sprite.y += ((dy + randomY) / distance) * speed * deltaTime / 1000;
    }
  }

  private updateSwimmingMovement(deltaTime: number, playerPos: Vector2, aggressive: boolean): void {
    this.swimTimer += deltaTime;
    
    // Change direction periodically
    if (this.swimTimer > 2000) { // Every 2 seconds
      if (aggressive) {
        // Aggressive swimming toward player
        const dx = playerPos.x - this.sprite.x;
        const dy = playerPos.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.swimDirection.set(dx / distance, dy / distance);
      } else {
        // Random swimming direction
        const angle = Math.random() * Math.PI * 2;
        this.swimDirection.set(Math.cos(angle), Math.sin(angle));
      }
      this.swimTimer = 0;
    }
    
    const speed = aggressive ? this.speed * 1.1 : this.speed * 0.8;
    this.sprite.x += this.swimDirection.x * speed * deltaTime / 1000;
    this.sprite.y += this.swimDirection.y * speed * deltaTime / 1000;
  }

  private updateFrenzyMovement(deltaTime: number, playerPos: Vector2): void {
    // Ultra-fast, chaotic movement
    const speed = this.speed * 2;
    const time = Date.now() / 200; // Fast oscillation
    
    const dx = playerPos.x - this.sprite.x;
    const dy = playerPos.y - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Zigzag pattern toward player
    const perpX = -dy / distance;
    const perpY = dx / distance;
    const zigzag = Math.sin(time) * 30;
    
    this.sprite.x += (dx / distance + perpX * zigzag) * speed * deltaTime / 1000;
    this.sprite.y += (dy / distance + perpY * zigzag) * speed * deltaTime / 1000;
  }

  private updateBossAttacks(deltaTime: number, playerPos: Vector2): void {
    const currentTime = Date.now();
    if (currentTime - this.lastAttackTime < this.attackCooldown) return;
    
    const currentPhase = this.bossConfig.phases[this.currentPhase];
    const availableAttacks = currentPhase.abilities;
    
    if (availableAttacks.length === 0) return;
    
    // Choose random attack from current phase
    const attackName = availableAttacks[Math.floor(Math.random() * availableAttacks.length)];
    this.executeAttack(attackName as BossAttack, playerPos);
    
    this.lastAttackTime = currentTime;
  }

  private executeAttack(attack: BossAttack, playerPos: Vector2): void {
    console.log(`Boss executing attack: ${attack}`);
    
    switch (attack) {
      case BossAttack.SUMMON_SWARM:
        this.executeSummonSwarm();
        break;
        
      case BossAttack.CHARGE_ATTACK:
        this.executeChargeAttack(playerPos);
        break;
        
      case BossAttack.BOMB_BARRAGE:
        this.executeBombBarrage(playerPos);
        break;
        
      case BossAttack.CHARGE_SLAM:
        this.executeChargeSlam(playerPos);
        break;
        
      case BossAttack.MEGA_BOMB:
        this.executeMegaBomb(playerPos);
        break;
        
      case BossAttack.ICE_DASH:
        this.executeIceDash(playerPos);
        break;
        
      case BossAttack.FREEZE_WAVE:
        this.executeFreezeWave();
        break;
        
      case BossAttack.MEGA_FREEZE:
        this.executeMegaFreeze(playerPos);
        break;
        
      case BossAttack.TRIPLE_DASH:
        this.executeTripleDash(playerPos);
        break;
    }
  }

  private executeSummonSwarm(): void {
    // TODO: Spawn swarm enemies around the boss
    console.log("Boss summons swarm enemies!");
  }

  private executeChargeAttack(playerPos: Vector2): void {
    this.chargeTarget = playerPos.clone();
    this.isCharging = true;
    
    // Show warning line
    this.showAttackWarning(this.sprite.x, this.sprite.y, playerPos.x, playerPos.y);
    
    // Execute charge after warning
    this.scene.time.delayedCall(1000, () => {
      if (this.chargeTarget) {
        const chargeSpeed = this.speed * 3;
        const dx = this.chargeTarget.x - this.sprite.x;
        const dy = this.chargeTarget.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Apply charge velocity
        this.knockbackVelocity.set(
          (dx / distance) * chargeSpeed,
          (dy / distance) * chargeSpeed
        );
        
        this.scene.time.delayedCall(500, () => {
          this.isCharging = false;
          this.chargeTarget = null;
        });
      }
    });
  }

  private executeBombBarrage(playerPos: Vector2): void {
    // Create multiple explosion warning areas
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 300, () => {
        const angle = (Math.PI * 2 / 5) * i;
        const radius = 80;
        const bombX = playerPos.x + Math.cos(angle) * radius;
        const bombY = playerPos.y + Math.sin(angle) * radius;
        
        this.showExplosionWarning(bombX, bombY);
        
        this.scene.time.delayedCall(800, () => {
          // TODO: Create actual explosion damage area
          console.log(`Bomb explodes at ${bombX}, ${bombY}`);
        });
      });
    }
  }

  private executeChargeSlam(playerPos: Vector2): void {
    // Similar to charge attack but with area damage on impact
    this.executeChargeAttack(playerPos);
    
    this.scene.time.delayedCall(1500, () => {
      // TODO: Create slam damage area
      console.log("Boss slam creates shockwave!");
    });
  }

  private executeMegaBomb(playerPos: Vector2): void {
    this.showExplosionWarning(playerPos.x, playerPos.y, 120); // Larger warning
    
    this.scene.time.delayedCall(1500, () => {
      // TODO: Create massive explosion
      console.log("MEGA BOMB EXPLOSION!");
    });
  }

  private executeIceDash(playerPos: Vector2): void {
    // Fast dash that leaves ice trail
    this.executeChargeAttack(playerPos);
    // TODO: Add ice trail visual effect
  }

  private executeFreezeWave(): void {
    // Expanding freeze wave from boss position
    console.log("Boss creates freeze wave!");
    // TODO: Implement expanding freeze effect
  }

  private executeMegaFreeze(playerPos: Vector2): void {
    // Large area freeze around player
    this.showExplosionWarning(playerPos.x, playerPos.y, 150);
    
    this.scene.time.delayedCall(1200, () => {
      console.log("MEGA FREEZE!");
      // TODO: Create large freeze area
    });
  }

  private executeTripleDash(playerPos: Vector2): void {
    // Three consecutive dashes
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 800, () => {
        this.executeChargeAttack(playerPos);
      });
    }
  }

  private showAttackWarning(startX: number, startY: number, endX: number, endY: number): void {
    if (!this.attackWarning) return;
    
    this.attackWarning.setVisible(true);
    this.attackWarning.clear();
    this.attackWarning.lineStyle(3, 0xff0000, 0.8);
    this.attackWarning.lineBetween(startX, startY, endX, endY);
    
    // Flash warning
    this.scene.tweens.add({
      targets: this.attackWarning,
      alpha: { from: 1, to: 0 },
      duration: 200,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        if (this.attackWarning) {
          this.attackWarning.setVisible(false);
          this.attackWarning.setAlpha(1);
        }
      }
    });
  }

  private showExplosionWarning(x: number, y: number, radius: number = 60): void {
    const warning = this.scene.add.graphics();
    warning.setDepth(88);
    warning.lineStyle(2, 0xff0000, 0.7);
    warning.strokeCircle(x, y, radius);
    
    // Flash warning
    this.scene.tweens.add({
      targets: warning,
      alpha: { from: 1, to: 0 },
      duration: 150,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        warning.destroy();
      }
    });
  }

  private updateBossUI(): void {
    if (!this.healthBarBg || !this.healthBarFill || !this.nameText) return;
    
    // Position UI at top of screen
    const camera = this.scene.cameras.main;
    const screenCenterX = camera.worldView.centerX;
    const screenTop = camera.worldView.top + 30;
    
    // Health bar dimensions
    const barWidth = 300;
    const barHeight = 20;
    
    // Update health bar background
    this.healthBarBg.clear();
    this.healthBarBg.fillStyle(0x000000, 0.8);
    this.healthBarBg.fillRect(screenCenterX - barWidth/2 - 2, screenTop - 2, barWidth + 4, barHeight + 4);
    this.healthBarBg.lineStyle(2, 0xffffff, 1);
    this.healthBarBg.strokeRect(screenCenterX - barWidth/2 - 2, screenTop - 2, barWidth + 4, barHeight + 4);
    
    // Update health bar fill
    const healthPercent = Math.max(0, this.health / this.maxHealth);
    const fillWidth = barWidth * healthPercent;
    
    this.healthBarFill.clear();
    // Color changes based on health
    let fillColor = 0x00ff00; // Green
    if (healthPercent < 0.6) fillColor = 0xffff00; // Yellow
    if (healthPercent < 0.3) fillColor = 0xff0000; // Red
    
    this.healthBarFill.fillStyle(fillColor, 1);
    this.healthBarFill.fillRect(screenCenterX - barWidth/2, screenTop, fillWidth, barHeight);
    
    // Update name text
    this.nameText.setPosition(screenCenterX, screenTop - 5);
  }

  takeDamage(amount: number): boolean {
    const wasDead = super.takeDamage(amount);
    
    if (wasDead) {
      this.onBossDefeated();
    }
    
    return wasDead;
  }

  private onBossDefeated(): void {
    console.log(`Boss ${this.bossConfig.name} defeated! Unlocking character: ${this.bossConfig.unlockCharacter}`);
    
    // TODO: Trigger character unlock
    // TODO: Show victory screen
    // TODO: Return to zone selection
    
    // Clean up boss UI
    this.cleanupBossUI();
  }

  private cleanupBossUI(): void {
    if (this.healthBarBg) {
      this.healthBarBg.destroy();
      this.healthBarBg = undefined;
    }
    if (this.healthBarFill) {
      this.healthBarFill.destroy();
      this.healthBarFill = undefined;
    }
    if (this.nameText) {
      this.nameText.destroy();
      this.nameText = undefined;
    }
    if (this.phaseTransitionEffect) {
      this.phaseTransitionEffect.destroy();
      this.phaseTransitionEffect = undefined;
    }
    if (this.attackWarning) {
      this.attackWarning.destroy();
      this.attackWarning = undefined;
    }
  }

  reset(): void {
    super.reset();
    
    // Reset boss-specific properties
    this.currentPhase = 0;
    this.lastAttackTime = 0;
    this.circleAngle = 0;
    this.chargeTarget = null;
    this.isCharging = false;
    this.swimDirection.set(1, 0);
    this.swimTimer = 0;
    
    // Reset to original attack cooldown and speed
    this.attackCooldown = 2000;
    
    this.cleanupBossUI();
  }
}