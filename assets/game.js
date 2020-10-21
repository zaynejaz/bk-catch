(function(){

    /* DOM elements */
    var container     = $( '#container' ),
        field         = $( '#playfield' ),
        player        = $( '#player' ),
        intro         = $( '#intro' ),
        instructions  = $( '#instructions' ),
        leftbutton    = $( '.left' ),
        rightbutton   = $( '.right' ),
        scoredisplay  = $( '#score output' ),
        energydisplay = $( '#energy output' ),
        canvas        = $( 'canvas' ),
        over          = $( '#gameover' ),
        overmsg       = over.querySelector( '.message' ),
        characters    = document.querySelectorAll( 'li.introdeck' ),
        c             = canvas.getContext( '2d' ),
        startenergy   = +energydisplay.innerHTML;
  
    /* Game data */
    var scores = { 
          energy: startenergy 
        },
        playerincrease = +player.getAttribute( 'data-increase' );
  
    /* counters, etc */
    var score = 0, gamestate = null, x = 0, sprites = [], allsprites = [],
        spritecount = 0, now = 0, old = null, playerY = 0, offset = 0,
        width = 0, height = 0, levelincrease = 0, i=0 , storedscores = null,
        initsprites = 0, newsprite = 500, rightdown = false, leftdown = false;
    /* 
      Setting up the game
    */
  
    function init() {
      var current, sprdata, scoreinfo, i, j;
  
      /* retrieve sprite data from HTML */
      sprdata = document.querySelectorAll( 'img.sprite' );
      i = sprdata.length;
      while (i--) {
        current = {};
        current.effects = [];
        current.img = sprdata[ i ];
        current.offset = sprdata[ i ].offsetWidth / 2;
        scoreinfo = sprdata[ i ].getAttribute( 'data-collision' ).split(',');
        j = scoreinfo.length;
        while ( j-- ) {
          var keyval = scoreinfo[ j ].split( ':' );
          current.effects.push( {
            effect: keyval[ 0 ],
            value: keyval[ 1 ]
          } );
        }
        current.type = sprdata[ i ].getAttribute ('data-type');
        allsprites.push( current );
      }
      spritecount = allsprites.length;
      initsprites = +$( '#characters' ).getAttribute( 'data-countstart' );
      newsprite = +$( '#characters' ).getAttribute( 'data-newsprite' );
  
      /* make game keyboard enabled */
      container.tabIndex = -1;
      container.focus();
  
      /* Assign event handlers */
      container.addEventListener( 'keydown', onkeydown, false );
      container.addEventListener( 'keyup', onkeyup, false );
      container.addEventListener( 'touchstart', ontouchstart, false );
      container.addEventListener( 'touchend', ontouchend, false );
      container.addEventListener( 'click', onclick, false );
      container.addEventListener( 'mousemove', onmousemove, false );
      window.addEventListener( 'resize', handleResize, false );
  
      //display buttons if on a mobile device
      if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        document.getElementById('buttons').style.display = 'block';
      }
  
      /* Get the game score, or preset it when there isn't any  */
      if( localStorage.html5catcher ) {
        storedscores = JSON.parse( localStorage.html5catcher );
      } else {
        storedscores = { last: 0, high: 0 };
        localStorage.html5catcher = JSON.stringify( storedscores );
      }
    
      /* show the intro */
      showintro();
      
  
    };
    
    /* Event Handlers */ 
  
    /* Click handling */ 
    function onclick( ev ) {
      var t = ev.target;
      if ( gamestate === 'gameover' ) {
        if ( t.id === 'replay' ) { showintro(); }
      }
      if ( t.className === 'next' ) { instructionsnext(); }
      if ( t.className === 'endinstructions' ) { instructionsdone(); }
      if ( t.id === 'instructionbutton' ) { showinstructions(); }
      if ( t.id === 'playbutton' ) { startgame(); }
      ev.preventDefault();
    }
  
    /* Keyboard handling */
    function onkeydown( ev ) {
      if ( ev.keyCode === 39 ) { rightdown = true; }
      else if ( ev.keyCode === 37 ) { leftdown = true; }
    }
    function onkeyup( ev ) {
      if ( ev.keyCode === 39 ) { rightdown = false; }
      else if ( ev.keyCode === 37 ) { leftdown = false; }
    }
    
    /* Touch handling */
    function ontouchstart( ev ) {
      if ( gamestate === 'playing' ) { ev.preventDefault(); }
      if ( ev.target === rightbutton ) { rightdown = true; }
      else if ( ev.target === leftbutton ) { leftdown = true; }
    }
    function ontouchend( ev ) {
      if ( gamestate === 'playing' ) { ev.preventDefault(); }
      if ( ev.target === rightbutton ) { rightdown = false; }
      else if ( ev.target === leftbutton ) { leftdown = false; }
    }
  
    /* Orientation handling */
    function tilt (ev) {
      if(ev.gamma < 0) { x = x - 2; }
      if(ev.gamma > 0) { x = x + 2; }
      if ( x < offset ) { x = offset; }
      if ( x > width-offset ) { x = width-offset; }
    }
  
    /* Mouse handling */
    function onmousemove ( ev ) {
      var mx = ev.clientX - container.offsetLeft;
      if ( mx < offset ) { mx = offset; }
      if ( mx > width-offset ) { mx = width-offset; }
      x = mx;
    }
  
    /* 
      Introduction
    */ 
    function showintro() {
      setcurrent( intro );
      gamestate = 'intro';
      var scoreelms = intro.querySelectorAll( 'output' );
      scoreelms[ 0 ].innerHTML = storedscores.last;
      scoreelms[ 1 ].innerHTML = storedscores.high;
    }
  
    /* 
      Instructions
    */ 
    function showinstructions() {
      setcurrent( instructions );
      gamestate = 'instructions';
      now = 0;
      characters[ now ].className = 'current';
    }
    
    /* action when left is activated */
    function instructionsdone() {
      characters[ now ].className = 'introdeck';
      now = 0;
      showintro();
    }
  
    /* action when right is activated */
    function instructionsnext() {
      if ( characters[ now + 1 ] ) {
        now = now + 1;
      }
      if ( characters[ now ] ) {
        characters[ now - 1 ].className = 'introdeck';
        characters[ now ].className = 'current';
      }
    }
  
    function handleResize() {
      width = field.offsetWidth;
      height = field.offsetHeight;
      canvas.width = width;
      canvas.height = height;
      playerY = height - player.offsetHeight;
      playerX = width/2;
      console.log('resizing');
    }
  
    /*
      Start the game 
    */
    function startgame() {
      setcurrent( field );
      gamestate = 'playing';
      document.body.className = 'playing';
      width = field.offsetWidth;
      height = field.offsetHeight;
      canvas.width = width;
      canvas.height = height;
      playerY = height - player.offsetHeight; 
      offset = player.offsetWidth / 2; 
      x = width / 2;
      sprites = [];
      for ( i = 0; i < initsprites; i++ ) {
        sprites.push( addsprite() );
      }
      scores.energy = startenergy;
      levelincrease = 0;
      score = 0;
      energydisplay.innerHTML = startenergy;
      loop();
    }
  
    /* 
      The main game loop
    */
    function loop() {
      c.clearRect( 0, 0, width, height );
  
      /* render and update sprites */
      j = sprites.length;
      for ( i=0; i < j ; i++ ) {
        sprites[ i ].render(); 
        sprites[ i ].update();
      }
  
      /* show scores */
      energydisplay.innerHTML = scores.energy;
      scoredisplay.innerHTML = ~~(score/10);
      score++;
  
      /* with increasing score, add more sprites */
      if ( ~~(score/newsprite) > levelincrease ) {
        sprites.push( addsprite() );
        levelincrease++;
      } 
  
      /* position player*/
      if( rightdown ) { playerright(); }
      if( leftdown ) { playerleft(); }
  
      c.save(); 
      c.translate( x-offset, playerY );
      c.drawImage( player, 0, 0 );
      c.restore();
  
      /* when you still have energy, render next, else game over */
      scores.energy = Math.min( scores.energy, 100 );
      if ( scores.energy > 0 ) {
        requestAnimationFrame( loop );
      } else {
        gameover();
      }
    };
  
    /* action when left is activated */
    function playerleft() {
      x -= playerincrease;
      if (x < offset) { x = offset; }
    }
  
    /* action when left is activated */
    function playerright() {
      x += playerincrease;
      if (x > width - offset) { x = width - offset; }
    }
  
    /* 
      Game over
    */
    function gameover() {
      document.body.className = 'gameover';
      setcurrent( over );
      gamestate = 'gameover';
      var nowscore =  ~~(score/10);
      over.querySelector( 'output' ).innerHTML = nowscore;
      storedscores.last = nowscore;
      if ( nowscore > storedscores.high ) {
        overmsg.innerHTML = overmsg.getAttribute('data-highscore');
        storedscores.high = nowscore;
      }
      localStorage.html5catcher = JSON.stringify(storedscores);
    }
  
    /* 
      Helper methods 
    */
  
    /* Particle system */
    function sprite() {
      this.px = 0; 
      this.py = 0; 
      this.vx = 0; 
      this.vy = 0; 
      this.goodguy = false;
      this.height = 0;
      this.width = 0;
      this.effects = [];
      this.img = null; 
      this.update = function() {
        this.px += this.vx;
        this.py += this.vy;
        if ( ~~(this.py + 10) > playerY ) {
          if ( (x - offset) < this.px && this.px < (x + offset) ) {
            this.py = -200;
            i = this.effects.length;
            while ( i-- ) {
              scores[ this.effects[ i ].effect ] += +this.effects[ i ].value;
            }
          }
        } 
        if ( this.px > (width - this.offset) || this.px < this.offset ) {
          this.vx = -this.vx;
        }
        if ( this.py > height + 100 ) {
          if ( this.type === 'good' ) {
            i = this.effects.length;
            while ( i-- ) {
              scores[ this.effects[ i ].effect ] -= +this.effects[ i ].value;
            }
          }
          setspritedata( this );
        }
      };
      this.render = function() {
        c.save(); 
        c.translate( this.px, this.py );
        c.translate( this.width * -0.5, this.height * -0.5 );
        c.drawImage( this.img, 0, 0) ;
        c.restore();
      };
    };
  
    function addsprite() {
      var s = new sprite(); 
      setspritedata( s );
      return s;
    };
    
    function setspritedata( sprite ) {
      var r = ~~rand( 0, spritecount );
      sprite.img = allsprites[ r ].img;
      sprite.height = sprite.img.offsetHeight;
      sprite.width = sprite.img.offsetWidth;
      sprite.type = allsprites[ r ].type;
      sprite.effects = allsprites[ r ].effects;
      sprite.offset = allsprites[ r ].offset;
      sprite.py = -100;
      sprite.px = rand( sprite.width / 2, width - sprite.width / 2  );
      sprite.vx = rand( -1, 2 );
      sprite.vy = rand( 1, 5 );
    };
  
    /* yeah, yeah... */
    function $( str ) { 
      return document.querySelector( str );
    };
  
    /* Get a random number between min and max */
    function rand( min, max ) {
      return ( (Math.random() * (max-min)) + min ); 
    };
  
    /* Show the current part of the game and hide the old one */
    function setcurrent(elm) {
      if (old) { old.className = ''; }
      elm.className = 'current';
      old = elm;
    };
  
    /* Detect and set requestAnimationFrame */
    if ( !window.requestAnimationFrame ) {
      window.requestAnimationFrame = (function() {
        return window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function( callback, element ) {
          window.setTimeout( callback, 1000 / 60 );
        };
      })();
    }
  
    /* off to the races */
    init();
  })();