#version 430

layout(location = 0) in vec4 VPos;
layout(location = 1) in vec3 VNormal;

out vec3 vpos;
out vec3 vnormal;

uniform mat4 synth_ViewMatrix;
uniform mat4 synth_ProjectionMatrix;
uniform mat3 synth_NormalMatrix;
uniform mat4 ModelMatrix;

void main()
{
	gl_Position = synth_ProjectionMatrix * synth_ViewMatrix * ModelMatrix * VPos;
	vpos = (synth_ViewMatrix * ModelMatrix * VPos).xyz;
	vnormal = synth_NormalMatrix * VNormal;
}
