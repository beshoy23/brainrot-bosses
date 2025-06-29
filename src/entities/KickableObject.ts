import { GameObjects, Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';
import { GameConfig } from '../config/game';

export enum ObjectType {
  BARREL = 'barrel',
  BOX = 'box', 
  STONE = 'stone',
  LOG = 'log'
}

export enum BreakEffect {
  EXPLODE = 'explode',
  SHATTER = 'shatter',
  SPLINTER = 'splinter'
}

export interface ObjectConfig {
  type: ObjectType;
  weight: number;
  health: number;
  breakEffect: BreakEffect;
  damage: number;
  knockbackMultiplier: number;
  sprite: string;
  scale: number;
  bounceDecay: number;
}

export class KickableObject {
  public sprite: GameObjects.Sprite;
  public velocity: Vector2 = new Vector2();
  public health: number;
  public maxHealth: number;
  public config: ObjectConfig;
  public isFlying: boolean = false;
  public isBroken: boolean = false;
  public hitboxRadius: number;
  
  // Physics properties
  public weight: number;
  public bounceDecay: number;
  public rotationSpeed: number = 0;
  
  // Visual effects
  private trailPoints: Array<{x: number, y: number, alpha: number}> = [];
  private lastTrailTime: number = 0;
  private trailGraphics?: GameObjects.Graphics;
  private breakEffectPlayed: boolean = false;
  
  // Static object configurations
  private static OBJECT_CONFIGS: { [key in ObjectType]: ObjectConfig } = {
    [ObjectType.BARREL]: {
      type: ObjectType.BARREL,
      weight: 50,
      health: 30,
      breakEffect: BreakEffect.EXPLODE,
      damage: 40,
      knockbackMultiplier: 1.5,
      sprite: 'barrel-sprite',
      scale: 0.6,
      bounceDecay: 0.85
    },
    [ObjectType.BOX]: {
      type: ObjectType.BOX,
      weight: 20,
      health: 15,
      breakEffect: BreakEffect.SHATTER,
      damage: 25,
      knockbackMultiplier: 1.2,
      sprite: 'box-sprite',
      scale: 0.5,
      bounceDecay: 0.75
    },
    [ObjectType.STONE]: {
      type: ObjectType.STONE,
      weight: 80,
      health: 50,
      breakEffect: BreakEffect.SHATTER,
      damage: 60,
      knockbackMultiplier: 2.0,
      sprite: 'stone-sprite',
      scale: 0.4,
      bounceDecay: 0.95
    },
    [ObjectType.LOG]: {
      type: ObjectType.LOG,
      weight: 70,
      health: 40,
      breakEffect: BreakEffect.SPLINTER,
      damage: 45,
      knockbackMultiplier: 1.8,
      sprite: 'log-sprite',
      scale: 0.8,
      bounceDecay: 0.88
    }
  };

  constructor(scene: Scene, x: number, y: number, objectType: ObjectType) {
    this.config = KickableObject.OBJECT_CONFIGS[objectType];
    
    // Create proper object graphics instead of confusing enemy sprites
    this.sprite = this.createObjectGraphics(scene, x, y, objectType);
    this.sprite.setDepth(5); // Between ground and enemies
    
    // Initialize properties
    this.health = this.config.health;
    this.maxHealth = this.config.health;
    this.weight = this.config.weight;
    this.bounceDecay = this.config.bounceDecay;
    this.hitboxRadius = (this.sprite.width * this.config.scale) / 2;
    
    // Create trail graphics
    this.trailGraphics = scene.add.graphics();
    this.trailGraphics.setVisible(false);
    this.trailGraphics.setDepth(this.sprite.depth - 1);
    
    // Apply object-specific tinting and effects
    this.applyObjectStyling();
  }

  private createObjectGraphics(scene: Scene, x: number, y: number, objectType: ObjectType): GameObjects.Sprite {
    // Create proper object graphics instead of confusing enemy sprites
    const graphics = scene.add.graphics();
    graphics.setPosition(x, y);
    
    switch (objectType) {
      case ObjectType.BARREL:
        this.drawBarrel(graphics);
        break;
      case ObjectType.BOX:
        this.drawBox(graphics);
        break;
      case ObjectType.STONE:
        this.drawStone(graphics);
        break;
      case ObjectType.LOG:
        this.drawLog(graphics);
        break;
    }
    
    // Convert graphics to texture and create sprite
    const textureKey = `object-${objectType}-${Date.now()}`;
    graphics.generateTexture(textureKey, 64, 64);
    graphics.destroy(); // Clean up the temporary graphics
    
    const sprite = scene.add.sprite(x, y, textureKey);
    sprite.setScale(this.config.scale);
    return sprite;
  }

  private drawBarrel(graphics: GameObjects.Graphics): void {
    // Draw a brown barrel with metal bands
    graphics.fillStyle(0x8B4513); // Saddle brown
    graphics.fillEllipse(0, 0, 32, 40); // Main barrel body
    
    // Metal bands
    graphics.fillStyle(0x666666); // Dark gray
    graphics.fillRect(-16, -10, 32, 3); // Top band
    graphics.fillRect(-16, 0, 32, 3);   // Middle band
    graphics.fillRect(-16, 10, 32, 3);  // Bottom band
    
    // Barrel top
    graphics.fillStyle(0xA0522D); // Sienna brown (darker)
    graphics.fillEllipse(0, -20, 30, 8);
  }

  private drawBox(graphics: GameObjects.Graphics): void {
    // Draw a wooden crate with planks
    graphics.fillStyle(0xDEB887); // Burlywood
    graphics.fillRect(-16, -16, 32, 32); // Main box
    
    // Wood planks (darker lines)
    graphics.lineStyle(1, 0xCD853F); // Peru brown
    graphics.lineBetween(-16, -8, 16, -8);  // Horizontal plank line
    graphics.lineBetween(-16, 0, 16, 0);    // Middle line
    graphics.lineBetween(-16, 8, 16, 8);    // Bottom line
    graphics.lineBetween(-8, -16, -8, 16);  // Vertical plank line
    graphics.lineBetween(8, -16, 8, 16);    // Right line
    
    // Corner reinforcements
    graphics.fillStyle(0x654321); // Dark brown
    graphics.fillRect(-18, -18, 4, 4); // Top-left corner
    graphics.fillRect(14, -18, 4, 4);  // Top-right corner
    graphics.fillRect(-18, 14, 4, 4);  // Bottom-left corner
    graphics.fillRect(14, 14, 4, 4);   // Bottom-right corner
  }

  private drawStone(graphics: GameObjects.Graphics): void {
    // Draw a gray stone with rough edges
    graphics.fillStyle(0x696969); // Dim gray
    
    // Create irregular stone shape
    const points = [
      { x: -12, y: -15 },
      { x: 8, y: -18 },
      { x: 15, y: -8 },
      { x: 18, y: 5 },
      { x: 10, y: 16 },
      { x: -8, y: 18 },
      { x: -16, y: 8 },
      { x: -18, y: -5 }
    ];
    
    graphics.fillPoints(points, true);
    
    // Add texture with darker spots
    graphics.fillStyle(0x555555); // Darker gray
    graphics.fillCircle(-5, -8, 3);
    graphics.fillCircle(6, 2, 2);
    graphics.fillCircle(-8, 6, 2);
    graphics.fillCircle(8, -10, 1);
    
    // Add lighter highlights
    graphics.fillStyle(0x808080); // Light gray
    graphics.fillCircle(-10, -2, 2);
    graphics.fillCircle(4, -6, 1);
    graphics.fillCircle(10, 8, 1);
  }

  private drawLog(graphics: GameObjects.Graphics): void {
    // Draw a brown log with wood grain
    graphics.fillStyle(0xA0522D); // Sienna brown
    graphics.fillRect(-20, -8, 40, 16); // Main log body (horizontal)
    
    // Rounded ends
    graphics.fillCircle(-20, 0, 8); // Left end
    graphics.fillCircle(20, 0, 8);  // Right end
    
    // Wood grain lines
    graphics.lineStyle(1, 0x8B4513); // Saddle brown (darker)
    graphics.lineBetween(-20, -4, 20, -4); // Top grain line
    graphics.lineBetween(-20, 0, 20, 0);   // Middle grain line
    graphics.lineBetween(-20, 4, 20, 4);   // Bottom grain line
    
    // Wood rings on ends
    graphics.lineStyle(1, 0x654321); // Dark brown
    graphics.strokeCircle(-20, 0, 4); // Left end rings
    graphics.strokeCircle(-20, 0, 6);
    graphics.strokeCircle(20, 0, 4);  // Right end rings
    graphics.strokeCircle(20, 0, 6);
    
    // Bark texture on top
    graphics.fillStyle(0x654321); // Dark brown
    graphics.fillRect(-18, -8, 36, 2); // Top bark strip
  }

  private applyObjectStyling(): void {
    // Objects now have proper graphics, so no additional styling needed
    // Colors and appearance are built into the graphics themselves
    // This method is kept for potential future styling effects
  }

  // Method to be called by weapon system when player kicks the object
  applyKick(forceX: number, forceY: number, characterKickForce: number): void {
    if (this.isBroken) return;
    
    // Adjust force based on object weight and character kick force
    const weightFactor = 100 / this.weight; // Heavier objects move less
    const adjustedForceX = forceX * weightFactor * (characterKickForce / 100);
    const adjustedForceY = forceY * weightFactor * (characterKickForce / 100);
    
    this.velocity.set(adjustedForceX, adjustedForceY);
    this.isFlying = true;
    
    // Add rotation when kicked
    this.rotationSpeed = (Math.random() - 0.5) * 0.2; // Random spin
    
    // Visual feedback - scale up briefly when kicked
    const originalScale = this.sprite.scaleX;
    this.sprite.setScale(originalScale * 1.2);
    this.sprite.scene.time.delayedCall(100, () => {
      if (!this.isBroken) {
        this.sprite.setScale(originalScale); // Restore original scale
      }
    });
    
    console.log(`${this.config.type} kicked with force: ${adjustedForceX}, ${adjustedForceY}`);
  }

  // Method called when object hits an enemy
  hitEnemy(enemy: any): number {
    if (this.isBroken || !this.isFlying) return 0;
    
    // Reduce object health on impact
    this.takeDamage(5);
    
    // Apply knockback to enemy based on object velocity and weight
    const impactForce = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    const knockbackForce = impactForce * this.config.knockbackMultiplier;
    
    if (enemy.applyKnockback) {
      enemy.applyKnockback(
        this.velocity.x * 0.5, // Transfer some velocity
        this.velocity.y * 0.5
      );
    }
    
    // Reduce object velocity after impact
    this.velocity.x *= 0.7;
    this.velocity.y *= 0.7;
    
    // Check if velocity is too low to continue flying
    if (impactForce < 50) {
      this.isFlying = false;
      this.velocity.set(0, 0);
    }
    
    return this.config.damage;
  }

  takeDamage(amount: number): void {
    if (this.isBroken) return;
    
    this.health -= amount;
    
    // Visual damage feedback - brief red flash overlay
    const scene = this.sprite.scene;
    const redFlash = scene.add.graphics();
    redFlash.setPosition(this.sprite.x, this.sprite.y);
    redFlash.fillStyle(0xFF0000, 0.5);
    redFlash.fillCircle(0, 0, 20);
    redFlash.setDepth(this.sprite.depth + 1);
    
    scene.time.delayedCall(150, () => {
      redFlash.destroy();
    });
    
    if (this.health <= 0) {
      this.breakObject();
    }
  }

  private breakObject(): void {
    if (this.isBroken || this.breakEffectPlayed) return;
    
    this.isBroken = true;
    this.breakEffectPlayed = true;
    this.isFlying = false;
    this.velocity.set(0, 0);
    
    // Play break effect based on object type
    this.playBreakEffect();
    
    // Hide the object
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    
    console.log(`${this.config.type} broken with ${this.config.breakEffect} effect!`);
  }

  private playBreakEffect(): void {
    const scene = this.sprite.scene;
    const x = this.sprite.x;
    const y = this.sprite.y;
    
    switch (this.config.breakEffect) {
      case BreakEffect.EXPLODE:
        this.createExplosionEffect(scene, x, y);
        break;
      case BreakEffect.SHATTER:
        this.createShatterEffect(scene, x, y);
        break;
      case BreakEffect.SPLINTER:
        this.createSplinterEffect(scene, x, y);
        break;
    }
  }

  private createExplosionEffect(scene: Scene, x: number, y: number): void {
    // Create expanding orange circle for explosion
    const explosionGraphics = scene.add.graphics();
    explosionGraphics.setDepth(20);
    
    scene.tweens.add({
      targets: { radius: 0 },
      radius: 80,
      duration: 300,
      onUpdate: (tween) => {
        explosionGraphics.clear();
        const radius = (tween.targets[0] as any).radius;
        const alpha = 1 - tween.progress;
        
        explosionGraphics.fillStyle(0xFF4500, alpha); // Orange
        explosionGraphics.fillCircle(x, y, radius);
        explosionGraphics.lineStyle(3, 0xFF0000, alpha); // Red outline
        explosionGraphics.strokeCircle(x, y, radius);
      },
      onComplete: () => {
        explosionGraphics.destroy();
      }
    });
    
    // Create particle burst
    this.createParticleBurst(scene, x, y, 0xFF4500, 12);
  }

  private createShatterEffect(scene: Scene, x: number, y: number): void {
    // Create multiple small fragments flying outward
    this.createParticleBurst(scene, x, y, 0xC0C0C0, 8); // Silver fragments
    
    // Add glass-like lines radiating out
    const shatterGraphics = scene.add.graphics();
    shatterGraphics.setDepth(15);
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const length = 30 + Math.random() * 20;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      
      shatterGraphics.lineStyle(2, 0xFFFFFF, 0.8);
      shatterGraphics.lineBetween(x, y, endX, endY);
    }
    
    scene.tweens.add({
      targets: shatterGraphics,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        shatterGraphics.destroy();
      }
    });
  }

  private createSplinterEffect(scene: Scene, x: number, y: number): void {
    // Create wooden splinters
    this.createParticleBurst(scene, x, y, 0x8B4513, 10); // Brown splinters
    
    // Add longer wooden pieces
    for (let i = 0; i < 4; i++) {
      const splinter = scene.add.graphics();
      splinter.setDepth(15);
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = 50 + Math.random() * 100;
      const length = 15 + Math.random() * 10;
      
      splinter.lineStyle(3, 0xA0522D, 1);
      splinter.lineBetween(0, 0, length, 0);
      splinter.setPosition(x, y);
      splinter.setRotation(angle);
      
      scene.tweens.add({
        targets: splinter,
        x: x + Math.cos(angle) * velocity,
        y: y + Math.sin(angle) * velocity,
        rotation: angle + Math.PI * 2,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          splinter.destroy();
        }
      });
    }
  }

  private createParticleBurst(scene: Scene, x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const particle = scene.add.graphics();
      particle.setDepth(18);
      
      const size = 2 + Math.random() * 4;
      const angle = Math.random() * Math.PI * 2;
      const velocity = 30 + Math.random() * 70;
      
      particle.fillStyle(color, 1);
      particle.fillCircle(0, 0, size);
      particle.setPosition(x, y);
      
      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * velocity,
        y: y + Math.sin(angle) * velocity,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  update(deltaTime: number): void {
    if (this.isBroken) return;
    
    // Update physics
    if (this.isFlying) {
      // Apply velocity to position
      this.sprite.x += this.velocity.x * deltaTime / 1000;
      this.sprite.y += this.velocity.y * deltaTime / 1000;
      
      // Apply rotation while flying
      this.sprite.rotation += this.rotationSpeed;
      
      // Create trail effect
      if (Date.now() - this.lastTrailTime > 80) { // Every 80ms
        this.trailPoints.push({
          x: this.sprite.x,
          y: this.sprite.y,
          alpha: 0.6
        });
        this.lastTrailTime = Date.now();
        
        // Limit trail length
        if (this.trailPoints.length > 6) {
          this.trailPoints.shift();
        }
      }
      
      // Apply bounce decay
      this.velocity.x *= this.bounceDecay;
      this.velocity.y *= this.bounceDecay;
      
      // Stop flying when velocity is too low
      const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
      if (speed < 20) {
        this.isFlying = false;
        this.velocity.set(0, 0);
        this.rotationSpeed = 0;
        this.trailPoints = [];
      }
    }
    
    // Update trail visual
    this.updateTrail();
  }

  private updateTrail(): void {
    if (!this.trailGraphics) return;
    
    this.trailGraphics.clear();
    
    if (this.trailPoints.length > 1 && this.isFlying) {
      this.trailGraphics.setVisible(true);
      
      // Draw trail as connected circles with fading alpha
      for (let i = 0; i < this.trailPoints.length; i++) {
        const point = this.trailPoints[i];
        const size = 2 + (i / this.trailPoints.length) * 3; // Growing size
        
        // Color based on object type
        let trailColor = 0xFFFFFF;
        switch (this.config.type) {
          case ObjectType.BARREL:
            trailColor = 0xFF4500; // Orange
            break;
          case ObjectType.BOX:
            trailColor = 0xFFD700; // Gold
            break;
          case ObjectType.STONE:
            trailColor = 0x808080; // Gray
            break;
          case ObjectType.LOG:
            trailColor = 0x8B4513; // Brown
            break;
        }
        
        this.trailGraphics.fillStyle(trailColor, point.alpha);
        this.trailGraphics.fillCircle(point.x, point.y, size);
        
        // Fade trail points
        point.alpha *= 0.9;
      }
      
      // Remove faded points
      this.trailPoints = this.trailPoints.filter(point => point.alpha > 0.1);
    } else {
      this.trailGraphics.setVisible(false);
    }
  }

  // Getters for collision detection
  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get radius(): number { return this.hitboxRadius; }

  reset(): void {
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.velocity.set(0, 0);
    this.isFlying = false;
    this.isBroken = false;
    this.breakEffectPlayed = false;
    this.rotationSpeed = 0;
    this.sprite.rotation = 0;
    this.health = this.maxHealth;
    this.trailPoints = [];
    
    if (this.trailGraphics) {
      this.trailGraphics.clear();
      this.trailGraphics.setVisible(false);
    }
  }

  destroy(): void {
    if (this.trailGraphics) {
      this.trailGraphics.destroy();
    }
    this.sprite.destroy();
  }
}