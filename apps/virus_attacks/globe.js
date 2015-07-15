/**
* dat.globe Javascript WebGL Globe Toolkit
* http://dataarts.github.com/dat.globe
*
* Copyright 2011 Data Arts Team, Google Creative Lab
*
* Licensed under the Apache License, Version 2.0 (the 'License');
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*/

function pct( chance100 ) {
	return Math.floor(Math.random()*100) < chance100;
}

function rndi( min, max ) {
	return Math.floor(Math.random()*(max-min)) + min;
}

function rndf( min, max ) {
	return Math.random()*(max-min) + min;
}

function toHex2(c) {
	var hex = (c*255).toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
	return "#" + toHex2(r) + toHex2(g) + toHex(b);
}

function rgbToInt(r, g, b) {
	return Math.floor( ((r*255)<<16) + ((g*255)<<8) + (b*255) );
}

function sphereToVector3(lat,lng) {
	var phi = (90 - lat) * Math.PI / 180;
	var theta = (180 - lng) * Math.PI / 180;

	return new THREE.Vector3(
		Math.sin(phi) * Math.cos(theta),
		Math.cos(phi),
		Math.sin(phi) * Math.sin(theta)
	);
}



var DAT = DAT || {};

DAT.Globe = function(container, opts) {
	var world = this;
	opts = opts || {};

	var colorFn = opts.colorFn || function(x) {
		var c = new THREE.Color();
		c.setHSL( ( 0.6 - ( x * 0.5 ) ), 1.0, 0.5 );
		return c;
	};
	var imgDir = ''; // opts.imgDir || '/globe/';

	var Shaders = {
		'earth' : {
			uniforms: {
				'texture': { type: 't', value: null }
			},
			vertexShader: [
				'varying vec3 vNormal;',
				'varying vec2 vUv;',
				'void main() {',
					'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
					'vNormal = normalize( normalMatrix * normal );',
					'vUv = uv;',
				'}'
			].join('\n'),
			fragmentShader: [
				'uniform sampler2D texture;',
				'varying vec3 vNormal;',
				'varying vec2 vUv;',
				'void main() {',
					'vec3 diffuse = texture2D( texture, vUv ).xyz;',
					'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
					'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
					'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
				'}'
			].join('\n')
		},
		'atmosphere' : {
			uniforms: {},
			vertexShader: [
				'varying vec3 vNormal;',
				'void main() {',
					'vNormal = normalize( normalMatrix * normal );',
					'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
				'}'
			].join('\n'),
			fragmentShader: [
				'varying vec3 vNormal;',
				'void main() {',
					'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
					'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
				'}'
			].join('\n')
		}
	};

	var camera, scene, renderer, w, h;
	var mesh, atmosphere, point;
	var worldMesh;

	var overRenderer;

	var curZoomSpeed = 0;
	var zoomSpeed = 50;
	var earthRadius = 200;

	var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
	var rotation = { x: 0, y: 0 },
			target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
			targetOnDown = { x: 0, y: 0 };

	var distance = 100000, distanceTarget = 100000;
	var padding = 40;
	var PI_HALF = Math.PI / 2;

	function init() {

		container.style.color = '#fff';
		container.style.font = '13px/20px Arial, sans-serif';

		var shader, uniforms, material;
		w = container.offsetWidth || window.innerWidth;
		h = container.offsetHeight || window.innerHeight;

		camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
		camera.position.z = distance;

		scene = new THREE.Scene();

		var geometry = new THREE.SphereGeometry(earthRadius, 40, 30);

		shader = Shaders['earth'];
		uniforms = THREE.UniformsUtils.clone(shader.uniforms);

		uniforms['texture'].value = THREE.ImageUtils.loadTexture(imgDir+'world1.jpg');

		material = new THREE.ShaderMaterial({
					uniforms: uniforms,
					vertexShader: shader.vertexShader,
					fragmentShader: shader.fragmentShader

				});

		mesh = new THREE.Mesh(geometry, material);
		mesh.rotation.y = Math.PI;
		worldMesh = mesh;
		scene.add(mesh);

		shader = Shaders['atmosphere'];
		uniforms = THREE.UniformsUtils.clone(shader.uniforms);

		material = new THREE.ShaderMaterial({

					uniforms: uniforms,
					vertexShader: shader.vertexShader,
					fragmentShader: shader.fragmentShader,
					side: THREE.BackSide,
					blending: THREE.AdditiveBlending,
					transparent: true

				});

		mesh = new THREE.Mesh(geometry, material);
		mesh.scale.set( 1.1, 1.1, 1.1 );
		scene.add(mesh);

		geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
		geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,-0.5));

		point = new THREE.Mesh(geometry);

		renderer = new THREE.WebGLRenderer({antialias: true});
		renderer.setSize(w, h);

		renderer.domElement.style.position = 'absolute';

		container.appendChild(renderer.domElement);

		container.addEventListener('mousedown', onMouseDown, false);

		container.addEventListener('mousewheel', onMouseWheel, false);

		document.addEventListener('keydown', onDocumentKeyDown, false);

		window.addEventListener('resize', onWindowResize, false);

		container.addEventListener('mouseover', function() {
			overRenderer = true;
		}, false);

		container.addEventListener('mouseout', function() {
			overRenderer = false;
		}, false);
	}

	function addData(data, opts) {
		var lat, lng, size, color, i, step, colorFnWrapper;

		opts.animated = opts.animated || false;
		this.is_animated = opts.animated;
		opts.format = opts.format || 'magnitude'; // other option is 'legend'
		if (opts.format === 'magnitude') {
			step = 3;
			colorFnWrapper = function(data, i) { return colorFn(data[i+2]); }
		} else if (opts.format === 'legend') {
			step = 4;
			colorFnWrapper = function(data, i) { return colorFn(data[i+3]); }
		} else {
			throw('error: format not supported: '+opts.format);
		}

		var clipPointCount = 200000;
		var clipSize = 0.02;
		function skip(size) { return size < clipSize; }

		if (opts.animated) {
			if (this._baseGeometry === undefined) {
				this._baseGeometry = new THREE.Geometry();
				for (i = 0; i < Math.min(clipPointCount,data.length); i += step) {
					if( skip(data[i+2]) ) {
						continue;
					}
					lat = data[i];
					lng = data[i + 1];
//				size = data[i + 2];
					color = colorFnWrapper(data,i);
					size = 0;
					addPoint(lat, lng, size, color, this._baseGeometry);
				}
			}
			if(this._morphTargetId === undefined) {
				this._morphTargetId = 0;
			} else {
				this._morphTargetId += 1;
			}
			opts.name = opts.name || 'morphTarget'+this._morphTargetId;
		}
		var subgeo = new THREE.Geometry();
		for (i = 0; i < Math.min(clipPointCount,data.length); i += step) {
			if( skip(data[i+2]) ) {
				continue;
			}
			lat = data[i];
			lng = data[i + 1];
			color = colorFnWrapper(data,i);
			size = data[i + 2];
			size = size * earthRadius;
			addPoint(lat, lng, size, color, subgeo);
		}
		if (opts.animated) {
			this._baseGeometry.morphTargets.push({'name': opts.name, vertices: subgeo.vertices});
		} else {
			this._baseGeometry = subgeo;
		}

	};

	function createPoints() {
		if (this._baseGeometry !== undefined) {
			if (this.is_animated === false) {
				this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
							color: 0xffffff,
							vertexColors: THREE.FaceColors,
							morphTargets: false
						}));
			} else {
				if (this._baseGeometry.morphTargets.length < 8) {
					console.log('t l',this._baseGeometry.morphTargets.length);
					var padding = 8-this._baseGeometry.morphTargets.length;
					console.log('padding', padding);
					for(var i=0; i<=padding; i++) {
						console.log('padding',i);
						this._baseGeometry.morphTargets.push({'name': 'morphPadding'+i, vertices: this._baseGeometry.vertices});
					}
				}
				this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
							color: 0xffffff,
							vertexColors: THREE.FaceColors,
							morphTargets: true
						}));
			}
			scene.add(this.points);
		}
	}

	var Ballistics = function() {
		var config = {
			shot: {
				size: 1.5,
				speed: { min: 0.01, max: 0.01 },
				speedMax: 100,
				color: {
					r: { min: 1, max: 1 },
					g: { min: 0.0, max: 0.2 },
					b: { min: 0.0, max: 0.2 }
				},
				acceleration: 20.0,
				closeEnough: 4,
				trail: 3,
				altitude: 200,
				rise: 20
			},
			burst: {
				altitude: 200,
				speed: 6,
				size: { start: 1, end: 8 }
			},
			flash: {
				color: { r:1, g:1, b:1 },
				size: 3,
				life: 0.1
			},
			safe: {
				color: { r:0.4, g:1, b:0.4 },
				size: 2,
				life: 3
			},
			timeBetweenShots: 0.1
		}


		var running = false;
		var shotList = [];
		var t_last = 0;
		var dt = 0;
		var library = {
			material: {},
			mesh: {}
		};

		// create custom material from the shader code above
		//   that is within specially labeled script tags
		library.material.glow = function(colorInt) {
			return new THREE.ShaderMaterial({
				uniforms: {
					"c":   { type: "f", value: 0.3 },
					"p":   { type: "f", value: 1.7 },
					glowColor: { type: "c", value: new THREE.Color(colorInt) },
					viewVector: { type: "v3", value: camera.position }
				},
				vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
				fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
				side: THREE.FrontSide,
				blending: THREE.AdditiveBlending,
				transparent: true
			});
		}

		library.material.mono = function(colorInt) {
			return new THREE.MeshBasicMaterial({
				color: colorInt,
				//wireframe: true
			});
		}

		library.material.flat = function(colorInt,opacity) {
			return new THREE.MeshBasicMaterial({
				color: colorInt,
				shading: THREE.SmoothShading,
				fog: true,
				transparent: true,
				opacity: opacity,
				side: THREE.FrontSide,
				//blending: THREE.AdditiveBlending,
				//wireframe: true
			});
		}

		library.material.line = function(colorInt) {
			return new THREE.LineBasicMaterial({
				color: colorInt
			});
		}

		library.mesh.shot = function(param) {
			var geometry = new THREE.SphereGeometry(1, 2, 2);

			var colorInt = rgbToInt(param.color.r,param.color.g,param.color.b)
			var mesh = new THREE.Mesh( geometry, library.material.flat( colorInt, 0.6) );

			mesh.scale.x = param.size;
			mesh.scale.y = param.size;
			mesh.scale.z = param.size;
			mesh.onTick = function() {
				// this is for use if you try to use 'glow' instead of flat. But glow
				// is not always compatible with end user machines...
//				mesh.material.uniforms.viewVector.value =
//				new THREE.Vector3().subVectors( camera.position, mesh.position );
			}


			return mesh;
		}

		library.mesh.burst = function(param) {
			var geometry = new THREE.SphereGeometry(1, 16, 8);
			var colorInt = rgbToInt(param.color.r,param.color.g,param.color.b)
			var mesh = new THREE.Mesh( geometry, library.material.flat( colorInt, 1.0 ) );
			mesh.scale.x = param.size;
			mesh.scale.y = param.size;
			mesh.scale.z = param.size;

			mesh.onTick = function() {
			}

			return mesh;
		}

		library.mesh.flash = function(param) {
			var geometry = new THREE.SphereGeometry(1, 8, 4);
			var colorInt = rgbToInt(param.color.r,param.color.g,param.color.b)
			var mesh = new THREE.Mesh( geometry, library.material.flat( colorInt, 0.9 ) );
			mesh.scale.x = param.size;
			mesh.scale.y = param.size;
			mesh.scale.z = param.size;

			mesh.onTick = function() {
			}

			return mesh;
		}

		library.mesh.safe = function(param) {
			var geometry = new THREE.TorusGeometry( 1, 0.2, 6, 12 );	// radius, diam, radial segments, tube segments
			var colorInt = rgbToInt(param.color.r,param.color.g,param.color.b)
			var mesh = new THREE.Mesh( geometry, library.material.flat( colorInt, 1.0 ) );
			mesh.scale.x = param.size;
			mesh.scale.y = param.size;
			mesh.scale.z = param.size;

			mesh.onTick = function() {
			}

			return mesh;
		}

		var line = null;
/*
		var line = {};
		function lineExtend(sig,p) {
			if( !sig ) { return; }
			if( !line[sig] ) {
				line[sig] = {
					mesh: new THREE.Line(new THREE.Geometry(), library.material.line(0xffffff)),
					last: p.clone()
				};
			}

			if( line[sig].last.distanceTo(p) > 20 ) {
				line[sig].last = p.clone();
				line[sig].mesh.geometry.vertices.push( line[sig].last );
				line[sig].mesh.geometry.verticesNeedUpdate = true;
				if( line[sig].mesh.geometry.vertices.length == 2 ) {
					scene.add(line[sig].mesh);
				}
			}
		}
*/

		function Shot(start,target,anim,callback) {
			var self = this;
			var mesh;

			function init() {
				start.p = sphereToVector3(start.lat,start.lng);
				target.p = sphereToVector3(target.lat,target.lng);

				for( var k in start ) {
					self[k] = start[k];
				}
				self.signature = 'p'+self.lat+'_'+self.lng+'_'+target.lat+'_'+target.lng;
				self.targetSignature = 't'+target.lat+'_'+target.lng;
				mesh = library.mesh[self.mesh](self);
				scene.add(mesh);
			}
			init();


			self.remove = function() {
				for( var i=0 ; i<meshHistory.length ; ++i ) {
					scene.remove(meshHistory[i]);
					delete meshHistory[i];
				}
				scene.remove(mesh);
				delete start;
				delete self.color;
				delete self.mesh.geometry;
				delete self.mesh.material;
				delete self.mesh;
			}

			function calcDistance(x,y) {
				return Math.sqrt(x*x+y*y);
			}

			var meshHistory = [];
			var halfTrip = 0;
			var pairSignature;

			self['fly'] = function() {
				if( !halfTrip ) {
					var delta = target.p.clone();
					delta.sub( self.p );
					halfTrip = delta.length() / 2;
				}

				if( meshHistory.length > config.shot.trail ) {
					var kill = meshHistory.shift();
					scene.remove(kill);
					delete kill;
				}
				var m = mesh.clone();
				scene.add(m);
				meshHistory.push(m);

				var delta = target.p.clone();
				delta.sub( self.p );
				var rawLength = delta.length();

				var length = rawLength * earthRadius;
				self.speed += self.speed >= config.shot.speedMax ? 0 : config.shot.acceleration * dt;
				delta.multiplyScalar( (dt * self.speed) / length );
				self.p.add( delta );
				self.p.normalize();
				var p = self.p;

				var alt = config.shot.altitude;
				var d = Math.abs( halfTrip - rawLength ) / halfTrip;
				alt += config.shot.rise * Math.cos( Math.PI/2*d );
				//var oldPosition = mesh.position.clone();
				mesh.position.set( p.x*alt, p.y*alt, p.z*alt );

				if( line ) {
					if( !pairSignature && pairSignature != "X" ) {
						pairSignature = self.signature;
						if( line[pairSignature] ) {
							pairSignature = 'X';
						}
					}

					if( pairSignature != 'X' ) {
						lineExtend( pairSignature, mesh.position );
					}
				}

				if( !self.kill && length < config.shot.closeEnough ) {
					self.lat = target.lat;
					self.lng = target.lng;
					self.kill = true;
					callback(self);
				}
			}

			self['flash'] = function() {
				var p = sphereToVector3( self.lat, self.lng );
				var alt = config.burst.altitude;
				mesh.position.set( p.x*alt, p.y*alt, p.z*alt );
				mesh.lookAt( worldMesh.position );

				mesh.scale.x = self.size;
				mesh.scale.y = self.size;
				mesh.scale.z = self.size;

				mesh.material.opacity = ( self.life / start.life );
				mesh.material.needsUpdate = true;

				self.life -= dt;

				if( !self.kill && self.life < 0  ) {
					self.kill = true;
					callback(self);
				}
			}


			self['burst'] = function() {
				dSize = target.size - self.size;
				self.size += dt * self.speed * (dSize < 0 ? -1 : 1);

				var p = sphereToVector3( self.lat, self.lng );
				var alt = config.burst.altitude;
				mesh.position.set( p.x*alt, p.y*alt, p.z*alt );
				mesh.scale.x = self.size;
				mesh.scale.y = self.size;
				mesh.scale.z = self.size;

				mesh.material.opacity = 1 - ( self.size / target.size );
				mesh.material.needsUpdate = true;

				if( !self.kill && Math.abs(dSize) < 1 ) {
					self.kill = true;
					callback(self);
				}
			}

			self.tick = function() {
				self[anim]();
				mesh.onTick();
			}

			return self;
		}

		var spot = {
			none: {
				list: []
			},
			america: {
				lat: {min:26.0,max:48.6},
				lng: {min:-125.8,max:-67.8},
				list: []
			}
		};
		function spotRemember(lat,lng,size) {
			var country = 'none';
			for( c in spot ) {
				var r = spot[c];
				if( r.lat &&
					lat >= r.lat.min && lat <= r.lat.max &&
					lng >= r.lng.min && lng <= r.lng.max ) {
					country = c;
					break;
				}
			}
			while( size > 0 ) {
				spot[country].list.push({lat,lng});
				size -= 0.05;
			}
		}

		var originHistory = [];
		var targetHistory = [];

		function spotPick(history,maxHistory,avoid,country) {
			country = country || 'none';
			if( history.length > maxHistory ) {
				history.shift();
			}
			var s;
			if( history.length == maxHistory && pct(90) ) {
				var reps = 6;
				do {
					s = history[rndi(0,history.length)];
				} while( reps-- && s == avoid );
				if( s == avoid ) { s = null; }
			}
			if( !s ) {
				s = spot[country].list[rndi(0,spot[country].list.length)];
				history.push(s);
			}

			return s;
		}

		function nop() { }

		var safeList = {};

		function actionBurstOrSafe(shot) {
			if( safeList[shot.targetSignature] === undefined ) {
				safeList[shot.targetSignature] = pct(25);
			}

			if( safeList[shot.targetSignature] ) {
				shotList.push( new Shot({
					lat:shot.lat,
					lng:shot.lng,
					mesh: 'safe',
					size:config.safe.size,
					color:config.safe.color,
					life: config.safe.life
				},{
					size:config.safe.size.end
				},'flash',nop) );
				return;
			}

			shotList.push( new Shot({
				lat:shot.lat,
				lng:shot.lng,
				mesh: 'burst',
				size:config.burst.size.start,
				color:shot.color,
				speed:config.burst.speed
			},{
				size:config.burst.size.end
			},'burst',nop) );

		}

		function actionFire(origin,size,color,speed,target) {
			shotList.push( new Shot({
				lat:origin.lat,
				lng:origin.lng,
				mesh: 'shot',
				size:size,
				color:color,
				speed:speed
			},target,'fly',actionBurstOrSafe) );

			shotList.push( new Shot({
				lat:origin.lat,
				lng:origin.lng,
				mesh: 'flash',
				size: config.flash.size,
				color: config.flash.color,
				life: config.flash.life
			},target,'flash',nop) );

		}

		var timeSinceShot = 0;
		var latest = {};

		function tick() {

			function advanceTime() {
				var t_now = (new Date()).getTime() / 1000;
				if( t_last == 0 ) {
					t_last = t_now - 0.05;
				}
				dt = Math.min(1.0,t_now - t_last);
				t_last = t_now;
			}

			function fireShots() {
				timeSinceShot += dt;
				if( timeSinceShot > config.timeBetweenShots ) {
					var origin = spotPick(originHistory,6);
					var target;
					var signature = 'a'+origin.lat+'_'+origin.lng;
					if( latest[signature] && pct(80) ) {
						target = latest[signature];
					}
					else {
						target = spotPick(targetHistory,20,target,'america');
						latest[signature] = target;
					}
					var color = {
						r: rndf(config.shot.color.r.min,config.shot.color.r.max),
						g: rndf(config.shot.color.g.min,config.shot.color.g.max),
						b: rndf(config.shot.color.b.min,config.shot.color.b.max)
					};
					var speed = rndf( config.shot.speed.min, config.shot.speed.max );

					actionFire( origin, config.shot.size, color, speed, target);
					timeSinceShot = 0;
				}
			}

			function moveShots() {
				for( var i=0 ; i<shotList.length ; ++i ) {
					var shot = shotList[i];
					shot.tick();
				}

				shotList = shotList.filter(function (shot) {
					if( shot.kill ) {
						shot.remove();
					}
					return !shot.kill;
				});
			}

			advanceTime();
			fireShots();
			moveShots();
		}

		function init() {
		}

		this.spotRemember = spotRemember;
		this.tick = tick;
		this.init = init;
		return this;
	};

	var ballistics = null;
	var sizeScaler = 0.2;
	function addPoint(lat, lng, size, color, subgeo) {
		if( !ballistics ) {
			ballistics = new Ballistics();
			ballistics.init(subgeo);
		}

		ballistics.spotRemember(lat,lng,size);
		size = size * sizeScaler;

		var phi = (90 - lat) * Math.PI / 180;
		var theta = (180 - lng) * Math.PI / 180;

		point.position.x = earthRadius * Math.sin(phi) * Math.cos(theta);
		point.position.y = earthRadius * Math.cos(phi);
		point.position.z = earthRadius * Math.sin(phi) * Math.sin(theta);

		point.lookAt(mesh.position);

		point.scale.z = Math.max( size, 0.1 ); // avoid non-invertible matrix
		point.updateMatrix();

		for (var i = 0; i < point.geometry.faces.length; i++) {
			point.geometry.faces[i].color = color;
		}
		if(point.matrixAutoUpdate){
			point.updateMatrix();
		}
		subgeo.merge(point.geometry, point.matrix);
	}

	function onMouseDown(event) {
		event.preventDefault();

		container.addEventListener('mousemove', onMouseMove, false);
		container.addEventListener('mouseup', onMouseUp, false);
		container.addEventListener('mouseout', onMouseOut, false);

		mouseOnDown.x = - event.clientX;
		mouseOnDown.y = event.clientY;

		targetOnDown.x = target.x;
		targetOnDown.y = target.y;

		container.style.cursor = 'move';
	}

	function onMouseMove(event) {
		mouse.x = - event.clientX;
		mouse.y = event.clientY;

		var zoomDamp = distance/1000;

		target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
		target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

		target.y = target.y > PI_HALF ? PI_HALF : target.y;
		target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
	}

	function onMouseUp(event) {
		container.removeEventListener('mousemove', onMouseMove, false);
		container.removeEventListener('mouseup', onMouseUp, false);
		container.removeEventListener('mouseout', onMouseOut, false);
		container.style.cursor = 'auto';
	}

	function onMouseOut(event) {
		container.removeEventListener('mousemove', onMouseMove, false);
		container.removeEventListener('mouseup', onMouseUp, false);
		container.removeEventListener('mouseout', onMouseOut, false);
	}

	function onMouseWheel(event) {
		event.preventDefault();
		if (overRenderer) {
			zoom(event.wheelDeltaY * 0.3);
		}
		return false;
	}

	function onDocumentKeyDown(event) {
		switch (event.keyCode) {
			case 38:
				zoom(100);
				event.preventDefault();
				break;
			case 40:
				zoom(-100);
				event.preventDefault();
				break;
		}
	}

	function onWindowResize( event ) {
		camera.aspect = container.offsetWidth / container.offsetHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( container.offsetWidth, container.offsetHeight );
	}

	function zoom(delta) {
		distanceTarget -= delta;
		distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
		distanceTarget = distanceTarget < 100 ? 100 : distanceTarget;
	}

	function animate() {
		requestAnimationFrame(animate);
		render();
	}

	function render() {
		zoom(curZoomSpeed);

		rotation.x += (target.x - rotation.x) * 0.1;
		rotation.y += (target.y - rotation.y) * 0.1;
		distance += (distanceTarget - distance) * 0.3;

		ballistics.tick();

		camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
		camera.position.y = distance * Math.sin(rotation.y);
		camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

		camera.lookAt(mesh.position);

		renderer.render(scene, camera);
	}

	init();
	this.animate = animate;


	this.__defineGetter__('time', function() {
		return this._time || 0;
	});

	this.__defineSetter__('time', function(t) {
		var validMorphs = [];
		var morphDict = this.points.morphTargetDictionary;
		for(var k in morphDict) {
			if(k.indexOf('morphPadding') < 0) {
				validMorphs.push(morphDict[k]);
			}
		}
		validMorphs.sort();
		var l = validMorphs.length-1;
		var scaledt = t*l+1;
		var index = Math.floor(scaledt);
		for (i=0;i<validMorphs.length;i++) {
			this.points.morphTargetInfluences[validMorphs[i]] = 0;
		}
		var lastIndex = index - 1;
		var leftover = scaledt - index;
		if (lastIndex >= 0) {
			this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
		}
		this.points.morphTargetInfluences[index] = leftover;
		this._time = t;
	});

	this.addData = addData;
	this.createPoints = createPoints;
	this.renderer = renderer;
	this.scene = scene;

	return this;

};
