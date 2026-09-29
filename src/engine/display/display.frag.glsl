precision highp float;
precision highp int;
precision highp sampler2D;

// Scene already rendered at low resolution (sRGB8: it is read as linear).
uniform sampler2D tSource;
// View origin in device pixels (GL convention) and block size.
uniform vec2 uOrigin;
uniform float uBlock;
uniform vec2 uSourceSize;
// 0 = Millions (not quantized), 1 = palette with dither.
uniform int uQuantize;
uniform vec3 uPaletteLab[16];
uniform vec3 uPaletteRgb[16];
uniform int uPaletteSize;
uniform float uSpread;
// Levels (black, white) applied before the dither.
uniform vec2 uLevels;
// Grading (OKLab chroma, linear exposure) before quantization; (1, 1) = untouched.
uniform vec2 uGrade;
// Threshold dissolve: the pixel shows if its Bayer threshold is below uReveal.
uniform float uReveal;
uniform vec3 uRevealRgb;
// Optional shape mask: 0 = no mask, 1 = ellipse, 2 = rounded rectangle. It is evaluated at the
// center of each block (a stepped edge like the rest of the display); outside it is transparent.
uniform int uMaskShape;
uniform vec2 uViewSize;
uniform float uMaskRadius;

out vec4 fragColor;

// 8×8 Bayer threshold in [0, 1): index from interleaving the reversed bits of (x^y, y).
float bayer8(ivec2 p) {
  int x = p.x & 7;
  int y = p.y & 7;
  int xy = x ^ y;
  int v = ((xy & 1) << 5) | ((y & 1) << 4) | ((xy & 2) << 2) | ((y & 2) << 1) | ((xy & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

vec3 linearToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  vec3 lms = pow(max(vec3(l, m, s), 0.0), vec3(1.0 / 3.0));
  return vec3(
    0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
    1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
    0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z
  );
}

vec3 oklabToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

void main() {
  // Every screen pixel in a block reads the same texel: crisp uBlock×uBlock blocks.
  ivec2 p = ivec2(floor((gl_FragCoord.xy - uOrigin) / uBlock));
  p = clamp(p, ivec2(0), ivec2(uSourceSize) - 1);
  float threshold = bayer8(p);

  if (uMaskShape != 0) {
    vec2 halfSize = uViewSize * 0.5;
    vec2 q = (vec2(p) + 0.5) * uBlock - halfSize;
    float outside;
    if (uMaskShape == 1) {
      vec2 e = q / halfSize;
      outside = dot(e, e) - 1.0;
    } else {
      float r = min(uMaskRadius, min(halfSize.x, halfSize.y));
      vec2 d = abs(q) - (halfSize - r);
      outside = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
    }
    if (outside > 0.0) {
      fragColor = vec4(0.0);
      return;
    }
  }

  if (threshold >= uReveal) {
    fragColor = vec4(uRevealRgb, 1.0);
    return;
  }

  vec3 color = texelFetch(tSource, p, 0).rgb;
  if (uGrade.x != 1.0 || uGrade.y != 1.0) {
    vec3 lab = linearToOklab(color * uGrade.y);
    color = max(oklabToLinear(vec3(lab.x, lab.yz * uGrade.x)), 0.0);
  }
  vec3 srgb = linearToSrgb(color);
  if (uQuantize == 0) {
    fragColor = vec4(srgb, 1.0);
    return;
  }

  srgb = clamp((srgb - uLevels.x) / (uLevels.y - uLevels.x), 0.0, 1.0);
  vec3 dithered = clamp(srgb + (threshold - 0.5) * uSpread, 0.0, 1.0);
  vec3 lab = linearToOklab(srgbToLinear(dithered));
  int best = 0;
  float bestDistance = 1e20;
  for (int i = 0; i < 16; i++) {
    if (i >= uPaletteSize) break;
    vec3 d = lab - uPaletteLab[i];
    float distance2 = dot(d, d);
    if (distance2 < bestDistance) {
      bestDistance = distance2;
      best = i;
    }
  }
  fragColor = vec4(uPaletteRgb[best], 1.0);
}
