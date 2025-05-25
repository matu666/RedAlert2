import * as THREE from 'three';

export const paletteShaderLib = {
  uniforms: {
    palette: { type: "t", value: null },
    paletteOffsetCount: { value: [0, 1] },
    extraLight: { value: new THREE.Vector3(0, 0, 0) },
  },
  instanceParsVertex: `
#ifdef INSTANCE_TRANSFORM
    attribute float instancePaletteOffset;
    varying float vInstancePaletteOffset;
    attribute vec3 instanceExtraLight;
    varying vec3 vInstanceExtraLight;
#endif
`,
  instanceVertex: `
  #ifdef INSTANCE_TRANSFORM
    vInstancePaletteOffset = instancePaletteOffset;
    vInstanceExtraLight = instanceExtraLight;
  #endif
`,
  paletteColorParsVertex: `
#ifdef VERTEX_PALETTE_OFFSET
    attribute float vertexPaletteOffset;
    varying float vVertexPaletteOffset;
#endif
`,
  paletteColorVertex: `
  #ifdef VERTEX_PALETTE_OFFSET
    vVertexPaletteOffset = vertexPaletteOffset;
  #endif
`,
  paletteColorParsFrag: `
uniform sampler2D palette;
#ifdef VERTEX_PALETTE_OFFSET
    varying float vVertexPaletteOffset;
#endif
uniform vec2 paletteOffsetCount;
uniform vec3 extraLight;

#ifdef INSTANCE_TRANSFORM
varying float vInstancePaletteOffset;
varying vec3 vInstanceExtraLight;
#endif
`,
  paletteColorFrag: `
  float paletteColorIndex;

  #ifdef USE_MAP
  paletteColorIndex = texelColor.r;
  #endif

  #ifdef USE_COLOR
  paletteColorIndex = vColor.r;
  #endif

  // 确保调色板索引在有效范围内
  paletteColorIndex = clamp(paletteColorIndex, 0.0, 1.0);
  
  // 调试：如果调色板索引为0，显示为红色以便调试
  // if (paletteColorIndex < 0.01) {
  //   diffuseColor = vec4(1.0, 0.0, 0.0, 1.0);
  //   return;
  // }

  #ifdef INSTANCE_TRANSFORM
  diffuseColor = texture2D(palette, vec2(paletteColorIndex, (vInstancePaletteOffset + 0.5) / paletteOffsetCount.y));
  #elif defined(VERTEX_PALETTE_OFFSET)
  diffuseColor = texture2D(palette, vec2(paletteColorIndex, (vVertexPaletteOffset + 0.5) / paletteOffsetCount.y));
  #else
  diffuseColor = texture2D(palette, vec2(paletteColorIndex, (paletteOffsetCount.x + 0.5) / paletteOffsetCount.y));
  #endif

  #ifdef INSTANCE_OPACITY
  diffuseColor.a *= vInstanceOpacity * opacity;
  #else
  diffuseColor.a *= opacity;
  #endif
  diffuseColor = clamp(diffuseColor, 0.0, 1.0);
`,
  paletteBasicLightFragment: `
  #ifdef INSTANCE_TRANSFORM
  diffuseColor.rgb += vInstanceExtraLight.rgb * diffuseColor.rgb;
  #else
  diffuseColor.rgb += extraLight.rgb * diffuseColor.rgb;
  #endif

  diffuseColor = clamp(diffuseColor, 0.0, 1.0);
`,
  paletteFullLightFragment: `
  #ifdef INSTANCE_TRANSFORM
  vec3 extraIrradiance = vInstanceExtraLight.rgb;
  #else
  vec3 extraIrradiance = extraLight.rgb;
  #endif

  #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
    #pragma unroll_loop
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
      directionalLight = directionalLights[ i ];
      getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );

      directLight.color = extraIrradiance;
      RE_Direct( directLight, geometry, material, reflectedLight );
    }
  #endif

  #if defined( RE_IndirectDiffuse )
  RE_IndirectDiffuse( extraIrradiance, geometry, material, reflectedLight );
  #endif
`,
  vertexColorMultParsVertex: `
#ifdef USE_VERTEX_COLOR_MULT
attribute vec4 vertexColorMult;
varying vec4 vVertexColorMult;
#endif
`,
  vertexColorMultVertex: `
  #ifdef USE_VERTEX_COLOR_MULT
  vVertexColorMult = vertexColorMult;
  #endif
`,
  vertexColorMultParsFrag: `
#ifdef USE_VERTEX_COLOR_MULT
varying vec4 vVertexColorMult;
#endif
`,
  vertexColorMultFrag: `
  #ifdef USE_VERTEX_COLOR_MULT
  diffuseColor.rgba *= vVertexColorMult.rgba;
  #endif
`,
};
  