// 游戏核心类
class AngelGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();

        // 游戏状态
        this.gameState = 'start'; // 'start', 'playing', 'paused', 'gameOver'
        this.score = 0;
        this.lives = 3;
        this.maxLives = 50;
        this.gameTime = 0;

        // 图片资源
        this.wingsImage = null;
        this.heroImage = null;
        this.maxImage = null;
        this.loadImages();

        // 玩家设置
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 80,
            width: 40,
            height: 50,
            speed: 8,
            invulnerable: false,
            invulnerableTime: 0
        };

        // 游戏对象数组
        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.specialDrops = []; // MAX特殊道具
        this.particles = [];
        this.boss = null; // Boss对象

        // 游戏设置
        this.enemySpawnRate = 2000; // 初始敌人生成间隔（毫秒）
        this.powerupSpawnRate = 4000; // 道具生成间隔
        this.lastEnemySpawn = 0;
        this.lastPowerupSpawn = 0;
        this.lastBossSpawn = 0; // Boss生成时间
        this.bossSpecialMode = false; // Boss特殊模式（MAX频率增加）
        this.bossSpecialModeEnd = 0; // Boss特殊模式结束时间

        // 触摸控制
        this.touchX = null;
        this.isTouching = false;

        this.setupEventListeners();
        this.gameLoop();
    }

    setupCanvas() {
        // 设置画布尺寸
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;

        // 窗口大小改变时重新设置
        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height - 80;
        });
    }

    loadImages() {
        // 加载翅膀图片
        this.wingsImage = new Image();
        this.wingsImage.src = 'wings.png';

        // 加载主角头像
        this.heroImage = new Image();
        this.heroImage.src = 'hero.jpg';

        // 加载MAX特殊道具
        this.maxImage = new Image();
        this.maxImage.src = 'MAX.jpg';
    }

    setupEventListeners() {
        // 开始按钮
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });

        // 暂停按钮
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseGame();
        });

        // 继续按钮
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });

        // 重新开始按钮
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('restartBtn2').addEventListener('click', () => {
            this.restartGame();
        });

        // 射击按钮
        document.getElementById('shootBtn').addEventListener('click', () => {
            this.shoot();
        });

        // 触摸控制
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.touchX = touch.clientX - rect.left;
            this.isTouching = true;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isTouching && this.gameState === 'playing') {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                this.touchX = touch.clientX - rect.left;
                this.updatePlayerPosition();
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isTouching = false;
            this.touchX = null;
        });

        // 键盘控制（用于调试）
        document.addEventListener('keydown', (e) => {
            if (this.gameState !== 'playing') return;

            switch(e.key) {
                case 'ArrowLeft':
                    this.player.x = Math.max(this.player.width/2, this.player.x - this.player.speed);
                    break;
                case 'ArrowRight':
                    this.player.x = Math.min(this.canvas.width - this.player.width/2, this.player.x + this.player.speed);
                    break;
                case ' ':
                    e.preventDefault();
                    this.shoot();
                    break;
                case 'p':
                    this.pauseGame();
                    break;
            }
        });
    }

    updatePlayerPosition() {
        if (this.touchX !== null) {
            this.player.x = Math.max(this.player.width/2,
                Math.min(this.canvas.width - this.player.width/2, this.touchX));
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.gameTime = 0;
        this.enemySpawnRate = 2000;
        this.lastEnemySpawn = Date.now();
        this.lastPowerupSpawn = Date.now();

        // 清空游戏对象
        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.specialDrops = [];
        this.particles = [];

        // 重置玩家位置
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 80;
        this.player.invulnerable = false;
        this.player.invulnerableTime = 0;

        // 切换界面
        this.showScreen('gameScreen');
        this.updateUI();
    }

    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showScreen('pauseScreen');
        }
    }

    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.showScreen('gameScreen');
        }
    }

    restartGame() {
        this.showScreen('startScreen');
        this.gameState = 'start';
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
    }

    shoot() {
        if (this.gameState !== 'playing') return;

        // 弹道数量：最多左右对称1个（总共3个）
        const bulletCount = Math.min(3, 1 + Math.floor(this.lives / 5) * 2);

        if (bulletCount === 1) {
            // 单弹道
            this.bullets.push({
                x: this.player.x,
                y: this.player.y - this.player.height/2,
                width: 6,
                height: 15,
                speed: 12
            });
        } else {
            // 最多3个弹道（对称分布）
            for (let i = 0; i < bulletCount; i++) {
                const offset = (i - 1) * 15; // -15, 0, 15 的偏移
                this.bullets.push({
                    x: this.player.x + offset,
                    y: this.player.y - this.player.height/2,
                    width: 6,
                    height: 15,
                    speed: 12
                });
            }
        }
    }

    spawnEnemy() {
        const now = Date.now();

        // 动态计算敌人生成间隔（基于游戏时间）
        const difficultyLevel = Math.floor(this.gameTime / 10000); // 每10秒增加一个难度等级
        const baseSpawnRate = 2000;
        const minSpawnRate = 500;
        const currentSpawnRate = Math.max(minSpawnRate, baseSpawnRate - difficultyLevel * 150);

        if (now - this.lastEnemySpawn > currentSpawnRate) {
            // 根据难度生成多个敌人
            const enemyCount = 1 + Math.floor(difficultyLevel / 2);

            for (let i = 0; i < enemyCount; i++) {
                // 根据难度决定敌人类型
                let enemyType = 'normal';
                if (difficultyLevel >= 2 && Math.random() < 0.3) {
                    enemyType = 'tracking'; // 追踪型
                } else if (difficultyLevel >= 4 && Math.random() < 0.2) {
                    enemyType = 'rush'; // 突袭型
                }

                const enemy = {
                    x: Math.random() * (this.canvas.width - 30) + 15,
                    y: -30 - i * 40, // 错开位置
                    width: 30,
                    height: 30,
                    speed: 1.5 + Math.random() * 2 + difficultyLevel * 0.3, // 速度随难度增加
                    health: 1 + Math.floor(difficultyLevel / 3), // 每3级增加1点血量
                    maxHealth: 1 + Math.floor(difficultyLevel / 3),
                    type: enemyType
                };

                // 突袭型敌人特殊属性
                if (enemyType === 'rush') {
                    enemy.baseSpeed = enemy.speed;
                    enemy.rushSpeed = enemy.speed * 3; // 突袭速度是基础速度3倍
                    enemy.rushMode = false;
                    enemy.rushCooldown = 0;
                }

                this.enemies.push(enemy);
            }

            this.lastEnemySpawn = now;
        }
    }

    spawnPowerup() {
        const now = Date.now();

        // 动态调整道具生成频率（难度越高，道具越少）
        const difficultyLevel = Math.floor(this.gameTime / 10000);
        const basePowerupRate = 4000;
        const currentPowerupRate = Math.max(2000, basePowerupRate + difficultyLevel * 500);

        if (now - this.lastPowerupSpawn > currentPowerupRate) {
            this.powerups.push({
                x: Math.random() * (this.canvas.width - 20) + 10,
                y: -20,
                width: 20,
                height: 20,
                speed: 1.5
            });
            this.lastPowerupSpawn = now;
        }

        // 生成MAX特殊道具（频率很低，且随难度调整）
        let baseSpecialRate = 15000;
        let currentSpecialRate = Math.max(10000, baseSpecialRate + difficultyLevel * 1000);

        // Boss特殊模式下，MAX生成频率增加10倍
        if (this.bossSpecialMode) {
            currentSpecialRate = Math.max(1000, currentSpecialRate / 10);
        }

        if (now - (this.lastSpecialDrop || 0) > currentSpecialRate) {
            this.specialDrops.push({
                x: Math.random() * (this.canvas.width - 60) + 30,
                y: -50,
                width: 50,
                height: 50,
                speed: 5, // 速度
                type: 'max'
            });
            this.lastSpecialDrop = now;
        }
    }

    spawnBoss() {
        // 动态调整Boss生成频率（基于难度）
        const difficultyLevel = Math.floor(this.gameTime / 10000); // 每10秒增加一个难度等级
        const baseScoreInterval = 500;
        const minScoreInterval = 100; // 最小间隔
        const currentScoreInterval = Math.max(minScoreInterval, baseScoreInterval - difficultyLevel * 50);

        // 检查是否达到新的Boss生成阈值
        const currentBossCount = Math.floor(this.score / currentScoreInterval);
        const spawnedBossCount = this.lastBossSpawn ? Math.floor(this.lastBossSpawn / currentScoreInterval) : 0;

        if (this.score >= currentScoreInterval && currentBossCount > spawnedBossCount && !this.boss) {
            // Boss血量随难度增加
            const baseBossHealth = 200;
            const healthIncrease = difficultyLevel * 50; // 每级增加50点血量
            const bossHealth = baseBossHealth + healthIncrease;

            this.boss = {
                x: this.canvas.width / 2,
                y: -150,
                width: 120,
                height: 120,
                speed: 0.3,
                health: bossHealth,
                maxHealth: bossHealth,
                spawnScore: this.score
            };
            this.lastBossSpawn = this.score; // 记录当前分数，不是时间
        }
    }

    updateGame() {
        if (this.gameState !== 'playing') return;

        this.gameTime += 16; // 约60FPS

        // 更新玩家无敌时间
        if (this.player.invulnerable) {
            this.player.invulnerableTime -= 16;
            if (this.player.invulnerableTime <= 0) {
                this.player.invulnerable = false;
            }
        }

        // 生成敌人和道具
        this.spawnEnemy();
        this.spawnPowerup();
        this.spawnBoss();

        // 更新Boss特殊模式
        if (this.bossSpecialMode && Date.now() > this.bossSpecialModeEnd) {
            this.bossSpecialMode = false;
        }

        // 更新子弹
        this.bullets.forEach((bullet, index) => {
            bullet.y -= bullet.speed;
            if (bullet.y < -bullet.height) {
                this.bullets.splice(index, 1);
            }
        });

        // 更新敌人
        this.enemies.forEach((enemy, index) => {
            // 根据敌人类型更新移动逻辑
            if (enemy.type === 'tracking') {
                // 追踪型：朝玩家方向移动
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    const moveX = (dx / distance) * enemy.speed * 0.7; // 水平追踪
                    const moveY = (dy / distance) * enemy.speed * 0.7 + enemy.speed * 0.3; // 垂直下降+追踪
                    enemy.x += moveX;
                    enemy.y += moveY;
                }
            } else if (enemy.type === 'rush') {
                // 突袭型：间歇性加速
                enemy.rushCooldown--;

                if (!enemy.rushMode && enemy.rushCooldown <= 0) {
                    // 开始突袭
                    enemy.rushMode = true;
                    enemy.rushCooldown = 120; // 突袭持续2秒（60FPS）
                } else if (enemy.rushMode && enemy.rushCooldown <= 0) {
                    // 结束突袭
                    enemy.rushMode = false;
                    enemy.rushCooldown = 180; // 冷却3秒
                }

                // 应用速度
                const currentSpeed = enemy.rushMode ? enemy.rushSpeed : enemy.baseSpeed;
                enemy.y += currentSpeed;
            } else {
                // 普通型：直线下降
                enemy.y += enemy.speed;
            }

            // 检查敌人是否超出屏幕
            if (enemy.y > this.canvas.height + enemy.height ||
                enemy.x < -enemy.width || enemy.x > this.canvas.width + enemy.width) {
                this.enemies.splice(index, 1);
                return;
            }

            // 检查与玩家的碰撞
            if (!this.player.invulnerable && this.checkCollision(this.player, enemy)) {
                this.takeDamage();
                this.enemies.splice(index, 1);
            }

            // 检查与子弹的碰撞
            this.bullets.forEach((bullet, bulletIndex) => {
                if (this.checkCollision(bullet, enemy)) {
                    // 敌人血量减1
                    enemy.health--;
                    this.bullets.splice(bulletIndex, 1);

                    if (enemy.health <= 0) {
                        this.createExplosion(enemy.x, enemy.y);
                        this.addScore(10);

                        // 随机掉落爱心（30%概率）
                        if (Math.random() < 0.1) {
                            this.powerups.push({
                                x: enemy.x,
                                y: enemy.y,
                                width: 20,
                                height: 20,
                                speed: 1.5
                            });
                        }

                        this.enemies.splice(index, 1);
                    }
                }
            });
        });

        // 更新道具
        this.powerups.forEach((powerup, index) => {
            powerup.y += powerup.speed;

            if (powerup.y > this.canvas.height + powerup.height) {
                this.powerups.splice(index, 1);
                return;
            }

            // 检查与玩家的碰撞
            if (this.checkCollision(this.player, powerup)) {
                this.collectPowerup();
                this.powerups.splice(index, 1);
            }
        });

        // 更新特殊道具
        this.specialDrops.forEach((drop, index) => {
            drop.y += drop.speed;

            if (drop.y > this.canvas.height + drop.height) {
                this.specialDrops.splice(index, 1);
                return;
            }

            // 检查与玩家的碰撞
            if (this.checkCollision(this.player, drop)) {
                this.activateSpecialDrop(drop);
                this.specialDrops.splice(index, 1);
            }
        });

        // 更新Boss
        if (this.boss) {
            this.updateBoss();
        }

        // 更新粒子效果
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 1;
            particle.alpha -= 0.02;

            if (particle.life <= 0 || particle.alpha <= 0) {
                this.particles.splice(index, 1);
            }
        });
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    takeDamage() {
        if (this.player.invulnerable) return;

        this.lives--;
        this.player.invulnerable = true;
        this.player.invulnerableTime = 1000; // 1秒无敌

        // 添加闪烁效果
        const playerElement = document.getElementById('gameCanvas');
        playerElement.classList.add('flash');
        setTimeout(() => {
            playerElement.classList.remove('flash');
        }, 500);

        this.updateUI();

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    updateBoss() {
        if (!this.boss) return;

        // 移动Boss
        this.boss.y += this.boss.speed;

        // 检查Boss是否超出屏幕
        if (this.boss.y > this.canvas.height + this.boss.height) {
            this.boss = null;
            return;
        }

        // 检查与玩家的碰撞
        if (this.boss && !this.player.invulnerable && this.checkCollision(this.player, this.boss)) {
            this.takeDamage();
        }

        // 检查与子弹的碰撞
        this.bullets.forEach((bullet, bulletIndex) => {
            if (this.boss && this.checkCollision(bullet, this.boss)) {
                this.boss.health--;
                this.bullets.splice(bulletIndex, 1);

                // 创建击中特效
                this.createExplosion(bullet.x, bullet.y);

                if (this.boss && this.boss.health <= 0) {
                    this.defeatBoss();
                    return; // 立即返回，避免继续处理已删除的Boss
                }
            }
        });
    }

    defeatBoss() {
        // 击败Boss奖励
        this.lives++; // +1生命值
        this.addScore(100); // +100分

        // 激活特殊模式：MAX频率增加10倍，持续10秒
        this.bossSpecialMode = true;
        this.bossSpecialModeEnd = Date.now() + 10000;

        // 创建击败特效
        this.createExplosion(this.boss.x, this.boss.y);
        for (let i = 0; i < 30; i++) {
            this.createExplosion(
                this.boss.x + (Math.random() - 0.5) * 100,
                this.boss.y + (Math.random() - 0.5) * 100
            );
        }

        this.boss = null;
        this.updateUI();
    }

    collectPowerup() {
        if (this.lives < this.maxLives) {
            this.lives++;
        }
        this.addScore(50);
        this.updateUI();
    }

    activateSpecialDrop(drop) {
        if (drop.type === 'max') {
            // Kiss特效
            this.createKissEffect();

            // 清屏所有敌人
            this.enemies = [];

            // 开始爱心雨
            this.startHeartRain();

            // 额外+1生命值
            if (this.lives < this.maxLives) {
                this.lives++;
            }

            // 加分
            this.addScore(200);
            this.updateUI();
        }
    }

    createKissEffect() {
        // 在玩家位置创建Kiss特效
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;

            this.particles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 80,
                alpha: 1,
                color: '#ff1493',
                size: 6,
                type: 'kiss'
            });
        }
    }

    startHeartRain() {
        // 创建爱心雨效果
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const x = Math.random() * this.canvas.width;
                this.createHeartParticle(x, -20);
            }, i * 100);
        }
    }

    createHeartParticle(x, y) {
        this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: 1 + Math.random() * 2,
            life: 200,
            alpha: 0.8,
            color: '#ff69b4',
            size: 8,
            type: 'heart'
        });
    }

    addScore(points) {
        this.score += points;
        this.updateUI();
    }

    createExplosion(x, y) {
        // 夸张卡通爆炸效果
        for (let i = 0; i < 20; i++) {
            const angle = (i * Math.PI * 2) / 20;
            const speed = 3 + Math.random() * 5;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 60,
                alpha: 1,
                color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                size: 4 + Math.random() * 4,
                type: Math.random() > 0.5 ? 'sparkle' : 'star'
            });
        }

        // 添加爆炸冲击波
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const speed = 1 + Math.random() * 2;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 80,
                alpha: 0.6,
                color: 'white',
                size: 6,
                type: 'wave'
            });
        }
    }

    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = this.score;
        this.showScreen('gameOverScreen');
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = 'rgba(255, 182, 193, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制玩家（天使）
        this.drawPlayer();

        // 绘制夸张的彩虹子弹
        this.bullets.forEach(bullet => {
            // 彩虹渐变子弹
            const gradient = this.ctx.createRadialGradient(
                bullet.x, bullet.y, 0,
                bullet.x, bullet.y, bullet.width * 2
            );
            gradient.addColorStop(0, '#ff6b9d');
            gradient.addColorStop(0.3, '#ffb347');
            gradient.addColorStop(0.6, '#87ceeb');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.width * 1.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 子弹核心
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.width * 0.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 卡通星星效果
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
            this.drawStar(bullet.x, bullet.y, bullet.width * 0.8);
        });

        // 绘制敌人（emoji大便）- 移除模糊效果，增加写实感
        this.enemies.forEach(enemy => {
            this.ctx.save();
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            // 根据敌人类型使用不同emoji
            let emoji = '💩';
            if (enemy.type === 'tracking') {
                emoji = '👹'; // 追踪型用恶魔emoji
            } else if (enemy.type === 'rush') {
                emoji = '💢'; // 突袭型用怒气emoji
                if (enemy.rushMode) {
                    // 突袭状态下闪烁效果
                    this.ctx.globalAlpha = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;
                }
            }

            this.ctx.fillText(emoji, enemy.x, enemy.y);

            // 如果血量大于1，显示血量条
            if (enemy.health > 1) {
                const barWidth = 30;
                const barHeight = 4;
                const barX = enemy.x - barWidth / 2;
                const barY = enemy.y - enemy.height / 2 - 8;

                // 血量条背景
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                this.ctx.fillRect(barX, barY, barWidth, barHeight);

                // 血量条
                const healthPercent = enemy.health / enemy.maxHealth;
                this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : '#ff0000';
                this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

                // 血量条边框
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(barX, barY, barWidth, barHeight);
            }

            this.ctx.restore();
        });

        // 绘制梦幻爱心道具
        this.powerups.forEach(powerup => {
            // 用emoji爱心字符
            this.ctx.save();
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('❤️', powerup.x, powerup.y);
            this.ctx.restore();

            // 爱心周围的小星星
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6 + this.gameTime * 0.01;
                const distance = 20 + Math.sin(this.gameTime * 0.02 + i) * 5;
                const x = powerup.x + Math.cos(angle) * distance;
                const y = powerup.y + Math.sin(angle) * distance;
                this.drawStar(x, y, 1.5);
            }
        });

        // 绘制Boss
        if (this.boss) {
            this.drawBoss();
        }

        // 绘制MAX特殊道具（空投伞包）
        this.specialDrops.forEach(drop => {
            if (drop.type === 'max' && this.maxImage && this.maxImage.complete) {
                this.ctx.save();

                // 绘制降落伞绳子
                this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(drop.x - 15, drop.y - 30);
                this.ctx.lineTo(drop.x - 10, drop.y - 10);
                this.ctx.moveTo(drop.x + 15, drop.y - 30);
                this.ctx.lineTo(drop.x + 10, drop.y - 10);
                this.ctx.stroke();

                // 绘制降落伞
                const umbrellaGradient = this.ctx.createRadialGradient(
                    drop.x, drop.y - 35, 0,
                    drop.x, drop.y - 35, 25
                );
                umbrellaGradient.addColorStop(0, 'rgba(255, 0, 0, 0.9)');
                umbrellaGradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.9)');
                umbrellaGradient.addColorStop(1, 'rgba(255, 140, 0, 0.8)');

                this.ctx.fillStyle = umbrellaGradient;
                this.ctx.beginPath();
                this.ctx.arc(drop.x, drop.y - 30, 20, 0, Math.PI);
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // 降落伞纹理线条
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 8;
                    this.ctx.beginPath();
                    this.ctx.moveTo(drop.x, drop.y - 30);
                    this.ctx.lineTo(
                        drop.x + Math.cos(angle) * 18,
                        drop.y - 30 + Math.sin(angle) * 18
                    );
                    this.ctx.stroke();
                }

                // 绘制空投箱子
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 8;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;

                // 箱子背景
                this.ctx.fillStyle = 'rgba(139, 69, 19, 0.9)';
                this.ctx.fillRect(drop.x - drop.width/2, drop.y - drop.height/2, drop.width, drop.height);

                // 绘制MAX头像在箱子中央
                this.ctx.drawImage(this.maxImage,
                    drop.x - drop.width/2 + 5,
                    drop.y - drop.height/2 + 5,
                    drop.width - 10, drop.height - 10);

                // 箱子边框
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(drop.x - drop.width/2, drop.y - drop.height/2, drop.width, drop.height);

                // 闪烁效果
                if (Math.floor(this.gameTime / 200) % 2) {
                    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(drop.x - drop.width/2 - 2, drop.y - drop.height/2 - 2, drop.width + 4, drop.height + 4);
                }

                this.ctx.restore();
            }
        });
    }

    // 绘制爱心形状
    drawHeart(x, y, size) {
        this.ctx.save();

        // 彩虹渐变爱心
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, '#ff6b9d');
        gradient.addColorStop(0.5, '#ff1493');
        gradient.addColorStop(1, '#dc143c');

        this.ctx.fillStyle = gradient;

        // 绘制爱心路径
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + size * 0.3);

        // 左侧爱心
        this.ctx.bezierCurveTo(
            x, y - size * 0.1,
            x - size * 0.6, y - size * 0.1,
            x - size * 0.6, y + size * 0.2
        );

        // 左侧圆
        this.ctx.bezierCurveTo(
            x - size * 0.6, y - size * 0.4,
            x - size * 0.2, y - size * 0.4,
            x, y - size * 0.1
        );

        // 右侧圆
        this.ctx.bezierCurveTo(
            x + size * 0.2, y - size * 0.4,
            x + size * 0.6, y - size * 0.4,
            x + size * 0.6, y + size * 0.2
        );

        // 右侧爱心
        this.ctx.bezierCurveTo(
            x + size * 0.6, y - size * 0.1,
            x, y - size * 0.1,
            x, y + size * 0.3
        );

        this.ctx.fill();

        // 爱心边框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawPlayer() {
        this.ctx.save();

        // 先绘制翅膀（在头像下面）
        if (this.wingsImage && this.wingsImage.complete) {
            // 绘制图片翅膀
            this.ctx.drawImage(this.wingsImage,
                this.player.x - this.player.width,
                this.player.y - this.player.height/2,
                this.player.width * 2, this.player.height * 1.5);
        } else {
            // 默认矢量翅膀
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.strokeStyle = 'rgba(255, 107, 157, 0.6)';
            this.ctx.lineWidth = 2;

            // 左翼
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x - 10, this.player.y + 15);
            this.ctx.quadraticCurveTo(this.player.x - 40, this.player.y - 10, this.player.x - 35, this.player.y + 30);
            this.ctx.quadraticCurveTo(this.player.x - 25, this.player.y + 25, this.player.x - 10, this.player.y + 15);
            this.ctx.fill();
            this.ctx.stroke();

            // 右翼
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x + 10, this.player.y + 15);
            this.ctx.quadraticCurveTo(this.player.x + 40, this.player.y - 10, this.player.x + 35, this.player.y + 30);
            this.ctx.quadraticCurveTo(this.player.x + 25, this.player.y + 25, this.player.x + 10, this.player.y + 15);
            this.ctx.fill();
            this.ctx.stroke();
        }

        // 再绘制头像（在翅膀上面）
        if (this.heroImage && this.heroImage.complete) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.width/2, 0, Math.PI * 2);
            this.ctx.clip();

            // 先绘制白色背景确保不透明
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(
                this.player.x - this.player.width/2,
                this.player.y - this.player.height/2,
                this.player.width, this.player.height
            );

            this.ctx.drawImage(this.heroImage,
                this.player.x - this.player.width/2,
                this.player.y - this.player.height/2,
                this.player.width, this.player.height);
            this.ctx.restore();

            // 头像边框
            this.ctx.strokeStyle = 'rgba(255, 107, 157, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.width/2, 0, Math.PI * 2);
            this.ctx.stroke();
        } else {
            // 矢量风格天使头像
            this.ctx.fillStyle = 'rgba(255, 240, 245, 0.9)';
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.width/2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 107, 157, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // 矢量风格脸部
            this.ctx.fillStyle = 'rgba(255, 182, 193, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(this.player.x - 6, this.player.y - 2, 1.5, 0, Math.PI * 2);
            this.ctx.arc(this.player.x + 6, this.player.y - 2, 1.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 微笑
            this.ctx.strokeStyle = 'rgba(255, 107, 157, 0.9)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y + 4, 4, 0.2, Math.PI - 0.2);
            this.ctx.stroke();
        }

        // 最后绘制光环（在最上面）
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        this.ctx.strokeStyle = 'rgba(255, 165, 0, 0.9)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y - 30, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // 光环装饰线条
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = this.player.x + Math.cos(angle) * 14;
            const y = this.player.y - 30 + Math.sin(angle) * 14;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + Math.cos(angle) * 4, y + Math.sin(angle) * 4);
            this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    // 绘制矢量翅膀
    drawVectorWings() {
        // 创建渐变翅膀效果
        const gradient1 = this.ctx.createLinearGradient(
            this.player.x - 40, this.player.y - 20,
            this.player.x - 10, this.player.y + 20
        );
        gradient1.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient1.addColorStop(0.5, 'rgba(240, 248, 255, 0.8)');
        gradient1.addColorStop(1, 'rgba(230, 230, 250, 0.6)');

        const gradient2 = this.ctx.createLinearGradient(
            this.player.x + 10, this.player.y - 20,
            this.player.x + 40, this.player.y + 20
        );
        gradient2.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient2.addColorStop(0.5, 'rgba(240, 248, 255, 0.8)');
        gradient2.addColorStop(1, 'rgba(230, 230, 250, 0.6)');

        // 左翼
        this.ctx.fillStyle = gradient1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x - 15, this.player.y + 5);
        this.ctx.quadraticCurveTo(this.player.x - 45, this.player.y - 15, this.player.x - 35, this.player.y + 25);
        this.ctx.quadraticCurveTo(this.player.x - 30, this.player.y + 35, this.player.x - 20, this.player.y + 30);
        this.ctx.quadraticCurveTo(this.player.x - 10, this.player.y + 20, this.player.x - 15, this.player.y + 5);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(200, 200, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 右翼
        this.ctx.fillStyle = gradient2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x + 15, this.player.y + 5);
        this.ctx.quadraticCurveTo(this.player.x + 45, this.player.y - 15, this.player.x + 35, this.player.y + 25);
        this.ctx.quadraticCurveTo(this.player.x + 30, this.player.y + 35, this.player.x + 20, this.player.y + 30);
        this.ctx.quadraticCurveTo(this.player.x + 10, this.player.y + 20, this.player.x + 15, this.player.y + 5);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(200, 200, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 翅膀羽毛纹理
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 3; i++) {
            // 左翼羽毛
            this.ctx.beginPath();
            this.ctx.ellipse(this.player.x - 30 - i * 5, this.player.y + 5 + i * 3, 3, 8, -0.3, 0, Math.PI * 2);
            this.ctx.fill();

            // 右翼羽毛
            this.ctx.beginPath();
            this.ctx.ellipse(this.player.x + 30 + i * 5, this.player.y + 5 + i * 3, 3, 8, 0.3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // 绘制Boss
    drawBoss() {
        if (!this.boss) return;

        this.ctx.save();

        // 绘制巨型大便Boss
        this.ctx.font = '120px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('💩', this.boss.x, this.boss.y);

        // 绘制血量条
        const barWidth = 120;
        const barHeight = 10;
        const barX = this.boss.x - barWidth / 2;
        const barY = this.boss.y - this.boss.height / 2 - 20;

        // 血量条背景
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // 血量条
        const healthPercent = this.boss.health / this.boss.maxHealth;
        this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // 血量条边框
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        this.ctx.restore();
    }

    // 绘制小星星
    drawStar(x, y, size) {
        this.ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5;
            const radius = i % 2 === 0 ? size : size / 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.fill();
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = 'rgba(255, 182, 193, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制玩家（天使）
        this.drawPlayer();

        // 绘制夸张的彩虹子弹
        this.bullets.forEach(bullet => {
            // 彩虹渐变子弹
            const gradient = this.ctx.createRadialGradient(
                bullet.x, bullet.y, 0,
                bullet.x, bullet.y, bullet.width * 2
            );
            gradient.addColorStop(0, '#ff6b9d');
            gradient.addColorStop(0.3, '#ffb347');
            gradient.addColorStop(0.6, '#87ceeb');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.width * 1.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 子弹核心
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.width * 0.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 卡通星星效果
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
            this.drawStar(bullet.x, bullet.y, bullet.width * 0.8);
        });

        // 绘制敌人（emoji大便）- 移除模糊效果，增加写实感
        this.enemies.forEach(enemy => {
            this.ctx.save();
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            // 根据敌人类型使用不同emoji
            let emoji = '💩';
            if (enemy.type === 'tracking') {
                emoji = '👹'; // 追踪型用恶魔emoji
            } else if (enemy.type === 'rush') {
                emoji = '💢'; // 突袭型用怒气emoji
                if (enemy.rushMode) {
                    // 突袭状态下闪烁效果
                    this.ctx.globalAlpha = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;
                }
            }

            this.ctx.fillText(emoji, enemy.x, enemy.y);

            // 如果血量大于1，显示血量条
            if (enemy.health > 1) {
                const barWidth = 30;
                const barHeight = 4;
                const barX = enemy.x - barWidth / 2;
                const barY = enemy.y - enemy.height / 2 - 8;

                // 血量条背景
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                this.ctx.fillRect(barX, barY, barWidth, barHeight);

                // 血量条
                const healthPercent = enemy.health / enemy.maxHealth;
                this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : '#ff0000';
                this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

                // 血量条边框
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(barX, barY, barWidth, barHeight);
            }

            this.ctx.restore();
        });

        // 绘制梦幻爱心道具
        this.powerups.forEach(powerup => {
            // 用emoji爱心字符
            this.ctx.save();
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('❤️', powerup.x, powerup.y);
            this.ctx.restore();

            // 爱心周围的小星星
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6 + this.gameTime * 0.01;
                const distance = 20 + Math.sin(this.gameTime * 0.02 + i) * 5;
                const x = powerup.x + Math.cos(angle) * distance;
                const y = powerup.y + Math.sin(angle) * distance;
                this.drawStar(x, y, 1.5);
            }
        });

        // 绘制Boss
        if (this.boss) {
            this.drawBoss();
        }

        // 绘制MAX特殊道具（空投伞包）
        this.specialDrops.forEach(drop => {
            if (drop.type === 'max' && this.maxImage && this.maxImage.complete) {
                this.ctx.save();

                // 绘制降落伞绳子
                this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(drop.x - 15, drop.y - 30);
                this.ctx.lineTo(drop.x - 10, drop.y - 10);
                this.ctx.moveTo(drop.x + 15, drop.y - 30);
                this.ctx.lineTo(drop.x + 10, drop.y - 10);
                this.ctx.stroke();

                // 绘制降落伞
                const umbrellaGradient = this.ctx.createRadialGradient(
                    drop.x, drop.y - 35, 0,
                    drop.x, drop.y - 35, 25
                );
                umbrellaGradient.addColorStop(0, 'rgba(255, 0, 0, 0.9)');
                umbrellaGradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.9)');
                umbrellaGradient.addColorStop(1, 'rgba(255, 140, 0, 0.8)');

                this.ctx.fillStyle = umbrellaGradient;
                this.ctx.beginPath();
                this.ctx.arc(drop.x, drop.y - 30, 20, 0, Math.PI);
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // 降落伞纹理线条
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 8;
                    this.ctx.beginPath();
                    this.ctx.moveTo(drop.x, drop.y - 30);
                    this.ctx.lineTo(
                        drop.x + Math.cos(angle) * 18,
                        drop.y - 30 + Math.sin(angle) * 18
                    );
                    this.ctx.stroke();
                }

                // 绘制空投箱子
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 8;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;

                // 箱子背景
                this.ctx.fillStyle = 'rgba(139, 69, 19, 0.9)';
                this.ctx.fillRect(drop.x - drop.width/2, drop.y - drop.height/2, drop.width, drop.height);

                // 绘制MAX头像在箱子中央
                this.ctx.drawImage(this.maxImage,
                    drop.x - drop.width/2 + 5,
                    drop.y - drop.height/2 + 5,
                    drop.width - 10, drop.height - 10);

                // 箱子边框
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(drop.x - drop.width/2, drop.y - drop.height/2, drop.width, drop.height);

                // 闪烁效果
                if (Math.floor(this.gameTime / 200) % 2) {
                    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(drop.x - drop.width/2 - 2, drop.y - drop.height/2 - 2, drop.width + 4, drop.height + 4);
                }

                this.ctx.restore();
            }
        });

        // 绘制夸张卡通粒子效果
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;

            if (particle.type === 'star') {
                // 绘制夸张星星粒子
                this.ctx.fillStyle = particle.color;
                this.drawStar(particle.x, particle.y, particle.size);

                // 星星光晕
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size * 2
                );
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
                this.ctx.fill();

            } else if (particle.type === 'wave') {
                // 绘制冲击波
                this.ctx.strokeStyle = particle.color;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (particle.type === 'kiss') {
                // 绘制Kiss特效
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();

                // Kiss文字效果
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('💋', particle.x, particle.y);

            } else if (particle.type === 'heart') {
                // 绘制爱心雨
                this.drawHeart(particle.x, particle.y, particle.size);
            } else {
                // 绘制夸张彩虹粒子
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size * 1.5
                );
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(0.7, particle.color);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
                this.ctx.fill();

                // 粒子核心
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        });

        // 绘制玩家无敌状态闪烁效果
        if (this.player.invulnerable && Math.floor(this.gameTime / 100) % 2) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    gameLoop() {
        this.updateGame();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 游戏音效管理
class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
    }

    loadSound(name, url) {
        // 这里可以加载音效文件
        // 由于是示例，暂时使用Web Audio API生成简单音效
    }

    playSound(name) {
        if (!this.enabled) return;

        // 使用Web Audio API生成音效
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch(name) {
            case 'shoot':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
            case 'hit':
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
            case 'powerup':
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
                break;
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new AngelGame();
    const soundManager = new SoundManager();

    // 将音效管理器暴露给游戏实例
    window.gameSounds = soundManager;
});
