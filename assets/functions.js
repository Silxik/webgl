function $(s) {
    return doc.getElementById(s);
}
function setupProgram() {

    prog = gl.createProgram();
    gl.attachShader(prog, getShader('vs0'));
    gl.attachShader(prog, getShader('fs0'));
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program.');
    }

    gl.useProgram(prog);

    prog.ver = gl.getAttribLocation(prog, 'aVertexPosition');
    gl.enableVertexAttribArray(prog.ver);

    prog.tex = gl.getAttribLocation(prog, 'aTextureCoord');
    gl.enableVertexAttribArray(prog.tex);

    prog.nor = gl.getAttribLocation(prog, 'aVertexNormal');
    gl.enableVertexAttribArray(prog.nor);
}

function setupGL() {
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
        var i = key.length, k = e.which;
        while (--i >= 0) {
            if (k == key[i]) {
                act[i] = e.type == 'keydown' ? 1 : 0;
                break;
            }
        }
    }

    // Enable window responsiveness
    win.onresize = function () {
        var w = can.width = win.innerWidth,
            h = can.height = win.innerHeight;
        gl.viewport(0, 0, w, h);
    }

    // Initial resize
    win.onresize();
}