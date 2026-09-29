precision highp float;
precision highp int;
precision highp sampler2DArray;

// Source frames, one layer per frame (sRGB8: they are read as linear).
uniform sampler2DArray tSource;
uniform int uLayer;

in vec2 vUv;
out vec4 fragColor;

void main() {
  // Seen from behind it is not mirrored: the frame reads the same from both sides.
  vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
  fragColor = vec4(texture(tSource, vec3(uv, float(uLayer))).rgb, 1.0);
}
