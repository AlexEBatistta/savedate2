// Pixi texture info
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

// Tint
uniform vec4 uColor;

// on 2D applications
// fwidth = screenScale / glyphAtlasScale * distanceFieldRange
uniform float uFWidth;

// internally it becomes 0 = thick outline, 0.5 = no outline
uniform float uOutlineDistance;
uniform vec3 uOutlineColor;

// becomes 0.04 when we need to fake a bold text, is 0 otherwise
uniform float uFakeBold;

// shadow
uniform vec3 uShadowColor;
uniform vec2 uShadowOffset;

void main(void) {

  // To stack MSDF and SDF we need a non-pre-multiplied-alpha texture.
  vec4 texColor = texture2D(uSampler, vTextureCoord);

  // MSDF
  float median = texColor.r + texColor.g + texColor.b -
                 min(texColor.r, min(texColor.g, texColor.b)) -
                 max(texColor.r, max(texColor.g, texColor.b));
  // SDF
  median = min(median, texColor.a);

  float screenPxDistance = uFWidth * (median - 0.5 + uFakeBold);
  float alpha = clamp(screenPxDistance + 0.5 - uFakeBold, 0.0, 1.0);
  float alphaOutline =
      clamp((uFWidth * (median - uOutlineDistance + uFakeBold)) +
                uOutlineDistance - uFakeBold,
            0.0, 1.0);

  vec3 color = mix(uOutlineColor, uColor.rgb, alpha);

  // Shadow time. This reuses a lot of variables!
  vec4 textColor = vec4(color, alphaOutline);

  texColor = texture2D(uSampler, vTextureCoord + uShadowOffset);

  // MSDF
  median = texColor.r + texColor.g + texColor.b -
           min(texColor.r, min(texColor.g, texColor.b)) -
           max(texColor.r, max(texColor.g, texColor.b));
  // SDF
  median = min(median, texColor.a);

  float alphaShadow =
      clamp((uFWidth * (median - 0.5 + uFakeBold)) + 0.5 - uFakeBold, 0.0, 1.0);

  vec4 shadowColor = vec4(uShadowColor, alphaShadow);

  vec4 outColor = mix(shadowColor, textColor, textColor.a);
  outColor.a = outColor.a * uColor.a; // apply global alpha
  gl_FragColor = outColor;
}