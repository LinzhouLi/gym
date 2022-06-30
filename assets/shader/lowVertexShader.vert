#version 300 es

precision highp float;
uniform mat4 modelViewMatrix, projectionMatrix;
// uniform vec3 cameraPosition;

in vec3 position;
in vec2 inUV;
in vec3 normal;
in vec3 mcol0, mcol1, mcol2, mcol3;
in vec4 textureIndex;
in float animationIndex; // 动画类型

out vec2 outUV;
out vec3 outNormal;
out vec4 outTextureIndex;
// out vec3 lightDirection;

void main() {

    outUV = inUV;
    outNormal = normal;
    outTextureIndex = textureIndex;

    // lightDirection = normalize(cameraPosition - mcol3);

    mat4 transformMatrix = mat4(
        vec4(mcol0, 0),
        vec4(mcol1, 0),
        vec4(mcol2, 0),
        vec4(mcol3, 1)
    );

    vec3 pos = position;
    if (animationIndex > 5.5) { // 如果是站立动画, 位置向上移动
        pos.y += 1.;
    }
    gl_Position = projectionMatrix * modelViewMatrix * transformMatrix * vec4(pos, 1.0);

}
