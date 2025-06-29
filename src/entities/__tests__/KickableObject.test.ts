import { KickableObject, ObjectType, BreakEffect } from '../KickableObject';
import { Vector2 } from '../../utils/Vector2';

// Mock Phaser Scene and dependencies
const mockScene = {
  add: {
    sprite: jest.fn(() => ({
      setScale: jest.fn(),
      setDepth: jest.fn(),
      setTint: jest.fn(),
      setVisible: jest.fn(),
      setActive: jest.fn(),
      setPosition: jest.fn(),
      setRotation: jest.fn(),
      destroy: jest.fn(),
      x: 100,
      y: 100,
      width: 32,
      height: 32,
      rotation: 0,
      scene: {
        time: {
          delayedCall: jest.fn()
        },
        add: {
          graphics: jest.fn(() => ({
            setDepth: jest.fn(),
            setVisible: jest.fn(),
            clear: jest.fn(),
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            lineStyle: jest.fn(),
            strokeCircle: jest.fn(),
            lineBetween: jest.fn(),
            setAlpha: jest.fn(),
            destroy: jest.fn(),
            setPosition: jest.fn(),
            setRotation: jest.fn()
          }))
        },
        tweens: {
          add: jest.fn()
        }
      }
    })),
    graphics: jest.fn(() => ({
      setVisible: jest.fn(),
      setDepth: jest.fn(),
      clear: jest.fn(),
      fillStyle: jest.fn(),
      fillCircle: jest.fn(),
      lineStyle: jest.fn(),
      strokeCircle: jest.fn(),
      lineBetween: jest.fn(),
      setAlpha: jest.fn(),
      destroy: jest.fn(),
      setPosition: jest.fn(),
      setRotation: jest.fn()
    }))
  },
  tweens: {
    add: jest.fn()
  },
  time: {
    delayedCall: jest.fn()
  }
} as any;

describe('KickableObject', () => {
  let kickableObject: KickableObject;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('object creation and configuration', () => {
    it('should create barrel object with correct config', () => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      
      expect(kickableObject.config.type).toBe(ObjectType.BARREL);
      expect(kickableObject.config.weight).toBe(50);
      expect(kickableObject.config.health).toBe(30);
      expect(kickableObject.config.breakEffect).toBe(BreakEffect.EXPLODE);
      expect(kickableObject.config.damage).toBe(40);
      expect(kickableObject.health).toBe(30);
      expect(kickableObject.maxHealth).toBe(30);
    });

    it('should create box object with correct config', () => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BOX);
      
      expect(kickableObject.config.type).toBe(ObjectType.BOX);
      expect(kickableObject.config.weight).toBe(20);
      expect(kickableObject.config.health).toBe(15);
      expect(kickableObject.config.breakEffect).toBe(BreakEffect.SHATTER);
      expect(kickableObject.config.damage).toBe(25);
    });

    it('should create stone object with correct config', () => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.STONE);
      
      expect(kickableObject.config.type).toBe(ObjectType.STONE);
      expect(kickableObject.config.weight).toBe(80);
      expect(kickableObject.config.health).toBe(50);
      expect(kickableObject.config.breakEffect).toBe(BreakEffect.SHATTER);
      expect(kickableObject.config.damage).toBe(60);
    });

    it('should create log object with correct config', () => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.LOG);
      
      expect(kickableObject.config.type).toBe(ObjectType.LOG);
      expect(kickableObject.config.weight).toBe(70);
      expect(kickableObject.config.health).toBe(40);
      expect(kickableObject.config.breakEffect).toBe(BreakEffect.SPLINTER);
      expect(kickableObject.config.damage).toBe(45);
    });

    it('should initialize with correct default state', () => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      
      expect(kickableObject.isFlying).toBe(false);
      expect(kickableObject.isBroken).toBe(false);
      expect(kickableObject.velocity.x).toBe(0);
      expect(kickableObject.velocity.y).toBe(0);
      expect(kickableObject.rotationSpeed).toBe(0);
    });

    it('should create sprite and graphics objects', () => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      
      expect(mockScene.add.sprite).toHaveBeenCalled();
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });
  });

  describe('kick physics', () => {
    beforeEach(() => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
    });

    it('should apply kick force correctly', () => {
      kickableObject.applyKick(100, 50, 100);
      
      expect(kickableObject.isFlying).toBe(true);
      expect(kickableObject.velocity.x).toBeGreaterThan(0);
      expect(kickableObject.velocity.y).toBeGreaterThan(0);
      expect(kickableObject.rotationSpeed).toBeDefined();
    });

    it('should adjust kick force based on object weight', () => {
      const lightObject = new KickableObject(mockScene, 100, 200, ObjectType.BOX); // weight 20
      const heavyObject = new KickableObject(mockScene, 100, 200, ObjectType.STONE); // weight 80
      
      lightObject.applyKick(100, 0, 100);
      heavyObject.applyKick(100, 0, 100);
      
      // Lighter object should move faster
      expect(lightObject.velocity.x).toBeGreaterThan(heavyObject.velocity.x);
    });

    it('should adjust kick force based on character kick force', () => {
      const object1 = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      const object2 = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      
      object1.applyKick(100, 0, 50); // Low kick force
      object2.applyKick(100, 0, 150); // High kick force
      
      expect(object2.velocity.x).toBeGreaterThan(object1.velocity.x);
    });

    it('should not apply kick to broken objects', () => {
      kickableObject.isBroken = true;
      kickableObject.applyKick(100, 50, 100);
      
      expect(kickableObject.isFlying).toBe(false);
      expect(kickableObject.velocity.x).toBe(0);
      expect(kickableObject.velocity.y).toBe(0);
    });

    it('should provide visual feedback when kicked', () => {
      kickableObject.applyKick(100, 50, 100);
      
      expect(kickableObject.sprite.setTint).toHaveBeenCalledWith(0xFFFFFF);
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });
  });

  describe('enemy collision', () => {
    let mockEnemy: any;

    beforeEach(() => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      mockEnemy = {
        applyKnockback: jest.fn()
      };
    });

    it('should deal damage when hitting enemy while flying', () => {
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      
      const damage = kickableObject.hitEnemy(mockEnemy);
      
      expect(damage).toBe(kickableObject.config.damage);
      expect(kickableObject.health).toBeLessThan(kickableObject.maxHealth);
    });

    it('should not deal damage when not flying', () => {
      kickableObject.isFlying = false;
      
      const damage = kickableObject.hitEnemy(mockEnemy);
      
      expect(damage).toBe(0);
    });

    it('should not deal damage when broken', () => {
      kickableObject.isBroken = true;
      kickableObject.isFlying = true;
      
      const damage = kickableObject.hitEnemy(mockEnemy);
      
      expect(damage).toBe(0);
    });

    it('should apply knockback to enemy', () => {
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      
      kickableObject.hitEnemy(mockEnemy);
      
      expect(mockEnemy.applyKnockback).toHaveBeenCalledWith(50, 25); // Half velocity
    });

    it('should reduce velocity after impact', () => {
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      const originalVelocity = kickableObject.velocity.clone();
      
      kickableObject.hitEnemy(mockEnemy);
      
      expect(kickableObject.velocity.x).toBeLessThan(originalVelocity.x);
      expect(kickableObject.velocity.y).toBeLessThan(originalVelocity.y);
    });

    it('should stop flying when velocity becomes too low', () => {
      kickableObject.velocity.set(30, 20); // Low velocity
      kickableObject.isFlying = true;
      
      kickableObject.hitEnemy(mockEnemy);
      
      expect(kickableObject.isFlying).toBe(false);
      expect(kickableObject.velocity.x).toBe(0);
      expect(kickableObject.velocity.y).toBe(0);
    });

    it('should handle enemy without knockback method gracefully', () => {
      const enemyWithoutKnockback = {};
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      
      expect(() => kickableObject.hitEnemy(enemyWithoutKnockback)).not.toThrow();
    });
  });

  describe('damage and breaking', () => {
    beforeEach(() => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
    });

    it('should take damage correctly', () => {
      const initialHealth = kickableObject.health;
      kickableObject.takeDamage(10);
      
      expect(kickableObject.health).toBe(initialHealth - 10);
      expect(kickableObject.sprite.setTint).toHaveBeenCalledWith(0xFF6666);
    });

    it('should not take damage when already broken', () => {
      kickableObject.isBroken = true;
      const initialHealth = kickableObject.health;
      
      kickableObject.takeDamage(10);
      
      expect(kickableObject.health).toBe(initialHealth);
    });

    it('should break when health reaches zero', () => {
      kickableObject.health = 5;
      kickableObject.takeDamage(5);
      
      expect(kickableObject.isBroken).toBe(true);
      expect(kickableObject.isFlying).toBe(false);
      expect(kickableObject.sprite.setVisible).toHaveBeenCalledWith(false);
      expect(kickableObject.sprite.setActive).toHaveBeenCalledWith(false);
    });

    it('should not break multiple times', () => {
      kickableObject.health = 1;
      kickableObject.takeDamage(10); // First break
      
      const wasAlreadyBroken = kickableObject.isBroken;
      kickableObject.takeDamage(10); // Second break attempt
      
      expect(wasAlreadyBroken).toBe(true);
      expect(kickableObject.isBroken).toBe(true);
    });

    it('should create break effects based on object type', () => {
      const barrelObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      const boxObject = new KickableObject(mockScene, 100, 200, ObjectType.BOX);
      const stoneObject = new KickableObject(mockScene, 100, 200, ObjectType.STONE);
      const logObject = new KickableObject(mockScene, 100, 200, ObjectType.LOG);
      
      barrelObject.takeDamage(1000); // Break it
      boxObject.takeDamage(1000);
      stoneObject.takeDamage(1000);
      logObject.takeDamage(1000);
      
      // Should create different visual effects (tweens) for each type
      expect(mockScene.tweens.add).toHaveBeenCalledTimes(4);
    });
  });

  describe('physics update', () => {
    beforeEach(() => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
    });

    it('should not update when broken', () => {
      kickableObject.isBroken = true;
      const originalX = kickableObject.sprite.x;
      
      kickableObject.update(16);
      
      expect(kickableObject.sprite.x).toBe(originalX);
    });

    it('should update position when flying', () => {
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      const originalX = kickableObject.sprite.x;
      
      kickableObject.update(16);
      
      expect(kickableObject.sprite.x).not.toBe(originalX);
    });

    it('should apply rotation when flying', () => {
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      kickableObject.rotationSpeed = 0.1;
      const originalRotation = kickableObject.sprite.rotation;
      
      kickableObject.update(16);
      
      expect(kickableObject.sprite.rotation).not.toBe(originalRotation);
    });

    it('should apply velocity decay', () => {
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      const originalVelocityX = kickableObject.velocity.x;
      
      kickableObject.update(16);
      
      expect(kickableObject.velocity.x).toBeLessThan(originalVelocityX);
    });

    it('should stop flying when velocity becomes too low', () => {
      kickableObject.velocity.set(15, 10); // Below 20 threshold
      kickableObject.isFlying = true;
      
      kickableObject.update(16);
      
      expect(kickableObject.isFlying).toBe(false);
      expect(kickableObject.velocity.x).toBe(0);
      expect(kickableObject.velocity.y).toBe(0);
      expect(kickableObject.rotationSpeed).toBe(0);
    });

    it('should not update position when not flying', () => {
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = false;
      const originalX = kickableObject.sprite.x;
      
      kickableObject.update(16);
      
      expect(kickableObject.sprite.x).toBe(originalX);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      kickableObject = new KickableObject(mockScene, 150, 250, ObjectType.BARREL);
    });

    it('should return correct position getters', () => {
      expect(kickableObject.x).toBe(kickableObject.sprite.x);
      expect(kickableObject.y).toBe(kickableObject.sprite.y);
    });

    it('should return correct radius', () => {
      expect(kickableObject.radius).toBe(kickableObject.hitboxRadius);
      expect(kickableObject.radius).toBeGreaterThan(0);
    });
  });

  describe('reset functionality', () => {
    beforeEach(() => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
    });

    it('should reset object to initial state', () => {
      // Modify object state
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      kickableObject.isBroken = true;
      kickableObject.rotationSpeed = 0.5;
      kickableObject.sprite.rotation = 1.5;
      kickableObject.health = 10;
      
      kickableObject.reset();
      
      expect(kickableObject.velocity.x).toBe(0);
      expect(kickableObject.velocity.y).toBe(0);
      expect(kickableObject.isFlying).toBe(false);
      expect(kickableObject.isBroken).toBe(false);
      expect(kickableObject.rotationSpeed).toBe(0);
      expect(kickableObject.sprite.rotation).toBe(0);
      expect(kickableObject.health).toBe(kickableObject.maxHealth);
      expect(kickableObject.sprite.setVisible).toHaveBeenCalledWith(false);
      expect(kickableObject.sprite.setActive).toHaveBeenCalledWith(false);
    });
  });

  describe('destroy functionality', () => {
    beforeEach(() => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
    });

    it('should destroy sprite and graphics', () => {
      kickableObject.destroy();
      
      expect(kickableObject.sprite.destroy).toHaveBeenCalled();
    });
  });

  describe('object type configurations', () => {
    it('should have different weights for different object types', () => {
      const barrel = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      const box = new KickableObject(mockScene, 100, 200, ObjectType.BOX);
      const stone = new KickableObject(mockScene, 100, 200, ObjectType.STONE);
      const log = new KickableObject(mockScene, 100, 200, ObjectType.LOG);
      
      const weights = [barrel.weight, box.weight, stone.weight, log.weight];
      const uniqueWeights = new Set(weights);
      
      expect(uniqueWeights.size).toBe(4); // All different weights
      expect(box.weight).toBeLessThan(barrel.weight); // Box lighter than barrel
      expect(stone.weight).toBeGreaterThan(barrel.weight); // Stone heavier than barrel
    });

    it('should have different health values for different object types', () => {
      const barrel = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      const box = new KickableObject(mockScene, 100, 200, ObjectType.BOX);
      const stone = new KickableObject(mockScene, 100, 200, ObjectType.STONE);
      const log = new KickableObject(mockScene, 100, 200, ObjectType.LOG);
      
      expect(box.maxHealth).toBeLessThan(barrel.maxHealth);
      expect(stone.maxHealth).toBeGreaterThan(barrel.maxHealth);
      expect(log.maxHealth).toBeGreaterThan(box.maxHealth);
    });

    it('should have different break effects for different object types', () => {
      const barrel = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
      const box = new KickableObject(mockScene, 100, 200, ObjectType.BOX);
      const stone = new KickableObject(mockScene, 100, 200, ObjectType.STONE);
      const log = new KickableObject(mockScene, 100, 200, ObjectType.LOG);
      
      expect(barrel.config.breakEffect).toBe(BreakEffect.EXPLODE);
      expect(box.config.breakEffect).toBe(BreakEffect.SHATTER);
      expect(stone.config.breakEffect).toBe(BreakEffect.SHATTER);
      expect(log.config.breakEffect).toBe(BreakEffect.SPLINTER);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      kickableObject = new KickableObject(mockScene, 100, 200, ObjectType.BARREL);
    });

    it('should handle zero kick force', () => {
      kickableObject.applyKick(0, 0, 100);
      
      expect(kickableObject.velocity.x).toBe(0);
      expect(kickableObject.velocity.y).toBe(0);
      expect(kickableObject.isFlying).toBe(true); // Still set to flying
    });

    it('should handle negative kick force', () => {
      kickableObject.applyKick(-100, -50, 100);
      
      expect(kickableObject.velocity.x).toBeLessThan(0);
      expect(kickableObject.velocity.y).toBeLessThan(0);
      expect(kickableObject.isFlying).toBe(true);
    });

    it('should handle zero character kick force', () => {
      kickableObject.applyKick(100, 50, 0);
      
      expect(kickableObject.velocity.x).toBe(0);
      expect(kickableObject.velocity.y).toBe(0);
    });

    it('should handle massive damage', () => {
      kickableObject.takeDamage(10000);
      
      expect(kickableObject.health).toBeLessThanOrEqual(0);
      expect(kickableObject.isBroken).toBe(true);
    });

    it('should handle very high delta time in update', () => {
      kickableObject.velocity.set(100, 50);
      kickableObject.isFlying = true;
      
      expect(() => kickableObject.update(10000)).not.toThrow();
    });
  });
});