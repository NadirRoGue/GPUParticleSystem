#version 430

layout(location = 0) in vec4 ParticlePos;
layout(location = 1) in vec4 ParticleLifeTime;

out vec3 Color;
out float lifeTime;

uniform mat4 synth_ViewMatrix;
//uniform mat4 synth_ProjectionMatrix;

void main()
{
	gl_Position = synth_ViewMatrix * ParticlePos;
	//gl_Position = ParticlePos;
	lifeTime = ParticleLifeTime.x;
}
