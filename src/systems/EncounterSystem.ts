import { Scene } from 'phaser';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { KickableObject, ObjectType } from '../entities/KickableObject';
import { PoolManager } from '../managers/PoolManager';
import { Vector2 } from '../utils/Vector2';
import { ENEMY_TYPES } from '../config/enemyTypes';
import { EnemyTypeId } from '../enemies/EnemyType';
import { CharacterManager } from '../entities/Character';

export enum EnemyState {
  STATIONARY = 'stationary',
  PATROLLING = 'patrolling', 
  AGGROED = 'aggroed',
  COMBAT = 'combat',
  FLEEING = 'fleeing'
}

export interface GameZone {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  enemies: StationaryEnemy[];
  kickableObjects: KickableObjectConfig[];
  boss?: BossConfig;
  theme: ZoneTheme;
  requiredCharacters: string[];
  isUnlocked: boolean;
}

export interface StationaryEnemy {
  position: Vector2;
  enemyType: EnemyTypeId;
  aggroRadius: number;
  patrolPath?: Vector2[];
  state: EnemyState;
  enemy?: Enemy; // Runtime enemy instance
}

export interface KickableObjectConfig {
  position: Vector2;
  type: ObjectType;
  object?: KickableObject; // Runtime object instance
}

export interface BossConfig {
  type: string;
  name: string;
  position: Vector2;
  health: number;
  phases: BossPhase[];
  arenaRadius: number;
  unlockCharacter: string;
}

export interface BossPhase {
  healthThreshold: number;
  abilities: string[];
  movementPattern: string;
}

export interface ZoneTheme {
  backgroundColor: number;
  groundTexture: string;
  ambientColor: number;
  musicTrack: string;
}

export class EncounterSystem {
  private enemyPool: PoolManager<Enemy>;
  private zones: GameZone[] = [];
  private currentZone: GameZone | null = null;
  private activeEnemies: Map<string, Enemy> = new Map();
  private activeObjects: Map<string, KickableObject> = new Map();
  private currentBoss: Boss | null = null;
  private isBossFight: boolean = false;
  private aggroRadius: number = 150; // Default aggro distance
  
  constructor(private scene: Scene) {
    // Create enemy pool
    this.enemyPool = new PoolManager(
      () => new Enemy(scene),
      (enemy) => enemy.reset(),
      200 // Fewer enemies needed for zone-based encounters
    );
    
    // Initialize zones
    this.createGameZones();
  }

  private createGameZones(): void {
    // Zone 1: Tutorial Grove - Easy introduction
    this.zones.push({
      id: 'tutorial-grove',
      name: 'Tutorial Grove',
      bounds: { x: 0, y: 0, width: 1200, height: 800 },
      enemies: [
        { position: new Vector2(300, 200), enemyType: EnemyTypeId.BASIC, aggroRadius: 100, state: EnemyState.STATIONARY },
        { position: new Vector2(500, 300), enemyType: EnemyTypeId.BASIC, aggroRadius: 120, state: EnemyState.STATIONARY },
        { position: new Vector2(700, 150), enemyType: EnemyTypeId.FAST, aggroRadius: 140, state: EnemyState.STATIONARY },
        { position: new Vector2(400, 500), enemyType: EnemyTypeId.BASIC, aggroRadius: 110, state: EnemyState.STATIONARY },
        { position: new Vector2(800, 400), enemyType: EnemyTypeId.FAST, aggroRadius: 130, state: EnemyState.STATIONARY }
      ],
      kickableObjects: [
        { position: new Vector2(350, 250), type: ObjectType.BARREL },
        { position: new Vector2(600, 200), type: ObjectType.BOX },
        { position: new Vector2(450, 400), type: ObjectType.STONE }
      ],
      boss: {
        type: 'swarm-king',
        name: 'Swarm King Chimpanzini',
        position: new Vector2(900, 600),
        health: 300,
        phases: [
          { healthThreshold: 1.0, abilities: ['summon-swarm'], movementPattern: 'circle' },
          { healthThreshold: 0.5, abilities: ['summon-swarm', 'charge-attack'], movementPattern: 'aggressive' }
        ],
        arenaRadius: 200,
        unlockCharacter: 'chimpanzini-bananini'
      },
      theme: {
        backgroundColor: 0x2d5a27,
        groundTexture: 'grass',
        ambientColor: 0x90ff90,
        musicTrack: 'forest-theme'
      },
      requiredCharacters: [],
      isUnlocked: true
    });

    // Zone 2: Desert Outpost - Medium difficulty
    this.zones.push({
      id: 'desert-outpost', 
      name: 'Desert Outpost',
      bounds: { x: 1500, y: 0, width: 1400, height: 900 },
      enemies: [
        { position: new Vector2(1700, 200), enemyType: EnemyTypeId.TANK, aggroRadius: 120, state: EnemyState.PATROLLING, 
          patrolPath: [new Vector2(1700, 200), new Vector2(1900, 200), new Vector2(1900, 400), new Vector2(1700, 400)] },
        { position: new Vector2(2000, 300), enemyType: EnemyTypeId.FAST, aggroRadius: 160, state: EnemyState.STATIONARY },
        { position: new Vector2(2200, 150), enemyType: EnemyTypeId.FAST, aggroRadius: 140, state: EnemyState.STATIONARY },
        { position: new Vector2(1800, 500), enemyType: EnemyTypeId.BASIC, aggroRadius: 100, state: EnemyState.STATIONARY },
        { position: new Vector2(2100, 600), enemyType: EnemyTypeId.TANK, aggroRadius: 130, state: EnemyState.STATIONARY },
        { position: new Vector2(2300, 450), enemyType: EnemyTypeId.SWARM, aggroRadius: 180, state: EnemyState.STATIONARY }
      ],
      kickableObjects: [
        { position: new Vector2(1750, 300), type: ObjectType.BARREL },
        { position: new Vector2(2050, 250), type: ObjectType.STONE },
        { position: new Vector2(2150, 500), type: ObjectType.LOG }
      ],
      boss: {
        type: 'desert-bomber',
        name: 'Bombardiro Crocodilo',
        position: new Vector2(2500, 700),
        health: 500,
        phases: [
          { healthThreshold: 1.0, abilities: ['bomb-barrage'], movementPattern: 'stationary' },
          { healthThreshold: 0.7, abilities: ['bomb-barrage', 'charge-slam'], movementPattern: 'chase' },
          { healthThreshold: 0.3, abilities: ['mega-bomb', 'charge-slam'], movementPattern: 'berserker' }
        ],
        arenaRadius: 250,
        unlockCharacter: 'bombardiro-crocodilo'
      },
      theme: {
        backgroundColor: 0x8b7355,
        groundTexture: 'sand',
        ambientColor: 0xffdd88,
        musicTrack: 'desert-theme'
      },
      requiredCharacters: ['chimpanzini-bananini'],
      isUnlocked: false
    });

    // Zone 3: Arctic Laboratory - High difficulty
    this.zones.push({
      id: 'arctic-lab',
      name: 'Arctic Laboratory', 
      bounds: { x: 0, y: 1200, width: 1600, height: 1000 },
      enemies: [
        { position: new Vector2(200, 1400), enemyType: EnemyTypeId.ELITE, aggroRadius: 200, state: EnemyState.PATROLLING,
          patrolPath: [new Vector2(200, 1400), new Vector2(400, 1400), new Vector2(400, 1600), new Vector2(200, 1600)] },
        { position: new Vector2(600, 1300), enemyType: EnemyTypeId.TANK, aggroRadius: 140, state: EnemyState.STATIONARY },
        { position: new Vector2(800, 1500), enemyType: EnemyTypeId.TANK, aggroRadius: 130, state: EnemyState.STATIONARY },
        { position: new Vector2(1000, 1350), enemyType: EnemyTypeId.SWARM, aggroRadius: 160, state: EnemyState.STATIONARY },
        { position: new Vector2(1200, 1450), enemyType: EnemyTypeId.ELITE, aggroRadius: 180, state: EnemyState.STATIONARY },
        { position: new Vector2(900, 1700), enemyType: EnemyTypeId.FAST, aggroRadius: 170, state: EnemyState.STATIONARY },
        { position: new Vector2(1100, 1650), enemyType: EnemyTypeId.FAST, aggroRadius: 160, state: EnemyState.STATIONARY }
      ],
      kickableObjects: [
        { position: new Vector2(300, 1500), type: ObjectType.BARREL },
        { position: new Vector2(700, 1400), type: ObjectType.BOX },
        { position: new Vector2(950, 1600), type: ObjectType.STONE },
        { position: new Vector2(1300, 1500), type: ObjectType.BARREL }
      ],
      boss: {
        type: 'ice-shark',
        name: 'Tralalero Tralala', 
        position: new Vector2(1400, 1800),
        health: 700,
        phases: [
          { healthThreshold: 1.0, abilities: ['ice-dash'], movementPattern: 'swimming' },
          { healthThreshold: 0.6, abilities: ['ice-dash', 'freeze-wave'], movementPattern: 'aggressive-swim' },
          { healthThreshold: 0.2, abilities: ['mega-freeze', 'triple-dash'], movementPattern: 'frenzy' }
        ],
        arenaRadius: 300,
        unlockCharacter: 'tralalero-tralala'
      },
      theme: {
        backgroundColor: 0x4a7c7e,
        groundTexture: 'ice',
        ambientColor: 0xaaffff,
        musicTrack: 'arctic-theme'
      },
      requiredCharacters: ['bombardiro-crocodilo'],
      isUnlocked: false
    });
  }

  loadZone(zoneId: string): void {
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone || !zone.isUnlocked) {
      console.warn(`Zone ${zoneId} not found or not unlocked`);
      return;
    }

    // Clear current zone
    this.clearCurrentZone();
    
    this.currentZone = zone;
    
    // Spawn stationary enemies
    zone.enemies.forEach((enemyConfig, index) => {
      const enemy = this.enemyPool.acquire();
      const enemyType = ENEMY_TYPES[enemyConfig.enemyType];
      
      // Add custom properties for aggro system
      (enemy as any).aggroRadius = enemyConfig.aggroRadius;
      (enemy as any).currentState = enemyConfig.state;
      (enemy as any).originalPosition = enemyConfig.position.clone();
      (enemy as any).patrolPath = enemyConfig.patrolPath;
      (enemy as any).patrolIndex = 0;
      (enemy as any).hasAggro = false;
      
      // Spawn at designated position
      enemy.spawn(enemyConfig.position.x, enemyConfig.position.y, enemyType);
      
      // Override movement type for stationary enemies
      if (enemyConfig.state === EnemyState.STATIONARY) {
        (enemy as any).movementType = 'stationary';
      } else if (enemyConfig.state === EnemyState.PATROLLING) {
        (enemy as any).movementType = 'patrol';
      }
      
      // Store enemy reference
      enemyConfig.enemy = enemy;
      this.activeEnemies.set(`${zoneId}-enemy-${index}`, enemy);
    });
    
    // Spawn kickable objects
    zone.kickableObjects.forEach((objectConfig, index) => {
      const kickableObject = new KickableObject(
        this.scene,
        objectConfig.position.x,
        objectConfig.position.y,
        objectConfig.type
      );
      
      // Store object reference
      objectConfig.object = kickableObject;
      this.activeObjects.set(`${zoneId}-object-${index}`, kickableObject);
    });
    
    // Load zone theme and environment
    this.applyZoneTheme(zone);
  }

  private clearCurrentZone(): void {
    // Release all active enemies
    this.activeEnemies.forEach(enemy => {
      this.enemyPool.release(enemy);
    });
    this.activeEnemies.clear();
    
    // Clean up all active objects
    this.activeObjects.forEach(obj => {
      obj.destroy();
    });
    this.activeObjects.clear();
    
    this.currentZone = null;
  }

  private applyZoneTheme(zone: GameZone): void {
    // Apply visual theme to the scene
    const camera = this.scene.cameras.main;
    camera.setBackgroundColor(zone.theme.backgroundColor);
    
    // Additional theme application would go here
    // - Ground texture changes
    // - Ambient lighting
    // - Background music
  }

  update(currentTime: number, playerPos: Vector2): void {
    if (!this.currentZone) return;

    // Update boss if active
    if (this.currentBoss && this.currentBoss.sprite.active) {
      this.currentBoss.update(16, playerPos); // Assume 60fps for delta
      
      // Check if boss was defeated
      if (this.currentBoss.health <= 0 && this.currentBoss.isDying) {
        this.onBossDefeated();
      }
    }

    // Update all kickable objects
    this.activeObjects.forEach(obj => {
      obj.update(16); // Assume 60fps for delta
    });

    // Only update regular enemies if not in boss fight
    if (!this.isBossFight) {
      // Update each enemy's aggro state
      this.currentZone.enemies.forEach(enemyConfig => {
        if (!enemyConfig.enemy || !enemyConfig.enemy.sprite.active) return;

        this.updateEnemyAggro(enemyConfig, playerPos);
      });

      // Check if player is near boss spawn area to trigger boss fight
      if (this.currentZone.boss && !this.currentBoss) {
        const distanceToBoss = Vector2.distance(playerPos, this.currentZone.boss.position);
        if (distanceToBoss <= this.currentZone.boss.arenaRadius) {
          this.startBossFight();
        }
      }
    }

    // Clean up dead enemies
    const deadEnemies: string[] = [];
    this.activeEnemies.forEach((enemy, key) => {
      if (enemy.sprite.active && enemy.health <= 0 && !enemy.isDying) {
        this.enemyPool.release(enemy);
        deadEnemies.push(key);
      }
    });
    
    deadEnemies.forEach(key => {
      this.activeEnemies.delete(key);
    });
    
    // Clean up broken objects
    const brokenObjects: string[] = [];
    this.activeObjects.forEach((obj, key) => {
      if (obj.isBroken) {
        obj.destroy();
        brokenObjects.push(key);
      }
    });
    
    brokenObjects.forEach(key => {
      this.activeObjects.delete(key);
    });
  }

  private updateEnemyAggro(enemyConfig: StationaryEnemy, playerPos: Vector2): void {
    const enemy = enemyConfig.enemy!;
    const enemyPos = new Vector2(enemy.sprite.x, enemy.sprite.y);
    const distanceToPlayer = Vector2.distance(enemyPos, playerPos);
    
    const aggroRange = enemyConfig.aggroRadius;
    const hasAggro = (enemy as any).hasAggro;
    
    // State transitions
    switch (enemyConfig.state) {
      case EnemyState.STATIONARY:
        if (distanceToPlayer <= aggroRange && !hasAggro) {
          this.triggerAggro(enemy, enemyConfig);
        }
        break;
        
      case EnemyState.PATROLLING:
        if (distanceToPlayer <= aggroRange && !hasAggro) {
          this.triggerAggro(enemy, enemyConfig);
        } else if (!hasAggro) {
          this.updatePatrol(enemy, enemyConfig);
        }
        break;
        
      case EnemyState.AGGROED:
        if (distanceToPlayer > aggroRange * 1.5) { // Hysteresis to prevent flapping
          this.loseAggro(enemy, enemyConfig);
        } else {
          // Continue normal homing behavior (handled by Enemy.update)
          (enemy as any).movementType = 'homing';
        }
        break;
    }
  }

  private triggerAggro(enemy: Enemy, config: StationaryEnemy): void {
    (enemy as any).hasAggro = true;
    config.state = EnemyState.AGGROED;
    (enemy as any).movementType = 'homing';
    
    // Visual/audio feedback for aggro trigger
    enemy.sprite.setTint(0xff9999); // Slight red tint when aggroed
    
    console.log(`Enemy aggroed at position ${enemy.sprite.x}, ${enemy.sprite.y}`);
  }

  private loseAggro(enemy: Enemy, config: StationaryEnemy): void {
    (enemy as any).hasAggro = false;
    
    // Return to original state
    if (config.patrolPath) {
      config.state = EnemyState.PATROLLING;
      (enemy as any).movementType = 'patrol';
    } else {
      config.state = EnemyState.STATIONARY;
      (enemy as any).movementType = 'stationary';
    }
    
    // Clear aggro tint
    enemy.sprite.clearTint();
    
    console.log(`Enemy lost aggro, returning to ${config.state}`);
  }

  private updatePatrol(enemy: Enemy, config: StationaryEnemy): void {
    if (!config.patrolPath || config.patrolPath.length === 0) return;
    
    const patrolIndex = (enemy as any).patrolIndex || 0;
    const targetPos = config.patrolPath[patrolIndex];
    const enemyPos = new Vector2(enemy.sprite.x, enemy.sprite.y);
    const distanceToTarget = Vector2.distance(enemyPos, targetPos);
    
    if (distanceToTarget < 20) {
      // Reached patrol point, move to next
      (enemy as any).patrolIndex = (patrolIndex + 1) % config.patrolPath.length;
    }
    
    // Override enemy movement to patrol toward current target
    const dx = targetPos.x - enemy.sprite.x;
    const dy = targetPos.y - enemy.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      const moveSpeed = enemy.speed * 0.5; // Patrol slower than aggro
      const moveX = (dx / distance) * moveSpeed * (1/60); // Assuming 60 FPS
      const moveY = (dy / distance) * moveSpeed * (1/60);
      
      enemy.sprite.x += moveX;
      enemy.sprite.y += moveY;
    }
  }

  getActiveEnemies(): Enemy[] {
    return Array.from(this.activeEnemies.values()).filter(enemy => enemy.sprite.active);
  }

  getCurrentZone(): GameZone | null {
    return this.currentZone;
  }

  getAvailableZones(): GameZone[] {
    return this.zones.filter(zone => zone.isUnlocked);
  }

  unlockZone(zoneId: string): void {
    const zone = this.zones.find(z => z.id === zoneId);
    if (zone) {
      zone.isUnlocked = true;
      console.log(`Zone ${zone.name} unlocked!`);
    }
  }

  private startBossFight(): void {
    if (!this.currentZone?.boss) return;
    
    console.log(`Starting boss fight: ${this.currentZone.boss.name}`);
    
    // Clear all regular enemies for boss fight
    this.activeEnemies.forEach(enemy => {
      this.enemyPool.release(enemy);
    });
    this.activeEnemies.clear();
    
    // Create and spawn boss
    this.currentBoss = new Boss(this.scene, this.currentZone.boss);
    
    // Use appropriate enemy type for boss visual
    let bossEnemyType;
    switch (this.currentZone.boss.type) {
      case 'swarm-king':
        bossEnemyType = ENEMY_TYPES.elite; // Use elite sprite for now
        break;
      case 'desert-bomber':
        bossEnemyType = ENEMY_TYPES.tank; // Use tank sprite for crocodile
        break;
      case 'ice-shark':
        bossEnemyType = ENEMY_TYPES.elite; // Use elite sprite for shark
        break;
      default:
        bossEnemyType = ENEMY_TYPES.elite;
    }
    
    this.currentBoss.spawn(
      this.currentZone.boss.position.x,
      this.currentZone.boss.position.y,
      bossEnemyType
    );
    
    this.isBossFight = true;
    
    // TODO: Show boss introduction screen
    // TODO: Play boss music
  }

  private onBossDefeated(): void {
    if (!this.currentBoss || !this.currentZone?.boss) return;
    
    console.log(`Boss ${this.currentZone.boss.name} defeated!`);
    
    // Unlock the Italian Brainrot character!
    const characterManager = CharacterManager.getInstance();
    const unlocked = characterManager.unlockCharacterByBoss(this.currentZone.boss.type);
    
    if (unlocked) {
      console.log(`🎉 New Italian Brainrot character unlocked: ${this.currentZone.boss.unlockCharacter}`);
      // TODO: Show character unlock animation/screen
    }
    
    // TODO: Show victory screen
    // TODO: Play victory music
    
    // Unlock next zone if applicable
    this.unlockNextZone();
    
    // Clean up boss
    this.currentBoss.reset();
    this.currentBoss = null;
    this.isBossFight = false;
    
    // TODO: Return to zone selection or continue
  }

  private unlockNextZone(): void {
    const currentZoneIndex = this.zones.findIndex(z => z.id === this.currentZone?.id);
    if (currentZoneIndex !== -1 && currentZoneIndex < this.zones.length - 1) {
      const nextZone = this.zones[currentZoneIndex + 1];
      nextZone.isUnlocked = true;
      console.log(`Zone ${nextZone.name} unlocked!`);
    }
  }

  getBoss(): Boss | null {
    return this.currentBoss;
  }

  isBossActive(): boolean {
    return this.isBossFight && this.currentBoss !== null;
  }

  getActiveEnemies(): Enemy[] {
    const regularEnemies = Array.from(this.activeEnemies.values()).filter(enemy => enemy.sprite.active);
    
    // Include boss in enemy list for collision detection
    if (this.currentBoss && this.currentBoss.sprite.active) {
      regularEnemies.push(this.currentBoss);
    }
    
    return regularEnemies;
  }

  getActiveObjects(): KickableObject[] {
    return Array.from(this.activeObjects.values()).filter(obj => !obj.isBroken);
  }

  getFlyingObjects(): KickableObject[] {
    return Array.from(this.activeObjects.values()).filter(obj => obj.isFlying && !obj.isBroken);
  }

  reset(): void {
    this.clearCurrentZone();
    
    // Reset boss fight state
    if (this.currentBoss) {
      this.currentBoss.reset();
      this.currentBoss = null;
    }
    this.isBossFight = false;
    
    // Clear any remaining objects
    this.activeObjects.clear();
  }
}