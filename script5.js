"use strict";

window.addEventListener("load", () => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let width, height;
    const NUM_ATOMS = 75;
    const NUM_SNAKES = 5;
    const NUM_PORTALS = 3;
    const SNAKE_LENGTH = 40;
    const SNAKE_SIZE = 6;
    const SPEED = 2;
    const PHOTON_SPEED = 4;
    const DISAPPEAR_TIME = 1000;
    const GRAVITY = 0.05;

    const atoms = [];
    const snakes = [];
    const photons = [];
    const blackHoles = [];
    const portals = [];

    const random = Math.random;
    const floor = Math.floor;
    const round = Math.round;
    const abs = Math.abs;
    const max = Math.max;
    const PI = Math.PI;
    const TWO_PI = 2 * Math.PI;
    const sin = Math.sin;
    const cos = Math.cos;
    const hypot = Math.hypot;

    function drawBackgroundGrid() {
        const gridSpacing = 50;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.2)'; // Neon purple
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= width; x += gridSpacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSpacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    class Atom {
        constructor(x, y) {
            this.position = { x, y };
            this.state = 0;
            this.startTime = 0;
            this.hue = 270 + random() * 60; // Vaporwave hues (purple to pink)
            this.radius = 10;
            this.type = random() < 0.5 ? 'normal' : 'special';
        }

        disintegrate(t) {
            this.startTime = t;
            this.state = 1;
            const photonCount = this.type === 'normal' ? 5 : 15;
            for (let i = 0; i < photonCount; i++) {
                photons.push(new Photon(this.position.x, this.position.y, this.hue, this.type));
            }
            if (this.type === 'special') {
                blackHoles.push(new BlackHole(this.position.x, this.position.y));
            }
        }

        draw(t) {
            if (this.state === 0) {
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, this.radius, 0, TWO_PI);
                ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`; // Vibrant color
                ctx.shadowColor = `hsl(${this.hue}, 100%, 70%)`;
                ctx.shadowBlur = 20;
                ctx.fill();
                ctx.shadowBlur = 0;
            } else if (this.state === 1) {
                const dt = t - this.startTime;
                const alpha = dt / DISAPPEAR_TIME;
                if (alpha > 1) {
                    this.state = 2; // Atom is gone
                } else {
                    ctx.beginPath();
                    ctx.arc(this.position.x, this.position.y, this.radius * (1 - alpha), 0, TWO_PI);
                    ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${1 - alpha})`;
                    ctx.shadowColor = `hsla(${this.hue}, 100%, 70%, ${1 - alpha})`;
                    ctx.shadowBlur = 20 * (1 - alpha);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }
    }

    class Photon {
        constructor(x, y, hue, type) {
            this.position = { x, y };
            const angle = random() * TWO_PI;
            const speed = type === 'normal' ? PHOTON_SPEED : PHOTON_SPEED * 1.5;
            this.velocity = {
                x: cos(angle) * speed,
                y: sin(angle) * speed
            };
            this.hue = hue;
            this.life = 0;
            this.maxLife = 100;
            this.size = type === 'normal' ? 3 : 5;
            this.type = type;
        }

        update() {
            // Check for collision with portals before moving
            portals.forEach(portal => {
                const dx = this.position.x - portal.position.x;
                const dy = this.position.y - portal.position.y;
                const dist = hypot(dx, dy);
                if (dist < portal.radius) {
                    // Teleport photon to partner portal
                    this.position.x = portal.partner.position.x;
                    this.position.y = portal.partner.position.y;

                    // Add a slight offset to prevent immediate retriggering
                    this.position.x += (random() - 0.5) * 10;
                    this.position.y += (random() - 0.5) * 10;
                }
            });

            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.velocity.y += GRAVITY; // Gravity effect
            this.life++;
            // Remove photon if it goes off screen or its life ends
            if (this.life > this.maxLife ||
                this.position.x < 0 || this.position.x > width ||
                this.position.y < 0 || this.position.y > height) {
                photons.splice(photons.indexOf(this), 1);
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.size, 0, TWO_PI);
            ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`;
            ctx.shadowColor = `hsl(${this.hue}, 100%, 70%)`;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class Snake {
        constructor() {
            this.hue = 180 + random() * 60; // Vaporwave blues and cyans
            this.color = `hsl(${this.hue}, 100%, 70%)`;
            this.positions = [];
            this.snakeLength = SNAKE_LENGTH; // Initial length
            const startX = random() * width;
            const startY = random() * height;
            for (let i = 0; i < this.snakeLength; i++) {
                this.positions.push({ x: startX, y: startY });
            }
            this.angle = random() * TWO_PI;
            this.target = null;
        }

        update() {
            const head = this.positions[0];

            // Seek nearest atom if no target
            if (!this.target || this.target.state !== 0) {
                let minDist = Infinity;
                atoms.forEach(atom => {
                    if (atom.state === 0) {
                        const dist = hypot(head.x - atom.position.x, head.y - atom.position.y);
                        if (dist < minDist) {
                            minDist = dist;
                            this.target = atom;
                        }
                    }
                });
            }

            // Adjust angle towards target
            if (this.target && this.target.state === 0) {
                const dx = this.target.position.x - head.x;
                const dy = this.target.position.y - head.y;
                const angleToTarget = Math.atan2(dy, dx);
                const angleDifference = angleToTarget - this.angle;
                this.angle += Math.atan2(sin(angleDifference), cos(angleDifference)) * 0.05; // Smooth turning
            } else {
                this.angle += (random() - 0.5) * 0.2; // Random movement
            }

            const newHead = {
                x: head.x + cos(this.angle) * SPEED,
                y: head.y + sin(this.angle) * SPEED
            };

            // Wrap around the canvas edges
            newHead.x = (newHead.x + width) % width;
            newHead.y = (newHead.y + height) % height;

            // Check collision with atoms
            atoms.forEach(atom => {
                if (atom.state === 0) {
                    const dist = hypot(newHead.x - atom.position.x, newHead.y - atom.position.y);
                    if (dist < atom.radius + SNAKE_SIZE / 2) {
                        atom.disintegrate(performance.now());
                        this.grow(atom.type);
                        this.target = null; // Reset target
                    }
                }
            });

            // Check collision with black holes
            blackHoles.forEach(hole => {
                const dist = hypot(newHead.x - hole.position.x, newHead.y - hole.position.y);
                if (dist < hole.radius + SNAKE_SIZE / 2) {
                    this.shrink();
                }
            });

            // Check collision with portals
            portals.forEach(portal => {
                const dist = hypot(newHead.x - portal.position.x, newHead.y - portal.position.y);
                if (dist < portal.radius + SNAKE_SIZE / 2) {
                    // Teleport snake's head to partner portal
                    const offsetX = (random() - 0.5) * 10;
                    const offsetY = (random() - 0.5) * 10;
                    newHead.x = portal.partner.position.x + offsetX;
                    newHead.y = portal.partner.position.y + offsetY;
                }
            });

            this.positions.unshift(newHead);
            if (this.positions.length > this.snakeLength) {
                this.positions.pop();
            }
        }

        grow(type) {
            const lengthToAdd = type === 'normal' ? 5 : 15;
            for (let i = 0; i < lengthToAdd; i++) {
                const tail = this.positions[this.positions.length - 1];
                this.positions.push({ x: tail.x, y: tail.y });
            }
            this.snakeLength += lengthToAdd; // Update the instance variable
        }

        shrink() {
            // Remove segments from the snake's length
            for (let i = 0; i < 10; i++) {
                if (this.positions.length > 0) {
                    this.positions.pop();
                }
            }
            this.snakeLength = Math.max(10, this.snakeLength - 10); // Ensure length doesn't go below 10
        }

        draw() {
            ctx.save();
            ctx.lineWidth = SNAKE_SIZE;
            ctx.lineCap = "round";
            ctx.strokeStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            this.positions.forEach((pos, i) => {
                if (i === 0) {
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
            });
            ctx.stroke();
            ctx.restore();
        }
    }

    class BlackHole {
        constructor(x, y) {
            this.position = { x, y };
            this.radius = 0;
            this.maxRadius = 50;
            this.growthRate = 0.5;
        }

        update() {
            if (this.radius < this.maxRadius) {
                this.radius += this.growthRate;
            }
            // Attract photons
            photons.forEach(photon => {
                const dx = this.position.x - photon.position.x;
                const dy = this.position.y - photon.position.y;
                const dist = hypot(dx, dy);
                if (dist < this.radius) {
                    const angle = Math.atan2(dy, dx);
                    photon.velocity.x += cos(angle) * 0.5;
                    photon.velocity.y += sin(angle) * 0.5;
                }
            });
        }

        draw() {
            ctx.save();
            var gradient = ctx.createRadialGradient(
                this.position.x, this.position.y, 0,
                this.position.x, this.position.y, this.radius
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius, 0, TWO_PI);
            ctx.fill();
            ctx.restore();
        }
    }

    class Portal {
        constructor(x, y) {
            this.position = { x, y };
            this.radius = 20;
            this.partner = null; // Partner portal to teleport to
        }

        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius, 0, TWO_PI);
            ctx.strokeStyle = 'hsl(300, 100%, 70%)'; // Portal color
            ctx.lineWidth = 5;
            ctx.shadowColor = 'hsl(300, 100%, 70%)';
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.restore();
        }
    }

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function init() {
        resizeCanvas();
        atoms.length = 0;
        snakes.length = 0;
        photons.length = 0;
        blackHoles.length = 0;
        portals.length = 0;

        // Create atoms at random positions
        for (let i = 0; i < NUM_ATOMS; i++) {
            const x = random() * width;
            const y = random() * height;
            atoms.push(new Atom(x, y));
        }

        // Create snakes
        for (let i = 0; i < NUM_SNAKES; i++) {
            snakes.push(new Snake());
        }

        // Create portals at random positions
        for (let i = 0; i < NUM_PORTALS; i++) {
            const x = random() * width;
            const y = random() * height;
            portals.push(new Portal(x, y));
        }

        // Assign partners to portals
        for (let i = 0; i < portals.length; i++) {
            portals[i].partner = portals[(i + 1) % portals.length];
        }

        animate();
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#000'; // Background color
        ctx.fillRect(0, 0, width, height);

        drawBackgroundGrid();

        // Update and draw black holes
        blackHoles.forEach(hole => {
            hole.update();
            hole.draw();
        });

        // Update and draw atoms
        const currentTime = performance.now();
        atoms.forEach(atom => atom.draw(currentTime));

        // Update and draw snakes
        snakes.forEach(snake => {
            snake.update();
            snake.draw();
        });

        // Update and draw photons
        photons.forEach(photon => {
            photon.update();
            photon.draw();
        });

        // Draw portals
        portals.forEach(portal => portal.draw());

        requestAnimationFrame(animate);
    }

    function addSnakeAt(x, y) {
        const snake = new Snake();
        snake.positions = [];
        for (let i = 0; i < snake.snakeLength; i++) {
            snake.positions.push({ x, y });
        }
        snakes.push(snake);
    }

    canvas.addEventListener('click', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        addSnakeAt(x, y);
    });

    window.addEventListener('resize', resizeCanvas);
    init();
});