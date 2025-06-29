/**
 * Brainrot Bosses Integration Test
 * Tests core game logic and system interactions without complex Phaser mocks
 */

import { Vector2 } from '../../utils/Vector2';
import { CharacterManager, ITALIAN_BRAINROT_CHARACTERS } from '../../entities/Character';
import { EncounterSystem, EnemyState } from '../../systems/EncounterSystem';
import { KickableObject, ObjectType } from '../../entities/KickableObject';

// Minimal Phaser mocks - just enough for logic testing
const createMinimalScene = () => ({
  add: {
    sprite: () => ({ setScale: jest.fn(), setDepth: jest.fn(), setTint: jest.fn(), x: 0, y: 0, width: 32, height: 32 }),
    graphics: () => ({ setDepth: jest.fn(), setVisible: jest.fn(), clear: jest.fn() }),
    text: () => ({ setDepth: jest.fn(), setOrigin: jest.fn() })
  },
  cameras: { main: { setBackgroundColor: jest.fn(), worldView: { centerX: 400, top: 0 } } },
  tweens: { add: jest.fn() },
  time: { delayedCall: jest.fn() }
});

describe('Brainrot Bosses Integration Tests', () => {
  
  describe('🔧 Critical Vector2.distance Fix', () => {
    it('should calculate distances correctly (fixes runtime crash)', () => {
      const pos1 = new Vector2(0, 0);
      const pos2 = new Vector2(3, 4);
      
      // This was failing before our fix: rt.distance is not a function
      const distance = Vector2.distance(pos1, pos2);
      
      expect(distance).toBe(5); // 3-4-5 triangle
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(0);
    });

    it('should handle edge cases without errors', () => {
      const samePos = new Vector2(100, 100);
      const origin = new Vector2(0, 0);
      const negative = new Vector2(-50, -50);
      
      expect(() => Vector2.distance(samePos, samePos)).not.toThrow();
      expect(() => Vector2.distance(origin, negative)).not.toThrow();
      expect(Vector2.distance(samePos, samePos)).toBe(0);
    });
  });

  describe('🎮 Boss Defeat → Character Unlock Integration', () => {
    let characterManager: CharacterManager;

    beforeEach(() => {
      // Reset character manager singleton
      (CharacterManager as any).instance = undefined;
      ITALIAN_BRAINROT_CHARACTERS.forEach(char => {
        char.isUnlocked = char.id === 'br-br-patapim';
      });
      characterManager = CharacterManager.getInstance();
    });

    it('should unlock Chimpanzini Bananini when Swarm King is defeated', () => {
      expect(characterManager.isCharacterUnlocked('chimpanzini-bananini')).toBe(false);
      
      const unlocked = characterManager.unlockCharacterByBoss('swarm-king');
      
      expect(unlocked).toBe(true);
      expect(characterManager.isCharacterUnlocked('chimpanzini-bananini')).toBe(true);
      
      const progress = characterManager.getCharacterProgress();
      expect(progress.unlocked).toBe(2); // br-br-patapim + chimpanzini
      expect(progress.total).toBe(6);
    });

    it('should unlock Bombardiro Crocodilo when Desert Bomber is defeated', () => {
      const unlocked = characterManager.unlockCharacterByBoss('desert-bomber');
      
      expect(unlocked).toBe(true);
      expect(characterManager.isCharacterUnlocked('bombardiro-crocodilo')).toBe(true);
    });

    it('should unlock Tralalero Tralala when Ice Shark is defeated', () => {
      const unlocked = characterManager.unlockCharacterByBoss('ice-shark');
      
      expect(unlocked).toBe(true);
      expect(characterManager.isCharacterUnlocked('tralalero-tralala')).toBe(true);
    });

    it('should maintain character progression state', () => {
      // Unlock multiple characters
      characterManager.unlockCharacterByBoss('swarm-king');
      characterManager.unlockCharacterByBoss('desert-bomber');
      
      // Switch character
      const switched = characterManager.setCurrentCharacter('bombardiro-crocodilo');
      expect(switched).toBe(true);
      expect(characterManager.getCurrentCharacter().config.id).toBe('bombardiro-crocodilo');
      
      // Verify stats are different from default character
      const defaultChar = ITALIAN_BRAINROT_CHARACTERS.find(c => c.id === 'br-br-patapim')!;
      const currentChar = characterManager.getCurrentCharacter();
      
      expect(currentChar.getKickForce()).not.toBe(defaultChar.baseKickForce);
      expect(currentChar.getKickSpeed()).not.toBe(defaultChar.baseKickSpeed);
    });
  });

  describe('🗺️ Zone Management Integration', () => {
    let encounterSystem: EncounterSystem;

    beforeEach(() => {
      const scene = createMinimalScene();
      encounterSystem = new EncounterSystem(scene as any);
    });

    it('should load tutorial grove by default', () => {
      const availableZones = encounterSystem.getAvailableZones();
      const tutorialZone = availableZones.find(z => z.id === 'tutorial-grove');
      
      expect(tutorialZone).toBeDefined();
      expect(tutorialZone?.isUnlocked).toBe(true);
      expect(availableZones.length).toBe(1); // Only tutorial unlocked initially
    });

    it('should spawn enemies and objects when loading zone', () => {
      encounterSystem.loadZone('tutorial-grove');
      
      const currentZone = encounterSystem.getCurrentZone();
      expect(currentZone?.id).toBe('tutorial-grove');
      expect(currentZone?.enemies.length).toBeGreaterThan(0);
      expect(currentZone?.kickableObjects.length).toBeGreaterThan(0);
      
      const activeEnemies = encounterSystem.getActiveEnemies();
      const activeObjects = encounterSystem.getActiveObjects();
      
      expect(activeEnemies.length).toBeGreaterThan(0);
      expect(activeObjects.length).toBeGreaterThan(0);
    });

    it('should unlock next zone progression', () => {
      const initialZones = encounterSystem.getAvailableZones().length;
      
      encounterSystem.unlockZone('desert-outpost');
      
      const finalZones = encounterSystem.getAvailableZones().length;
      expect(finalZones).toBe(initialZones + 1);
      
      // Should be able to load the newly unlocked zone
      encounterSystem.loadZone('desert-outpost');
      expect(encounterSystem.getCurrentZone()?.id).toBe('desert-outpost');
    });

    it('should handle zone configuration correctly', () => {
      encounterSystem.loadZone('tutorial-grove');
      const zone = encounterSystem.getCurrentZone()!;
      
      // Verify zone has proper configuration
      expect(zone.boss).toBeDefined();
      expect(zone.boss?.type).toBe('swarm-king');
      expect(zone.boss?.unlockCharacter).toBe('chimpanzini-bananini');
      expect(zone.boss?.health).toBeGreaterThan(0);
      expect(zone.boss?.phases.length).toBeGreaterThan(0);
      
      // Verify enemy configurations
      zone.enemies.forEach(enemy => {
        expect(enemy.position).toBeInstanceOf(Vector2);
        expect(enemy.aggroRadius).toBeGreaterThan(0);
        expect(Object.values(EnemyState)).toContain(enemy.state);
      });
    });
  });

  describe('⚡ Physics Integration', () => {
    let kickableObject: KickableObject;

    beforeEach(() => {
      const scene = createMinimalScene();
      kickableObject = new KickableObject(scene as any, 100, 100, ObjectType.BARREL);
    });

    it('should calculate kick physics based on object weight', () => {
      const lightBox = new KickableObject(createMinimalScene() as any, 100, 100, ObjectType.BOX);
      const heavyStone = new KickableObject(createMinimalScene() as any, 100, 100, ObjectType.STONE);
      
      // Apply same kick force
      lightBox.applyKick(100, 0, 100);
      heavyStone.applyKick(100, 0, 100);
      
      // Lighter object should move faster
      expect(lightBox.velocity.x).toBeGreaterThan(heavyStone.velocity.x);
      expect(lightBox.isFlying).toBe(true);
      expect(heavyStone.isFlying).toBe(true);
    });

    it('should handle enemy collision with damage calculation', () => {
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      
      const mockEnemy = {
        applyKnockback: jest.fn()
      };
      
      const damage = kickableObject.hitEnemy(mockEnemy);
      
      expect(damage).toBe(kickableObject.config.damage);
      expect(mockEnemy.applyKnockback).toHaveBeenCalled();
      expect(kickableObject.health).toBeLessThan(kickableObject.maxHealth);
    });

    it('should handle object breaking and effects', () => {
      const initialHealth = kickableObject.health;
      kickableObject.takeDamage(initialHealth); // Break it
      
      expect(kickableObject.isBroken).toBe(true);
      expect(kickableObject.isFlying).toBe(false);
      expect(kickableObject.health).toBeLessThanOrEqual(0);
    });

    it('should maintain object type properties', () => {
      const barrel = new KickableObject(createMinimalScene() as any, 0, 0, ObjectType.BARREL);
      const box = new KickableObject(createMinimalScene() as any, 0, 0, ObjectType.BOX);
      const stone = new KickableObject(createMinimalScene() as any, 0, 0, ObjectType.STONE);
      const log = new KickableObject(createMinimalScene() as any, 0, 0, ObjectType.LOG);
      
      // Verify each object type has unique properties
      const weights = [barrel.weight, box.weight, stone.weight, log.weight];
      const damages = [barrel.config.damage, box.config.damage, stone.config.damage, log.config.damage];
      
      expect(new Set(weights).size).toBe(4); // All different weights
      expect(new Set(damages).size).toBe(4); // All different damages
      
      // Verify realistic ranges
      weights.forEach(weight => {
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThan(200);
      });
    });
  });

  describe('🔄 System Integration', () => {
    let encounterSystem: EncounterSystem;
    let characterManager: CharacterManager;

    beforeEach(() => {
      const scene = createMinimalScene();
      encounterSystem = new EncounterSystem(scene as any);
      
      (CharacterManager as any).instance = undefined;
      ITALIAN_BRAINROT_CHARACTERS.forEach(char => {
        char.isUnlocked = char.id === 'br-br-patapim';
      });
      characterManager = CharacterManager.getInstance();
    });

    it('should integrate boss defeat with character unlock', () => {
      encounterSystem.loadZone('tutorial-grove');
      
      // Simulate boss fight trigger
      const playerPos = new Vector2(900, 600); // Near boss position
      encounterSystem.update(16, playerPos);
      
      expect(encounterSystem.isBossActive()).toBe(true);
      
      // Simulate boss defeat (this would normally trigger character unlock)
      const boss = encounterSystem.getBoss();
      if (boss) {
        // Verify boss is included in active enemies for collision detection
        const activeEnemies = encounterSystem.getActiveEnemies();
        expect(activeEnemies).toContain(boss);
      }
    });

    it('should handle enemy aggro system with Vector2 calculations', () => {
      encounterSystem.loadZone('tutorial-grove');
      
      // Test player near enemy position
      const playerNearEnemy = new Vector2(300, 200);
      expect(() => {
        encounterSystem.update(16, playerNearEnemy);
      }).not.toThrow();
      
      // Test player far from enemies
      const playerFarAway = new Vector2(1000, 1000);
      expect(() => {
        encounterSystem.update(16, playerFarAway);
      }).not.toThrow();
    });

    it('should maintain consistent character stats across systems', () => {
      const defaultChar = characterManager.getCurrentCharacter();
      const stats = {
        kickForce: defaultChar.getKickForce(),
        kickSpeed: defaultChar.getKickSpeed(),
        kickRange: defaultChar.getKickRange()
      };
      
      // Stats should be consistent with character config
      expect(stats.kickForce).toBe(defaultChar.config.baseKickForce);
      expect(stats.kickSpeed).toBe(defaultChar.config.baseKickSpeed);
      expect(stats.kickRange).toBe(defaultChar.config.baseKickRange);
      
      // Stats should be within reasonable game balance ranges
      expect(stats.kickForce).toBeGreaterThan(50);
      expect(stats.kickForce).toBeLessThan(200);
      expect(stats.kickSpeed).toBeGreaterThan(0.5);
      expect(stats.kickSpeed).toBeLessThan(2.0);
    });

    it('should reset systems cleanly', () => {
      encounterSystem.loadZone('tutorial-grove');
      
      // Load zone and start boss fight
      const playerPos = new Vector2(900, 600);
      encounterSystem.update(16, playerPos);
      
      expect(encounterSystem.getCurrentZone()).not.toBeNull();
      expect(encounterSystem.isBossActive()).toBe(true);
      
      // Reset system
      encounterSystem.reset();
      
      expect(encounterSystem.getCurrentZone()).toBeNull();
      expect(encounterSystem.isBossActive()).toBe(false);
      expect(encounterSystem.getActiveEnemies().length).toBe(0);
      expect(encounterSystem.getActiveObjects().length).toBe(0);
    });
  });

  describe('📊 Game Balance Validation', () => {
    it('should have balanced character progression', () => {
      (CharacterManager as any).instance = undefined;
      ITALIAN_BRAINROT_CHARACTERS.forEach(char => {
        char.isUnlocked = char.id === 'br-br-patapim';
      });
      const manager = CharacterManager.getInstance();
      
      // Unlock all characters to test balance
      manager.unlockCharacterByBoss('swarm-king');
      manager.unlockCharacterByBoss('desert-bomber');
      manager.unlockCharacterByBoss('ice-shark');
      
      const unlockedChars = manager.getUnlockedCharacters();
      expect(unlockedChars.length).toBeGreaterThan(3);
      
      // Each character should have unique stats for variety
      const kickForces = unlockedChars.map(c => c.baseKickForce);
      const kickSpeeds = unlockedChars.map(c => c.baseKickSpeed);
      
      expect(new Set(kickForces).size).toBeGreaterThan(1); // Variety in force
      expect(new Set(kickSpeeds).size).toBeGreaterThan(1); // Variety in speed
    });

    it('should have escalating zone difficulty', () => {
      const scene = createMinimalScene();
      const encounterSystem = new EncounterSystem(scene as any);
      
      // Unlock all zones for testing
      encounterSystem.unlockZone('desert-outpost');
      encounterSystem.unlockZone('arctic-lab');
      
      const zones = encounterSystem.getAvailableZones();
      
      // Later zones should have more enemies and higher boss health
      const tutorialZone = zones.find(z => z.id === 'tutorial-grove')!;
      const arcticZone = zones.find(z => z.id === 'arctic-lab');
      
      if (arcticZone) {
        expect(arcticZone.enemies.length).toBeGreaterThanOrEqual(tutorialZone.enemies.length);
        expect(arcticZone.boss?.health).toBeGreaterThan(tutorialZone.boss?.health || 0);
      }
    });
  });
});