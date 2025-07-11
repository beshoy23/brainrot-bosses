import { GameConfig } from '../config/game';
import { WeaponType } from '../weapons/WeaponFactory';

interface WeaponStats {
  name: string;
  baseDPS: number;
  maxDPS: number;
  coverage: number; // Area effectiveness 0-1
  reliability: number; // Hit chance 0-1
  versatility: number; // Good against various enemies 0-1
  powerScore: number; // Overall effectiveness
}

export class WeaponBalanceAnalyzer {
  
  // Analyze a weapon's effectiveness
  static analyzeWeapon(
    weaponType: WeaponType,
    upgradeLevel: { damage: number; fireRate: number; projectileCount: number } = { damage: 0, fireRate: 0, projectileCount: 0 }
  ): WeaponStats {
    const baseWeapon = GameConfig.weapons.basic;
    
    // Apply upgrades
    const damageMultiplier = 1 + upgradeLevel.damage * 0.25;
    const fireRateMultiplier = 1 + upgradeLevel.fireRate * 0.2;
    const projectileBonus = upgradeLevel.projectileCount;
    
    let stats: WeaponStats;
    
    switch (weaponType) {
      case WeaponType.BRATTACK:
        stats = {
          name: 'Basic Kick (Br Attack)',
          baseDPS: baseWeapon.damage * baseWeapon.fireRate,
          maxDPS: baseWeapon.damage * damageMultiplier * baseWeapon.fireRate * fireRateMultiplier,
          coverage: 0.25, // Close range kick
          reliability: 0.9, // Very reliable
          versatility: 0.8, // Good all-around kick
          powerScore: 0
        };
        break;
        
      case WeaponType.UPPERCUT:
        stats = {
          name: 'Uppercut Technique',
          baseDPS: baseWeapon.damage * baseWeapon.fireRate,
          maxDPS: baseWeapon.damage * damageMultiplier * baseWeapon.fireRate * fireRateMultiplier,
          coverage: 0.15, // Single target focus
          reliability: 0.95, // Very accurate
          versatility: 0.7, // Limited to single targets
          powerScore: 0
        };
        break;
        
      case WeaponType.SPINNING_KICK:
        stats = {
          name: 'Spinning Kick',
          baseDPS: baseWeapon.damage * baseWeapon.fireRate * 3, // Hits multiple enemies
          maxDPS: baseWeapon.damage * damageMultiplier * baseWeapon.fireRate * fireRateMultiplier * 3,
          coverage: 0.8, // 360 degree coverage
          reliability: 0.9, // Very reliable area attack
          versatility: 0.9, // Excellent for crowds
          powerScore: 0
        };
        break;
        
      case WeaponType.GROUND_POUND:
        stats = {
          name: 'Ground Pound',
          baseDPS: baseWeapon.damage * baseWeapon.fireRate * 2.5, // Shockwave hits multiple
          maxDPS: baseWeapon.damage * damageMultiplier * baseWeapon.fireRate * fireRateMultiplier * 2.5,
          coverage: 0.7, // Large shockwave area
          reliability: 0.85, // Good reliability
          versatility: 0.85, // Good for crowds and positioning
          powerScore: 0
        };
        break;
        
      default:
        stats = this.analyzeWeapon(WeaponType.BRATTACK, upgradeLevel);
    }
    
    // Calculate power score
    stats.powerScore = (
      stats.maxDPS * 0.4 +
      stats.coverage * 200 * 0.3 +
      stats.reliability * 100 * 0.2 +
      stats.versatility * 100 * 0.1
    );
    
    return stats;
  }
  
  // Compare all weapons
  static compareWeapons(upgradeLevel: { damage: number; fireRate: number; projectileCount: number }): string {
    const report: string[] = ['=== WEAPON COMPARISON ===\n'];
    
    const weapons = [
      WeaponType.BRATTACK,
      WeaponType.UPPERCUT,
      WeaponType.SPINNING_KICK,
      WeaponType.GROUND_POUND
    ];
    
    const analyses = weapons.map(type => this.analyzeWeapon(type, upgradeLevel));
    
    // Sort by power score
    analyses.sort((a, b) => b.powerScore - a.powerScore);
    
    report.push(`Upgrade Levels - Damage: ${upgradeLevel.damage}, Fire Rate: ${upgradeLevel.fireRate}, Multi-shot: ${upgradeLevel.projectileCount}\n`);
    
    analyses.forEach((weapon, index) => {
      report.push(`${index + 1}. ${weapon.name}`);
      report.push(`   Base DPS: ${weapon.baseDPS.toFixed(1)}`);
      report.push(`   Max DPS: ${weapon.maxDPS.toFixed(1)}`);
      report.push(`   Coverage: ${(weapon.coverage * 100).toFixed(0)}%`);
      report.push(`   Reliability: ${(weapon.reliability * 100).toFixed(0)}%`);
      report.push(`   Versatility: ${(weapon.versatility * 100).toFixed(0)}%`);
      report.push(`   Power Score: ${weapon.powerScore.toFixed(1)}\n`);
    });
    
    return report.join('\n');
  }
  
  // Calculate optimal DPS for game progression
  static calculateRequiredDPS(survivalTime: number): {
    minDPS: number;
    recommendedDPS: number;
    comfortableDPS: number;
  } {
    // Based on enemy health and spawn rates
    const basicEnemyHealth = 10;
    const spawnRate = this.getSpawnRateAtTime(survivalTime);
    const enemiesPerSecond = 1000 / spawnRate;
    
    // Account for enemy variety
    const avgEnemyHealth = survivalTime < 60 ? basicEnemyHealth :
                           survivalTime < 180 ? basicEnemyHealth * 1.5 :
                           basicEnemyHealth * 2.5;
    
    // Minimum DPS to barely keep up
    const minDPS = enemiesPerSecond * avgEnemyHealth;
    
    // Recommended for comfortable play
    const recommendedDPS = minDPS * 1.5;
    
    // Comfortable with room for error
    const comfortableDPS = minDPS * 2;
    
    return {
      minDPS: Math.floor(minDPS),
      recommendedDPS: Math.floor(recommendedDPS),
      comfortableDPS: Math.floor(comfortableDPS)
    };
  }
  
  private static getSpawnRateAtTime(seconds: number): number {
    let rate = GameConfig.spawning.baseSpawnRate;
    let time = 0;
    
    while (time < seconds * 1000) {
      time += rate;
      rate = Math.max(
        GameConfig.spawning.minSpawnRate,
        rate * GameConfig.spawning.spawnAcceleration
      );
    }
    
    return rate;
  }
  
  // Weapon progression recommendations
  static getWeaponProgressionGuide(): string {
    const report: string[] = ['=== WEAPON PROGRESSION GUIDE ===\n'];
    
    const timePoints = [
      { time: 0, name: 'Start' },
      { time: 60, name: '1 minute' },
      { time: 180, name: '3 minutes' },
      { time: 300, name: '5 minutes' },
      { time: 600, name: '10 minutes' }
    ];
    
    timePoints.forEach(point => {
      const required = this.calculateRequiredDPS(point.time);
      report.push(`\n${point.name} (${point.time}s):`);
      report.push(`  Minimum DPS needed: ${required.minDPS}`);
      report.push(`  Recommended DPS: ${required.recommendedDPS}`);
      report.push(`  Comfortable DPS: ${required.comfortableDPS}`);
      
      // Suggest upgrade levels
      const upgradesNeeded = this.calculateUpgradesForDPS(required.recommendedDPS);
      report.push(`  Suggested upgrades:`);
      report.push(`    Damage: Level ${upgradesNeeded.damage}`);
      report.push(`    Fire Rate: Level ${upgradesNeeded.fireRate}`);
      report.push(`    Multi-shot: Level ${upgradesNeeded.projectileCount}`);
    });
    
    return report.join('\n');
  }
  
  // Calculate upgrade levels needed for target DPS
  private static calculateUpgradesForDPS(targetDPS: number): {
    damage: number;
    fireRate: number;
    projectileCount: number;
  } {
    const baseDPS = GameConfig.weapons.basic.damage * GameConfig.weapons.basic.fireRate;
    const multiplierNeeded = targetDPS / baseDPS;
    
    // Distribute upgrades efficiently
    let damage = 0;
    let fireRate = 0;
    let projectileCount = 0;
    let currentMultiplier = 1;
    
    while (currentMultiplier < multiplierNeeded) {
      // Prioritize damage first (most efficient)
      if (damage < 10 && currentMultiplier < multiplierNeeded) {
        damage++;
        currentMultiplier = (1 + damage * 0.25) * (1 + fireRate * 0.2) * (1 + projectileCount);
      }
      
      // Then fire rate
      if (fireRate < 5 && currentMultiplier < multiplierNeeded) {
        fireRate++;
        currentMultiplier = (1 + damage * 0.25) * (1 + fireRate * 0.2) * (1 + projectileCount);
      }
      
      // Then projectiles
      if (projectileCount < 3 && currentMultiplier < multiplierNeeded) {
        projectileCount++;
        currentMultiplier = (1 + damage * 0.25) * (1 + fireRate * 0.2) * (1 + projectileCount);
      }
      
      // Break if we can't upgrade anymore
      if (damage >= 10 && fireRate >= 5 && projectileCount >= 3) break;
    }
    
    return { damage, fireRate, projectileCount };
  }
}