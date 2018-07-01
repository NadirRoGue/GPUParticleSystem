"use strict";
//out.println();

Synthclipse.debugMode = true;

Synthclipse.setGLVersion(4, 5);
Synthclipse.load("gl-matrix-min.js");

var ParticlesV = "shaders/particles.vert";
var ParticlesG = "shaders/particles.geom";
var ParticlesF = "shaders/particles.frag";
var ParticlesCOMP = "shaders/particles.comp";
var ParticlesSortCOMP = "shaders/particleSort.comp";

var SphereV = "shaders/sphere.vert";
var SphereF = "shaders/sphere.frag";

var ParticleComputeProgram = null;
var ParticleSortProgram = null;
var ParticleRenderProgram = null;
var SphereRenderProgram = null;

//! <group name="Particle System"/>
var ParticleTimeStep = 0.1; //! slider[0.0, 0.01, 1.0];
var ParticlePowerOfTwo = 14;

var PARTICLE_COUNT; 
var WORK_GROUP_SIZE = 256;

var LIFE_TIME = 4.0; //! slider[0.0, 4.0, 20.0]

var POS_X_MIN = -0.5;
var POS_X_MAX = 0.5;

var POS_Y_MIN = -2;
var POS_Y_MAX = -2;

var POS_Z_MIN = -0.5; 
var POS_Z_MAX = 0.5; 

var PARTICLE_ACCELERATION = Native.newVector3(); //! slider[(-5.0,-5.0,-5.0),(0.0,1.0,0.0),(5.0,5.0,5.0)]

var TEXTURE_ATLAS_COLUMNS = 6; //! islider[1, 6, 30]
var TEXTURE_ATLAS_ROWS = 5; //! islider[1, 5, 30]

var COLOR_START_LIFETIME = Native.newColorRGB(); //! color[0.45, 0.45, 0.45]
var COLOR_END_LIFETIME = Native.newColorRGB(); //! color[1.0, 1.0, 1.0]

var SIZE_SPRITE_START_LIFETIME = 0.4; //! slider[0.0, 0.4, 5.0];
var SIZE_SPRITE_END_LIFETIME = 1.5; //! slider[0.0, 1.5, 5.0];

var ParticlePositions = null;
var ParticleVelocities = null;
var ParticleLifeTimes = null;
var SphereCenter = null;
var SphereRadius;

var ParticleSystem = null;
var Sphere = null;

var backgroundColor = Native.newColorRGB(); //! color[0, 0, 0]

var renderable = {};

function random(min, max)
{
	var delta = max - min;
	var random = Math.random() * delta;
	return min + random;
}

function initParticleBuffers()
{
	PARTICLE_COUNT = Math.pow(2, ParticlePowerOfTwo);
	
	SphereRadus = 2.0;
	SphereCenter = new Float32Array(3);
	SphereCenter[0] = 0.0;
	SphereCenter[1] = 2.0;
	SphereCenter[2] = 0.0;
	
	ParticlePositions = new Float32Array(PARTICLE_COUNT * 4);
	ParticleVelocities = new Float32Array(PARTICLE_COUNT * 4);
	ParticleLifeTimes = new Float32Array(PARTICLE_COUNT * 4);
	
	for(var i = 0; i < PARTICLE_COUNT; i++)
	{
		var index = i * 4;
		
		ParticlePositions[index] = random(POS_X_MIN, POS_X_MAX);
		ParticlePositions[index + 1] = random(POS_Y_MIN, POS_Y_MAX);
		ParticlePositions[index + 2] = random(POS_Z_MIN, POS_Z_MAX);
		ParticlePositions[index + 3] = 1.0;
		
		ParticleVelocities[index] = 0.0;
		ParticleVelocities[index + 1] = 0.0;
		ParticleVelocities[index + 2] = 0.0;
		ParticleVelocities[index + 3] = 0.0;
		
		//var lifeIndex = i * 4;
		ParticleLifeTimes[index] = random(0.0, LIFE_TIME);
		ParticleLifeTimes[index + 1] = 0.0;
		ParticleLifeTimes[index + 2] = 0.0;
		ParticleLifeTimes[index + 3] = 0.0;
	}
}

function particleSystem()
{
	var positionBufferId = {};
	var velocitiesBufferId = {};
	var lifeTimeBufferId = {};
	var sourceBufferId = {};
	
	positionBufferId.id = gl.createBuffer();
	gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, positionBufferId.id);
	gl.bufferData(gl.SHADER_STORAGE_BUFFER, ParticlePositions, gl.STATIC_DRAW);
	positionBufferId.itemSize = 4;
	positionBufferId.numItems = PARTICLE_COUNT;
	
	velocitiesBufferId.id = gl.createBuffer();
	gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, velocitiesBufferId.id);
	gl.bufferData(gl.SHADER_STORAGE_BUFFER, ParticleVelocities, gl.STATIC_DRAW);
	velocitiesBufferId.itemSize = 4;
	velocitiesBufferId.numItems = PARTICLE_COUNT;
	
	lifeTimeBufferId.id = gl.createBuffer();
	gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, lifeTimeBufferId.id);
	gl.bufferData(gl.SHADER_STORAGE_BUFFER, ParticleLifeTimes, gl.STATIC_DRAW);
	lifeTimeBufferId.itemSize = 4;
	lifeTimeBufferId.numItems = PARTICLE_COUNT;
	
	sourceBufferId.id = gl.createBuffer();
	gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, sourceBufferId.id);
	gl.bufferData(gl.SHADER_STORAGE_BUFFER, ParticlePositions, gl.STATIC_DRAW);
	sourceBufferId.itemSize = 4;
	sourceBufferId.numItems = PARTICLE_COUNT;
	
	return {
		process: function(Compute) {
			/*if(Debug) {
				gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, positionBufferId.id);
				var content = gl.mapBufferRange(gl.SHADER_STORAGE_BUFFER, 0, PARTICLE_COUNT * 16, gl.MAP_READ_BIT);
				var camPos = CameraManager.getSphericalCamera().getPosition();
				out.println("Cam pos: " + camPos.x + ", " + camPos.y + ", " + camPos.z);
				for(var i = 0; i < PARTICLE_COUNT; i++)
				{	
					var deltaX = camPos.x - content.getFloat();
					var deltaY = camPos.y - content.getFloat();
					var deltaZ = camPos.z - content.getFloat();
					var dist = (deltaX*deltaX + deltaY*deltaY + deltaZ*deltaZ);
					out.println(dist);
					
					var waste = content.getFloat();
				}
				gl.unmapBuffer(gl.SHADER_STORAGE_BUFFER);
			}*/
			
			if(Compute) {
				gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 4, positionBufferId.id);
				gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 5, velocitiesBufferId.id);
				gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 6, lifeTimeBufferId.id);
				gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 7, sourceBufferId.id);
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferId.id);
	    		gl.enableVertexAttribArray(0);
	    		gl.vertexAttribPointer(0, positionBufferId.itemSize, gl.FLOAT, false, 0, 0);
	    		
	    		gl.bindBuffer(gl.ARRAY_BUFFER, lifeTimeBufferId.id);
	    		gl.enableVertexAttribArray(1);
	    		gl.vertexAttribPointer(1, lifeTimeBufferId.itemSize, gl.FLOAT, false, 0, 0);
	    		
	    		gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
			}
    	}
    };
}

function updateParticles()
{
	ParticleComputeProgram.use();
	ParticleComputeProgram.applyUniforms();
	
	ParticleComputeProgram.setUniform("ParticleAcceleration", PARTICLE_ACCELERATION);
	ParticleComputeProgram.setUniformFloat("TimeStep", ParticleTimeStep);
	ParticleComputeProgram.setUniform("SphereCenter", 0.0, 2.0, 0.0);
	ParticleComputeProgram.setUniformFloat("SphereRadius", 2.0);
	ParticleComputeProgram.setUniformFloat("ParticleLifeTime", LIFE_TIME);
	
	ParticleSystem.process(true);
	
	var workGroups = PARTICLE_COUNT / WORK_GROUP_SIZE;
	workGroups = workGroups <= 1? 1 : workGroups;
	
	gl.dispatchCompute(workGroups, 1, 1);
	gl.memoryBarrier(gl.SHADER_STORAGE_BARRIER_BIT);
}

function sortParticles()
{
	ParticleSortProgram.use();
	
	var workGroups = (PARTICLE_COUNT) / WORK_GROUP_SIZE;
	
	for(var i = 0; i < ParticlePowerOfTwo; i++)
	{
		for(var j = 0; j <= i; j++)
		{
			ParticleSortProgram.applyUniforms();
			ParticleSortProgram.setUniformInt("CurrentPowerStep", i);
			ParticleSortProgram.setUniformInt("CurrentStrideStep", j);
			ParticleSortProgram.setUniform("CameraPosition", CameraManager.getSphericalCamera().getPosition());
			
			ParticleSystem.process(true);
			
			gl.dispatchCompute(workGroups, 1, 1);
			gl.memoryBarrier(gl.SHADER_STORAGE_BARRIER_BIT);
		}
	}
}

function renderParticles()
{
	ParticleRenderProgram.use();
	ParticleRenderProgram.applyUniforms();
	ParticleRenderProgram.setUniformFloat("ParticleLifeTime", LIFE_TIME);
	ParticleRenderProgram.setUniformFloat("SpriteStartSize", SIZE_SPRITE_START_LIFETIME);
	ParticleRenderProgram.setUniformFloat("SpriteEndSize", SIZE_SPRITE_END_LIFETIME);
	ParticleRenderProgram.setUniformFloat("TextureAtlastColumns", TEXTURE_ATLAS_COLUMNS);
	ParticleRenderProgram.setUniformFloat("TextureAtlastRows", TEXTURE_ATLAS_ROWS);
	ParticleRenderProgram.setUniform("StartColor", COLOR_START_LIFETIME);
	ParticleRenderProgram.setUniform("EndColor", COLOR_END_LIFETIME);
	ParticleSystem.process(false);
}

function renderSphere()
{
	SphereRenderProgram.use();
	SphereRenderProgram.applyUniforms();
	
	var cam = CameraManager.getSphericalCamera();
	var view = cam.getViewMatrix();
	var tempPos = Native.newVector4();
	tempPos.x = -1;
	tempPos.y = -1;
	tempPos.z = 0;
	tempPos.w = 0.0;
	var CameraLightDir = view.mult(tempPos);
	var finalDir = Native.newVector3();
	finalDir.x = CameraLightDir.x;
	finalDir.y = CameraLightDir.y;
	finalDir.z = CameraLightDir.z;

	SphereRenderProgram.setUniform("ModelMatrix", Sphere.transform);
	SphereRenderProgram.setUniform("LightDir", finalDir);
	
	Sphere.render();
}

function particleScene() 
{	
	updateParticles();
	
	sortParticles();
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, 0);
	gl.clearColor(backgroundColor.r, backgroundColor.g, backgroundColor.b, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	renderSphere();
	
	renderParticles();
}

function drawScene() 
{
	particleScene();
}

function initShaders() 
{
	ParticleComputeProgram = ProgramFactory.createProgram("ParticleComputation");
	ParticleComputeProgram.attachShader(ParticlesCOMP);	
	ParticleComputeProgram.link();
    ParticleComputeProgram.loadPreset("Default");
    
    ParticleSortProgram = ProgramFactory.createProgram("ParticleSorting");
    ParticleSortProgram.attachShader(ParticlesSortCOMP);
    ParticleSortProgram.link();
    ParticleSortProgram.loadPreset("Default");
    
    ParticleRenderProgram = ProgramFactory.createProgram("ParticleRendering");
    ParticleRenderProgram.attachShader(ParticlesV);
    ParticleRenderProgram.attachShader(ParticlesG);
    ParticleRenderProgram.attachShader(ParticlesF);
    ParticleRenderProgram.link();
    ParticleRenderProgram.loadPreset("Default");    
    
    SphereRenderProgram = ProgramFactory.createProgram("SphereRendering");
    SphereRenderProgram.attachShader(SphereV);
    SphereRenderProgram.attachShader(SphereF);
    SphereRenderProgram.link();
    SphereRenderProgram.loadPreset("Default");    
    
    Synthclipse.createScriptControls();
    Synthclipse.loadPreset("Default");
}

renderable.init = function() 
{
	initShaders();
	initParticleBuffers();
	
	ParticleSystem = particleSystem();
	Sphere = GeometryFactory.createSphere(2.0, 32);
	Sphere.transform.translate(0.0, 2.0, 0.0);
	
	var sphericalCamera = CameraManager.getSphericalCamera();
	sphericalCamera.setPosition(0.0, 0.0, -6.0);

	CameraManager.useSphericalCamera();
	CameraManager.setZoomFactor(0.4);
	
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.PROGRAM_POINT_SIZE);
	gl.pointSize(2.0);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};

renderable.display = function() 
{	
	drawScene();
};

Synthclipse.setRenderable(renderable);

/*!
 * <preset name="Default">
 *  backgroundColor = 0.5, 0.5, 0.5
 *  axesLength = 100.0
 *  boxLengthX = 5.0
 *  boxLengthY = 5.0
 *  boxLengthZ = 5.0
 *  coneHeight = 5.0
 *  coneRadius = 3.0
 *  coneTessellation = 32
 *  currentShapeID = 0
 *  cylinderHeight = 5.0
 *  cylinderRadius = 2.0
 *  cylinderTessellation = 32
 *  lineP1 = -10.0, -10.0, -10.0
 *  lineP2 = 10.0, 10.0, 10.0
 *  planeSizeX = 150.0
 *  planeSizeZ = 150.0
 *  planeTessellationX = 20.0
 *  planeTessellationZ = 20.0
 *  quadHalfLength = 4.0
 *  sphereRadius = 3.0
 *  sphereTessellation = 24
 *  teapotTessellation = 4
 *  torusInnerRadius = 1.0
 *  torusKnotDistance = 5.0
 *  torusKnotNumRings = 64
 *  torusKnotNumSegments = 64
 *  torusKnotP = 3
 *  torusKnotQ = 4
 *  torusKnotRadius = 1.0
 *  torusOuterRadius = 2.0
 *  torusRings = 24
 *  torusSides = 24
 *  trefoilSlices = 128
 *  trefoilStacks = 32
 *  wireframeMode = false
 * </preset>
 */

