#version 430

in vec3 vnormal;
in vec3 vpos;

out vec4 glFragColor;

// Model material properties
uniform vec3 ModelColor = vec3(0.2, 0.2, 0.2);
uniform float SpecularCoefficent = 40;

// Light parameters
uniform vec3 LightDir;
uniform vec3 LightDiffuseIntensity = vec3(0.8, 0.8, 0.8);
uniform vec3 LightAmbientIntensity = vec3(0.15, 0.15, 0.15);
uniform vec3 LightSpecularIntensity = vec3(1.0, 1.0, 1.0);

vec3 shade()
{
	vec3 color = vec3(0.0);

	// ambient
	color += LightAmbientIntensity * ModelColor;

	// diffuse
	vec3 L = -LightDir;

	float diffuseFactor = max(0, dot(normalize(L), vnormal));
	color += clamp(LightDiffuseIntensity * ModelColor * diffuseFactor, 0.0, 1.0);

	// // Blinn - Phong specular shading
	vec3 V = -vpos;
	vec3 H = L + V;
	H = normalize(H);

	float specFactor = pow (max(0, dot(vnormal, H)), SpecularCoefficent);
	color += LightSpecularIntensity * specFactor;

	return color;
}

void main()
{
	glFragColor = vec4(shade(), 1.0);
}

