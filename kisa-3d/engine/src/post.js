// post.js — scene -> MSAA HDR target -> depth of field -> bloom -> ACES, grade, vignette, grain, chromatic aberration.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export function makePost(renderer, W, H) {
  const depthTexture = new THREE.DepthTexture(W, H); depthTexture.type = THREE.UnsignedIntType;
  const rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture });
  const rtDof = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.35, 0.6, 0.82);

  const dof = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tCol: { value: null }, tDep: { value: depthTexture }, uRes: { value: new THREE.Vector2(W, H) }, uNear: { value: 1 }, uFar: { value: 100 },
      uFocus: { value: 10 }, uAperture: { value: 0 }, uMaxR: { value: 14 * W / 1080 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      #include <packing>
      uniform sampler2D tCol, tDep; uniform vec2 uRes; uniform float uNear, uFar, uFocus, uAperture, uMaxR; varying vec2 vUv;
      float dist(vec2 uv){ float d = texture2D(tDep, uv).x; return -perspectiveDepthToViewZ(d, uNear, uFar); }
      float coc(float z){ return clamp(abs(1.0 / uFocus - 1.0 / z) * uAperture, 0.0, 1.0); }
      void main(){
        vec3 c0 = texture2D(tCol, vUv).rgb;
        if (uAperture <= 0.0) { gl_FragColor = vec4(c0, 1.); return; }
        float z0 = dist(vUv), r0 = coc(z0);
        vec3 acc = c0; float wsum = 1.0;
        const int N = 36; const float GA = 2.39996323;
        for (int i = 1; i < N; i++) {
          float fi = float(i), rr = sqrt(fi / float(N)), a = fi * GA;
          vec2 o = vec2(cos(a), sin(a)) * rr;
          vec2 uv = vUv + o * uMaxR / uRes;
          float z = dist(uv), r = coc(z);
          // a sample counts if it is blurry enough to reach us; background behind a sharp subject does not bleed onto it
          float reach = (z < z0) ? r : min(r, r0);
          float w = smoothstep(rr - 0.08, rr + 0.02, max(reach, r0 * step(z0, z + 0.001)));
          acc += texture2D(tCol, uv).rgb * w; wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, 1.);
      }`,
  }));

  const fin = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tCol: { value: null }, uRes: { value: new THREE.Vector2(W, H) }, uTime: { value: 0 }, uExpo: { value: 1 }, uVig: { value: 0.35 },
      uGrain: { value: 0.035 }, uCA: { value: 0.0015 }, uSat: { value: 1.05 }, uLift: { value: new THREE.Vector3(0.01, 0.012, 0.018) },
      uGain: { value: new THREE.Vector3(1.0, 0.98, 0.95) }, uFlash: { value: 0 }, uFade: { value: 0 }, uZoom: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform sampler2D tCol; uniform vec2 uRes; uniform float uTime, uExpo, uVig, uGrain, uCA, uSat, uFlash, uFade, uZoom; uniform vec3 uLift, uGain; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - 0.5;
        vec3 c;
        if (uZoom > 0.0) {   // radial zoom blur for whip transitions
          c = vec3(0.0);
          for (int i = 0; i < 16; i++) { float k = float(i) / 15.0 * uZoom; vec2 uv = vUv - d * k;
            c += vec3(texture2D(tCol, uv - d * uCA).r, texture2D(tCol, uv).g, texture2D(tCol, uv + d * uCA).b); }
          c /= 16.0;
        } else {
          c.r = texture2D(tCol, vUv - d * uCA).r; c.g = texture2D(tCol, vUv).g; c.b = texture2D(tCol, vUv + d * uCA).b;
        }
        c = aces(c * uExpo * 0.8);
        c = pow(c, vec3(1.0 / 2.2));
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, uSat);
        c = c * uGain + uLift * (1.0 - c);
        float v = smoothstep(0.95, 0.25, length(d * vec2(1.0, 0.75)));
        c *= mix(1.0 - uVig, 1.0, v);
        c += (h(vUv * uRes + fract(uTime) * 91.7) - 0.5) * uGrain;
        c = mix(c, vec3(1.0), uFlash);
        c = mix(c, vec3(0.0), uFade);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));

  return {
    rtScene, bloom,
    render(scene, camera, fx = {}) {
      renderer.setRenderTarget(rtScene); renderer.clear(); renderer.render(scene, camera);
      const du = dof.material.uniforms;
      du.tCol.value = rtScene.texture; du.uNear.value = camera.near; du.uFar.value = camera.far;
      du.uFocus.value = fx.focus ?? 10; du.uAperture.value = fx.aperture ?? 0;
      renderer.setRenderTarget(rtDof); dof.render(renderer);
      bloom.strength = fx.bloom ?? 0.35; bloom.radius = fx.bloomRadius ?? 0.6; bloom.threshold = fx.bloomThreshold ?? 0.82;
      if (bloom.strength > 0) bloom.render(renderer, null, rtDof, 0, false);
      const fu = fin.material.uniforms;
      fu.tCol.value = rtDof.texture; fu.uTime.value = fx.time ?? 0; fu.uExpo.value = fx.exposure ?? 1; fu.uVig.value = fx.vignette ?? 0.35;
      fu.uGrain.value = fx.grain ?? 0.03; fu.uCA.value = fx.ca ?? 0.0015; fu.uSat.value = fx.sat ?? 1.05; fu.uFlash.value = fx.flash ?? 0; fu.uFade.value = fx.fade ?? 0; fu.uZoom.value = fx.zoom ?? 0;
      if (fx.lift) fu.uLift.value.set(...fx.lift); if (fx.gain) fu.uGain.value.set(...fx.gain);
      renderer.setRenderTarget(null); fin.render(renderer);
    },
  };
}
