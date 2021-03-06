/*
 * Heavily modified http://yomotsu.github.com/threejs-examples/tps/
 * Illustrates:
 *	- Skybox
 *	- Heightmap terrain
 *	- Simple horizon-to-horizon water
 *	- Very Simple character-follows-terrain using Raycaster
 *	- multiplayer support with a websocket server
 */


//Site-specific variables:

//var heightmap = 'spain_500.png';
var heightmap = 'assets/terreno_500.png';
var terrainsegmentsize = 0.25;  //put a heightmap coordinate at every one of these....
// con base de 128 px -> Yelmo 0.4 / Pedriza 1
// con base de 256 px -> Pedriza 0.5
// con base de 500 px -> Pedriza 0.25

//var terraintexture = 'spain_texture_127dpi.png';
var terraintexture = 'assets/foto.jpg';
var water = 'assets/water.jpg';

var charactermesh = 'js/droid.js';
var charactertexture  = 'assets/droidskin.png'
var characterscale = .02;

var websocket_url = 'ws://localhost:7681';
var websocket_protocol = 'lws-mirror-protocol';


var home = { x: 0, y: 0, z: 0 }
var multiplayer = false;


var camera = {
		speed : 500,
		distance : 2,
		x : 0,
		y : 0,
		z : 0
}


var terrainMesh;
var playertemplate;
var players = new Object();

var name;
if (multiplayer) {
	name = prompt("Please enter your name","Zurrasp");
}
else {
	name = 'foo';
}

var playergeometry;
var playermaterial;
var connection;

//var abovefog = new THREE.FogExp2( 0xffffff, 0.003 );
//var belowfog = new THREE.FogExp2( 0x888888, 0.25 );

window.addEventListener( 'DOMContentLoaded', function() {
	var width = window.innerWidth;
	var height = window.innerHeight;
	var clock = new THREE.Clock();

	var scene = new THREE.Scene();
	//scene.fog = abovefog;

	var viewcamera = new THREE.PerspectiveCamera( 70, width / height, 1, 10000 );
	scene.add( viewcamera );

	var light = new THREE.DirectionalLight( 0xffffff, 1.8 ); // 2 es demasiado luminoso
	light.position.set(1, 1, 1 ).normalize();
	light.castShadow = true;


//	var light = new THREE.SpotLight( 0xffffff, 2 );
//	light.position.set( 10, 10, 10 );
//	light.target.position.set( 0, 0, 0 );
//	light.castShadow = true;
//	light.shadowCameraNear = camera.near;
//	light.shadowCameraFar = camera.far;
//	light.shadowCameraFov = camera.fov;
//	light.shadowBias = 0.0001;
//	light.shadowDarkness = 0.3;
//	light.shadowMapWidth  = 1000;
//	light.shadowMapHeight = 1000;
	scene.add( light );

//	var light2 = new THREE.DirectionalLight( 0xffffff );
//	light2.position.set( 1, 1, 1 ).normalize();
//	scene.add( light2 );

	renderer = new THREE.WebGLRenderer();
	renderer.setSize( width, height );
	renderer.shadowMapEnabled = true;
	renderer.shadowMapSoft = true;

//	renderer.shadowCameraNear = camera.near;
//	renderer.shadowCameraFar = camera.far;
//	renderer.shadowCameraFov = 50;
//	renderer.shadowMapBias = 0.0039;
//	renderer.shadowMapDarkness = 0.5;
//	renderer.shadowMapWidth = 500;
//	renderer.shadowMapHeight = 500;
//	renderer.shadowMapEnabled = true;
//	renderer.shadowMapSoft = true;

	document.body.appendChild( renderer.domElement );

	animate();


	//skybox: uncomment one of the following two:


	/**
	 * create skybox: from http://http://learningthreejs.com/blog/2011/08/15/lets-do-a-sky/
	 */

/*
	//order is +x, -x, +y, -y, +z, -z
	var urls = [ 	"skybox3.jpg" , "skybox1.jpg",
			"skyboxup.jpg", "skyboxdn.jpg",
			"skybox0.jpg" , "skybox2.jpg" ];
	var textureCube	= THREE.ImageUtils.loadTextureCube( urls );

	var skyshader	= THREE.ShaderUtils.lib["cube"];
	skyshader.uniforms["tCube"].value = textureCube;  //used to be .texture, r54 migration
	var skymaterial = new THREE.ShaderMaterial({
		fragmentShader	: skyshader.fragmentShader,
		vertexShader	: skyshader.vertexShader,
		uniforms	: skyshader.uniforms,
		depthWrite	: false,			//r54 migration
		side		: THREE.DoubleSide		//r54 migration
	});

	skyboxMesh	= new THREE.Mesh( new THREE.CubeGeometry( 10000, 10000, 10000, 1, 1, 1, null, true ), skymaterial );
	scene.add( skyboxMesh );
*/


	/**
	 * skydome: http://pages.cs.wisc.edu/~lizy/mrdoob-three.js-ef5f05d/examples/webgl_lights_hemisphere.html
	 */

	var skyGeo = new THREE.SphereGeometry( 1000, 32, 15 );
	var skyMat = new THREE.MeshBasicMaterial( {color: 0x66CCFF, side: THREE.BackSide } );
	var sky = new THREE.Mesh( skyGeo, skyMat );
	scene.add( sky );


	/**
	 * create terrain, adapted from http://oos.moxiecode.com/js_webgl/terrain/index.html
	 */


	var img = new Image();
	img.onload = function () {
		var data = getHeightData(img);
		//terrainplane = new THREE.PlaneGeometry( 127, 127, 127, 127);
		terrainplane = new THREE.PlaneGeometry( (img.width-1)*terrainsegmentsize, (img.height-1)*terrainsegmentsize, (img.width-1), (img.height-1));
		terrainplane.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) ); //r54 migration
		for ( var i = 0, l = terrainplane.vertices.length; i < l; i++ ) {
			terrainplane.vertices[i].setY(data[i]);

			//make home the highest point:
			if (data[i] > home.y) {
				home.x = terrainplane.vertices[i].x;
				home.y = terrainplane.vertices[i].y;
				home.z = terrainplane.vertices[i].z;
			}
		}
		terrainMesh = new THREE.Mesh( terrainplane, new THREE.MeshLambertMaterial( { map: THREE.ImageUtils.loadTexture( terraintexture ), color: 0xffffff} ) );
		terrainMesh.wireframe = true;
		scene.add(terrainMesh);
		terrainMesh.visible = true;
	};
	img.src = heightmap;


	function getHeightData(img) {
		var canvas = document.createElement( 'canvas' );
		canvas.width = img.width;
		canvas.height = img.height;
		var context = canvas.getContext( '2d' );
		var size = img.width * img.height;
		var imgdata = new Float32Array( size );
		context.drawImage(img,0,0);
		for ( var i = 0; i < size; i ++ ) {
			imgdata[i] = 0
		}
		var imgd = context.getImageData(0, 0, img.width, img.height);
		var pix = imgd.data;
		var j=0;
		for (var i = 0, n = pix.length; i < n; i += (4)) {
			var all = pix[i]+pix[i+1]+pix[i+2];
			imgdata[j++] = all/30;

		}
		return imgdata;
	}


	// grid
	/*	var grid = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000, 50, 50 ),
				new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } ) );
		grid.rotation.x = -Math.PI / 2;
		grid.position.set(0, 5, 0);
		scene.add( grid );
	*/

	/**
	 * water, topside and underside views
	 */

	var topsideGeometry = new THREE.CircleGeometry(1000,50);
	topsideGeometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );
	var topsideMaterial = new THREE.MeshPhongMaterial( { color: 0x996699 } );
	var watertopside = new THREE.Mesh(topsideGeometry, topsideMaterial);
	watertopside.position.y = -1;
	watertopside.castShadow = false;
	watertopside.receiveShadow = true;
	scene.add( watertopside );

	var undersideGeometry = new THREE.CircleGeometry(1000,50);
	var undersideMaterial = new THREE.MeshPhongMaterial( { color: 0xFF9900 } );
	var waterunderside = new THREE.Mesh(undersideGeometry, undersideMaterial);
	waterunderside.applyMatrix( new THREE.Matrix4().makeRotationX( - (Math.PI /2)*3 ) );
	waterunderside.material.transparent = true;
	waterunderside.material.opacity = .5;
	waterunderside.position.y = -1;
	scene.add( waterunderside );



	function makeConnection() {
		connection = new WebSocket(websocket_url, websocket_protocol);
		connection.onopen = function(){
			console.log('Connection open!');
			connection.send(JSON.stringify(players[name].getStateRounded()));
		}
		connection.onclose = function(){
			console.log('Connection closed!');
			for (var p in players) {
				if (p != name) {
					scene.remove(players[p].object);
					delete players[p];
				}
			}
		}
		connection.onmessage = function(msg) {
			var obj = JSON.parse(msg.data);
			if (obj.name == name) return;
			if (obj.delete) {
				if (obj.delete == name) return;
				console.log("deleting: "+obj.delete);
				scene.remove(players[obj.delete].object);
				delete players[obj.delete];
				return;
			}
			if (obj.refresh) {
				connection.send(JSON.stringify(players[name].getState()));
				return;
			}
			if (obj.name in players) {
				players[obj.name].setState(obj);
			}
			else {
				//make a new guest
				players[obj.name] = new Dude(obj.name, playergeometry, playermaterial);
				players[obj.name].setState(obj);
				scene.add(players[obj.name].object);
				connection.send(JSON.stringify(players[name].getState()));
			}
			//console.log(msg.data);
		}
	}


	/**
	 * load md2 model
	 */


	function changeMotion(motion){
		player.model.motion = motion;
		player.model.state = md2frames[motion][3].state;
		var animMin = md2frames[motion][0];
		var animMax = md2frames[motion][1];
		var animFps = md2frames[motion][2];
		player.model.object.time = 0;
		player.model.object.duration = 1000 * (( animMax - animMin ) / animFps);
		player.model.object.setFrameRange( animMin, animMax );
	}


	playermaterial = new THREE.MeshLambertMaterial( { map: THREE.ImageUtils.loadTexture( charactertexture ), ambient: 0x999999, color: 0xffffff, specular: 0xffffff, shininess: 25, morphTargets: true } );


	var loader = new THREE.JSONLoader();
	loader.load( charactermesh, function( geometry ) {

		playergeometry = geometry;
		//playermaterial = new THREE.MeshLambertMaterial( { map: THREE.ImageUtils.loadTexture( 'droidskin.png' ), ambient: 0x999999, color: 0xffffff, specular: 0xffffff, shininess: 25, morphTargets: true } );


		players[name] = new Dude(name, geometry, playermaterial);
		players[name].changeMotion('stand');
		players[name].object.scale.set(characterscale, characterscale, characterscale);
		scene.add(players[name].object);
		//scene.add(players[name].sign);

		players[name].setPosition(-19,58,terrainMesh,0);
		//players[name].object.position.y = 14;  //need to move setPosition, above, to somewhere that'll see the terrain when refreshed from a caching web server...

		if (multiplayer) {
			makeConnection();
		}
		document.getElementById('position').innerHTML = Math.round(players[name].object.position.x*100)/100+" "+Math.round(players[name].object.position.y*100)/100+" "+Math.round(players[name].object.position.z*100)/100+" ";

	} );


	/**
	 * crouch toggle action
	 */
	document.addEventListener('keydown',function(e){
		if( !/67/.test(e.keyCode)){ return } //c key
		if(players[name].state === 'stand'){
			players[name].changeMotion('crstand');
		}else if(players[name].state === 'crstand'){
			players[name].changeMotion('stand');
		}
		if (multiplayer && connection.readyState == 1) connection.send(JSON.stringify(players[name].getState()));
	}, false);


	/**
	 * toggle connection
	 */
	document.addEventListener('keydown',function(e){
		if ( !/88/.test(e.keyCode)){ return } //x key
		if (multiplayer && connection) {
			if (connection.readyState == 3) {
				makeConnection();
			}
			if (connection.readyState == 1) {
				var msg = { "delete" : name };
				connection.send(JSON.stringify(msg));
				connection.close(1000);
			}
		}
	}, false);


	/**
	 * refresh guest states
	 */
	document.addEventListener('keydown',function(e){
		if ( !/82/.test(e.keyCode)){ return } //r key
		var msg = { "refresh": yes };
		if (multiplayer && connection.readyState == 1) connection.send(JSON.stringify(msg));

	}, false);

	/**
	 * move
	 */


	function teleportHome() {
		//players[name].setPosition(home.x, home.z, terrainMesh, 0);
		players[name].object.position.x = home.x;
		players[name].object.position.y = home.y+.5;
		players[name].object.position.z = home.z;
		document.getElementById('position').innerHTML = Math.round(players[name].object.position.x*100)/100+" "+Math.round(players[name].object.position.y*100)/100+" "+Math.round(players[name].object.position.z*100)/100+" ";
	}

	var moveState = {
		moving    : false,
		front     : false,
		Backwards : false,
		left      : false,
		right     : false,
		speed     : .4,
		angle     : 0
	}


	function move(){
		if(players[name].motion !== 'run' && players[name].state === 'stand'){
			players[name].changeMotion('run');
		}
		if(players[name].motion !== 'crwalk' && players[name].state === 'crstand'){
			players[name].changeMotion('crwalk');
		}
		var speed = moveState.speed;
		if(players[name].state === 'crstand'){speed *= .5;}
		if(players[name].state === 'freeze') {speed *= 0;}

		var direction = moveState.angle;
		if( moveState.front && !moveState.left && !moveState.Backwards && !moveState.right){direction +=   0}
		if( moveState.front &&  moveState.left && !moveState.Backwards && !moveState.right){direction +=  45}
		if(!moveState.front &&  moveState.left && !moveState.Backwards && !moveState.right){direction +=  90}
		if(!moveState.front &&  moveState.left &&  moveState.Backwards && !moveState.right){direction += 135}
		if(!moveState.front && !moveState.left &&  moveState.Backwards && !moveState.right){direction += 180}
		if(!moveState.front && !moveState.left &&  moveState.Backwards &&  moveState.right){direction += 225}
		if(!moveState.front && !moveState.left && !moveState.Backwards &&  moveState.right){direction += 270}
		if( moveState.front && !moveState.left && !moveState.Backwards &&  moveState.right){direction += 315}



		/*   //not working yet...
		var x = players[name].object.x - Math.sin(direction * Math.PI / 180) * speed;
		var z = players[name].object.z - Math.cos(direction * Math.PI / 180) * speed;
		players[name].setPosition(x, z, terrainMesh, (direction+270) * Math.PI / 180);
		*/


		players[name].object.rotation.y = (direction+270) * Math.PI / 180;
		players[name].direction = direction;
		players[name].object.position.x -= Math.sin(direction * Math.PI / 180) * speed;
		players[name].object.position.z -= Math.cos(direction * Math.PI / 180) * speed;

		var vec = new THREE.Vector3( 0, -1, 0 );
		var pos = new THREE.Vector3(players[name].object.position.x, players[name].object.position.y+2, players[name].object.position.z);
		var raycaster = new THREE.Raycaster(pos, vec);
		var intersects = raycaster.intersectObject(terrainMesh);
		if (intersects.length>0) players[name].object.position.y = intersects[0].point.y+.5;
		var rndstate = players[name].getStateRounded();
		if (multiplayer && connection.readyState == 1) connection.send(JSON.stringify(rndstate));
		document.getElementById('position').innerHTML = rndstate.x+" "+rndstate.y+" "+rndstate.z+" ";
	}


	var timer;

	document.addEventListener('keydown', function(e){
		if( !/65|68|83|87|38|40|37|39/.test(e.keyCode)){ console.log(e.keyCode); return }
		if( e.keyCode === 87 | e.keyCode === 38){
			moveState.front     = true;
			moveState.Backwards = false;
		} else if ( e.keyCode === 83 | e.keyCode === 40){
			moveState.Backwards = true;
			moveState.front     = false;
		} else if ( e.keyCode === 65 | e.keyCode === 37){
			moveState.left  = true;
			moveState.right = false;
		} else if ( e.keyCode === 68 | e.keyCode === 39){
			moveState.right = true;
			moveState.left  = false;
		}
		if(!moveState.moving){
			if(players[name].state === 'stand')  {players[name].changeMotion('run');}
			if(players[name].state === 'crstand'){players[name].changeMotion('crwalk');}
			moveState.moving = true;
			move();
			timer = setInterval( function(){
				move();
			}, 1000 / 60);
		}
		if (multiplayer && connection.readyState == 1) connection.send(JSON.stringify(players[name].getStateRounded()));
	}, false);

	document.addEventListener('keyup', function(e){
		if( !/65|68|83|87|38|40|37|39|84/.test(e.keyCode)){ return }
		if( e.keyCode === 87 | e.keyCode === 38){
			moveState.front = false;
		} else if ( e.keyCode === 83 | e.keyCode === 40 ){
			moveState.Backwards = false;
		} else if ( e.keyCode === 65 | e.keyCode === 37){
			moveState.left = false;
		} else if ( e.keyCode === 68  | e.keyCode === 39){
			moveState.right = false;
		} else if (e.keyCode === 84 ) {
			moveState.front = false;
			moveState.Backwards = false;
			moveState.left = false;
			moveState.right = false;
			teleportHome();
		}
		if(!moveState.front && !moveState.Backwards && !moveState.left && !moveState.right){
			players[name].changeMotion(players[name].state);
			moveState.moving = false;
			clearInterval(timer);
		}
		if (multiplayer && connection.readyState == 1) connection.send(JSON.stringify(players[name].getStateRounded()));
	}, false);




	/**
	 * camera rotation
	 */
	var getElementPosition = function(element) {
		var top = left = 0;
		do {
			top  += element.offsetTop  || 0;
			left += element.offsetLeft || 0;
			element =  element.offsetParent;
		}
		while (element);
		return {top: top, left: left};
	}

	function startMoving() {
		moveState.front = true;
		if(!moveState.moving){
			if(players[name].state === 'stand')  {players[name].changeMotion('run');}
			if(players[name].state === 'crstand'){players[name].changeMotion('crwalk');}
			moveState.moving = true;
			move();
			timer = setInterval( function(){
				move();
			}, 1000 / 60);
			if (multiplayer && connection.readyState == 1) connection.send(JSON.stringify(players[name].getState()));
		}
	}

	function stopMoving() {
		moveState.front = false;
		if(!moveState.front && !moveState.Backwards && !moveState.left && !moveState.right){
			if(players[name].state === 'run')  {players[name].changeMotion('stand');}
			if(players[name].state === 'crwalk'){players[name].changeMotion('crstand');}
			players[name].changeMotion(players[name].state);
			moveState.moving = false;
			clearInterval(timer);
			if (multiplayer && connection.readyState == 1) connection.send(JSON.stringify(players[name].getState()));
		}
	}


	var oldPointerX = oldPointerY = 0;
	var pointer = {x : 0, y : 0};
	document.addEventListener('touchstart', function (e) {
		if (e.targetTouches.length == 1) {
			var touch = e.targetTouches[0];
			var mouseX = touch.clientX - getElementPosition(renderer.domElement).left;
			var mouseY = touch.clientY - getElementPosition(renderer.domElement).top;
			pointer.x =   (mouseX / renderer.domElement.width) * 2 - 1;
			pointer.y = - (mouseY / renderer.domElement.height) * 2 + 1;
			oldPointerX = pointer.x;
			oldPointerY = pointer.y;
			if (touch.pageY / window.innerHeight > .9) startMoving();
			document.addEventListener('touchmove', rotate, false);
		}
	}, false );

	document.addEventListener('touchend', function(e) {
		stopMoving();
		document.removeEventListener('touchmove', rotate, false);
	}, false);

	document.addEventListener('touchmove', function(e) {
		e.preventDefault();
		if (e.targetTouches.length == 1) {
			var touch = e.targetTouches[0];
			var mouseX = touch.clientX - getElementPosition(renderer.domElement).left;
			var mouseY = touch.clientY - getElementPosition(renderer.domElement).top;
			pointer.x =   (mouseX / renderer.domElement.width) * 2 - 1;
			pointer.y = - (mouseY / renderer.domElement.height) * 2 + 1;
		}
	}, false);


	document.addEventListener('mousemove', function(e){
		var mouseX = e.clientX - getElementPosition(renderer.domElement).left;
		var mouseY = e.clientY - getElementPosition(renderer.domElement).top;
		pointer.x =   (mouseX / renderer.domElement.width) * 2 - 1;
		pointer.y = - (mouseY / renderer.domElement.height) * 2 + 1;
	}, false);


	document.addEventListener('touchstart', rotateStart, false);
	document.addEventListener('mousedown', rotateStart, false);
	function rotateStart() {
		oldPointerX = pointer.x;
		oldPointerY = pointer.y;
		renderer.domElement.addEventListener('mousemove', rotate, false);
		renderer.domElement.addEventListener('mouseup', rotateStop, false);
		renderer.domElement.addEventListener('touchmove', rotate, false);
		renderer.domElement.addEventListener('touchend', rotateStop, false);
	}
	function rotateStop() {
		renderer.domElement.removeEventListener('mousemove', rotate, false);
		renderer.domElement.removeEventListener('mouseup', rotateStop, false);
		renderer.domElement.removeEventListener('touchmove', rotate, false);
		renderer.domElement.removeEventListener('touchend', rotateStop, false);
	}

	function rotate(){
		camera.x += (oldPointerX - pointer.x) * camera.speed;
		camera.y += (oldPointerY - pointer.y) * camera.speed;
		if(camera.y > 150){
			camera.y = 150;
		}
		if(camera.y < 0){
			camera.y = 0;
		}

		moveState.angle = (camera.x / 2) % 360;

		oldPointerX = pointer.x;
		oldPointerY = pointer.y;
	}

	document.addEventListener ('mousewheel', zoom, false);
	document.addEventListener ('DOMMouseScroll', zoom, false);
	var prevtime = 0;
	function zoom(event) {
		var d = event.timeStamp - prevtime;
		if (d > 100) d = 1;
		else if (d > 50) d = 2;
		else if (d > 25) d = 3;
		else d = 4;
		d *= (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
		prevtime = event.timeStamp;
		camera.distance = (camera.distance -d < 1.5) ? 1.5 : camera.distance - d;
	}


	window.addEventListener( 'resize', onWindowResize, false );
	function onWindowResize() {

		viewcamera.aspect = window.innerWidth / window.innerHeight;
		viewcamera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

	}

	function setCamera(object) {
		// camera rotate x & z
		viewcamera.position.x = object.position.x + camera.distance * Math.sin( (camera.x) * Math.PI / 360 );
		viewcamera.position.z = object.position.z + camera.distance * Math.cos( (camera.x) * Math.PI / 360 );

		//camera rotate y
		viewcamera.position.y = object.position.y + camera.distance * Math.sin( (camera.y) * Math.PI / 360 );

		var vec3 = new THREE.Vector3( object.position.x,  object.position.y+.5,  object.position.z)
		viewcamera.lookAt(vec3);

	}


	/**
	 * render
	 */
	function animate(){
		requestAnimationFrame( animate );
		var delta = clock.getDelta();
		var isEndFrame;
		var isAction;
		var plist = name;

		for (var p in players) {
			if (p === name)
				setCamera(players[p].object);
			else
				plist = plist+","+p;
			players[p].animate(delta);
		}
		document.getElementById('players').innerHTML = plist;

		if (multiplayer && connection) {
			if (connection.readyState == 0) {
				document.getElementById('help').innerHTML = 'connecting...';
			}
			else if (connection.readyState == 1) {
				document.getElementById('help').innerHTML = 'connected';
			}
			else if (connection.readyState == 2) {
				document.getElementById('help').innerHTML = 'closing...';
			}
			else if (connection.readyState == 3) {
				document.getElementById('help').innerHTML = 'disconnected';
			}
			else {
				document.getElementById('help').innerHTML = 'unknown';
			}
		}

		/*if (viewcamera.position.y < 3)
			scene.fog = belowfog;
		else
			scene.fog = abovefog;
		*/

		renderer.render( scene, viewcamera );
	}

}, false);