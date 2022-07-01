#version 300 es

precision highp float;
uniform sampler2D textureData;
uniform vec2 textureCount; // [row, col]

in vec4 outTextureIndex;
in vec2 outUV;

out vec4 outColor;

vec4 computeTextureColor() { // 贴图颜色

    float u = outUV.x;
    float v = outUV.y;
    if (u > 0.5) u = 1. - u; // 对称
    u = u * 2.;
    float textureIndex = outTextureIndex[0];
    float col = float(int(textureIndex) % int(textureCount[1]));
    float row = (textureIndex - col) / textureCount[1];
    u = (u * 0.95 + col) / textureCount[1];
    v = (v + row) / textureCount[0];
    vec4 color = texture( textureData, vec2(u, v) );
    return color;

}

void main() {

    outColor = vec4(computeTextureColor().xyz * 1.1, 1.);

}
