import { GameObjects, Scene } from 'phaser';
import { GameConfig } from '../config/game';
import { Vector2 } from '../utils/Vector2';
import { VirtualJoystick } from '../mobile/VirtualJoystick';
import { CharacterManager, Character } from './Character';

export class Player {
  public sprite: GameObjects.Sprite;
  public velocity: Vector2 = new Vector2();
  public health: number;
  public maxHealth: number;
  // XP and leveling
  public experience: number = 0;
  public level: number = 1;
  public experienceToNext: number;
  // Character system
  public currentCharacter: Character;
  
  private keys: any;
  private lastDamageTime: number = 0;
  private damageFlashDuration: number = 100; // Brief visual feedback only
  
  // Mobile controls
  private virtualJoystick?: VirtualJoystick;
  private isMobile: boolean;
  
  // Afterimage trail effect
  private afterimagePool: GameObjects.Graphics[] = [];
  private lastAfterimageTime: number = 0;
  private afterimageInterval: number = 50; // ms between afterimages
  private isMoving: boolean = false;
  
  // Attack animation state
  private isAttacking: boolean = false;
  private attackAnimationDuration: number = 300; // ms

  constructor(scene: Scene, x: number, y: number) {
    // Get current character from CharacterManager
    const characterManager = CharacterManager.getInstance();
    this.currentCharacter = characterManager.getCurrentCharacter();
    
    // Create player sprite based on current character
    this.sprite = scene.add.sprite(x, y, this.currentCharacter.config.spriteKey, 0);
    this.sprite.setScale(0.4); // Scale down to appropriate size
    this.sprite.setDepth(GameConfig.player.depth);
    
    // Create animations for current character
    this.createCharacterAnimations(scene);
    this.sprite.play(`${this.currentCharacter.config.id}-idle-anim`);
    
    this.health = GameConfig.player.maxHealth;
    this.maxHealth = GameConfig.player.maxHealth;
    
    // Initialize XP
    this.experienceToNext = this.calculateXPRequired(this.level);
    
    // Check if mobile
    this.isMobile = (window as any).isMobile || false;
    
    // Always set up keyboard controls (WASD + Arrow keys work on all platforms)
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  }

  update(deltaTime: number): void {
    // Handle input
    this.handleMovement();
    
    // Check if moving
    this.isMoving = this.velocity.x !== 0 || this.velocity.y !== 0;
    
    // Update position
    this.sprite.x += this.velocity.x * deltaTime / 1000;
    this.sprite.y += this.velocity.y * deltaTime / 1000;
    
    // Create afterimage trail when moving
    if (this.isMoving) {
      this.updateAfterimage();
    }
    
    // Update animation based on movement
    this.updateAnimation();
    
    // Keep player within the larger world bounds (with some margin)
    const margin = 100;
    const worldWidth = this.sprite.scene.scale.width * 8;
    const worldHeight = this.sprite.scene.scale.height * 8;
    
    // Clamp position to world bounds
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, margin, worldWidth - margin);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, margin, worldHeight - margin);
    
    // Update damage flash (visual feedback only)
    if (Date.now() - this.lastDamageTime > this.damageFlashDuration) {
      this.sprite.clearAlpha();
      this.sprite.setAlpha(1);
    }
  }

  private handleMovement(): void {
    // Apply speed upgrade multiplier
    const upgradeManager = (window as any).upgradeManager;
    const speedMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('moveSpeed') * 0.1)) : 1;
    
    const speed = GameConfig.player.speed * speedMultiplier;
    this.velocity.set(0, 0);
    
    // Check joystick first (if available)
    if (this.virtualJoystick && this.virtualJoystick.isActive()) {
      // Use joystick movement
      const joystickVelocity = this.virtualJoystick.getVelocity(speed);
      this.velocity.x = joystickVelocity.x;
      this.velocity.y = joystickVelocity.y;
    } else if (this.keys) {
      // Use keyboard movement (WASD + Arrow keys work on all platforms)
      if (this.keys.A.isDown || this.keys.LEFT.isDown) this.velocity.x = -speed;
      if (this.keys.D.isDown || this.keys.RIGHT.isDown) this.velocity.x = speed;
      if (this.keys.W.isDown || this.keys.UP.isDown) this.velocity.y = -speed;
      if (this.keys.S.isDown || this.keys.DOWN.isDown) this.velocity.y = speed;
      
      // Normalize diagonal movement
      if (this.velocity.x !== 0 && this.velocity.y !== 0) {
        this.velocity.multiply(0.707); // 1/sqrt(2)
      }
    }
  }

  takeDamage(amount: number): void {
    // Apply percentage-based armor reduction (fixed from game-breaking flat reduction)
    const upgradeManager = (window as any).upgradeManager;
    const armorLevel = upgradeManager ? upgradeManager.getUpgradeLevel('armor') : 0;
    
    // Percentage-based damage reduction with 60% cap and minimum 1 damage
    const damageReduction = Math.min(armorLevel * 0.15, 0.6); // 15% per level, max 60%
    const actualDamage = Math.max(1, Math.floor(amount * (1 - damageReduction)));
    
    this.health -= actualDamage;
    this.lastDamageTime = Date.now();
    
    // Brief visual feedback (no invulnerability) - red tint effect
    this.sprite.setAlpha(0.6);
    
    // Add red overlay for damage flash
    const scene = this.sprite.scene;
    const redFlash = scene.add.graphics();
    redFlash.setPosition(this.sprite.x, this.sprite.y);
    redFlash.fillStyle(0xff0000, 0.4);
    redFlash.fillCircle(0, 0, 14);
    redFlash.setDepth(this.sprite.depth + 1);
    
    // Remove the red flash after damage flash duration
    scene.time.delayedCall(this.damageFlashDuration, () => {
      redFlash.destroy();
    });
    
    if (this.health <= 0) {
      this.health = 0;
      // Game over will be handled by GameScene
    }
  }

  getPosition(): Vector2 {
    return new Vector2(this.sprite.x, this.sprite.y);
  }
  
  setVirtualJoystick(joystick: VirtualJoystick): void {
    this.virtualJoystick = joystick;
  }
  
  playAttackAnimation(): void {
    this.isAttacking = true;
    this.sprite.play(`${this.currentCharacter.config.id}-attack-anim`);
    
    // Reset attack state after animation completes
    this.sprite.scene.time.delayedCall(this.attackAnimationDuration, () => {
      this.isAttacking = false;
    });
  }

  addExperience(amount: number): boolean {
    this.experience += amount;
    
    // Check for level up
    if (this.experience >= this.experienceToNext) {
      this.experience -= this.experienceToNext;
      this.level++;
      this.experienceToNext = this.calculateXPRequired(this.level);
      return true; // Level up!
    }
    
    return false;
  }
  
  private calculateXPRequired(level: number): number {
    return Math.floor(
      GameConfig.progression.baseXPRequired * 
      Math.pow(GameConfig.progression.xpMultiplier, level - 1)
    );
  }
  
  getXPProgress(): number {
    return this.experience / this.experienceToNext;
  }

  private createCharacterAnimations(scene: Scene): void {
    const characterId = this.currentCharacter.config.id;
    
    // Animation configurations per character
    const animConfigs: { [key: string]: any } = {
      'br-br-patapim': {
        idle: { sprite: 'patapim-idle', frames: 8, frameRate: 6 },
        run: { sprite: 'patapim-run', frames: 6, frameRate: 10 },
        attack: { sprite: 'patapim-attack', frames: 4, frameRate: 12 }
      },
      'chimpanzini-bananini': {
        idle: { sprite: 'zombie-male-idle', frames: 15, frameRate: 4 },
        run: { sprite: 'zombie-male-walk', frames: 10, frameRate: 8 },
        attack: { sprite: 'zombie-male-attack', frames: 8, frameRate: 10 }
      },
      'bombardiro-crocodilo': {
        idle: { sprite: 'black-warrior-idle', frames: 8, frameRate: 3 },
        run: { sprite: 'black-warrior-run', frames: 8, frameRate: 6 },
        attack: { sprite: 'black-warrior-idle', frames: 8, frameRate: 8 } // Use idle for attack
      },
      'tralalero-tralala': {
        idle: { sprite: 'red-lancer-idle', frames: 12, frameRate: 4 },
        run: { sprite: 'red-lancer-run', frames: 12, frameRate: 8 },
        attack: { sprite: 'red-lancer-idle', frames: 12, frameRate: 10 }
      },
      'cappuccino-assassino': {
        idle: { sprite: 'yellow-monk-idle', frames: 6, frameRate: 5 },
        run: { sprite: 'yellow-monk-run', frames: 6, frameRate: 12 },
        attack: { sprite: 'yellow-monk-idle', frames: 6, frameRate: 15 }
      },
      'lirili-larila': {
        idle: { sprite: 'zombie-female-idle', frames: 15, frameRate: 3 },
        run: { sprite: 'zombie-female-walk', frames: 10, frameRate: 7 },
        attack: { sprite: 'zombie-female-attack', frames: 8, frameRate: 9 }
      }
    };
    
    const config = animConfigs[characterId] || animConfigs['br-br-patapim']; // Fallback to default
    
    // Create idle animation
    const idleKey = `${characterId}-idle-anim`;
    if (!scene.anims.exists(idleKey)) {
      scene.anims.create({
        key: idleKey,
        frames: scene.anims.generateFrameNumbers(config.idle.sprite, { 
          start: 0, 
          end: config.idle.frames - 1
        }),
        frameRate: config.idle.frameRate,
        repeat: -1
      });
    }
    
    // Create run animation
    const runKey = `${characterId}-run-anim`;
    if (!scene.anims.exists(runKey)) {
      scene.anims.create({
        key: runKey,
        frames: scene.anims.generateFrameNumbers(config.run.sprite, { 
          start: 0, 
          end: config.run.frames - 1
        }),
        frameRate: config.run.frameRate,
        repeat: -1
      });
    }
    
    // Create attack animation
    const attackKey = `${characterId}-attack-anim`;
    if (!scene.anims.exists(attackKey)) {
      scene.anims.create({
        key: attackKey,
        frames: scene.anims.generateFrameNumbers(config.attack.sprite, { 
          start: 0, 
          end: config.attack.frames - 1
        }),
        frameRate: config.attack.frameRate,
        repeat: 0 // Play once
      });
    }
  }
  
  private updateAnimation(): void {
    // Update facing direction based on horizontal movement
    if (this.velocity.x > 0) {
      this.sprite.setFlipX(false); // Face right
    } else if (this.velocity.x < 0) {
      this.sprite.setFlipX(true);  // Face left (flip horizontally)
    }
    // If only moving vertically, keep current facing direction
    
    // Priority: Attack animation > Movement animations
    if (this.isAttacking) {
      // Attack animation is playing, don't override it
      return;
    }
    
    // Switch between idle and running animations using character-specific keys
    const characterId = this.currentCharacter.config.id;
    const idleKey = `${characterId}-idle-anim`;
    const runKey = `${characterId}-run-anim`;
    
    if (this.isMoving) {
      if (this.sprite.anims.currentAnim?.key !== runKey) {
        this.sprite.play(runKey);
      }
    } else {
      if (this.sprite.anims.currentAnim?.key !== idleKey) {
        this.sprite.play(idleKey);
      }
    }
  }

  private updateAfterimage(): void {
    const now = Date.now();
    if (now - this.lastAfterimageTime < this.afterimageInterval) {
      return;
    }
    
    this.lastAfterimageTime = now;
    this.createAfterimage();
  }
  
  private createAfterimage(): void {
    const scene = this.sprite.scene;
    
    // Create afterimage graphics
    const afterimage = scene.add.graphics();
    afterimage.setPosition(this.sprite.x, this.sprite.y);
    afterimage.setDepth(this.sprite.depth - 1);
    
    // Copy player appearance but with reduced opacity and blue tint
    afterimage.fillGradientStyle(0x4a90e2, 0x2c5aa0, 0x1e3a8a, 0x4a90e2, 0.3);
    afterimage.fillCircle(0, 0, 12);
    
    afterimage.fillStyle(0x87ceeb, 0.2);
    afterimage.fillCircle(0, 0, 8);
    
    // Fade out and destroy
    scene.tweens.add({
      targets: afterimage,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        afterimage.destroy();
      }
    });
  }
  
  // Character ability methods
  getKickForce(): number {
    return this.currentCharacter.getKickForce();
  }

  getKickSpeed(): number {
    return this.currentCharacter.getKickSpeed();
  }

  getKickRange(): number {
    return this.currentCharacter.getKickRange();
  }

  canUseCharacterAbility(abilityId: string): boolean {
    return this.currentCharacter.canUseAbility(abilityId);
  }

  useCharacterAbility(abilityId: string): any {
    return this.currentCharacter.useAbility(abilityId);
  }

  getCharacterAbilities(): any[] {
    return this.currentCharacter.config.specialAbilities;
  }

  getCharacterName(): string {
    return this.currentCharacter.config.name;
  }

  getCharacterTitle(): string {
    return this.currentCharacter.config.title;
  }

  // Method to switch characters (for character selection screen)
  switchCharacter(characterId: string): boolean {
    const characterManager = CharacterManager.getInstance();
    const success = characterManager.setCurrentCharacter(characterId);
    
    if (success) {
      this.currentCharacter = characterManager.getCurrentCharacter();
      
      // Update sprite and animations
      this.sprite.setTexture(this.currentCharacter.config.spriteKey, 0);
      
      // Create new animations for the character
      this.createCharacterAnimations(this.sprite.scene);
      
      // Start with idle animation
      this.sprite.play(`${this.currentCharacter.config.id}-idle-anim`);
      
      console.log(`Switched to ${this.currentCharacter.config.name}`);
    }
    
    return success;
  }

  destroy(): void {
    this.afterimagePool.forEach(afterimage => afterimage.destroy());
    this.afterimagePool = [];
    this.sprite.destroy();
  }
}