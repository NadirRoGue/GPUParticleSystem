#version 430

in vec2 uv;
in float life;

out vec4 glFragColor;

uniform sampler2D Texture; //! texture["textures/smoke.png"]

uniform float ParticleLifeTime;
uniform float TextureAtlastColumns;
uniform float TextureAtlastRows;

uniform vec3 StartColor;
uniform vec3 EndColor;

void main()
{
	float lifeTimeStep = ParticleLifeTime / (TextureAtlastColumns * TextureAtlastRows);

	float currentStep = floor(life/lifeTimeStep);

	float row = floor(currentStep / TextureAtlastColumns);
	float column = mod(currentStep, TextureAtlastColumns);

	float uStep = 1.0 / TextureAtlastColumns;
	float vStep = 1.0 / TextureAtlastRows;

	float beginTextureU = uStep * column;
	float beginTextureV = vStep * row;

	float finalU = beginTextureU + uStep * uv.x;
	float finalV = beginTextureV + vStep * uv.y;

	vec4 color = texture(Texture, vec2(finalU, finalV));
	if(color.a < 0.1)
		discard;

	float alpha = life/ParticleLifeTime;
	vec3 particleColor = mix(StartColor, EndColor, alpha);

	glFragColor = vec4(color.rgb * particleColor, color.a);
}
