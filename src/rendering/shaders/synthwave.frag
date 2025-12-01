precision mediump float;

varying vec2 vTextureCoord;

uniform float uTime;
uniform float uHeat;
uniform vec2 uResolution;

// Color palette
const vec3 COLOR_SKY_TOP = vec3(0.05, 0.01, 0.15);      // Deep purple
const vec3 COLOR_SKY_MID = vec3(0.4, 0.05, 0.3);       // Magenta
const vec3 COLOR_HORIZON = vec3(1.0, 0.4, 0.6);        // Hot pink
const vec3 COLOR_SUN_TOP = vec3(1.0, 0.9, 0.3);        // Yellow
const vec3 COLOR_SUN_BOTTOM = vec3(1.0, 0.2, 0.5);     // Pink
const vec3 COLOR_GRID = vec3(1.0, 0.0, 1.0);           // Magenta
const vec3 COLOR_STAR = vec3(1.0, 1.0, 1.0);           // White

// Hash function for stars
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Smooth noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Draw stars
float stars(vec2 uv) {
    float star = 0.0;

    // Multiple layers for depth
    for (float i = 0.0; i < 3.0; i++) {
        vec2 p = uv * (50.0 + i * 30.0);
        float h = hash(floor(p));

        if (h > 0.97) {
            vec2 center = fract(p) - 0.5;
            float d = length(center);
            float twinkle = 0.5 + 0.5 * sin(uTime * (2.0 + h * 3.0) + h * 10.0);
            star += smoothstep(0.1, 0.0, d) * twinkle * (1.0 - i * 0.2);
        }
    }

    return star;
}

// Draw sun with scanlines
vec3 sun(vec2 uv, float horizonY) {
    vec2 sunCenter = vec2(0.5, horizonY + 0.15);
    float sunRadius = 0.18;

    float dist = length((uv - sunCenter) * vec2(1.0, 1.2));

    if (dist < sunRadius) {
        // Gradient from top to bottom of sun
        float sunY = (uv.y - (sunCenter.y - sunRadius * 0.8)) / (sunRadius * 1.6);
        sunY = clamp(sunY, 0.0, 1.0);
        vec3 sunColor = mix(COLOR_SUN_BOTTOM, COLOR_SUN_TOP, sunY);

        // Scanlines on sun
        float scanline = sin(uv.y * 80.0 - uTime * 2.0) * 0.5 + 0.5;
        float scanMask = step(0.7, scanline);

        // Cut out horizontal bands (synthwave sun style)
        float bands = step(0.5, fract(uv.y * 25.0 - 0.3));
        float bandFade = smoothstep(sunCenter.y - sunRadius * 0.3, sunCenter.y - sunRadius * 0.8, uv.y);

        // Apply bands only in lower half
        float cutout = mix(1.0, bands, bandFade);

        // Sun edge glow
        float edge = smoothstep(sunRadius, sunRadius * 0.8, dist);

        return sunColor * edge * cutout;
    }

    // Sun glow
    float glow = smoothstep(sunRadius * 2.0, sunRadius, dist) * 0.3;
    return mix(COLOR_SUN_BOTTOM, COLOR_SUN_TOP, 0.5) * glow;
}

// Draw perspective grid
float grid(vec2 uv, float horizonY) {
    if (uv.y > horizonY) return 0.0;

    // Perspective transformation
    float depth = (horizonY - uv.y) / horizonY;
    depth = pow(depth, 1.5); // Non-linear for better perspective

    if (depth < 0.001) return 0.0;

    // Grid coordinates in world space
    float worldZ = 1.0 / depth;
    float worldX = (uv.x - 0.5) * worldZ * 2.0;

    // Animate grid scrolling
    float scrollSpeed = 0.5 + uHeat * 0.5;
    worldZ += uTime * scrollSpeed;

    // Grid lines
    float gridX = abs(fract(worldX * 0.5) - 0.5);
    float gridZ = abs(fract(worldZ * 0.3) - 0.5);

    float lineWidth = 0.02 + depth * 0.02;

    float lineX = smoothstep(lineWidth, 0.0, gridX);
    float lineZ = smoothstep(lineWidth, 0.0, gridZ);

    float gridIntensity = max(lineX, lineZ);

    // Fade with distance
    float fadeFactor = smoothstep(1.0, 0.1, depth);

    // Add glow based on heat
    float glowIntensity = 0.5 + uHeat * 0.5;

    return gridIntensity * fadeFactor * glowIntensity;
}

// Mountains/horizon silhouette
float mountains(vec2 uv, float horizonY) {
    float mountain = 0.0;

    // Layer of mountains
    float x = uv.x * 3.0;
    float height = noise(vec2(x, 0.0)) * 0.08 +
                   noise(vec2(x * 2.0, 1.0)) * 0.04 +
                   noise(vec2(x * 4.0, 2.0)) * 0.02;

    float mountainY = horizonY + height;
    mountain = smoothstep(mountainY + 0.01, mountainY, uv.y);

    return mountain;
}

void main() {
    vec2 uv = vTextureCoord;
    float horizonY = 0.35;

    // Sky gradient
    vec3 color = vec3(0.0);

    if (uv.y > horizonY) {
        // Sky
        float skyGradient = (uv.y - horizonY) / (1.0 - horizonY);
        skyGradient = pow(skyGradient, 0.7);

        if (skyGradient < 0.3) {
            color = mix(COLOR_HORIZON, COLOR_SKY_MID, skyGradient / 0.3);
        } else {
            color = mix(COLOR_SKY_MID, COLOR_SKY_TOP, (skyGradient - 0.3) / 0.7);
        }

        // Add stars (only in upper sky)
        float starMask = smoothstep(0.5, 0.9, uv.y);
        color += COLOR_STAR * stars(uv) * starMask;

        // Add sun
        vec3 sunColor = sun(uv, horizonY);
        color = max(color, sunColor);

        // Mountain silhouette
        float mountainMask = mountains(uv, horizonY);
        color = mix(color, vec3(0.02, 0.0, 0.05), mountainMask);

    } else {
        // Ground with grid
        float gridValue = grid(uv, horizonY);

        // Ground color (dark with grid lines)
        vec3 groundColor = vec3(0.02, 0.0, 0.05);
        vec3 gridColor = COLOR_GRID * (0.5 + uHeat * 0.5);

        // Heat affects grid color
        if (uHeat > 0.5) {
            gridColor = mix(COLOR_GRID, vec3(0.0, 1.0, 1.0), (uHeat - 0.5) * 2.0);
        }

        color = mix(groundColor, gridColor, gridValue);

        // Horizon glow
        float horizonGlow = smoothstep(0.0, 0.15, horizonY - uv.y);
        horizonGlow = 1.0 - horizonGlow;
        color += COLOR_HORIZON * horizonGlow * 0.2;
    }

    // Scanline effect (CRT style)
    float scanline = sin(uv.y * uResolution.y * 1.5) * 0.5 + 0.5;
    scanline = pow(scanline, 0.8);
    color *= 0.9 + scanline * 0.1;

    // Vignette
    float vignette = 1.0 - length((uv - 0.5) * 1.2);
    vignette = smoothstep(0.0, 0.7, vignette);
    color *= vignette;

    // Heat-based color boost
    color = mix(color, color * 1.3, uHeat * 0.3);

    gl_FragColor = vec4(color, 1.0);
}
