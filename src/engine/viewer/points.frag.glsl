precision highp float;

in vec3 vColor;
out vec4 fragColor;

void main() {
  // Linear: the display pass converts to sRGB and quantizes.
  fragColor = vec4(vColor, 1.0);
}
