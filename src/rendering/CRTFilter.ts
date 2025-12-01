/**
 * CRT Screen Effect Filter
 * Creates a retro CRT monitor look with scanlines, vignette, and chromatic aberration
 */

import { Filter, GlProgram } from 'pixi.js';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const fragment = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uScanlineIntensity;
uniform float uScanlineCount;
uniform float uVignetteIntensity;
uniform float uChromaticAberration;
uniform float uNoiseIntensity;
uniform float uCurvature;
uniform float uBrightness;
uniform vec2 uResolution;

// Random noise function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Curve the UV coordinates for CRT bulge effect
vec2 curveUV(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    vec2 offset = abs(uv.yx) / vec2(uCurvature, uCurvature);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

void main() {
    vec2 uv = vTextureCoord;

    // Apply curvature
    if (uCurvature > 0.0) {
        uv = curveUV(uv);
    }

    // Check if we're outside the screen
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        finalColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Chromatic aberration
    vec2 caOffset = vec2(uChromaticAberration / uResolution.x, 0.0);
    float r = texture(uTexture, uv + caOffset).r;
    float g = texture(uTexture, uv).g;
    float b = texture(uTexture, uv - caOffset).b;
    vec3 color = vec3(r, g, b);

    // Scanlines
    float scanline = sin(uv.y * uScanlineCount * 3.14159) * 0.5 + 0.5;
    scanline = pow(scanline, 1.5);
    color *= 1.0 - (uScanlineIntensity * (1.0 - scanline));

    // Horizontal scanline (phosphor simulation)
    float horizontalLine = sin(uv.y * uResolution.y * 0.5 + uTime * 10.0) * 0.02;
    color += horizontalLine;

    // Rolling bar effect (subtle)
    float rollBar = sin(uv.y * 3.14159 * 2.0 - uTime * 0.5) * 0.02 + 0.98;
    color *= rollBar;

    // Vignette
    vec2 vignetteUV = uv * (1.0 - uv.yx);
    float vignette = vignetteUV.x * vignetteUV.y * 15.0;
    vignette = pow(vignette, uVignetteIntensity);
    color *= vignette;

    // Static noise
    float noise = random(uv + fract(uTime)) * uNoiseIntensity;
    color += noise - (uNoiseIntensity * 0.5);

    // Brightness adjustment
    color *= uBrightness;

    // Slight color bleed / glow
    color += color * 0.1;

    finalColor = vec4(color, 1.0);
}
`;

/**
 * CRT Filter configuration
 */
export interface CRTFilterOptions {
  scanlineIntensity?: number;
  scanlineCount?: number;
  vignetteIntensity?: number;
  chromaticAberration?: number;
  noiseIntensity?: number;
  curvature?: number;
  brightness?: number;
}

const defaultOptions: Required<CRTFilterOptions> = {
  scanlineIntensity: 0.15,
  scanlineCount: 720,
  vignetteIntensity: 0.3,
  chromaticAberration: 2.0,
  noiseIntensity: 0.03,
  curvature: 6.0,
  brightness: 1.1,
};

/**
 * CRT Screen Effect Filter
 */
export class CRTFilter extends Filter {
  private _time: number = 0;

  constructor(options: CRTFilterOptions = {}) {
    const opts = { ...defaultOptions, ...options };

    const glProgram = GlProgram.from({
      vertex,
      fragment,
      name: 'crt-filter',
    });

    super({
      glProgram,
      resources: {
        crtUniforms: {
          uTime: { value: 0, type: 'f32' },
          uScanlineIntensity: { value: opts.scanlineIntensity, type: 'f32' },
          uScanlineCount: { value: opts.scanlineCount, type: 'f32' },
          uVignetteIntensity: { value: opts.vignetteIntensity, type: 'f32' },
          uChromaticAberration: { value: opts.chromaticAberration, type: 'f32' },
          uNoiseIntensity: { value: opts.noiseIntensity, type: 'f32' },
          uCurvature: { value: opts.curvature, type: 'f32' },
          uBrightness: { value: opts.brightness, type: 'f32' },
          uResolution: { value: [1280, 720], type: 'vec2<f32>' },
        },
      },
    });
  }

  /**
   * Update the filter (call each frame)
   */
  update(deltaMs: number): void {
    this._time += deltaMs / 1000;
    this.resources.crtUniforms.uniforms.uTime = this._time;
  }

  /**
   * Update resolution
   */
  setResolution(width: number, height: number): void {
    this.resources.crtUniforms.uniforms.uResolution = [width, height];
    this.resources.crtUniforms.uniforms.uScanlineCount = height;
  }

  // Getters and setters for properties

  get scanlineIntensity(): number {
    return this.resources.crtUniforms.uniforms.uScanlineIntensity;
  }

  set scanlineIntensity(value: number) {
    this.resources.crtUniforms.uniforms.uScanlineIntensity = value;
  }

  get vignetteIntensity(): number {
    return this.resources.crtUniforms.uniforms.uVignetteIntensity;
  }

  set vignetteIntensity(value: number) {
    this.resources.crtUniforms.uniforms.uVignetteIntensity = value;
  }

  get chromaticAberration(): number {
    return this.resources.crtUniforms.uniforms.uChromaticAberration;
  }

  set chromaticAberration(value: number) {
    this.resources.crtUniforms.uniforms.uChromaticAberration = value;
  }

  get noiseIntensity(): number {
    return this.resources.crtUniforms.uniforms.uNoiseIntensity;
  }

  set noiseIntensity(value: number) {
    this.resources.crtUniforms.uniforms.uNoiseIntensity = value;
  }

  get curvature(): number {
    return this.resources.crtUniforms.uniforms.uCurvature;
  }

  set curvature(value: number) {
    this.resources.crtUniforms.uniforms.uCurvature = value;
  }

  get brightness(): number {
    return this.resources.crtUniforms.uniforms.uBrightness;
  }

  set brightness(value: number) {
    this.resources.crtUniforms.uniforms.uBrightness = value;
  }
}
