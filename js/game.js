function hideClass(name) {
       var myClasses = document.querySelectorAll(name),
      i = 0,
      l = myClasses.length;

      for (i; i < l; i++) {
        myClasses[i].style.display = 'none';
      }
	}
    // Copyright (c) 2023 The Chromium Authors. All rights reserved. Adaptation done by Elizalde Alexios
    // Use of this source code is governed by a BSD-style license that can be
    // found in the LICENSE file.
    (function() {
    'use strict';
    /**
    * T-Rex runner.
    * @param {string} outerContainerId Outer containing element id.
    * @param {object} opt_config
    * @constructor
    * @export
    */
    function Runner(outerContainerId, opt_config) {
    // Singleton
    if (Runner.instance_) {
    return Runner.instance_;
    }
    Runner.instance_ = this;
    this.outerContainerEl = document.querySelector(outerContainerId);
    this.containerEl = null;
    this.detailsButton = this.outerContainerEl.querySelector('#details-button');
    this.config = opt_config || Runner.config;
    this.dimensions = Runner.defaultDimensions;
    this.canvas = null;
    this.canvasCtx = null;
    this.tRex = null;
    this.distanceMeter = null;
    this.distanceRan = 0;
    this.highestScore = 0;
    this.time = 0;
    this.runningTime = 0;
    this.msPerFrame = 1000 / FPS;
    this.currentSpeed = this.config.SPEED;
    this.obstacles = [];
    this.started = false;
    this.activated = false;
    this.crashed = false;
    this.paused = false;
    this.statsModalActive = false;
    this.resizeTimerId_ = null;
    this.playCount = 0;
    // Sound FX.
    this.audioBuffer = null;
    this.soundFx = {};
    // Global web audio context for playing sounds.
    this.audioContext = null;
    // Images.
    this.images = {};
    this.imagesLoaded = 0;
    this.loadImages();
    }
    window['Runner'] = Runner;
    /**
    * Default game width.
    * @const
    */
    var DEFAULT_WIDTH = 600;
    /**
    * Frames per second.
    * @const
    */
    var FPS = 60;
    /** @const */
    var IS_HIDPI = window.devicePixelRatio > 1;
    /** @const */
    var IS_IOS =
    window.navigator.userAgent.indexOf('UIWebViewForStaticFileContent') > -1;
    /** @const */
    var IS_MOBILE = window.navigator.userAgent.indexOf('Mobi') > -1 || IS_IOS;
    /** @const */
    var IS_TOUCH_ENABLED = 'ontouchstart' in window;
    /**
    * Default game configuration.
    * @enum {number}
    */
    Runner.config = {
    ACCELERATION: 0.001,
    BG_CLOUD_SPEED: 0.2,
    BOTTOM_PAD: 10,
    CLEAR_TIME: 3000,
    CLOUD_FREQUENCY: 0.5,
    GAMEOVER_CLEAR_TIME: 750,
    GAP_COEFFICIENT: 0.6,
    GRAVITY: 0.6,
    INITIAL_JUMP_VELOCITY: 12,
    MAX_CLOUDS: 6,
    MAX_OBSTACLE_LENGTH: 3,
    MAX_SPEED: 12,
    MIN_JUMP_HEIGHT: 35,
    MOBILE_SPEED_COEFFICIENT: 1.2,
    RESOURCE_TEMPLATE_ID: 'audio-resources',
    SPEED: 6,
    SPEED_DROP_COEFFICIENT: 3
    };
    /**
    * Default dimensions.
    * @enum {string}
    */
    Runner.defaultDimensions = {
    WIDTH: DEFAULT_WIDTH,
    HEIGHT: 150
    };
    /**
    * CSS class names.
    * @enum {string}
    */
    Runner.classes = {
    CANVAS: 'runner-canvas',
    CONTAINER: 'runner-container',
    CRASHED: 'crashed',
    ICON: 'icon-offline',
    TOUCH_CONTROLLER: 'controller'
    };
    /**
    * Image source urls.
    * @enum {array.<object>}
    */
    Runner.imageSources = {
    LDPI: [
    {name: 'CACTUS_LARGE', id: '1x-obstacle-large'},
    {name: 'CACTUS_SMALL', id: '1x-obstacle-small'},
    {name: 'CLOUD', id: '1x-cloud'},
    {name: 'HORIZON', id: '1x-horizon'},
    {name: 'RESTART', id: '1x-restart'},
    {name: 'TEXT_SPRITE', id: '1x-text'},
    {name: 'TREX', id: '1x-trex'}
    ],
    HDPI: [
    {name: 'CACTUS_LARGE', id: '2x-obstacle-large'},
    {name: 'CACTUS_SMALL', id: '2x-obstacle-small'},
    {name: 'CLOUD', id: '2x-cloud'},
    {name: 'HORIZON', id: '2x-horizon'},
    {name: 'RESTART', id: '2x-restart'},
    {name: 'TEXT_SPRITE', id: '2x-text'},
    {name: 'TREX', id: '2x-trex'}
    ]
    };
    /**
    * Sound FX. Reference to the ID of the audio tag on interstitial page.
    * @enum {string}
    */
    Runner.sounds = {
    BUTTON_PRESS: 'offline-sound-press',
    HIT: 'offline-sound-hit',
    SCORE: 'offline-sound-reached'
    };
    /**
    * Key code mapping.
    * @enum {object}
    */
    Runner.keycodes = {
    JUMP: {'38': 1, '32': 1}, // Up, spacebar
    DUCK: {'40': 1}, // Down
    RESTART: {'13': 1} // Enter
    };
    /**
    * Runner event names.
    * @enum {string}
    */
    Runner.events = {
    ANIM_END: 'webkitAnimationEnd',
    CLICK: 'click',
    KEYDOWN: 'keydown',
    KEYUP: 'keyup',
    MOUSEDOWN: 'mousedown',
    MOUSEUP: 'mouseup',
    RESIZE: 'resize',
    TOUCHEND: 'touchend',
    TOUCHSTART: 'touchstart',
    VISIBILITY: 'visibilitychange',
    BLUR: 'blur',
    FOCUS: 'focus',
    LOAD: 'load'
    };
    Runner.prototype = {
    /**
    * Setting individual settings for debugging.
    * @param {string} setting
    * @param {*} value
    */
    updateConfigSetting: function(setting, value) {
    if (setting in this.config && value != undefined) {
    this.config[setting] = value;
    switch (setting) {
    case 'GRAVITY':
    case 'MIN_JUMP_HEIGHT':
    case 'SPEED_DROP_COEFFICIENT':
    this.tRex.config[setting] = value;
    break;
    case 'INITIAL_JUMP_VELOCITY':
    this.tRex.setJumpVelocity(value);
    break;
    case 'SPEED':
    this.setSpeed(value);
    break;
    }
    }
    },
    /**
    * Load and cache the image assets from the page.
    */
    loadImages: function() {
    var imageSources = IS_HIDPI ? Runner.imageSources.HDPI :
    Runner.imageSources.LDPI;
    var numImages = imageSources.length;
    for (var i = numImages - 1; i >= 0; i--) {
    var imgSource = imageSources[i];
    this.images[imgSource.name] = document.getElementById(imgSource.id);
    }
    this.init();
    },
    /**
    * Load and decode base 64 encoded sounds.
    */
    loadSounds: function() {
    if (!IS_IOS) {
    this.audioContext = new AudioContext();
    var resourceTemplate =
    document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;
    for (var sound in Runner.sounds) {
    var soundSrc =
    resourceTemplate.getElementById(Runner.sounds[sound]).src;
    soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
    var buffer = decodeBase64ToArrayBuffer(soundSrc);
    // Async, so no guarantee of order in array.
    this.audioContext.decodeAudioData(buffer, function(index, audioData) {
    this.soundFx[index] = audioData;
    }.bind(this, sound));
    }
    }
    },
    /**
    * Sets the game speed. Adjust the speed accordingly if on a smaller screen.
    * @param {number} opt_speed
    */
    setSpeed: function(opt_speed) {
    var speed = opt_speed || this.currentSpeed;
    // Reduce the speed on smaller mobile screens.
    if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
    var mobileSpeed = speed * this.dimensions.WIDTH / DEFAULT_WIDTH *
    this.config.MOBILE_SPEED_COEFFICIENT;
    this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
    } else if (opt_speed) {
    this.currentSpeed = opt_speed;
    }
    },
    /**
    * Game initialiser.
    */
    init: function() {
    // Hide the static icon.
    //document.querySelector('.' + Runner.classes.ICON).style.visibility = 'hidden';
    this.adjustDimensions();
    this.setSpeed();
    this.containerEl = document.createElement('div');
    this.containerEl.className = Runner.classes.CONTAINER;
    // Player canvas container.
    this.canvas = createCanvas(this.containerEl, this.dimensions.WIDTH,
    this.dimensions.HEIGHT, Runner.classes.PLAYER);
    this.canvasCtx = this.canvas.getContext('2d');
    this.canvasCtx.fillStyle = '#f7f7f7';
    this.canvasCtx.fill();
    Runner.updateCanvasScaling(this.canvas);
    // Horizon contains clouds, obstacles and the ground.
    this.horizon = new Horizon(this.canvas, this.images, this.dimensions,
    this.config.GAP_COEFFICIENT);
    // Distance meter
    this.distanceMeter = new DistanceMeter(this.canvas,
    this.images.TEXT_SPRITE, this.dimensions.WIDTH);
    // Draw t-rex
    this.tRex = new Trex(this.canvas, this.images.TREX);
    this.outerContainerEl.appendChild(this.containerEl);
    if (IS_MOBILE) {
    this.createTouchController();
    }
    this.startListening();
    this.quizActive = false;
    this.difficultySelectorActive = false;
    this.quizQuestions = {
    easy: [
    {topic: 'Integral definida', mode: 'tf', statement: 'La integral definida de una funcion f(x) en el intervalo [a,b] se escribe como la integral de a a b de la derivada de f.', answer: 'falso', explanation: 'La integral definida usa la propia funcion f(x), no su derivada. La formula correcta es la integral de a a b de f(x)dx.'},
    {topic: 'Integral definida', mode: 'tf', statement: 'Si los limites de integracion son iguales, la integral definida vale cero: integral de a a a de f(x)dx = 0.', answer: 'verdadero', explanation: 'Propiedad de limites iguales: cuando a=b no hay intervalo que recorrer, la integral siempre vale cero.'},
    {topic: 'Integral definida', mode: 'tf', statement: 'La integral de la suma de dos funciones es igual a la suma de sus integrales: integral(f+g) = integral(f) + integral(g).', answer: 'verdadero', explanation: 'Propiedad de linealidad: integral de a a b de [f(x)+g(x)]dx = integral de a a b de f(x)dx + integral de a a b de g(x)dx.'},
    {topic: 'Area entre curvas', mode: 'single', statement: 'Considere las curvas: y=2x+3, eje x, recta x=0 y recta x=4. La integral que permite calcular el area de la region es:', options: ['∫(0,4)(x+3)dx', '∫(0,4)(-2x-3)dx', '∫(4,0)(2x+3)dx', '∫(0,4)(2x+3)dx'], answerIndex: 3, explanation: 'La funcion y=2x+3 es positiva en [0,4] y los limites son x=0 y x=4. El area es la integral de 0 a 4 de (2x+3)dx.'},
    {topic: 'Area entre curvas', mode: 'single', statement: 'Considere las curvas: y=4x-x^2, eje x, recta x=0 y recta x=4. La integral que permite calcular el area de la region es:', options: ['∫(1,4)(4x-x²)dx', '∫(0,4)(4x-x²)dx', '∫(4,0)(4x-x²)dx', '∫(1,3)(4x-x²)dx'], answerIndex: 1, explanation: 'La funcion y=4x-x² intersecta el eje x en x=0 y x=4. El area es la integral de 0 a 4 de (4x-x²)dx.'},
    {topic: 'Propiedad de la constante', mode: 'single', statement: 'Segun la propiedad de la constante de la integral definida, la integral de a a b de k*f(x)dx es igual a:', options: ['k + integral de a a b de f(x)dx', 'k * integral de a a b de f(x)dx', 'integral de a a b de k/f(x)dx', 'No se puede simplificar'], answerIndex: 1, explanation: 'Propiedad de la constante: la constante k puede sacarse fuera de la integral. integral(k*f) = k * integral(f).'}
    ],
    normal: [
    {topic: 'Area entre curvas', mode: 'single', statement: 'Considere las curvas: y=-x^2+2x+3, eje x, recta x=-1 y recta x=3. La integral que permite calcular el area de la region comprendida entre las curvas es:', options: ['∫(-1,3)(-x²+2x+3)dx', '∫(-1,3)(x²+2x+3)dx', '∫(-1,3)(x²-2x-3)dx', '∫(3,-1)(-x²+2x+3)dx'], answerIndex: 0, explanation: 'La parabola y=-x²+2x+3 es positiva en el intervalo [-1,3], por lo que el area se calcula integrando de -1 a 3.'},
    {topic: 'Area entre curvas', mode: 'single', statement: 'En la figura se muestran h(x)=4x y f(x)=4x^3 en [0,1]. La integral que permite calcular el area de la region sombreada es:', options: ['∫(0,1)(4x+4x³)dx', '∫(0,1)(-4x³+4x)dx', '∫(0,1)(4x-4x³)dx', '∫(1,0)(4x-4x³)dx'], answerIndex: 2, explanation: 'En [0,1], h(x)=4x esta por encima de f(x)=4x³. El area es la integral de 0 a 1 de (4x-4x³)dx (funcion superior menos inferior).'},
    {topic: 'Linealidad', mode: 'single', statement: 'Cual de las siguientes afirmaciones es verdadera acerca de la propiedad de linealidad de la integral definida?', options: ['integral(1/f) = 1/integral(f)', 'integral(f*g) = integral(f) * integral(g)', 'integral(f+g) = integral(f) + integral(g)', 'integral(f_prima) = f(b) - f(a)'], answerIndex: 2, explanation: 'La propiedad de linealidad indica que la integral de una suma es la suma de las integrales. Las demas opciones no son propiedades validas de la integral.'},
    {topic: 'Cambio de limites', mode: 'tf', statement: 'Segun la propiedad de cambio de limites, la integral de 1 a 5 de x³dx = - la integral de 5 a 1 de x³dx.', answer: 'verdadero', explanation: 'Si se intercambian los limites de integracion la integral cambia de signo: integral(a,b)f = -integral(b,a)f.'},
    {topic: 'Aditividad', mode: 'single', statement: 'Segun la propiedad de aditividad del intervalo, la integral de 3 a 10 de x²dx es igual a:', options: ['∫(3,5)x²dx - ∫(5,10)x²dx', '∫(3,7)x²dx + ∫(7,10)x²dx', '2 * ∫(3,7)x²dx', '∫(0,7)x²dx + ∫(0,10)x²dx'], answerIndex: 1, explanation: 'Propiedad de aditividad: si c esta entre a y b, entonces integral(a,b) = integral(a,c) + integral(c,b). Aqui c=7 divide [3,10].'},
    {topic: 'Integral del producto', mode: 'tf', statement: 'La integral del producto de dos funciones es igual al producto de sus integrales: integral(f*g) = integral(f) * integral(g).', answer: 'falso', explanation: 'Esta NO es una propiedad valida de la integral definida. No existe una regla general para la integral de un producto de funciones.'}
    ],
    hard: [
    {topic: 'Area entre curvas', mode: 'single', statement: 'Considere la figura con f(x)=cos(x)-sen(x) y g(x)=sen(x) en [-pi/2, pi/4]. La expresion que permite calcular el area de la region sombreada es:', options: ['∫(0,π/4)(cos(x)-sen(x))dx - ∫(0,π/4)cos(x)dx', '∫(-π/2,0)(cos(x)-sen(x))dx - ∫(0,π/4)sen(x)dx', '∫(-π/2,0)(cos(x)-sen(x))dx + ∫(0,π/4)sen(x)dx', '∫(-π/2,0)(sen(x)-cos(x))dx + ∫(0,π/4)sen(x)dx'], answerIndex: 2, explanation: 'En [-π/2,0] la funcion superior es cos(x)-sen(x); en [0,π/4] la superior es sen(x). Se suman ambas integrales con sus limites correctos.'},
    {topic: 'Teorema Fundamental', mode: 'single', statement: 'Segun el Teorema Fundamental del Calculo, si F es una antiderivada de f, entonces la integral de a a b de f(x)dx es igual a:', options: ['F(a) - F(b)', 'F(b) + F(a)', 'F(b) - F(a)', 'F_prima(b) - F_prima(a)'], answerIndex: 2, explanation: 'El Teorema Fundamental del Calculo establece que la integral de a a b de f(x)dx = F(b) - F(a), donde F es cualquier antiderivada de f.'},
    {topic: 'Teorema Fundamental', mode: 'tf', statement: 'Segun el Teorema Fundamental del Calculo, si la derivada de F es f, entonces la integral de a a b de f(x)dx = F(b) - F(a).', answer: 'verdadero', explanation: 'Esto es exactamente el Teorema Fundamental del Calculo: se evalua la antiderivada en los limites y se calcula F(b) - F(a).'},
    {topic: 'Cambio de limites', mode: 'single', statement: 'Si la integral de 2 a 5 de f(x)dx = 10, cuanto vale la integral de 5 a 2 de f(x)dx?', options: ['10', '-10', '0', 'Depende de f(x)'], answerIndex: 1, explanation: 'Por la propiedad de cambio de limites, invertir los limites cambia el signo: integral(5,2) = -integral(2,5) = -10.'},
    {topic: 'Aditividad', mode: 'single', statement: 'Si la integral de 1 a 10 de f(x)dx = 15 y la integral de 1 a 5 de f(x)dx = 8, cuanto vale la integral de 5 a 10 de f(x)dx?', options: ['23', '7', '-7', 'No se puede determinar'], answerIndex: 1, explanation: 'Por aditividad: integral(1,10) = integral(1,5) + integral(5,10). Entonces 15 = 8 + integral(5,10), por lo que el resultado es 7.'},
    {topic: 'Limites iguales', mode: 'single', statement: 'Cual es el valor de la integral de 3 a 3 de sen(x)dx?', options: ['1', 'sen(3)', '0', 'No existe'], answerIndex: 2, explanation: 'Propiedad de limites iguales: la integral de a a a de f(x)dx = 0 siempre, sin importar la funcion integranda.'}
    ]
    };
    this.quizQuestionQueue = { easy: [], normal: [], hard: [] };
    this.lastQuestionByLevel = { easy: null, normal: null, hard: null };
    this.nextQuizObstacle = 5;
    this.correctAnswers = 0;
    this.incorrectAnswers = 0;
    this.totalCorrectAnswers = 0;
    this.totalIncorrectAnswers = 0;
    this.lives = 3;
    this.level = 1;
    this.streak = 0;
    this.bestStreak = 0;
    this.bestScore = 0;
    this.difficulty = 'normal';
    this.history = [];
    this.questionHistory = [];
    this.statsModalActive = false;
    this.difficultySelectorActive = true;
    this.correctAnswers = 0;
    window.addEventListener(Runner.events.RESIZE,
    this.debounceResize.bind(this));
    this.createDashboard();
    this.createDifficultyButton();
    this.showDifficultySelector();
    this.updateDashboard();
    },
    /**
    * Create the touch controller. A div that covers whole screen.
    */
    createTouchController: function() {
    this.touchController = document.createElement('div');
    this.touchController.className = Runner.classes.TOUCH_CONTROLLER;
    },
    /**
    * Debounce the resize event.
    */
    debounceResize: function() {
    if (!this.resizeTimerId_) {
    this.resizeTimerId_ =
    setInterval(this.adjustDimensions.bind(this), 250);
    }
    },
    /**
    * Adjust game space dimensions on resize.
    */
    adjustDimensions: function() {
    clearInterval(this.resizeTimerId_);
    this.resizeTimerId_ = null;
    var boxStyles = window.getComputedStyle(this.outerContainerEl);
    var padding = Number(boxStyles.paddingLeft.substr(0,
    boxStyles.paddingLeft.length - 2));
    this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2;
    // Redraw the elements back onto the canvas.
    if (this.canvas) {
    this.canvas.width = this.dimensions.WIDTH;
    this.canvas.height = this.dimensions.HEIGHT;
    Runner.updateCanvasScaling(this.canvas);
    this.distanceMeter.calcXPos(this.dimensions.WIDTH);
    this.clearCanvas();
    this.horizon.update(0, 0, true);
    this.tRex.update(0);
    // Outer container and distance meter.
    if (this.activated || this.crashed) {
    this.containerEl.style.width = this.dimensions.WIDTH + 'px';
    this.containerEl.style.height = this.dimensions.HEIGHT + 'px';
    this.distanceMeter.update(0, Math.ceil(this.distanceRan));
    this.stop();
    } else {
    this.tRex.draw(0, 0);
    }
    // Game over panel.
    if (this.crashed && this.gameOverPanel) {
    this.gameOverPanel.updateDimensions(this.dimensions.WIDTH);
    this.gameOverPanel.draw();
    }
    }
    },
    /**
    * Play the game intro.
    * Canvas container width expands out to the full width.
    */
    playIntro: function() {
    if (!this.started && !this.crashed) {
    this.playingIntro = true;
    this.tRex.playingIntro = true;
    // CSS animation definition.
    var keyframes = '@-webkit-keyframes intro { ' +
    'from { width:' + Trex.config.WIDTH + 'px }' +
    'to { width: ' + this.dimensions.WIDTH + 'px }' +
    '}';
    var style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    this.containerEl.addEventListener(Runner.events.ANIM_END,
    this.startGame.bind(this));
    this.containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both';
    this.containerEl.style.width = this.dimensions.WIDTH + 'px';
    if (this.touchController) {
    this.outerContainerEl.appendChild(this.touchController);
    }
    this.activated = true;
    this.started = true;
    } else if (this.crashed) {
    this.restart();
    }
    },
    /**
    * Update the game status to started.
    */
    startGame: function() {
    this.runningTime = 0;
    this.playingIntro = false;
    this.tRex.playingIntro = false;
    this.containerEl.style.webkitAnimation = '';
    this.playCount++;
    // Handle tabbing off the page. Pause the current game.
    window.addEventListener(Runner.events.VISIBILITY,
    this.onVisibilityChange.bind(this));
    window.addEventListener(Runner.events.BLUR,
    this.onVisibilityChange.bind(this));
    window.addEventListener(Runner.events.FOCUS,
    this.onVisibilityChange.bind(this));
    },
    clearCanvas: function() {
    this.canvasCtx.clearRect(0, 0, this.dimensions.WIDTH,
    this.dimensions.HEIGHT);
    },
    /**
    * Update the game frame.
    */
    update: function() {
    this.drawPending = false;
    if (this.quizActive || this.statsModalActive || this.difficultySelectorActive) {
    this.raq();
    return;
    }
    var now = getTimeStamp();
    var deltaTime = now - (this.time || now);
    this.time = now;
    if (this.activated) {
    this.clearCanvas();
    if (this.tRex.jumping) {
    this.tRex.updateJump(deltaTime, this.config);
    }
    this.runningTime += deltaTime;
    var hasObstacles = this.runningTime > this.config.CLEAR_TIME;
    // First jump triggers the intro.
    if (this.tRex.jumpCount == 1 && !this.playingIntro) {
    this.playIntro();
    }
    // The horizon doesn't move until the intro is over.
    if (this.playingIntro) {
    this.horizon.update(0, this.currentSpeed, hasObstacles);
    } else {
    deltaTime = !this.started ? 0 : deltaTime;
    this.horizon.update(deltaTime, this.currentSpeed, hasObstacles);
    }
    if (!this.quizActive && this.activated && !this.playingIntro &&
    this.horizon && this.horizon.obstaclesPassed >= this.nextQuizObstacle) {
    this.nextQuizObstacle = this.horizon.obstaclesPassed + 5;
    this.showQuiz();
    }
    // Check for collisions.
    var collision = hasObstacles &&
    checkForCollision(this.horizon.obstacles[0], this.tRex);
    if (!collision) {
    this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;
    if (this.currentSpeed < this.config.MAX_SPEED) {
    this.currentSpeed += this.config.ACCELERATION;
    }
    } else {
    this.gameOver();
    }
    if (this.distanceMeter.getActualDistance(this.distanceRan) >
    this.distanceMeter.maxScore) {
    this.distanceRan = 0;
    }
    var playAcheivementSound = this.distanceMeter.update(deltaTime,
    Math.ceil(this.distanceRan));
    if (playAcheivementSound) {
    this.playSound(this.soundFx.SCORE);
    }
    }
    if (!this.crashed) {
    this.tRex.update(deltaTime);
    this.raq();
    }
    },
    shuffleQuestions: function(items) {
    for (var i = items.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
    }
    return items;
    },
    refillQuestionQueue: function(levelKey) {
    var source = (this.quizQuestions[levelKey] || []).slice();
    if (!source.length) {
    this.quizQuestionQueue[levelKey] = [];
    return;
    }
    this.shuffleQuestions(source);
    if (source.length > 1 && this.lastQuestionByLevel[levelKey] && source[0].statement === this.lastQuestionByLevel[levelKey]) {
    var swapTmp = source[0];
    source[0] = source[1];
    source[1] = swapTmp;
    }
    this.quizQuestionQueue[levelKey] = source;
    },
    getNextQuizQuestion: function(levelKey) {
    if (!this.quizQuestionQueue[levelKey] || !this.quizQuestionQueue[levelKey].length) {
    this.refillQuestionQueue(levelKey);
    }
    var question = this.quizQuestionQueue[levelKey].shift();
    if (question) {
    this.lastQuestionByLevel[levelKey] = question.statement;
    }
    return question;
    },
    /**
    * Show conceptual quiz modal.
    */
    showQuiz: function() {
    this.quizActive = true;
    var levelKey = this.difficulty || 'normal';
    this.level = levelKey === 'easy' ? 1 : levelKey === 'normal' ? 2 : 3;
    var question = this.getNextQuizQuestion(levelKey);
    if (!question) {
    this.quizActive = false;
    return;
    }
    var answerMode = question.mode || 'single';
    var promptText = question.statement || '';
    var answerSectionHtml = '';
    if (answerMode === 'tf') {
    answerSectionHtml = `
    <div style="display: grid; gap: 8px; margin-top: 10px;">
    <label style="display:flex; align-items:center; gap:8px; padding: 10px; border:1px solid #ddd; border-radius: 8px; cursor:pointer;">
    <input type="radio" name="quiz-answer" value="verdadero">
    <span>Verdadero</span>
    </label>
    <label style="display:flex; align-items:center; gap:8px; padding: 10px; border:1px solid #ddd; border-radius: 8px; cursor:pointer;">
    <input type="radio" name="quiz-answer" value="falso">
    <span>Falso</span>
    </label>
    </div>
    `;
    } else if (answerMode === 'single') {
    answerSectionHtml = '<div style="display: grid; gap: 8px; margin-top: 10px;">' + question.options.map(function(opt, idx) {
    return '<label style="display:flex; align-items:flex-start; gap:8px; padding: 10px; border:1px solid #ddd; border-radius: 8px; cursor:pointer;">' +
    '<input type="radio" name="quiz-answer" value="' + idx + '">' +
    '<span>' + opt + '</span>' +
    '</label>';
    }).join('') + '</div>';
    } else {
    answerSectionHtml = '<input type="text" id="quiz-text-answer" placeholder="Escribe tu respuesta" style="font-size: 18px; padding: 10px; width: 100%; box-sizing: border-box; border: 2px solid #ddd; border-radius: 6px; margin-top: 10px;">';
    }
    var modal = document.createElement('div');
    modal.className = 'quiz-modal-bg';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1000';
    modal.style.animation = 'fadeIn 0.3s ease-in';
    modal.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 10px; text-align: left; width: 92%; max-width: 520px; box-sizing: border-box; animation: scaleIn 0.3s ease-out;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
    <h2 style="margin: 0; flex: 1; font-size: 20px;">Pregunta conceptual</h2>
    <div style="font-size: 14px; font-weight: bold; color: #333;">Nivel ${this.level}</div>
    </div>
    <div style="margin-bottom: 10px; font-size: 13px; color: #555; font-weight: bold;">Tema: ${question.topic}</div>
    <p style="font-size: 17px; margin: 12px 0; font-weight: bold; color: #2c2c2c; line-height: 1.4;">${promptText}</p>
    ${answerSectionHtml}
    <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
    <button id="quiz-submit" style="font-size: 17px; padding: 10px 18px; min-width: 120px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Responder</button>
    </div>
    </div>
    `;
    this.setDashboardVisibility(false);
    document.body.appendChild(modal);
    var submit = modal.querySelector('#quiz-submit');
    var content = modal.querySelector('div');
    var self = this;
    submit.onclick = function() {
    var feedback = document.createElement('p');
    feedback.style.marginTop = '12px';
    feedback.style.fontSize = '16px';
    var answerLabel = '';
    var isCorrect = false;
    if (answerMode === 'input') {
    var textInput = modal.querySelector('#quiz-text-answer');
    var typed = textInput ? textInput.value.trim() : '';
    if (!typed) {
    feedback.innerHTML = 'Escribe tu respuesta para continuar.';
    feedback.style.color = '#E65100';
    content.appendChild(feedback);
    return;
    }
    answerLabel = typed;
    var normalizedTyped = typed.toLowerCase().replace(/\s+/g, ' ').trim();
    var accepted = question.acceptedAnswers || [];
    for (var ai = 0; ai < accepted.length; ai++) {
    if (normalizedTyped === String(accepted[ai]).toLowerCase().replace(/\s+/g, ' ').trim()) {
    isCorrect = true;
    break;
    }
    }
    } else {
    var selectedOption = modal.querySelector('input[name="quiz-answer"]:checked');
    if (!selectedOption) {
    feedback.innerHTML = answerMode === 'tf' ? 'Selecciona Verdadero o Falso.' : 'Selecciona una opcion.';
    feedback.style.color = '#E65100';
    content.appendChild(feedback);
    return;
    }
    if (answerMode === 'tf') {
    answerLabel = selectedOption.value;
    isCorrect = answerLabel === question.answer;
    } else {
    var selectedIndex = parseInt(selectedOption.value, 10);
    answerLabel = question.options[selectedIndex];
    isCorrect = selectedIndex === question.answerIndex;
    }
    }
    if (isCorrect) {
    feedback.innerHTML = '🎉 ¡Correcto! 🎉';
    feedback.style.color = '#4CAF50';
    feedback.style.fontWeight = 'bold';
    content.appendChild(feedback);
    self.correctAnswers++;
    self.totalCorrectAnswers++;
    self.streak++;
    if (self.streak > self.bestStreak) {
    self.bestStreak = self.streak;
    }
    self.level = self.difficulty === 'easy' ? 1 : self.difficulty === 'normal' ? 2 : self.difficulty === 'hard' ? 3 : 4;
    self.bestScore = Math.max(self.bestScore, self.correctAnswers);
    self.addQuestionHistoryEntry(promptText, answerLabel, true);
    self.nextQuizObstacle = (self.horizon ? self.horizon.obstaclesPassed : 0) + 5;
    self.ensureSafeResumeDistance();
    self.quizActive = false;
    self.updateDashboard();
    setTimeout(function() {
    if (document.body.contains(modal)) {
    document.body.removeChild(modal);
    }
    self.setDashboardVisibility(true);
    }, 800);
    } else {
    feedback.innerHTML = '❌ Incorrecto';
    feedback.style.color = '#F44336';
    feedback.style.fontWeight = 'bold';
    content.appendChild(feedback);
    var correctAnswerText = '';
    if (answerMode === 'tf') {
    correctAnswerText = question.answer === 'verdadero' ? 'Verdadero' : 'Falso';
    } else if (answerMode === 'single') {
    correctAnswerText = question.options[question.answerIndex];
    } else if (answerMode === 'input') {
    correctAnswerText = question.acceptedAnswers && question.acceptedAnswers.length > 0 ? question.acceptedAnswers[0] : '';
    }
    var correctAnswerEl = document.createElement('p');
    correctAnswerEl.style.marginTop = '8px';
    correctAnswerEl.style.fontSize = '14px';
    correctAnswerEl.style.lineHeight = '1.4';
    correctAnswerEl.style.color = '#2E7D32';
    correctAnswerEl.style.fontWeight = 'bold';
    correctAnswerEl.innerHTML = 'Respuesta correcta: ' + correctAnswerText;
    content.appendChild(correctAnswerEl);
    var explanation = document.createElement('p');
    explanation.style.marginTop = '8px';
    explanation.style.fontSize = '14px';
    explanation.style.lineHeight = '1.4';
    explanation.style.color = '#444';
    explanation.innerHTML = 'Explicacion: ' + question.explanation;
    content.appendChild(explanation);
    submit.disabled = true;
    var playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Jugar de nuevo';
    playAgainBtn.style.marginTop = '12px';
    playAgainBtn.style.fontSize = '16px';
    playAgainBtn.style.padding = '10px 16px';
    playAgainBtn.style.background = '#1976D2';
    playAgainBtn.style.color = 'white';
    playAgainBtn.style.border = 'none';
    playAgainBtn.style.borderRadius = '6px';
    playAgainBtn.style.cursor = 'pointer';
    content.appendChild(playAgainBtn);
    self.streak = 0;
    self.incorrectAnswers++;
    self.totalIncorrectAnswers++;
    self.addQuestionHistoryEntry(promptText, answerLabel, false);
    self.nextQuizObstacle = (self.horizon ? self.horizon.obstaclesPassed : 0) + 5;
    self.updateDashboard();
    playAgainBtn.onclick = function() {
    self.quizActive = false;
    if (document.body.contains(modal)) {
    document.body.removeChild(modal);
    }
    self.setDashboardVisibility(true);
    self.restart();
    };
    }
    };
    },
    /**
    * Show difficulty selector panel.
    */
    showDifficultySelector: function(opt_onSelected) {
    var self = this;
    this.difficultySelectorActive = true;
    this.setDashboardVisibility(false);
    this.correctAnswers = 0;
    this.bestScore = 0;

    var existing = document.getElementById('difficulty-selector-panel');
    if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
    }

    var panel = document.createElement('div');
    panel.id = 'difficulty-selector-panel';
    panel.style.position = 'fixed';
    panel.style.top = '20px';
    panel.style.left = '14px';
    panel.style.zIndex = '2200';
    panel.style.background = 'rgba(255,255,255,0.97)';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '10px';
    panel.style.padding = '10px';
    panel.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    panel.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; flex-wrap: wrap;">
    <label for="difficulty-select" style="font-size:13px; color:#333; font-weight:bold;">Nivel:</label>
    <select id="difficulty-select" style="padding:6px; border-radius:6px; border:1px solid #bbb; font-size:14px;">
    <option value="" selected>Selecciona</option>
    <option value="easy">Facil</option>
    <option value="normal">Normal</option>
    <option value="hard">Dificil</option>
    </select>
    </div>
    `;

    document.body.appendChild(panel);

    function applyDifficulty(value) {
    if (!value) {
    return;
    }
    self.difficulty = value;
    self.correctAnswers = 0;
    self.incorrectAnswers = 0;
    self.totalCorrectAnswers = 0;
    self.totalIncorrectAnswers = 0;
    self.bestScore = 0;
    self.bestStreak = 0;
    self.questionHistory = [];
    self.quizQuestionQueue = { easy: [], normal: [], hard: [] };
    self.lastQuestionByLevel = { easy: null, normal: null, hard: null };
    self.nextQuizObstacle = 5;
    self.difficultySelectorActive = false;
    if (document.body.contains(panel)) {
    document.body.removeChild(panel);
    }
    self.setDashboardVisibility(true);
    self.updateDashboard();
    if (typeof opt_onSelected === 'function') {
    opt_onSelected();
    }
    }

    panel.querySelector('#difficulty-select').onchange = function() {
    var selected = this.value;
    applyDifficulty(selected);
    };
    },
    /**
    * Push visible obstacles away after a quiz so the run can safely resume.
    */
    ensureSafeResumeDistance: function() {
    if (!this.horizon || !this.horizon.obstacles || !this.horizon.obstacles.length) {
    return;
    }
    var safeXPos = Math.max(220, this.tRex.xPos + 180);
    var firstObstacle = this.horizon.obstacles[0];
    if (!firstObstacle || firstObstacle.xPos >= safeXPos) {
    return;
    }
    var offset = safeXPos - firstObstacle.xPos;
    for (var i = 0; i < this.horizon.obstacles.length; i++) {
    this.horizon.obstacles[i].xPos += offset;
    }
    },
    createDashboard: function() {
    if (document.getElementById('dino-dashboard')) {
    return;
    }
    var dashboard = document.createElement('section');
    dashboard.id = 'dino-dashboard';
    dashboard.className = 'dino-dashboard';
    dashboard.innerHTML = `
    <div class="dino-dashboard__inner">
    <div class="dino-dashboard__history">
    <div class="dino-dashboard__eyebrow">Seguimiento</div>
    <h3 class="dino-dashboard__title">Historial de preguntas</h3>
    <div id="dashboard-history-list" class="dino-dashboard__history-list"></div>
    </div>
    <div class="dino-dashboard__stats">
    <div class="dino-dashboard__eyebrow">Dashboard</div>
    <h3 class="dino-dashboard__title">Resumen de partida</h3>
    <div class="dino-dashboard__stat-grid">
    <div class="dino-dashboard__stat-card">
    <p class="dino-dashboard__stat-label">Correctas</p>
    <p id="dashboard-correct" class="dino-dashboard__stat-value">0</p>
    </div>
    <div class="dino-dashboard__stat-card">
    <p class="dino-dashboard__stat-label">Incorrectas</p>
    <p id="dashboard-incorrect" class="dino-dashboard__stat-value">0</p>
    </div>
    <div class="dino-dashboard__stat-card">
    <p class="dino-dashboard__stat-label">Mejor puntuacion</p>
    <p id="dashboard-best-score" class="dino-dashboard__stat-value">0</p>
    </div>
    </div>
    </div>
    </div>
    `;
    document.body.appendChild(dashboard);
    },
    resetQuestionTracking: function() {
    this.correctAnswers = 0;
    this.incorrectAnswers = 0;
    this.totalCorrectAnswers = 0;
    this.totalIncorrectAnswers = 0;
    this.streak = 0;
    this.questionHistory = [];
    this.updateDashboard();
    },
    setDashboardVisibility: function(isVisible) {
    var dashboard = document.getElementById('dino-dashboard');
    if (!dashboard) {
    return;
    }
    if (isVisible) {
    dashboard.classList.remove('dino-dashboard--hidden');
    } else {
    dashboard.classList.add('dino-dashboard--hidden');
    }
    },
    addQuestionHistoryEntry: function(questionText, answer, isCorrect) {
    this.questionHistory.unshift({
    question: questionText,
    answer: answer,
    correct: isCorrect
    });
    if (this.questionHistory.length > 8) {
    this.questionHistory.pop();
    }
    },
    updateDashboard: function() {
    var correctEl = document.getElementById('dashboard-correct');
    var incorrectEl = document.getElementById('dashboard-incorrect');
    var bestScoreEl = document.getElementById('dashboard-best-score');
    var historyEl = document.getElementById('dashboard-history-list');
    if (!correctEl || !incorrectEl || !bestScoreEl || !historyEl) {
    return;
    }
    correctEl.textContent = String(this.totalCorrectAnswers);
    incorrectEl.textContent = String(this.totalIncorrectAnswers);
    bestScoreEl.textContent = String(this.bestScore);
    if (!this.questionHistory.length) {
    historyEl.innerHTML = '<div class="dino-dashboard__empty">Aun no respondes preguntas. Supera 5 obstaculos para ver tu primer reto.</div>';
    return;
    }
    historyEl.innerHTML = this.questionHistory.map(function(entry) {
    var itemClass = entry.correct ? 'dino-dashboard__history-item dino-dashboard__history-item--correct' : 'dino-dashboard__history-item dino-dashboard__history-item--incorrect';
    var statusClass = entry.correct ? 'dino-dashboard__history-status dino-dashboard__history-status--correct' : 'dino-dashboard__history-status dino-dashboard__history-status--incorrect';
    var statusLabel = entry.correct ? 'Correcta' : 'Incorrecta';
    return '<div class="' + itemClass + '">' +
    '<div class="dino-dashboard__history-question">' + entry.question + ' = ' + entry.answer + '</div>' +
    '<div class="' + statusClass + '">' + statusLabel + '</div>' +
    '</div>';
    }).join('');
    },
    /**
    * Create a floating button to change difficulty at any time.
    */
    createDifficultyButton: function() {
    var self = this;
    if (document.getElementById('change-difficulty-btn')) {
    return;
    }
    var button = document.createElement('button');
    button.id = 'change-difficulty-btn';
    button.textContent = 'Dificultad';
    button.style.position = 'fixed';
    button.style.top = '20px';
    button.style.right = '14px';
    button.style.zIndex = '2100';
    button.style.background = '#111';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '999px';
    button.style.padding = '10px 14px';
    button.style.fontSize = '14px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 4px 10px rgba(0,0,0,0.25)';
    button.onclick = function() {
    if (self.quizActive || self.difficultySelectorActive) {
    return;
    }
    self.showDifficultySelector(function() {
    if (self.crashed) {
    self.restart();
    } else {
    self.time = getTimeStamp();
    if (!self.isRunning()) {
    self.update();
    }
    }
    });
    };
    document.body.appendChild(button);
    },
    /**
    * Event handler.
    */
    handleEvent: function(e) {
    return (function(evtType, events) {
    switch (evtType) {
    case events.KEYDOWN:
    case events.TOUCHSTART:
    case events.MOUSEDOWN:
    this.onKeyDown(e);
    break;
    case events.KEYUP:
    case events.TOUCHEND:
    case events.MOUSEUP:
    this.onKeyUp(e);
    break;
    }
    }.bind(this))(e.type, Runner.events);
    },
    /**
    * Bind relevant key / mouse / touch listeners.
    */
    startListening: function() {
    // Keys.
    document.addEventListener(Runner.events.KEYDOWN, this);
    document.addEventListener(Runner.events.KEYUP, this);
    if (IS_MOBILE) {
    // Mobile only touch devices.
    document.addEventListener(Runner.events.TOUCHSTART, this);
    document.addEventListener(Runner.events.TOUCHEND, this);
    // Touch on dinosaur directly
    this.canvas.addEventListener(Runner.events.TOUCHSTART, this.onCanvasTouchStart.bind(this));
    } else {
    // Mouse.
    document.addEventListener(Runner.events.MOUSEDOWN, this);
    document.addEventListener(Runner.events.MOUSEUP, this);
    }
    // Click on dinosaur to make it jump (works on all devices)
    this.canvas.addEventListener(Runner.events.CLICK, this.onCanvasClick.bind(this));
    },
    /**
    * Remove all listeners.
    */
    stopListening: function() {
    document.removeEventListener(Runner.events.KEYDOWN, this);
    document.removeEventListener(Runner.events.KEYUP, this);
    if (IS_MOBILE) {
    document.removeEventListener(Runner.events.TOUCHSTART, this);
    document.removeEventListener(Runner.events.TOUCHEND, this);
    } else {
    document.removeEventListener(Runner.events.MOUSEDOWN, this);
    document.removeEventListener(Runner.events.MOUSEUP, this);
    }
    this.canvas.removeEventListener(Runner.events.CLICK, this.onCanvasClick.bind(this));
    },
    /**
    * Handle canvas click to make dinosaur jump.
    * @param {Event} e
    */
    onCanvasClick: function(e) {
    if (this.difficultySelectorActive) {
    return;
    }
    if (!this.crashed && this.tRex && !this.tRex.jumping) {
    if (!this.activated) {
    this.loadSounds();
    this.activated = true;
    }
    if (!this.isRunning()) {
    this.time = getTimeStamp();
    this.update();
    }
    this.playSound(this.soundFx.BUTTON_PRESS);
    this.tRex.startJump();
    }
    },
    /**
    * Handle touch on canvas to make dinosaur jump.
    * @param {Event} e
    */
    onCanvasTouchStart: function(e) {
    if (this.difficultySelectorActive) {
    return;
    }
    if (!this.crashed && this.tRex && !this.tRex.jumping) {
    if (!this.activated) {
    this.loadSounds();
    this.activated = true;
    }
    if (!this.isRunning()) {
    this.time = getTimeStamp();
    this.update();
    }
    this.playSound(this.soundFx.BUTTON_PRESS);
    this.tRex.startJump();
    e.preventDefault();
    }
    },
    /**
    * Process keydown.
    * @param {Event} e
    */
    onKeyDown: function(e) {
    if (this.difficultySelectorActive) {
    return;
    }
    if (e.target != this.detailsButton) {
    if (!this.crashed && (Runner.keycodes.JUMP[String(e.keyCode)] ||
    e.type == Runner.events.TOUCHSTART)) {
    if (!this.activated) {
    this.loadSounds();
    this.activated = true;
    }
    if (!this.isRunning()) {
    this.time = getTimeStamp();
    this.update();
    }
    if (!this.tRex.jumping) {
    this.playSound(this.soundFx.BUTTON_PRESS);
    this.tRex.startJump();
    }
    }
    if (this.crashed && e.type == Runner.events.TOUCHSTART) {
    this.restart();
    }
    }
    // Speed drop, activated only when jump key is not pressed.
    if (Runner.keycodes.DUCK[e.keyCode] && this.tRex.jumping) {
    e.preventDefault();
    this.tRex.setSpeedDrop();
    }
    },
    /**
    * Process key up.
    * @param {Event} e
    */
    onKeyUp: function(e) {
    var keyCode = String(e.keyCode);
    var isjumpKey = Runner.keycodes.JUMP[keyCode] ||
    e.type == Runner.events.TOUCHEND ||
    e.type == Runner.events.MOUSEDOWN;
    if (this.isRunning() && isjumpKey) {
    this.tRex.endJump();
    } else if (Runner.keycodes.DUCK[keyCode]) {
    this.tRex.speedDrop = false;
    } else if (this.crashed) {
    if (this.statsModalActive) {
    return;
    }
    // Check that enough time has elapsed before allowing jump key to restart.
    var deltaTime = getTimeStamp() - this.time;
    if (Runner.keycodes.RESTART[keyCode] ||
    (e.type == Runner.events.MOUSEUP && e.target == this.canvas) ||
    (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
    Runner.keycodes.JUMP[keyCode])) {
    this.restart();
    }
    } else if (this.paused && isjumpKey) {
    this.play();
    }
    },
    /**
    * RequestAnimationFrame wrapper.
    */
    raq: function() {
    if (!this.drawPending) {
    this.drawPending = true;
    this.raqId = requestAnimationFrame(this.update.bind(this));
    }
    },
    /**
    * Whether the game is running.
    * @return {boolean}
    */
    isRunning: function() {
    return !!this.raqId;
    },
    /**
    * Game over state.
    */
    gameOver: function() {
    this.playSound(this.soundFx.HIT);
    vibrate(200);
    this.stop();
    this.crashed = true;
    this.distanceMeter.acheivement = false;
    this.tRex.update(100, Trex.status.CRASHED);
    // Game over panel.
    if (!this.gameOverPanel) {
    this.gameOverPanel = new GameOverPanel(this.canvas,
    this.images.TEXT_SPRITE, this.images.RESTART,
    this.dimensions);
    } else {
    this.gameOverPanel.draw();
    }
    // Update the high score.
    if (this.distanceRan > this.highestScore) {
    this.highestScore = Math.ceil(this.distanceRan);
    this.distanceMeter.setHighScore(this.highestScore);
    }
    // Reset the time clock.
    this.time = getTimeStamp();
    },
    /**
    * Show game statistics modal.
    */
    showStatsModal: function() {
    this.statsModalActive = true;
    this.addHistoryRecord();
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.9)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '999';
    modal.innerHTML = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; text-align: center; width: 90%; max-width: 360px; color: white; animation: scaleIn 0.5s ease-out;">
    <h2 style="margin: 0 0 20px; font-size: 24px;">📊 ESTADÍSTICAS</h2>
    <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin-bottom: 15px; text-align:left;">
    <p style="margin: 8px 0; font-size: 18px;">✓ Respuestas Correctas: <span style="font-weight: bold; color: #FFD700;">${this.correctAnswers}</span></p>
    <p style="margin: 8px 0; font-size: 18px;">🏆 Mejor Puntuación: <span style="font-weight: bold; color: #FFD700;">${this.bestScore}</span></p>
    <p style="margin: 8px 0; font-size: 18px;">🔥 Mejor Racha: <span style="font-weight: bold; color: #90EE90;">${this.bestStreak}</span></p>
    <p style="margin: 8px 0; font-size: 18px;">🎯 Dificultad: <span id="stat-difficulty" style="font-weight: bold; color: #FFD700;">${this.difficulty}</span></p>
    </div>
    <div style="margin-bottom: 15px;">
    <p style="margin: 0 0 8px; font-size: 16px;">Seleccionar dificultad:</p>
    <div style="display: flex; gap: 10px; justify-content: center;">
    <button id="diff-easy" style="flex: 1; padding: 10px; border-radius: 8px; border: none; cursor: pointer; background: #B2DFDB;">Fácil</button>
    <button id="diff-normal" style="flex: 1; padding: 10px; border-radius: 8px; border: none; cursor: pointer; background: #90CAF9;">Normal</button>
    <button id="diff-hard" style="flex: 1; padding: 10px; border-radius: 8px; border: none; cursor: pointer; background: #EF9A9A;">Difícil</button>
    </div>
    </div>
    <button id="close-stats" style="background: white; color: #667eea; padding: 12px 30px; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%;">Jugar de Nuevo</button>
    </div>
    `;
    document.body.appendChild(modal);
    var self = this;
    var btn = modal.querySelector('#close-stats');
    var diffEasy = modal.querySelector('#diff-easy');
    var diffNormal = modal.querySelector('#diff-normal');
    var diffHard = modal.querySelector('#diff-hard');
    var diffLabel = modal.querySelector('#stat-difficulty');
    function setDifficulty(value) {
    self.difficulty = value;
    localStorage.setItem('dino-difficulty', value);
    diffLabel.textContent = value;
    diffEasy.style.opacity = value === 'easy' ? '1' : '0.6';
    diffNormal.style.opacity = value === 'normal' ? '1' : '0.6';
    diffHard.style.opacity = value === 'hard' ? '1' : '0.6';
    }
    setDifficulty(this.difficulty);
    diffEasy.onclick = function() { setDifficulty('easy'); };
    diffNormal.onclick = function() { setDifficulty('normal'); };
    diffHard.onclick = function() { setDifficulty('hard'); };
    btn.onclick = function() {
    document.body.removeChild(modal);
    self.statsModalActive = false;
    self.showDifficultySelector(function() {
    self.restart();
    });
    };
    },
    addHistoryRecord: function() {
    var record = {
    timestamp: Date.now(),
    difficulty: this.difficulty,
    correctAnswers: this.correctAnswers,
    bestStreak: this.bestStreak,
    level: this.level
    };
    this.history.unshift(record);
    if (this.history.length > 5) {
    this.history.pop();
    }
    localStorage.setItem('dino-history', JSON.stringify(this.history));
    },
    stop: function() {
    this.activated = false;
    this.paused = true;
    cancelAnimationFrame(this.raqId);
    this.raqId = 0;
    },
    play: function() {
    if (!this.crashed) {
    this.activated = true;
    this.paused = false;
    this.tRex.update(0, Trex.status.RUNNING);
    this.time = getTimeStamp();
    this.update();
    }
    },
    restart: function() {
    if (!this.raqId) {
    this.playCount++;
    this.runningTime = 0;
    this.activated = true;
    this.crashed = false;
    this.distanceRan = 0;
    this.setSpeed(this.config.SPEED);
    this.time = getTimeStamp();
    this.containerEl.classList.remove(Runner.classes.CRASHED);
    this.clearCanvas();
    this.distanceMeter.reset(this.highestScore);
    this.horizon.reset();
    this.nextQuizObstacle = 5;
    this.correctAnswers = 0;
    this.lives = 3;
    this.streak = 0;
    this.level = this.difficulty === 'easy' ? 1 : this.difficulty === 'hard' ? 3 : 2;
    this.tRex.reset();
    this.playSound(this.soundFx.BUTTON_PRESS);
    this.updateDashboard();
    this.update();
    }
    },
    /**
    * Pause the game if the tab is not in focus.
    */
    onVisibilityChange: function(e) {
    if (document.hidden || document.webkitHidden || e.type == 'blur') {
    this.stop();
    } else {
    this.play();
    }
    },
    /**
    * Play a sound.
    * @param {SoundBuffer} soundBuffer
    */
    playSound: function(soundBuffer) {
    if (soundBuffer) {
    var sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = soundBuffer;
    sourceNode.connect(this.audioContext.destination);
    sourceNode.start(0);
    }
    }
    };
    /**
    * Updates the canvas size taking into
    * account the backing store pixel ratio and
    * the device pixel ratio.
    *
    * See article by Paul Lewis:
    * https://www.html5rocks.com/en/tutorials/canvas/hidpi/
    *
    * @param {HTMLCanvasElement} canvas
    * @param {number} opt_width
    * @param {number} opt_height
    * @return {boolean} Whether the canvas was scaled.
    */
    Runner.updateCanvasScaling = function(canvas, opt_width, opt_height) {
    var context = canvas.getContext('2d');
    // Query the various pixel ratios
    var devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
    var backingStoreRatio = Math.floor(context.webkitBackingStorePixelRatio) || 1;
    var ratio = devicePixelRatio / backingStoreRatio;
    // Upscale the canvas if the two ratios don't match
    if (devicePixelRatio !== backingStoreRatio) {
    var oldWidth = opt_width || canvas.width;
    var oldHeight = opt_height || canvas.height;
    canvas.width = oldWidth * ratio;
    canvas.height = oldHeight * ratio;
    canvas.style.width = oldWidth + 'px';
    canvas.style.height = oldHeight + 'px';
    // Scale the context to counter the fact that we've manually scaled
    // our canvas element.
    context.scale(ratio, ratio);
    return true;
    }
    return false;
    };
    /**
    * Get random number.
    * @param {number} min
    * @param {number} max
    * @param {number}
    */
    function getRandomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    /**
    * Vibrate on mobile devices.
    * @param {number} duration Duration of the vibration in milliseconds.
    */
    function vibrate(duration) {
    if (IS_MOBILE && window.navigator.vibrate) {
    window.navigator.vibrate(duration);
    }
    }
    /**
    * Create canvas element.
    * @param {HTMLElement} container Element to append canvas to.
    * @param {number} width
    * @param {number} height
    * @param {string} opt_classname
    * @return {HTMLCanvasElement}
    */
    function createCanvas(container, width, height, opt_classname) {
    var canvas = document.createElement('canvas');
    canvas.className = opt_classname ? Runner.classes.CANVAS + ' ' +
    opt_classname : Runner.classes.CANVAS;
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);
    return canvas;
    }
    /**
    * Decodes the base 64 audio to ArrayBuffer used by Web Audio.
    * @param {string} base64String
    */
    function decodeBase64ToArrayBuffer(base64String) {
    var len = (base64String.length / 4) * 3;
    var str = atob(base64String);
    var arrayBuffer = new ArrayBuffer(len);
    var bytes = new Uint8Array(arrayBuffer);
    for (var i = 0; i < len; i++) {
    bytes[i] = str.charCodeAt(i);
    }
    return bytes.buffer;
    }
    /**
    * Return the current timestamp.
    * @return {number}
    */
    function getTimeStamp() {
    return IS_IOS ? new Date().getTime() : performance.now();
    }
    //******************************************************************************
    /**
    * Game over panel.
    * @param {!HTMLCanvasElement} canvas
    * @param {!HTMLImage} textSprite
    * @param {!HTMLImage} restartImg
    * @param {!Object} dimensions Canvas dimensions.
    * @constructor
    */
    function GameOverPanel(canvas, textSprite, restartImg, dimensions) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.canvasDimensions = dimensions;
    this.textSprite = textSprite;
    this.restartImg = restartImg;
    this.draw();
    };
    /**
    * Dimensions used in the panel.
    * @enum {number}
    */
    GameOverPanel.dimensions = {
    TEXT_X: 0,
    TEXT_Y: 13,
    TEXT_WIDTH: 191,
    TEXT_HEIGHT: 11,
    RESTART_WIDTH: 36,
    RESTART_HEIGHT: 32
    };
    GameOverPanel.prototype = {
    /**
    * Update the panel dimensions.
    * @param {number} width New canvas width.
    * @param {number} opt_height Optional new canvas height.
    */
    updateDimensions: function(width, opt_height) {
    this.canvasDimensions.WIDTH = width;
    if (opt_height) {
    this.canvasDimensions.HEIGHT = opt_height;
    }
    },
    /**
    * Draw the panel.
    */
    draw: function() {
    var dimensions = GameOverPanel.dimensions;
    var centerX = this.canvasDimensions.WIDTH / 2;
    // Game over text.
    var textSourceX = dimensions.TEXT_X;
    var textSourceY = dimensions.TEXT_Y;
    var textSourceWidth = dimensions.TEXT_WIDTH;
    var textSourceHeight = dimensions.TEXT_HEIGHT;
    var textTargetX = Math.round(centerX - (dimensions.TEXT_WIDTH / 2));
    var textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
    var textTargetWidth = dimensions.TEXT_WIDTH;
    var textTargetHeight = dimensions.TEXT_HEIGHT;
    var restartSourceWidth = dimensions.RESTART_WIDTH;
    var restartSourceHeight = dimensions.RESTART_HEIGHT;
    var restartTargetX = centerX - (dimensions.RESTART_WIDTH / 2);
    var restartTargetY = this.canvasDimensions.HEIGHT / 2;
    if (IS_HIDPI) {
    textSourceY *= 2;
    textSourceX *= 2;
    textSourceWidth *= 2;
    textSourceHeight *= 2;
    restartSourceWidth *= 2;
    restartSourceHeight *= 2;
    }
    // Game over text from sprite.
    this.canvasCtx.drawImage(this.textSprite,
    textSourceX, textSourceY, textSourceWidth, textSourceHeight,
    textTargetX, textTargetY, textTargetWidth, textTargetHeight);
    // Restart button.
    this.canvasCtx.drawImage(this.restartImg, 0, 0,
    restartSourceWidth, restartSourceHeight,
    restartTargetX, restartTargetY, dimensions.RESTART_WIDTH,
    dimensions.RESTART_HEIGHT);
    }
    };
    //******************************************************************************
    /**
    * Check for a collision.
    * @param {!Obstacle} obstacle
    * @param {!Trex} tRex T-rex object.
    * @param {HTMLCanvasContext} opt_canvasCtx Optional canvas context for drawing
    * collision boxes.
    * @return {Array.<CollisionBox>}
    */
    function checkForCollision(obstacle, tRex, opt_canvasCtx) {
    var obstacleBoxXPos = Runner.defaultDimensions.WIDTH + obstacle.xPos;
    // Adjustments are made to the bounding box as there is a 1 pixel white
    // border around the t-rex and obstacles.
    var tRexBox = new CollisionBox(
    tRex.xPos + 1,
    tRex.yPos + 1,
    tRex.config.WIDTH - 2,
    tRex.config.HEIGHT - 2);
    var obstacleBox = new CollisionBox(
    obstacle.xPos + 1,
    obstacle.yPos + 1,
    obstacle.typeConfig.width * obstacle.size - 2,
    obstacle.typeConfig.height - 2);
    // Debug outer box
    if (opt_canvasCtx) {
    drawCollisionBoxes(opt_canvasCtx, tRexBox, obstacleBox);
    }
    // Simple outer bounds check.
    if (boxCompare(tRexBox, obstacleBox)) {
    var collisionBoxes = obstacle.collisionBoxes;
    var tRexCollisionBoxes = Trex.collisionBoxes;
    // Detailed axis aligned box check.
    for (var t = 0; t < tRexCollisionBoxes.length; t++) {
    for (var i = 0; i < collisionBoxes.length; i++) {
    // Adjust the box to actual positions.
    var adjTrexBox =
    createAdjustedCollisionBox(tRexCollisionBoxes[t], tRexBox);
    var adjObstacleBox =
    createAdjustedCollisionBox(collisionBoxes[i], obstacleBox);
    var crashed = boxCompare(adjTrexBox, adjObstacleBox);
    // Draw boxes for debug.
    if (opt_canvasCtx) {
    drawCollisionBoxes(opt_canvasCtx, adjTrexBox, adjObstacleBox);
    }
    if (crashed) {
    return [adjTrexBox, adjObstacleBox];
    }
    }
    }
    }
    return false;
    };
    /**
    * Adjust the collision box.
    * @param {!CollisionBox} box The original box.
    * @param {!CollisionBox} adjustment Adjustment box.
    * @return {CollisionBox} The adjusted collision box object.
    */
    function createAdjustedCollisionBox(box, adjustment) {
    return new CollisionBox(
    box.x + adjustment.x,
    box.y + adjustment.y,
    box.width,
    box.height);
    };
    /**
    * Draw the collision boxes for debug.
    */
    function drawCollisionBoxes(canvasCtx, tRexBox, obstacleBox) {
    canvasCtx.save();
    canvasCtx.strokeStyle = '#f00';
    canvasCtx.strokeRect(tRexBox.x, tRexBox.y,
    tRexBox.width, tRexBox.height);
    canvasCtx.strokeStyle = '#0f0';
    canvasCtx.strokeRect(obstacleBox.x, obstacleBox.y,
    obstacleBox.width, obstacleBox.height);
    canvasCtx.restore();
    };
    /**
    * Compare two collision boxes for a collision.
    * @param {CollisionBox} tRexBox
    * @param {CollisionBox} obstacleBox
    * @return {boolean} Whether the boxes intersected.
    */
    function boxCompare(tRexBox, obstacleBox) {
    var crashed = false;
    var tRexBoxX = tRexBox.x;
    var tRexBoxY = tRexBox.y;
    var obstacleBoxX = obstacleBox.x;
    var obstacleBoxY = obstacleBox.y;
    // Axis-Aligned Bounding Box method.
    if (tRexBox.x < obstacleBoxX + obstacleBox.width &&
    tRexBox.x + tRexBox.width > obstacleBoxX &&
    tRexBox.y < obstacleBox.y + obstacleBox.height &&
    tRexBox.height + tRexBox.y > obstacleBox.y) {
    crashed = true;
    }
    return crashed;
    };
    //******************************************************************************
    /**
    * Collision box object.
    * @param {number} x X position.
    * @param {number} y Y Position.
    * @param {number} w Width.
    * @param {number} h Height.
    */
    function CollisionBox(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    };
    //******************************************************************************
    /**
    * Obstacle.
    * @param {HTMLCanvasCtx} canvasCtx
    * @param {Obstacle.type} type
    * @param {image} obstacleImg Image sprite.
    * @param {Object} dimensions
    * @param {number} gapCoefficient Mutipler in determining the gap.
    * @param {number} speed
    */
    function Obstacle(canvasCtx, type, obstacleImg, dimensions,
    gapCoefficient, speed) {
    this.canvasCtx = canvasCtx;
    this.image = obstacleImg;
    this.typeConfig = type;
    this.gapCoefficient = gapCoefficient;
    this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH);
    this.dimensions = dimensions;
    this.remove = false;
    this.xPos = 0;
    this.yPos = this.typeConfig.yPos;
    this.width = 0;
    this.collisionBoxes = [];
    this.gap = 0;
    this.init(speed);
    };
    /**
    * Coefficient for calculating the maximum gap.
    * @const
    */
    Obstacle.MAX_GAP_COEFFICIENT = 1.5;
    /**
    * Maximum obstacle grouping count.
    * @const
    */
    Obstacle.MAX_OBSTACLE_LENGTH = 3,
    Obstacle.prototype = {
    /**
    * Initialise the DOM for the obstacle.
    * @param {number} speed
    */
    init: function(speed) {
    this.cloneCollisionBoxes();
    // Only allow sizing if we're at the right speed.
    if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
    this.size = 1;
    }
    this.width = this.typeConfig.width * this.size;
    this.xPos = this.dimensions.WIDTH - this.width;
    this.draw();
    // Make collision box adjustments,
    // Central box is adjusted to the size as one box.
    // ____ ______ ________
    // _| |-| _| |-| _| |-|
    // | |<->| | | |<--->| | | |<----->| |
    // | | 1 | | | | 2 | | | | 3 | |
    // |_|___|_| |_|_____|_| |_|_______|_|
    //
    if (this.size > 1) {
    this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
    this.collisionBoxes[2].width;
    this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
    }
    this.gap = this.getGap(this.gapCoefficient, speed);
    },
    /**
    * Draw and crop based on size.
    */
    draw: function() {
    var sourceWidth = this.typeConfig.width;
    var sourceHeight = this.typeConfig.height;
    if (IS_HIDPI) {
    sourceWidth = sourceWidth * 2;
    sourceHeight = sourceHeight * 2;
    }
    // Sprite
    var sourceX = (sourceWidth * this.size) * (0.5 * (this.size - 1));
    this.canvasCtx.drawImage(this.image,
    sourceX, 0,
    sourceWidth * this.size, sourceHeight,
    this.xPos, this.yPos,
    this.typeConfig.width * this.size, this.typeConfig.height);
    },
    /**
    * Obstacle frame update.
    * @param {number} deltaTime
    * @param {number} speed
    */
    update: function(deltaTime, speed) {
    if (!this.remove) {
    this.xPos -= Math.floor((speed * FPS / 1000) * deltaTime);
    this.draw();
    if (!this.isVisible()) {
    this.remove = true;
    }
    }
    },
    /**
    * Calculate a random gap size.
    * - Minimum gap gets wider as speed increses
    * @param {number} gapCoefficient
    * @param {number} speed
    * @return {number} The gap size.
    */
    getGap: function(gapCoefficient, speed) {
    var minGap = Math.round(this.width * speed +
    this.typeConfig.minGap * gapCoefficient);
    var maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
    return getRandomNum(minGap, maxGap);
    },
    /**
    * Check if obstacle is visible.
    * @return {boolean} Whether the obstacle is in the game area.
    */
    isVisible: function() {
    return this.xPos + this.width > 0;
    },
    /**
    * Make a copy of the collision boxes, since these will change based on
    * obstacle type and size.
    */
    cloneCollisionBoxes: function() {
    var collisionBoxes = this.typeConfig.collisionBoxes;
    for (var i = collisionBoxes.length - 1; i >= 0; i--) {
    this.collisionBoxes[i] = new CollisionBox(collisionBoxes[i].x,
    collisionBoxes[i].y, collisionBoxes[i].width,
    collisionBoxes[i].height);
    }
    }
    };
    /**
    * Obstacle definitions.
    * minGap: minimum pixel space betweeen obstacles.
    * multipleSpeed: Speed at which multiples are allowed.
    */
    Obstacle.types = [
    {
    type: 'CACTUS_SMALL',
    className: ' cactus cactus-small ',
    width: 17,
    height: 35,
    yPos: 105,
    multipleSpeed: 3,
    minGap: 120,
    collisionBoxes: [
    new CollisionBox(0, 7, 5, 27),
    new CollisionBox(4, 0, 6, 34),
    new CollisionBox(10, 4, 7, 14)
    ]
    },
    {
    type: 'CACTUS_LARGE',
    className: ' cactus cactus-large ',
    width: 25,
    height: 50,
    yPos: 90,
    multipleSpeed: 6,
    minGap: 120,
    collisionBoxes: [
    new CollisionBox(0, 12, 7, 38),
    new CollisionBox(8, 0, 7, 49),
    new CollisionBox(13, 10, 10, 38)
    ]
    }
    ];
    //******************************************************************************
    /**
    * T-rex game character.
    * @param {HTMLCanvas} canvas
    * @param {HTMLImage} image Character image.
    * @constructor
    */
    function Trex(canvas, image) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.image = image;
    this.xPos = 0;
    this.yPos = 0;
    // Position when on the ground.
    this.groundYPos = 0;
    this.currentFrame = 0;
    this.currentAnimFrames = [];
    this.blinkDelay = 0;
    this.animStartTime = 0;
    this.timer = 0;
    this.msPerFrame = 1000 / FPS;
    this.config = Trex.config;
    // Current status.
    this.status = Trex.status.WAITING;
    this.jumping = false;
    this.jumpVelocity = 0;
    this.reachedMinHeight = false;
    this.speedDrop = false;
    this.jumpCount = 0;
    this.jumpspotX = 0;
    this.init();
    };
    /**
    * T-rex player config.
    * @enum {number}
    */
    Trex.config = {
    DROP_VELOCITY: -5,
    GRAVITY: 0.6,
    HEIGHT: 47,
    INIITAL_JUMP_VELOCITY: -10,
    INTRO_DURATION: 1500,
    MAX_JUMP_HEIGHT: 30,
    MIN_JUMP_HEIGHT: 30,
    SPEED_DROP_COEFFICIENT: 3,
    SPRITE_WIDTH: 262,
    START_X_POS: 50,
    WIDTH: 44
    };
    /**
    * Used in collision detection.
    * @type {Array.<CollisionBox>}
    */
    Trex.collisionBoxes = [
    new CollisionBox(1, -1, 30, 26),
    new CollisionBox(32, 0, 8, 16),
    new CollisionBox(10, 35, 14, 8),
    new CollisionBox(1, 24, 29, 5),
    new CollisionBox(5, 30, 21, 4),
    new CollisionBox(9, 34, 15, 4)
    ];
    /**
    * Animation states.
    * @enum {string}
    */
    Trex.status = {
    CRASHED: 'CRASHED',
    JUMPING: 'JUMPING',
    RUNNING: 'RUNNING',
    WAITING: 'WAITING'
    };
    /**
    * Blinking coefficient.
    * @const
    */
    Trex.BLINK_TIMING = 7000;
    /**
    * Animation config for different states.
    * @enum {object}
    */
    Trex.animFrames = {
    WAITING: {
    frames: [44, 0],
    msPerFrame: 1000 / 3
    },
    RUNNING: {
    frames: [88, 132],
    msPerFrame: 1000 / 12
    },
    CRASHED: {
    frames: [220],
    msPerFrame: 1000 / 60
    },
    JUMPING: {
    frames: [0],
    msPerFrame: 1000 / 60
    }
    };
    Trex.prototype = {
    /**
    * T-rex player initaliser.
    * Sets the t-rex to blink at random intervals.
    */
    init: function() {
    this.blinkDelay = this.setBlinkDelay();
    this.groundYPos = Runner.defaultDimensions.HEIGHT - this.config.HEIGHT -
    Runner.config.BOTTOM_PAD;
    this.yPos = this.groundYPos;
    this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;
    this.draw(0, 0);
    this.update(0, Trex.status.WAITING);
    },
    /**
    * Setter for the jump velocity.
    * The approriate drop velocity is also set.
    */
    setJumpVelocity: function(setting) {
    this.config.INIITAL_JUMP_VELOCITY = -setting;
    this.config.DROP_VELOCITY = -setting / 2;
    },
    /**
    * Set the animation status.
    * @param {!number} deltaTime
    * @param {Trex.status} status Optional status to switch to.
    */
    update: function(deltaTime, opt_status) {
    this.timer += deltaTime;
    // Update the status.
    if (opt_status) {
    this.status = opt_status;
    this.currentFrame = 0;
    this.msPerFrame = Trex.animFrames[opt_status].msPerFrame;
    this.currentAnimFrames = Trex.animFrames[opt_status].frames;
    if (opt_status == Trex.status.WAITING) {
    this.animStartTime = getTimeStamp();
    this.setBlinkDelay();
    }
    }
    // Game intro animation, T-rex moves in from the left.
    if (this.playingIntro && this.xPos < this.config.START_X_POS) {
    this.xPos += Math.round((this.config.START_X_POS /
    this.config.INTRO_DURATION) * deltaTime);
    }
    if (this.status == Trex.status.WAITING) {
    this.blink(getTimeStamp());
    } else {
    this.draw(this.currentAnimFrames[this.currentFrame], 0);
    }
    // Update the frame position.
    if (this.timer >= this.msPerFrame) {
    this.currentFrame = this.currentFrame ==
    this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
    this.timer = 0;
    }
    },
    /**
    * Draw the t-rex to a particular position.
    * @param {number} x
    * @param {number} y
    */
    draw: function(x, y) {
    var sourceX = x;
    var sourceY = y;
    var sourceWidth = this.config.WIDTH;
    var sourceHeight = this.config.HEIGHT;
    if (IS_HIDPI) {
    sourceX *= 2;
    sourceY *= 2;
    sourceWidth *= 2;
    sourceHeight *= 2;
    }
    this.canvasCtx.drawImage(this.image, sourceX, sourceY,
    sourceWidth, sourceHeight,
    this.xPos, this.yPos,
    this.config.WIDTH, this.config.HEIGHT);
    },
    /**
    * Sets a random time for the blink to happen.
    */
    setBlinkDelay: function() {
    this.blinkDelay = Math.ceil(Math.random() * Trex.BLINK_TIMING);
    },
    /**
    * Make t-rex blink at random intervals.
    * @param {number} time Current time in milliseconds.
    */
    blink: function(time) {
    var deltaTime = time - this.animStartTime;
    if (deltaTime >= this.blinkDelay) {
    this.draw(this.currentAnimFrames[this.currentFrame], 0);
    if (this.currentFrame == 1) {
    // Set new random delay to blink.
    this.setBlinkDelay();
    this.animStartTime = time;
    }
    }
    },
    /**
    * Initialise a jump.
    */
    startJump: function() {
    if (!this.jumping) {
    this.update(0, Trex.status.JUMPING);
    this.jumpVelocity = this.config.INIITAL_JUMP_VELOCITY;
    this.jumping = true;
    this.reachedMinHeight = false;
    this.speedDrop = false;
    }
    },
    /**
    * Jump is complete, falling down.
    */
    endJump: function() {
    if (this.reachedMinHeight &&
    this.jumpVelocity < this.config.DROP_VELOCITY) {
    this.jumpVelocity = this.config.DROP_VELOCITY;
    }
    },
    /**
    * Update frame for a jump.
    * @param {number} deltaTime
    */
    updateJump: function(deltaTime) {
    var msPerFrame = Trex.animFrames[this.status].msPerFrame;
    var framesElapsed = deltaTime / msPerFrame;
    // Speed drop makes Trex fall faster.
    if (this.speedDrop) {
    this.yPos += Math.round(this.jumpVelocity *
    this.config.SPEED_DROP_COEFFICIENT * framesElapsed);
    } else {
    this.yPos += Math.round(this.jumpVelocity * framesElapsed);
    }
    this.jumpVelocity += this.config.GRAVITY * framesElapsed;
    // Minimum height has been reached.
    if (this.yPos < this.minJumpHeight || this.speedDrop) {
    this.reachedMinHeight = true;
    }
    // Max height
    if (this.yPos < this.config.MAX_JUMP_HEIGHT || this.speedDrop) {
    this.endJump();
    }
    // Back down at ground level. Jump completed.
    if (this.yPos > this.groundYPos) {
    this.reset();
    this.jumpCount++;
    }
    this.update(deltaTime);
    },
    /**
    * Set the speed drop. Immediately cancels the current jump.
    */
    setSpeedDrop: function() {
    this.speedDrop = true;
    this.jumpVelocity = 1;
    },
    /**
    * Reset the t-rex to running at start of game.
    */
    reset: function() {
    this.yPos = this.groundYPos;
    this.jumpVelocity = 0;
    this.jumping = false;
    this.update(0, Trex.status.RUNNING);
    this.midair = false;
    this.speedDrop = false;
    this.jumpCount = 0;
    }
    };
    //******************************************************************************
    /**
    * Handles displaying the distance meter.
    * @param {!HTMLCanvasElement} canvas
    * @param {!HTMLImage} spriteSheet Image sprite.
    * @param {number} canvasWidth
    * @constructor
    */
    function DistanceMeter(canvas, spriteSheet, canvasWidth) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.image = spriteSheet;
    this.x = 0;
    this.y = 5;
    this.currentDistance = 0;
    this.maxScore = 0;
    this.highScore = 0;
    this.container = null;
    this.digits = [];
    this.acheivement = false;
    this.defaultString = '';
    this.flashTimer = 0;
    this.flashIterations = 0;
    this.config = DistanceMeter.config;
    this.init(canvasWidth);
    };
    /**
    * @enum {number}
    */
    DistanceMeter.dimensions = {
    WIDTH: 10,
    HEIGHT: 13,
    DEST_WIDTH: 11
    };
    /**
    * Y positioning of the digits in the sprite sheet.
    * X position is always 0.
    * @type {array.<number>}
    */
    DistanceMeter.yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];
    /**
    * Distance meter config.
    * @enum {number}
    */
    DistanceMeter.config = {
    // Number of digits.
    MAX_DISTANCE_UNITS: 5,
    // Distance that causes achievement animation.
    ACHIEVEMENT_DISTANCE: 100,
    // Used for conversion from pixel distance to a scaled unit.
    COEFFICIENT: 0.025,
    // Flash duration in milliseconds.
    FLASH_DURATION: 1000 / 4,
    // Flash iterations for achievement animation.
    FLASH_ITERATIONS: 3
    };
    DistanceMeter.prototype = {
    /**
    * Initialise the distance meter to '00000'.
    * @param {number} width Canvas width in px.
    */
    init: function(width) {
    var maxDistanceStr = '';
    this.calcXPos(width);
    this.maxScore = this.config.MAX_DISTANCE_UNITS;
    for (var i = 0; i < this.config.MAX_DISTANCE_UNITS; i++) {
    this.draw(i, 0);
    this.defaultString += '0';
    maxDistanceStr += '9';
    }
    this.maxScore = parseInt(maxDistanceStr);
    },
    /**
    * Calculate the xPos in the canvas.
    * @param {number} canvasWidth
    */
    calcXPos: function(canvasWidth) {
    this.x = canvasWidth - (DistanceMeter.dimensions.DEST_WIDTH *
    (this.config.MAX_DISTANCE_UNITS + 1));
    },
    /**
    * Draw a digit to canvas.
    * @param {number} digitPos Position of the digit.
    * @param {number} value Digit value 0-9.
    * @param {boolean} opt_highScore Whether drawing the high score.
    */
    draw: function(digitPos, value, opt_highScore) {
    var sourceWidth = DistanceMeter.dimensions.WIDTH;
    var sourceHeight = DistanceMeter.dimensions.HEIGHT;
    var sourceX = DistanceMeter.dimensions.WIDTH * value;
    var targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH;
    var targetY = this.y;
    var targetWidth = DistanceMeter.dimensions.WIDTH;
    var targetHeight = DistanceMeter.dimensions.HEIGHT;
    // For high DPI we 2x source values.
    if (IS_HIDPI) {
    sourceWidth *= 2;
    sourceHeight *= 2;
    sourceX *= 2;
    }
    this.canvasCtx.save();
    if (opt_highScore) {
    // Left of the current score.
    var highScoreX = this.x - (this.config.MAX_DISTANCE_UNITS * 2) *
    DistanceMeter.dimensions.WIDTH;
    this.canvasCtx.translate(highScoreX, this.y);
    } else {
    this.canvasCtx.translate(this.x, this.y);
    }
    this.canvasCtx.drawImage(this.image, sourceX, 0,
    sourceWidth, sourceHeight,
    targetX, targetY,
    targetWidth, targetHeight
    );
    this.canvasCtx.restore();
    },
    /**
    * Covert pixel distance to a 'real' distance.
    * @param {number} distance Pixel distance ran.
    * @return {number} The 'real' distance ran.
    */
    getActualDistance: function(distance) {
    return distance ?
    Math.round(distance * this.config.COEFFICIENT) : 0;
    },
    /**
    * Update the distance meter.
    * @param {number} deltaTime
    * @param {number} distance
    * @return {boolean} Whether the acheivement sound fx should be played.
    */
    update: function(deltaTime, distance) {
    var paint = true;
    var playSound = false;
    if (!this.acheivement) {
    distance = this.getActualDistance(distance);
    if (distance > 0) {
    // Acheivement unlocked
    if (distance % this.config.ACHIEVEMENT_DISTANCE == 0) {
    // Flash score and play sound.
    this.acheivement = true;
    this.flashTimer = 0;
    playSound = true;
    }
    // Create a string representation of the distance with leading 0.
    var distanceStr = (this.defaultString +
    distance).substr(-this.config.MAX_DISTANCE_UNITS);
    this.digits = distanceStr.split('');
    } else {
    this.digits = this.defaultString.split('');
    }
    } else {
    // Control flashing of the score on reaching acheivement.
    if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
    this.flashTimer += deltaTime;
    if (this.flashTimer < this.config.FLASH_DURATION) {
    paint = false;
    } else if (this.flashTimer >
    this.config.FLASH_DURATION * 2) {
    this.flashTimer = 0;
    this.flashIterations++;
    }
    } else {
    this.acheivement = false;
    this.flashIterations = 0;
    this.flashTimer = 0;
    }
    }
    // Draw the digits if not flashing.
    if (paint) {
    for (var i = this.digits.length - 1; i >= 0; i--) {
    this.draw(i, parseInt(this.digits[i]));
    }
    }
    this.drawHighScore();
    return playSound;
    },
    /**
    * Draw the high score.
    */
    drawHighScore: function() {
    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = .8;
    for (var i = this.highScore.length - 1; i >= 0; i--) {
    this.draw(i, parseInt(this.highScore[i], 10), true);
    }
    this.canvasCtx.restore();
    },
    /**
    * Set the highscore as a array string.
    * Position of char in the sprite: H - 10, I - 11.
    * @param {number} distance Distance ran in pixels.
    */
    setHighScore: function(distance) {
    distance = this.getActualDistance(distance);
    var highScoreStr = (this.defaultString +
    distance).substr(-this.config.MAX_DISTANCE_UNITS);
    this.highScore = ['10', '11', ''].concat(highScoreStr.split(''));
    },
    /**
    * Reset the distance meter back to '00000'.
    */
    reset: function() {
    this.update(0);
    this.acheivement = false;
    }
    };
    //******************************************************************************
    /**
    * Cloud background item.
    * Similar to an obstacle object but without collision boxes.
    * @param {HTMLCanvasElement} canvas Canvas element.
    * @param {Image} cloudImg
    * @param {number} containerWidth
    */
    function Cloud(canvas, cloudImg, containerWidth) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.image = cloudImg;
    this.containerWidth = containerWidth;
    this.xPos = containerWidth;
    this.yPos = 0;
    this.remove = false;
    this.cloudGap = getRandomNum(Cloud.config.MIN_CLOUD_GAP,
    Cloud.config.MAX_CLOUD_GAP);
    this.init();
    };
    /**
    * Cloud object config.
    * @enum {number}
    */
    Cloud.config = {
    HEIGHT: 14,
    MAX_CLOUD_GAP: 400,
    MAX_SKY_LEVEL: 30,
    MIN_CLOUD_GAP: 100,
    MIN_SKY_LEVEL: 71,
    WIDTH: 46
    };
    Cloud.prototype = {
    /**
    * Initialise the cloud. Sets the Cloud height.
    */
    init: function() {
    this.yPos = getRandomNum(Cloud.config.MAX_SKY_LEVEL,
    Cloud.config.MIN_SKY_LEVEL);
    this.draw();
    },
    /**
    * Draw the cloud.
    */
    draw: function() {
    this.canvasCtx.save();
    var sourceWidth = Cloud.config.WIDTH;
    var sourceHeight = Cloud.config.HEIGHT;
    if (IS_HIDPI) {
    sourceWidth = sourceWidth * 2;
    sourceHeight = sourceHeight * 2;
    }
    this.canvasCtx.drawImage(this.image, 0, 0,
    sourceWidth, sourceHeight,
    this.xPos, this.yPos,
    Cloud.config.WIDTH, Cloud.config.HEIGHT);
    this.canvasCtx.restore();
    },
    /**
    * Update the cloud position.
    * @param {number} speed
    */
    update: function(speed) {
    if (!this.remove) {
    this.xPos -= Math.ceil(speed);
    this.draw();
    // Mark as removeable if no longer in the canvas.
    if (!this.isVisible()) {
    this.remove = true;
    }
    }
    },
    /**
    * Check if the cloud is visible on the stage.
    * @return {boolean}
    */
    isVisible: function() {
    return this.xPos + Cloud.config.WIDTH > 0;
    }
    };
    //******************************************************************************
    /**
    * Horizon Line.
    * Consists of two connecting lines. Randomly assigns a flat / bumpy horizon.
    * @param {HTMLCanvasElement} canvas
    * @param {HTMLImage} bgImg Horizon line sprite.
    * @constructor
    */
    function HorizonLine(canvas, bgImg) {
    this.image = bgImg;
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.sourceDimensions = {};
    this.dimensions = HorizonLine.dimensions;
    this.sourceXPos = [0, this.dimensions.WIDTH];
    this.xPos = [];
    this.yPos = 0;
    this.bumpThreshold = 0.5;
    this.setSourceDimensions();
    this.draw();
    };
    /**
    * Horizon line dimensions.
    * @enum {number}
    */
    HorizonLine.dimensions = {
    WIDTH: 600,
    HEIGHT: 12,
    YPOS: 127
    };
    HorizonLine.prototype = {
    /**
    * Set the source dimensions of the horizon line.
    */
    setSourceDimensions: function() {
    for (var dimension in HorizonLine.dimensions) {
    if (IS_HIDPI) {
    if (dimension != 'YPOS') {
    this.sourceDimensions[dimension] =
    HorizonLine.dimensions[dimension] * 2;
    }
    } else {
    this.sourceDimensions[dimension] =
    HorizonLine.dimensions[dimension];
    }
    this.dimensions[dimension] = HorizonLine.dimensions[dimension];
    }
    this.xPos = [0, HorizonLine.dimensions.WIDTH];
    this.yPos = HorizonLine.dimensions.YPOS;
    },
    /**
    * Return the crop x position of a type.
    */
    getRandomType: function() {
    return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
    },
    /**
    * Draw the horizon line.
    */
    draw: function() {
    this.canvasCtx.drawImage(this.image, this.sourceXPos[0], 0,
    this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
    this.xPos[0], this.yPos,
    this.dimensions.WIDTH, this.dimensions.HEIGHT);
    this.canvasCtx.drawImage(this.image, this.sourceXPos[1], 0,
    this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
    this.xPos[1], this.yPos,
    this.dimensions.WIDTH, this.dimensions.HEIGHT);
    },
    /**
    * Update the x position of an indivdual piece of the line.
    * @param {number} pos Line position.
    * @param {number} increment
    */
    updateXPos: function(pos, increment) {
    var line1 = pos;
    var line2 = pos == 0 ? 1 : 0;
    this.xPos[line1] -= increment;
    this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;
    if (this.xPos[line1] <= -this.dimensions.WIDTH) {
    this.xPos[line1] += this.dimensions.WIDTH * 2;
    this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
    this.sourceXPos[line1] = this.getRandomType();
    }
    },
    /**
    * Update the horizon line.
    * @param {number} deltaTime
    * @param {number} speed
    */
    update: function(deltaTime, speed) {
    var increment = Math.floor(speed * (FPS / 1000) * deltaTime);
    if (this.xPos[0] <= 0) {
    this.updateXPos(0, increment);
    } else {
    this.updateXPos(1, increment);
    }
    this.draw();
    },
    /**
    * Reset horizon to the starting position.
    */
    reset: function() {
    this.xPos[0] = 0;
    this.xPos[1] = HorizonLine.dimensions.WIDTH;
    }
    };
    //******************************************************************************
    /**
    * Horizon background class.
    * @param {HTMLCanvasElement} canvas
    * @param {Array.<HTMLImageElement>} images
    * @param {object} dimensions Canvas dimensions.
    * @param {number} gapCoefficient
    * @constructor
    */
    function Horizon(canvas, images, dimensions, gapCoefficient) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.config = Horizon.config;
    this.dimensions = dimensions;
    this.gapCoefficient = gapCoefficient;
    this.obstacles = [];
    this.horizonOffsets = [0, 0];
    this.cloudFrequency = this.config.CLOUD_FREQUENCY;
    // Cloud
    this.clouds = [];
    this.cloudImg = images.CLOUD;
    this.cloudSpeed = this.config.BG_CLOUD_SPEED;
    // Horizon
    this.horizonImg = images.HORIZON;
    this.horizonLine = null;
    // Obstacles
    this.obstacleImgs = {
    CACTUS_SMALL: images.CACTUS_SMALL,
    CACTUS_LARGE: images.CACTUS_LARGE
    };
    this.init();
    };
    /**
    * Horizon config.
    * @enum {number}
    */
    Horizon.config = {
    BG_CLOUD_SPEED: 0.2,
    BUMPY_THRESHOLD: .3,
    CLOUD_FREQUENCY: .5,
    HORIZON_HEIGHT: 16,
    MAX_CLOUDS: 6
    };
    Horizon.prototype = {
    /**
    * Initialise the horizon. Just add the line and a cloud. No obstacles.
    */
    init: function() {
    this.addCloud();
    this.horizonLine = new HorizonLine(this.canvas, this.horizonImg);
    this.obstaclesPassed = 0;
    },
    /**
    * @param {number} deltaTime
    * @param {number} currentSpeed
    * @param {boolean} updateObstacles Used as an override to prevent
    * the obstacles from being updated / added. This happens in the
    * ease in section.
    */
    update: function(deltaTime, currentSpeed, updateObstacles) {
    this.runningTime += deltaTime;
    this.horizonLine.update(deltaTime, currentSpeed);
    this.updateClouds(deltaTime, currentSpeed);
    if (updateObstacles) {
    this.updateObstacles(deltaTime, currentSpeed);
    }
    },
    /**
    * Update the cloud positions.
    * @param {number} deltaTime
    * @param {number} currentSpeed
    */
    updateClouds: function(deltaTime, speed) {
    var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
    var numClouds = this.clouds.length;
    if (numClouds) {
    for (var i = numClouds - 1; i >= 0; i--) {
    this.clouds[i].update(cloudSpeed);
    }
    var lastCloud = this.clouds[numClouds - 1];
    // Check for adding a new cloud.
    if (numClouds < this.config.MAX_CLOUDS &&
    (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
    this.cloudFrequency > Math.random()) {
    this.addCloud();
    }
    // Remove expired clouds.
    this.clouds = this.clouds.filter(function(obj) {
    return !obj.remove;
    });
    }
    },
    /**
    * Update the obstacle positions.
    * @param {number} deltaTime
    * @param {number} currentSpeed
    */
    updateObstacles: function(deltaTime, currentSpeed) {
    // Obstacles, move to Horizon layer.
    var updatedObstacles = this.obstacles.slice(0);
    for (var i = 0; i < this.obstacles.length; i++) {
    var obstacle = this.obstacles[i];
    obstacle.update(deltaTime, currentSpeed);
    // Clean up existing obstacles.
    if (obstacle.remove) {
    updatedObstacles.shift();
    this.obstaclesPassed++;
    }
    }
    this.obstacles = updatedObstacles;
    if (this.obstacles.length > 0) {
    var lastObstacle = this.obstacles[this.obstacles.length - 1];
    if (lastObstacle && !lastObstacle.followingObstacleCreated &&
    lastObstacle.isVisible() &&
    (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
    this.dimensions.WIDTH) {
    this.addNewObstacle(currentSpeed);
    lastObstacle.followingObstacleCreated = true;
    }
    } else {
    // Create new obstacles.
    this.addNewObstacle(currentSpeed);
    }
    },
    /**
    * Add a new obstacle.
    * @param {number} currentSpeed
    */
    addNewObstacle: function(currentSpeed) {
    var obstacleTypeIndex =
    getRandomNum(0, Obstacle.types.length - 1);
    var obstacleType = Obstacle.types[obstacleTypeIndex];
    var obstacleImg = this.obstacleImgs[obstacleType.type];
    this.obstacles.push(new Obstacle(this.canvasCtx, obstacleType,
    obstacleImg, this.dimensions, this.gapCoefficient, currentSpeed));
    },
    /**
    * Reset the horizon layer.
    * Remove existing obstacles and reposition the horizon line.
    */
    reset: function() {
    this.obstacles = [];
    this.horizonLine.reset();
    this.obstaclesPassed = 0;
    },
    /**
    * Update the canvas width and scaling.
    * @param {number} width Canvas width.
    * @param {number} height Canvas height.
    */
    resize: function(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    },
    /**
    * Add a new cloud to the horizon.
    */
    addCloud: function() {
    this.clouds.push(new Cloud(this.canvas, this.cloudImg,
    this.dimensions.WIDTH));
    }
    };
    })();