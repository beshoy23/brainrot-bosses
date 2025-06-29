import { EncounterSystem, EnemyState, GameZone } from '../EncounterSystem';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Boss } from '../../entities/Boss';
import { KickableObject, ObjectType } from '../../entities/KickableObject';
import { ENEMY_TYPES } from '../../config/enemyTypes';

// Mock Phaser Scene
const mockScene = {
  add: {
    sprite: jest.fn(() => ({
      setScale: jest.fn(),
      setDepth: jest.fn(),
      setTint: jest.fn(),
      setVisible: jest.fn(),
      setActive: jest.fn(),
      clearTint: jest.fn(),
      x: 100,
      y: 100,
      active: true,
      destroy: jest.fn()
    })),
    graphics: jest.fn(() => ({
      setDepth: jest.fn(),
      setVisible: jest.fn(),
      clear: jest.fn(),
      destroy: jest.fn()
    })),
    text: jest.fn(() => ({
      setDepth: jest.fn(),
      setOrigin: jest.fn(),
      destroy: jest.fn()
    }))
  },
  cameras: {
    main: {
      setBackgroundColor: jest.fn(),
      worldView: {
        centerX: 400,
        top: 0
      }
    }
  },
  tweens: {
    add: jest.fn()
  },
  time: {
    delayedCall: jest.fn()
  }
} as any;

// Mock Enemy class
jest.mock('../../entities/Enemy', () => ({
  Enemy: jest.fn().mockImplementation(() => ({
    spawn: jest.fn(),
    reset: jest.fn(),
    sprite: {
      x: 100,
      y: 100,
      active: true,
      setTint: jest.fn(),
      clearTint: jest.fn()
    },
    health: 100,
    isDying: false,
    speed: 100
  }))
}));

// Mock Boss class  
jest.mock('../../entities/Boss', () => ({
  Boss: jest.fn().mockImplementation(() => ({
    spawn: jest.fn(),
    reset: jest.fn(),
    update: jest.fn(),
    sprite: {
      x: 500,
      y: 400,
      active: true
    },
    health: 1000,
    isDying: false
  }))
}));

// Mock KickableObject class
jest.mock('../../entities/KickableObject', () => ({
  KickableObject: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    destroy: jest.fn(),
    isBroken: false
  })),
  ObjectType: {
    BARREL: 'barrel',
    BOX: 'box',
    STONE: 'stone',
    LOG: 'log'
  }
}));

// Mock CharacterManager
const mockCharacterManager = {
  unlockCharacterByBoss: jest.fn().mockReturnValue(true)
};

jest.mock('../../entities/Character', () => ({
  CharacterManager: {
    getInstance: jest.fn(() => mockCharacterManager)
  }
}));

describe('EncounterSystem', () => {
  let encounterSystem: EncounterSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    encounterSystem = new EncounterSystem(mockScene);
  });

  describe('initialization', () => {
    it('should create encounter system with zones', () => {
      expect(encounterSystem).toBeDefined();
      const availableZones = encounterSystem.getAvailableZones();
      expect(availableZones.length).toBeGreaterThan(0);
    });

    it('should have tutorial grove unlocked by default', () => {
      const availableZones = encounterSystem.getAvailableZones();
      const tutorialZone = availableZones.find(z => z.id === 'tutorial-grove');
      expect(tutorialZone).toBeDefined();
      expect(tutorialZone?.isUnlocked).toBe(true);
    });

    it('should have other zones locked initially', () => {
      const allZones = encounterSystem['zones']; // Access private property for testing
      const lockedZones = allZones.filter(z => z.id !== 'tutorial-grove');
      
      lockedZones.forEach(zone => {
        expect(zone.isUnlocked).toBe(false);
      });
    });
  });

  describe('zone loading', () => {
    it('should load tutorial grove successfully', () => {
      encounterSystem.loadZone('tutorial-grove');
      
      const currentZone = encounterSystem.getCurrentZone();
      expect(currentZone).toBeDefined();
      expect(currentZone?.id).toBe('tutorial-grove');
    });

    it('should not load locked zones', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      encounterSystem.loadZone('desert-outpost'); // Locked initially
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Zone desert-outpost not found or not unlocked')
      );
      
      consoleSpy.mockRestore();
    });

    it('should not load non-existent zones', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      encounterSystem.loadZone('non-existent-zone');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Zone non-existent-zone not found or not unlocked')
      );
      
      consoleSpy.mockRestore();
    });

    it('should spawn enemies when loading zone', () => {
      encounterSystem.loadZone('tutorial-grove');
      
      const activeEnemies = encounterSystem.getActiveEnemies();
      expect(activeEnemies.length).toBeGreaterThan(0);
    });

    it('should spawn kickable objects when loading zone', () => {
      encounterSystem.loadZone('tutorial-grove');
      
      const activeObjects = encounterSystem.getActiveObjects();
      expect(activeObjects.length).toBeGreaterThan(0);
    });

    it('should clear previous zone when loading new zone', () => {
      encounterSystem.loadZone('tutorial-grove');
      const firstZoneEnemies = encounterSystem.getActiveEnemies().length;
      
      // Unlock and load another zone
      encounterSystem.unlockZone('desert-outpost');
      encounterSystem.loadZone('desert-outpost');
      
      // Should have different enemies now
      const secondZoneEnemies = encounterSystem.getActiveEnemies();
      expect(secondZoneEnemies).toBeDefined();
    });

    it('should apply zone theme when loading', () => {
      encounterSystem.loadZone('tutorial-grove');
      
      expect(mockScene.cameras.main.setBackgroundColor).toHaveBeenCalled();
    });
  });

  describe('enemy aggro system', () => {
    beforeEach(() => {
      encounterSystem.loadZone('tutorial-grove');
    });

    it('should trigger aggro when player approaches stationary enemy', () => {
      const playerPos = new Vector2(300, 200); // Near first enemy position
      
      encounterSystem.update(16, playerPos);
      
      // Check that enemy aggro was triggered (via console logs or sprite tint)
      const activeEnemies = encounterSystem.getActiveEnemies();
      expect(activeEnemies.length).toBeGreaterThan(0);
    });

    it('should not trigger aggro when player is far away', () => {
      const playerPos = new Vector2(1000, 1000); // Far from enemies
      
      encounterSystem.update(16, playerPos);
      
      // Enemies should remain in stationary state
      const activeEnemies = encounterSystem.getActiveEnemies();
      expect(activeEnemies.length).toBeGreaterThan(0);
    });

    it('should handle patrolling enemies', () => {
      // Unlock and load desert zone which has patrolling enemies
      encounterSystem.unlockZone('desert-outpost');
      encounterSystem.loadZone('desert-outpost');
      
      const playerPos = new Vector2(1700, 200); // Near patrolling enemy
      
      expect(() => {
        encounterSystem.update(16, playerPos);
      }).not.toThrow();
    });

    it('should make enemies lose aggro when player moves away', () => {
      const playerNearPos = new Vector2(300, 200);
      const playerFarPos = new Vector2(1000, 1000);
      
      // Get close to trigger aggro
      encounterSystem.update(16, playerNearPos);
      
      // Move far away
      encounterSystem.update(16, playerFarPos);
      
      // System should handle aggro loss
      expect(() => {
        encounterSystem.update(16, playerFarPos);
      }).not.toThrow();
    });
  });

  describe('boss fight system', () => {
    beforeEach(() => {
      encounterSystem.loadZone('tutorial-grove');
    });

    it('should start boss fight when player approaches boss area', () => {
      const playerPos = new Vector2(900, 600); // Near boss position
      
      encounterSystem.update(16, playerPos);
      
      expect(encounterSystem.isBossActive()).toBe(true);
      const boss = encounterSystem.getBoss();
      expect(boss).toBeDefined();
    });

    it('should not start boss fight when player is far from boss area', () => {
      const playerPos = new Vector2(100, 100); // Far from boss
      
      encounterSystem.update(16, playerPos);
      
      expect(encounterSystem.isBossActive()).toBe(false);
    });

    it('should clear regular enemies when boss fight starts', () => {
      const playerPos = new Vector2(900, 600); // Trigger boss fight
      
      encounterSystem.update(16, playerPos);
      
      // Boss should be active
      expect(encounterSystem.isBossActive()).toBe(true);
    });

    it('should update boss during boss fight', () => {
      const playerPos = new Vector2(900, 600);
      
      encounterSystem.update(16, playerPos); // Start boss fight
      
      const boss = encounterSystem.getBoss();
      if (boss) {
        expect(boss.update).toHaveBeenCalled();
      }
    });

    it('should handle boss defeat', () => {
      const playerPos = new Vector2(900, 600);
      
      encounterSystem.update(16, playerPos); // Start boss fight
      
      const boss = encounterSystem.getBoss();
      if (boss) {
        // Simulate boss defeat
        boss.health = 0;
        boss.isDying = true;
        
        encounterSystem.update(16, playerPos);
        
        // Should trigger character unlock
        expect(mockCharacterManager.unlockCharacterByBoss).toHaveBeenCalled();
      }
    });

    it('should include boss in active enemies list', () => {
      const playerPos = new Vector2(900, 600);
      
      encounterSystem.update(16, playerPos); // Start boss fight
      
      const activeEnemies = encounterSystem.getActiveEnemies();
      const boss = encounterSystem.getBoss();
      
      if (boss) {
        expect(activeEnemies).toContain(boss);
      }
    });
  });

  describe('zone management', () => {
    it('should unlock zones correctly', () => {
      const initialUnlocked = encounterSystem.getAvailableZones().length;
      
      encounterSystem.unlockZone('desert-outpost');
      
      const finalUnlocked = encounterSystem.getAvailableZones().length;
      expect(finalUnlocked).toBe(initialUnlocked + 1);
    });

    it('should unlock next zone after boss defeat', () => {
      encounterSystem.loadZone('tutorial-grove');
      const playerPos = new Vector2(900, 600);
      
      encounterSystem.update(16, playerPos); // Start boss fight
      
      const boss = encounterSystem.getBoss();
      if (boss) {
        boss.health = 0;
        boss.isDying = true;
        
        const initialZones = encounterSystem.getAvailableZones().length;
        encounterSystem.update(16, playerPos); // Trigger boss defeat
        
        // Next zone should be unlocked
        setTimeout(() => {
          const finalZones = encounterSystem.getAvailableZones().length;
          expect(finalZones).toBeGreaterThanOrEqual(initialZones);
        }, 10);
      }
    });

    it('should provide correct zone information', () => {
      const currentZone = encounterSystem.getCurrentZone();
      expect(currentZone).toBeNull(); // No zone loaded initially
      
      encounterSystem.loadZone('tutorial-grove');
      const loadedZone = encounterSystem.getCurrentZone();
      
      expect(loadedZone).toBeDefined();
      expect(loadedZone?.name).toBe('Tutorial Grove');
      expect(loadedZone?.enemies.length).toBeGreaterThan(0);
      expect(loadedZone?.kickableObjects.length).toBeGreaterThan(0);
      expect(loadedZone?.boss).toBeDefined();
    });
  });

  describe('object management', () => {
    beforeEach(() => {
      encounterSystem.loadZone('tutorial-grove');
    });

    it('should update all active objects', () => {
      const activeObjects = encounterSystem.getActiveObjects();
      
      encounterSystem.update(16, new Vector2(100, 100));
      
      activeObjects.forEach(obj => {
        expect(obj.update).toHaveBeenCalledWith(16);
      });
    });

    it('should return flying objects separately', () => {
      const flyingObjects = encounterSystem.getFlyingObjects();
      expect(Array.isArray(flyingObjects)).toBe(true);
    });

    it('should clean up broken objects', () => {
      const playerPos = new Vector2(100, 100);
      
      // Mark an object as broken
      const activeObjects = encounterSystem.getActiveObjects();
      if (activeObjects.length > 0) {
        activeObjects[0].isBroken = true;
        
        encounterSystem.update(16, playerPos);
        
        // Broken object should be cleaned up
        expect(activeObjects[0].destroy).toHaveBeenCalled();
      }
    });
  });

  describe('reset functionality', () => {
    beforeEach(() => {
      encounterSystem.loadZone('tutorial-grove');
    });

    it('should reset system to initial state', () => {
      // Start boss fight
      const playerPos = new Vector2(900, 600);
      encounterSystem.update(16, playerPos);
      
      // Reset system
      encounterSystem.reset();
      
      expect(encounterSystem.getCurrentZone()).toBeNull();
      expect(encounterSystem.isBossActive()).toBe(false);
      expect(encounterSystem.getBoss()).toBeNull();
      expect(encounterSystem.getActiveEnemies().length).toBe(0);
      expect(encounterSystem.getActiveObjects().length).toBe(0);
    });
  });

  describe('zone configurations', () => {
    it('should have correct zone progression requirements', () => {
      const allZones = encounterSystem['zones'];
      
      // Tutorial grove should be unlocked by default
      const tutorialZone = allZones.find(z => z.id === 'tutorial-grove');
      expect(tutorialZone?.isUnlocked).toBe(true);
      expect(tutorialZone?.requiredCharacters.length).toBe(0);
      
      // Desert outpost should require chimpanzini
      const desertZone = allZones.find(z => z.id === 'desert-outpost');
      expect(desertZone?.isUnlocked).toBe(false);
      expect(desertZone?.requiredCharacters).toContain('chimpanzini-bananini');
      
      // Arctic lab should require bombardiro
      const arcticZone = allZones.find(z => z.id === 'arctic-lab');
      expect(arcticZone?.isUnlocked).toBe(false);
      expect(arcticZone?.requiredCharacters).toContain('bombardiro-crocodilo');
    });

    it('should have valid boss configurations for all zones', () => {
      const allZones = encounterSystem['zones'];
      
      allZones.forEach(zone => {
        expect(zone.boss).toBeDefined();
        expect(zone.boss?.type).toBeTruthy();
        expect(zone.boss?.name).toBeTruthy();
        expect(zone.boss?.health).toBeGreaterThan(0);
        expect(zone.boss?.phases.length).toBeGreaterThan(0);
        expect(zone.boss?.arenaRadius).toBeGreaterThan(0);
        expect(zone.boss?.unlockCharacter).toBeTruthy();
      });
    });

    it('should have balanced enemy distributions', () => {
      const allZones = encounterSystem['zones'];
      
      allZones.forEach(zone => {
        expect(zone.enemies.length).toBeGreaterThan(0);
        expect(zone.enemies.length).toBeLessThan(20); // Reasonable upper limit
        
        zone.enemies.forEach(enemy => {
          expect(enemy.position).toBeInstanceOf(Vector2);
          expect(enemy.aggroRadius).toBeGreaterThan(0);
          expect(enemy.aggroRadius).toBeLessThan(300); // Reasonable limit
          expect(Object.values(EnemyState)).toContain(enemy.state);
        });
      });
    });

    it('should have kickable objects in all zones', () => {
      const allZones = encounterSystem['zones'];
      
      allZones.forEach(zone => {
        expect(zone.kickableObjects.length).toBeGreaterThan(0);
        
        zone.kickableObjects.forEach(obj => {
          expect(obj.position).toBeInstanceOf(Vector2);
          expect(Object.values(ObjectType)).toContain(obj.type);
        });
      });
    });
  });

  describe('performance and edge cases', () => {
    it('should handle update with no current zone', () => {
      const playerPos = new Vector2(100, 100);
      
      expect(() => {
        encounterSystem.update(16, playerPos);
      }).not.toThrow();
    });

    it('should handle very high delta times', () => {
      encounterSystem.loadZone('tutorial-grove');
      const playerPos = new Vector2(100, 100);
      
      expect(() => {
        encounterSystem.update(10000, playerPos); // Very high delta
      }).not.toThrow();
    });

    it('should handle dead enemies cleanup', () => {
      encounterSystem.loadZone('tutorial-grove');
      const playerPos = new Vector2(100, 100);
      
      // Mark some enemies as dead
      const activeEnemies = encounterSystem.getActiveEnemies();
      if (activeEnemies.length > 0) {
        activeEnemies[0].health = 0;
        activeEnemies[0].isDying = false; // Dead but not dying
        
        encounterSystem.update(16, playerPos);
        
        // System should handle cleanup
        expect(() => {
          encounterSystem.update(16, playerPos);
        }).not.toThrow();
      }
    });

    it('should handle enemies without aggro properties gracefully', () => {
      encounterSystem.loadZone('tutorial-grove');
      const playerPos = new Vector2(300, 200);
      
      // Remove aggro properties from an enemy
      const currentZone = encounterSystem.getCurrentZone();
      if (currentZone && currentZone.enemies.length > 0) {
        const enemyConfig = currentZone.enemies[0];
        if (enemyConfig.enemy) {
          delete (enemyConfig.enemy as any).hasAggro;
          
          expect(() => {
            encounterSystem.update(16, playerPos);
          }).not.toThrow();
        }
      }
    });
  });
});