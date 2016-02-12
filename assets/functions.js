"use strict";
function rnd() {
    return 0.5 - Math.random();
}
function $(s) {
    return doc.getElementById(s);
}

function setupProgram() {
    var i = pro.length, p;

    while (--i >= 0) {
        p = gl.createProgram();
        gl.attachShader(p, getShader('vs' + i));
        gl.attachShader(p, getShader('fs' + i));
        gl.linkProgram(p);

        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.log('Unable to link the shader program: ' + gl.getProgramInfoLog(p));
        }

        p.uRes = gl.getUniformLocation(p, "uRes");
        p.uCam = gl.getUniformLocation(p, "uCam");
        p.uPos = gl.getUniformLocation(p, "uPos");
        p.uAng = gl.getUniformLocation(p, "uAng");

        p.aVer = gl.getAttribLocation(p, 'aVer');
        p.aTex = gl.getAttribLocation(p, 'aTex');

        pro[i] = p;

    }


    gl.useProgram(p);

    i = meshes.length;
    while (--i >= 0) {
        meshes[i].setup();
    }
}

function setupTextures() {
    var i = pro.length, p;
    while (--i >= 0) {
        p = pro[i];
        p.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, p.tex);

        // Send image data to graphics card
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


        gl.generateMipmap(gl.TEXTURE_2D);
    }
}

function setupGL() {
    can = doc.getElementById('can');
    try {
        gl = can.getContext('webgl') || can.getContext('experimental-webgl');
    } catch (e) {
        console.log('Error getting WebGL context:', e);
    }
    if (!gl) {
        console.log('Unable to initialize WebGL');
        return false;
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return true;
}

function getShader(id) {
    var src = $(id),
        sha = gl.createShader(src.type == 'fs' ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
    gl.shaderSource(sha, src.textContent);
    gl.compileShader(sha);
    if (!gl.getShaderParameter(sha, gl.COMPILE_STATUS)) {
        console.log('Shader compile error: ' + gl.getShaderInfoLog(sha));
        return false;
    }
    return sha;
}

function enableInput() {

    // Enable keyboard input detection
    win.onkeydown = win.onkeyup = function (e) {
        var i = key.length, k = e.which, d;
        while (--i >= 0) {
            if (k == key[i]) {
                d = e.type == 'keydown';
                act[i] = d ? 1 : 0;
                if (k == 37 && d) cam.foc = cam.foc == 0 ? meshes.length - 1 : cam.foc - 1;
                if (k == 39 && d) cam.foc = cam.foc == meshes.length - 1 ? 0 : cam.foc + 1;
                break;
            }
        }
    };

    // Enable window responsiveness
    win.onresize = function () {
        var w = can.width = win.innerWidth,
            h = can.height = win.innerHeight,
            i = pro.length, p;
        gl.viewport(0, 0, w, h);

        while (--i >= 0) {
            p = pro[i];
            gl.uniform2f(p.uRes, 2 / w, 2 / h);
        }
    }

    // Initial resize
    win.onresize();
}

function glbuf(type, data) {
    var b = gl.createBuffer();
    gl.bindBuffer(type, b);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    return b
}