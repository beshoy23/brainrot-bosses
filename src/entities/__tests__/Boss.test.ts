import { Boss, BossAttack, MovementPattern } from '../Boss';
import { Vector2 } from '../../utils/Vector2';
import { BossConfig } from '../../systems/EncounterSystem';
import { ENEMY_TYPES } from '../../config/enemyTypes';

// Mock Phaser Scene and dependencies
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      setDepth: jest.fn(),
      setVisible: jest.fn(),
      clear: jest.fn(),
      lineStyle: jest.fn(),
      strokeCircle: jest.fn(),
      fillStyle: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      lineBetween: jest.fn(),
      destroy: jest.fn(),
      setAlpha: jest.fn()
    })),
    text: jest.fn(() => ({
      setDepth: jest.fn(),
      setOrigin: jest.fn(),
      setPosition: jest.fn(),
      destroy: jest.fn()
    })),
    sprite: jest.fn(() => ({
      setScale: jest.fn(),
      setTint: jest.fn(),
      x: 100,
      y: 100,
      active: true
    }))
  },
  cameras: {
    main: {
      worldView: {
        centerX: 400,
        top: 0
      }
    }
  },
  time: {
    delayedCall: jest.fn()
  },
  tweens: {
    add: jest.fn()
  }
} as any;

describe('Boss', () => {
  let boss: Boss;
  let mockBossConfig: BossConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    mockBossConfig = {
      type: 'test-boss',
      name: 'Test Boss',
      position: new Vector2(500, 400),
      health: 1000,
      arenaRadius: 200,
      unlockCharacter: 'test-character',
      phases: [
        {
          healthThreshold: 1.0,
          abilities: ['summon-swarm'],
          movementPattern: 'circle'
        },
        {
          healthThreshold: 0.5,
          abilities: ['summon-swarm', 'charge-attack'],
          movementPattern: 'aggressive'
        },
        {
          healthThreshold: 0.2,
          abilities: ['mega-bomb'],
          movementPattern: 'berserker'
        }
      ]
    };

    boss = new Boss(mockScene, mockBossConfig);
  });

  describe('constructor', () => {
    it('should initialize boss with provided config', () => {
      expect(boss.bossConfig).toBe(mockBossConfig);
      expect(boss.arenaCenter.x).toBe(500);
      expect(boss.arenaCenter.y).toBe(400);
      expect(boss.arenaRadius).toBe(200);
      expect(boss.currentPhase).toBe(0);
    });

    it('should create boss UI elements', () => {
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(3); // healthBarBg, healthBarFill, phaseTransitionEffect, attackWarning
      expect(mockScene.add.text).toHaveBeenCalledWith(
        0, 0, 'Test Boss',
        expect.objectContaining({
          fontSize: '24px',
          fill: '#ffffff'
        })
      );
    });
  });

  describe('spawn', () => {
    it('should spawn boss with correct health and properties', () => {
      const enemyType = ENEMY_TYPES.elite;
      boss.spawn(100, 200, enemyType);

      expect(boss.health).toBe(1000);
      expect(boss.maxHealth).toBe(1000);
      expect(boss.hitboxRadius).toBe(40);
      expect(boss.currentPhase).toBe(0);
    });
  });

  describe('phase transitions', () => {
    beforeEach(() => {
      boss.spawn(100, 200, ENEMY_TYPES.elite);
    });

    it('should transition to phase 2 when health drops to 50%', () => {
      boss.health = 500; // 50% health
      
      const originalPhase = boss.currentPhase;
      boss['checkPhaseTransition']();
      
      expect(boss.currentPhase).toBe(originalPhase + 1);
    });

    it('should transition to phase 3 when health drops to 20%', () => {
      boss.health = 200; // 20% health
      boss.currentPhase = 1; // Already in phase 2
      
      boss['checkPhaseTransition']();
      
      expect(boss.currentPhase).toBe(2);
    });

    it('should not transition beyond last phase', () => {
      boss.health = 50; // 5% health
      boss.currentPhase = 2; // Already in last phase
      
      boss['checkPhaseTransition']();
      
      expect(boss.currentPhase).toBe(2); // Should stay at 2
    });

    it('should modify boss properties during phase transitions', () => {
      const originalSpeed = boss.speed;
      const originalCooldown = boss.attackCooldown;
      
      // Test berserker phase transition
      boss.currentPhase = 1;
      boss['enterNextPhase'](); // Should go to berserker phase
      
      expect(boss.speed).toBe(originalSpeed * 1.5);
      
      // Test frenzy phase (if it existed in config)
      boss.bossConfig.phases[2].movementPattern = 'frenzy';
      boss.currentPhase = 1;
      boss['enterNextPhase']();
      
      expect(boss.attackCooldown).toBe(originalCooldown * 0.5);
    });
  });

  describe('movement patterns', () => {
    let playerPos: Vector2;

    beforeEach(() => {
      boss.spawn(500, 400, ENEMY_TYPES.elite);
      playerPos = new Vector2(300, 300);
    });

    it('should handle stationary movement', () => {
      boss.bossConfig.phases[0].movementPattern = 'stationary';
      const originalX = boss.sprite.x;
      const originalY = boss.sprite.y;
      
      boss['updateBossMovement'](16, playerPos);
      
      expect(boss.sprite.x).toBe(originalX);
      expect(boss.sprite.y).toBe(originalY);
    });

    it('should handle circle movement pattern', () => {
      boss.bossConfig.phases[0].movementPattern = 'circle';
      boss.circleAngle = 0;
      
      boss['updateBossMovement'](16, playerPos);
      
      expect(boss.circleAngle).toBeGreaterThan(0);
    });

    it('should handle chase movement pattern', () => {
      boss.bossConfig.phases[0].movementPattern = 'chase';
      boss.sprite.x = 600;
      boss.sprite.y = 500;
      
      const originalX = boss.sprite.x;
      boss['updateBossMovement'](16, playerPos);
      
      // Should move toward player if distance > 60
      expect(boss.sprite.x).not.toBe(originalX);
    });

    it('should handle aggressive movement pattern', () => {
      boss.bossConfig.phases[0].movementPattern = 'aggressive';
      boss.sprite.x = 600;
      boss.sprite.y = 500;
      
      const originalX = boss.sprite.x;
      boss['updateBossMovement'](16, playerPos);
      
      // Should move toward player with increased speed
      expect(boss.sprite.x).not.toBe(originalX);
    });

    it('should handle swimming movement pattern', () => {
      boss.bossConfig.phases[0].movementPattern = 'swimming';
      boss.swimDirection = new Vector2(1, 0);
      
      const originalX = boss.sprite.x;
      boss['updateBossMovement'](16, playerPos);
      
      expect(boss.sprite.x).toBeGreaterThan(originalX);
    });

    it('should handle frenzy movement pattern', () => {
      boss.bossConfig.phases[0].movementPattern = 'frenzy';
      boss.sprite.x = 600;
      boss.sprite.y = 500;
      
      const originalX = boss.sprite.x;
      boss['updateBossMovement'](16, playerPos);
      
      expect(boss.sprite.x).not.toBe(originalX);
    });
  });

  describe('attack system', () => {
    let playerPos: Vector2;

    beforeEach(() => {
      boss.spawn(500, 400, ENEMY_TYPES.elite);
      playerPos = new Vector2(300, 300);
      boss.lastAttackTime = 0; // Allow immediate attacks
    });

    it('should execute attacks when cooldown is ready', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      boss['updateBossAttacks'](16, playerPos);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Boss executing attack:')
      );
      
      consoleSpy.mockRestore();
    });

    it('should respect attack cooldown', () => {
      boss.lastAttackTime = Date.now(); // Just attacked
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      boss['updateBossAttacks'](16, playerPos);
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Boss executing attack:')
      );
      
      consoleSpy.mockRestore();
    });

    it('should choose attacks from current phase abilities', () => {
      boss.currentPhase = 1; // Phase with summon-swarm and charge-attack
      boss.lastAttackTime = 0;
      
      const executeAttackSpy = jest.spyOn(boss as any, 'executeAttack');
      boss['updateBossAttacks'](16, playerPos);
      
      const calledAttack = executeAttackSpy.mock.calls[0][0];
      expect(['summon-swarm', 'charge-attack']).toContain(calledAttack);
    });
  });

  describe('specific attacks', () => {
    let playerPos: Vector2;

    beforeEach(() => {
      boss.spawn(500, 400, ENEMY_TYPES.elite);
      playerPos = new Vector2(300, 300);
    });

    it('should execute summon swarm attack', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      boss['executeSummonSwarm']();
      
      expect(consoleSpy).toHaveBeenCalledWith('Boss summons swarm enemies!');
      consoleSpy.mockRestore();
    });

    it('should execute charge attack with warning', () => {
      boss['executeChargeAttack'](playerPos);
      
      expect(boss.chargeTarget).toEqual(playerPos);
      expect(boss.isCharging).toBe(true);
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });

    it('should execute bomb barrage with multiple bombs', () => {
      boss['executeBombBarrage'](playerPos);
      
      expect(mockScene.time.delayedCall).toHaveBeenCalledTimes(5); // 5 bombs
    });

    it('should execute mega bomb with warning', () => {
      boss['executeMegaBomb'](playerPos);
      
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });

    it('should execute triple dash attack', () => {
      boss['executeTripleDash'](playerPos);
      
      expect(mockScene.time.delayedCall).toHaveBeenCalledTimes(3); // 3 dashes
    });
  });

  describe('visual effects', () => {
    beforeEach(() => {
      boss.spawn(500, 400, ENEMY_TYPES.elite);
    });

    it('should show attack warnings', () => {
      const mockWarning = {
        setVisible: jest.fn(),
        clear: jest.fn(),
        lineStyle: jest.fn(),
        lineBetween: jest.fn()
      };
      boss['attackWarning'] = mockWarning as any;
      
      boss['showAttackWarning'](100, 100, 200, 200);
      
      expect(mockWarning.setVisible).toHaveBeenCalledWith(true);
      expect(mockWarning.lineBetween).toHaveBeenCalledWith(100, 100, 200, 200);
    });

    it('should show explosion warnings', () => {
      boss['showExplosionWarning'](300, 300, 60);
      
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should update boss UI with health bar', () => {
      boss.health = 500; // 50% health
      const mockHealthBar = {
        clear: jest.fn(),
        fillStyle: jest.fn(),
        fillRect: jest.fn(),
        lineStyle: jest.fn(),
        strokeRect: jest.fn()
      };
      boss['healthBarBg'] = mockHealthBar as any;
      boss['healthBarFill'] = mockHealthBar as any;
      boss['nameText'] = { setPosition: jest.fn() } as any;
      
      boss['updateBossUI']();
      
      expect(mockHealthBar.clear).toHaveBeenCalled();
      expect(mockHealthBar.fillRect).toHaveBeenCalled();
    });
  });

  describe('damage and defeat', () => {
    beforeEach(() => {
      boss.spawn(500, 400, ENEMY_TYPES.elite);
    });

    it('should handle damage correctly', () => {
      const initialHealth = boss.health;
      boss.takeDamage(100);
      
      expect(boss.health).toBe(initialHealth - 100);
    });

    it('should trigger defeat when health reaches 0', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      boss.health = 1;
      
      boss.takeDamage(1);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Boss Test Boss defeated!')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      boss.spawn(500, 400, ENEMY_TYPES.elite);
      boss.currentPhase = 2;
      boss.isCharging = true;
      boss.chargeTarget = new Vector2(100, 100);
    });

    it('should reset boss to initial state', () => {
      boss.reset();
      
      expect(boss.currentPhase).toBe(0);
      expect(boss.isCharging).toBe(false);
      expect(boss.chargeTarget).toBeNull();
      expect(boss.lastAttackTime).toBe(0);
      expect(boss.attackCooldown).toBe(2000);
    });
  });

  describe('edge cases', () => {
    it('should handle missing UI elements gracefully', () => {
      boss['healthBarBg'] = undefined;
      boss['healthBarFill'] = undefined;
      boss['nameText'] = undefined;
      
      expect(() => boss['updateBossUI']()).not.toThrow();
    });

    it('should handle empty abilities array', () => {
      boss.spawn(500, 400, ENEMY_TYPES.elite);
      boss.bossConfig.phases[0].abilities = [];
      boss.lastAttackTime = 0;
      
      expect(() => boss['updateBossAttacks'](16, new Vector2(300, 300))).not.toThrow();
    });

    it('should handle invalid movement patterns gracefully', () => {
      boss.spawn(500, 400, ENEMY_TYPES.elite);
      boss.bossConfig.phases[0].movementPattern = 'invalid' as any;
      
      expect(() => boss['updateBossMovement'](16, new Vector2(300, 300))).not.toThrow();
    });

    it('should handle very high delta times', () => {
      boss.spawn(500, 400, ENEMY_TYPES.elite);
      
      expect(() => boss['updateBossMovement'](10000, new Vector2(300, 300))).not.toThrow();
    });
  });
});